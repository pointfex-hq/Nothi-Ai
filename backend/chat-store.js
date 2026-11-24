const { randomUUID } = require('node:crypto');
const { closeSync, mkdirSync, openSync } = require('node:fs');
const path = require('node:path');
const { Database, DatabaseSync } = require('node:sqlite');
const { chatsFile } = require('./local-data');
const RequestError = require('./request-error');

const SQLiteDatabase = Database ?? DatabaseSync;
mkdirSync(path.dirname(chatsFile), { recursive: true, mode: 0o700 });
closeSync(openSync(chatsFile, 'a', 0o600));
const database = new SQLiteDatabase(chatsFile);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS chats (
    owner_id TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (owner_id, id)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS chats_by_owner ON chats(owner_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS chat_messages (
    position INTEGER PRIMARY KEY,
    owner_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('document', 'legal')),
    payload TEXT NOT NULL,
    FOREIGN KEY (owner_id, chat_id) REFERENCES chats(owner_id, id) ON DELETE CASCADE
  ) STRICT;
  CREATE INDEX IF NOT EXISTS chat_messages_in_order ON chat_messages(owner_id, chat_id, position);

  CREATE TABLE IF NOT EXISTS chat_attachments (
    owner_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('pdf', 'photo')),
    name TEXT NOT NULL,
    pages TEXT NOT NULL,
    PRIMARY KEY (owner_id, chat_id, kind),
    FOREIGN KEY (owner_id, chat_id) REFERENCES chats(owner_id, id) ON DELETE CASCADE
  ) STRICT;
`);

const selectList = database.prepare(`
  SELECT id, title, updated_at AS updatedAt FROM chats WHERE owner_id = ?
  ORDER BY updated_at DESC, rowid DESC
`);
const selectChat = database.prepare(`
  SELECT id, title, updated_at AS updatedAt, revision FROM chats WHERE owner_id = ? AND id = ?
`);
const selectMessages = database.prepare(`
  SELECT payload FROM chat_messages WHERE owner_id = ? AND chat_id = ? ORDER BY position
`);
const selectAttachments = database.prepare(`
  SELECT kind, name, pages FROM chat_attachments WHERE owner_id = ? AND chat_id = ?
`);
const insertChat = database.prepare('INSERT INTO chats (owner_id, id, title, updated_at) VALUES (?, ?, ?, ?)');
const updateChat = database.prepare(`
  UPDATE chats SET title = ?, updated_at = ?, revision = revision + 1
  WHERE owner_id = ? AND id = ? AND revision = ?
`);
const updateChatDirect = database.prepare(`
  UPDATE chats SET title = ?, updated_at = ?, revision = revision + 1
  WHERE owner_id = ? AND id = ?
`);
const deleteChatRow = database.prepare('DELETE FROM chats WHERE owner_id = ? AND id = ?');
const deleteUserChatsRow = database.prepare('DELETE FROM chats WHERE owner_id = ?');
const countUserChats = database.prepare('SELECT COUNT(*) AS count FROM chats WHERE owner_id = ?');
const findChatAnyOwner = database.prepare('SELECT owner_id, id, title FROM chats WHERE id = ? LIMIT 1');
const insertMessage = database.prepare(`
  INSERT INTO chat_messages (owner_id, chat_id, mode, payload) VALUES (?, ?, ?, ?)
`);
const clearAttachmentHistory = database.prepare(`
  DELETE FROM chat_messages WHERE owner_id = ? AND chat_id = ?
    AND (mode = 'document' OR json_extract(payload, '$.hasAttachmentContext') = 1)
`);
const upsertAttachment = database.prepare(`
  INSERT INTO chat_attachments (owner_id, chat_id, kind, name, pages) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (owner_id, chat_id, kind) DO UPDATE SET name = excluded.name, pages = excluded.pages
`);
const deleteAttachment = database.prepare(`
  DELETE FROM chat_attachments WHERE owner_id = ? AND chat_id = ? AND kind = ?
`);

function missingChat() {
  return new RequestError(404, 'This chat is no longer available.');
}

function transaction(begin, work) {
  database.exec(begin);
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    if (database.isTransaction !== false) database.exec('ROLLBACK');
    throw error;
  }
}

function listChats(ownerId) {
  return selectList.all(ownerId);
}

function ensureChat(ownerId, id) {
  const chat = selectChat.get(ownerId, id);
  if (!chat) {
    const globalMatch = findChatAnyOwner.get(id);
    if (globalMatch) {
      throw new RequestError(403, 'You do not have permission to access this chat.');
    }
    throw missingChat();
  }
  return chat;
}

function readChat(ownerId, id) {
  return transaction('BEGIN', () => {
    const chat = ensureChat(ownerId, id);
    const attachments = { pdf: null, photo: null };
    for (const { kind, name, pages } of selectAttachments.all(ownerId, id)) {
      attachments[kind] = { kind, name, pages: JSON.parse(pages) };
    }
    const messages = selectMessages.all(ownerId, id).map(row => JSON.parse(row.payload));
    return { ...chat, attachments, messages };
  });
}

function createChat(ownerIdOrData, initialData = {}) {
  let ownerId;
  let data;
  if (typeof ownerIdOrData === 'object' && ownerIdOrData !== null) {
    ownerId = ownerIdOrData.userId || ownerIdOrData.ownerId;
    data = ownerIdOrData;
  } else {
    ownerId = ownerIdOrData;
    data = initialData || {};
  }
  const id = (typeof data.id === 'string' && data.id.trim()) ? data.id.trim() : randomUUID();
  const title = (typeof data.title === 'string' && data.title.trim()) ? data.title.trim() : 'New chat';
  const now = Date.now();
  insertChat.run(ownerId, id, title, now);
  if (Array.isArray(data.messages) && data.messages.length > 0) {
    for (const msg of data.messages) {
      const mode = msg.mode === 'legal' ? 'legal' : 'document';
      insertMessage.run(ownerId, id, mode, JSON.stringify(msg));
    }
  }
  if (data.attachments) {
    for (const kind of ['pdf', 'photo']) {
      const att = data.attachments[kind];
      if (att && att.name) {
        upsertAttachment.run(ownerId, id, kind, att.name, JSON.stringify(att.pages || []));
      }
    }
  }
  return readChat(ownerId, id);
}

function updateChatVersion(ownerId, chat) {
  const { changes } = updateChat.run(chat.title, chat.updatedAt, ownerId, chat.id, chat.revision);
  if (changes) return;
  ensureChat(ownerId, chat.id);
  throw new RequestError(409, 'This chat changed. Refresh it and try again.');
}

function updateFullChat(ownerId, id, { title, messages, attachments, updatedAt }) {
  return transaction('BEGIN IMMEDIATE', () => {
    let chat = selectChat.get(ownerId, id);
    if (!chat) {
      const globalMatch = findChatAnyOwner.get(id);
      if (globalMatch) {
        throw new RequestError(403, 'You do not have permission to access this chat.');
      }
      insertChat.run(ownerId, id, title || 'New chat', updatedAt || Date.now());
      chat = selectChat.get(ownerId, id);
    }
    const newTitle = (typeof title === 'string' && title.trim()) ? title.trim() : chat.title;
    const newUpdatedAt = typeof updatedAt === 'number' ? updatedAt : Date.now();
    updateChatDirect.run(newTitle, newUpdatedAt, ownerId, id);

    if (Array.isArray(messages)) {
      database.prepare('DELETE FROM chat_messages WHERE owner_id = ? AND chat_id = ?').run(ownerId, id);
      for (const msg of messages) {
        const mode = msg.mode === 'legal' ? 'legal' : 'document';
        insertMessage.run(ownerId, id, mode, JSON.stringify(msg));
      }
    }
    if (attachments) {
      for (const kind of ['pdf', 'photo']) {
        if (attachments[kind] && attachments[kind].name) {
          upsertAttachment.run(ownerId, id, kind, attachments[kind].name, JSON.stringify(attachments[kind].pages || []));
        } else {
          deleteAttachment.run(ownerId, id, kind);
        }
      }
    }
    return readChat(ownerId, id);
  });
}

function saveAttachment(ownerId, chat, kind) {
  transaction('BEGIN IMMEDIATE', () => {
    updateChatVersion(ownerId, chat);
    const attachment = chat.attachments[kind];
    if (attachment) {
      upsertAttachment.run(ownerId, chat.id, kind, attachment.name, JSON.stringify(attachment.pages));
    } else {
      deleteAttachment.run(ownerId, chat.id, kind);
    }
    clearAttachmentHistory.run(ownerId, chat.id);
  });
}

function appendMessages(ownerId, chatOrId, messages) {
  transaction('BEGIN IMMEDIATE', () => {
    const chat = typeof chatOrId === 'object' && chatOrId !== null ? chatOrId : ensureChat(ownerId, chatOrId);
    updateChatVersion(ownerId, chat);
    for (const message of messages) {
      insertMessage.run(ownerId, chat.id, message.mode || 'document', JSON.stringify(message));
    }
  });
}

function deleteChat(ownerId, id) {
  if (!deleteChatRow.run(ownerId, id).changes) {
    const globalMatch = findChatAnyOwner.get(id);
    if (globalMatch) {
      throw new RequestError(403, 'You do not have permission to delete this chat.');
    }
    throw missingChat();
  }
}

function deleteUserChats(ownerId) {
  deleteUserChatsRow.run(ownerId);
}

function getUserChatCount(ownerId) {
  const row = countUserChats.get(ownerId);
  return row ? row.count : 0;
}

function findChatGlobally(chatId) {
  const row = findChatAnyOwner.get(chatId);
  if (row) {
    return { chat: row, ownerId: row.owner_id };
  }
  return null;
}

module.exports = {
  listChats,
  createChat,
  ensureChat,
  readChat,
  saveAttachment,
  appendMessages,
  deleteChat,
  deleteUserChats,
  getUserChatCount,
  findChatGlobally,
  updateFullChat,
};
