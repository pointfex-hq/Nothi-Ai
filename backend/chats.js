const express = require('express');
const { randomUUID } = require('node:crypto');
const { win32 } = require('node:path');
const { answerChatQuestion, answerLegalQuestion, getQuestion } = require('./ask');
const { sendAskQuotaError, getUserUsage } = require('./ask-quota');
const { extractPdf } = require('./pdf');
const { extractPhoto } = require('./ocr');
const { requireUser } = require('./auth');
const chatStore = require('./chat-store');
const RequestError = require('./request-error');

const router = express.Router();
const activityByChat = new Map();
const readFile = express.raw({
  type: ['application/pdf', 'image/jpeg', 'image/png'],
  limit: '5mb',
  inflate: false,
});
const readJson = express.json({ limit: '256kb' });

function activityKey(ownerId, chatId) {
  return ownerId + ':' + chatId;
}

function chatResponse(ownerId, { id, title, updatedAt, attachments, messages }) {
  const activity = activityByChat.get(activityKey(ownerId, id));
  return {
    id,
    title,
    updatedAt,
    attachments: attachments || { pdf: null, photo: null },
    messages: Array.isArray(messages) ? messages : [],
    uploads: activity?.uploads ?? { pdf: null, photo: null },
    busy: activity?.busy ?? null,
  };
}

function requireIdle(ownerId, chatId) {
  if (activityByChat.get(activityKey(ownerId, chatId))?.busy) {
    throw new RequestError(409, 'Wait for the current operation to finish.');
  }
}

function beginActivity(ownerId, chatId, busy) {
  const key = activityKey(ownerId, chatId);
  const activity = activityByChat.get(key) ?? { uploads: { pdf: null, photo: null } };
  activity.busy = busy;
  activityByChat.set(key, activity);
  return activity;
}

function finishActivity(ownerId, chatId, activity) {
  activity.busy = null;
  if (!activity.uploads.pdf && !activity.uploads.photo) activityByChat.delete(activityKey(ownerId, chatId));
}

function resetAttachmentContext(chat) {
  chat.messages = chat.messages.filter(message => message.mode === 'legal' && !message.hasAttachmentContext);
  chat.updatedAt = Date.now();
  if (chat.messages.length) return;
  const title = Object.values(chat.attachments).filter(Boolean).map(attachment => attachment.name).join(' + ');
  chat.title = title.length > 72 ? title.slice(0, 71) + '…' : title || 'New chat';
}

router.use(requireUser);

router.get('/', (_request, response) => {
  response.json(chatStore.listChats(response.locals.user.id));
});

router.get('/quota', (_request, response) => {
  const userId = response.locals.user.id;
  response.json(getUserUsage(userId));
});

router.post('/', readJson, (request, response) => {
  const { id: ownerId } = response.locals.user;
  const initialData = request.body || {};
  response.status(201).json(chatResponse(ownerId, chatStore.createChat(ownerId, initialData)));
});

router.param('chatId', (_request, response, next, id) => {
  chatStore.ensureChat(response.locals.user.id, id);
  next();
});

router.get('/:chatId', (request, response) => {
  const { id: ownerId } = response.locals.user;
  response.json(chatResponse(ownerId, chatStore.readChat(ownerId, request.params.chatId)));
});

router.put('/:chatId', readJson, (request, response) => {
  const { id: ownerId } = response.locals.user;
  const { chatId } = request.params;
  requireIdle(ownerId, chatId);
  const updated = chatStore.updateFullChat(ownerId, chatId, request.body || {});
  response.json(chatResponse(ownerId, updated));
});

router.delete('/:chatId', (request, response) => {
  const { id: ownerId } = response.locals.user;
  const { chatId } = request.params;
  requireIdle(ownerId, chatId);
  chatStore.deleteChat(ownerId, chatId);
  activityByChat.delete(activityKey(ownerId, chatId));
  response.json({ id: chatId });
});

router.post('/:chatId/document', readFile, async (request, response) => {
  const { id: ownerId } = response.locals.user;
  const { chatId } = request.params;
  requireIdle(ownerId, chatId);
  const chat = chatStore.readChat(ownerId, chatId);
  if (!Buffer.isBuffer(request.body) || !request.body.length) {
    throw new RequestError(400, 'Choose one PDF, JPG, JPEG, or PNG.');
  }

  let name;
  try {
    name = win32.basename(decodeURIComponent(request.get('X-File-Name') || '')).trim();
  } catch {
    throw new RequestError(400, 'Choose a file with a valid name.');
  }
  if (!name || name.length > 255 || /[\x00-\x1f\x7f]/u.test(name)) {
    throw new RequestError(400, 'Choose a file with a valid name.');
  }

  const kind = request.is('application/pdf') ? 'pdf' : 'photo';
  const activity = beginActivity(ownerId, chatId, 'extracting');
  activity.uploads[kind] = { name, status: 'processing' };
  let failure;
  try {
    let pages;
    try {
      pages = kind === 'pdf'
        ? await extractPdf(request.body)
        : [{ pageNumber: 1, text: await extractPhoto(request.body) }];
    } catch (error) {
      failure = error instanceof RequestError ? error : new RequestError(500, 'Could not extract text from this file. Try again.');
      activity.uploads[kind] = { name, status: 'failed', error: failure.message };
    }
    if (!failure) {
      chat.attachments[kind] = { name, kind, pages };
      resetAttachmentContext(chat);
      chatStore.saveAttachment(ownerId, chat, kind);
    }
  } finally {
    if (activity.uploads[kind]?.status === 'processing') activity.uploads[kind] = null;
    finishActivity(ownerId, chatId, activity);
  }
  const view = chatResponse(ownerId, chat);
  if (failure) return response.status(failure.status).json({ error: failure.message, chat: view });
  response.json(view);
});

router.delete('/:chatId/document/:kind', (request, response) => {
  const { id: ownerId } = response.locals.user;
  const { chatId, kind } = request.params;
  requireIdle(ownerId, chatId);
  if (kind !== 'pdf' && kind !== 'photo') throw new RequestError(400, 'Choose the PDF or photo to remove.');

  const chat = chatStore.readChat(ownerId, chatId);
  if (chat.attachments[kind]) {
    chat.attachments[kind] = null;
    resetAttachmentContext(chat);
    chatStore.saveAttachment(ownerId, chat, kind);
  }
  const activity = activityByChat.get(activityKey(ownerId, chatId));
  if (activity) {
    activity.uploads[kind] = null;
    finishActivity(ownerId, chatId, activity);
  }
  response.json(chatResponse(ownerId, chat));
});

router.patch('/:chatId/document', readJson, (request, response) => {
  const { id: ownerId } = response.locals.user;
  const { chatId } = request.params;
  requireIdle(ownerId, chatId);
  const chat = chatStore.readChat(ownerId, chatId);
  if (!chat.attachments.photo) {
    throw new RequestError(400, 'Attach a photo before editing extracted text.');
  }
  const { text } = request.body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > 24000) {
    throw new RequestError(400, 'Enter between 1 and 24,000 characters of reviewed text.');
  }

  const page = chat.attachments.photo.pages[0];
  if (page.text !== text.trim()) {
    page.text = text.trim();
    resetAttachmentContext(chat);
    chatStore.saveAttachment(ownerId, chat, 'photo');
  }
  response.json(chatResponse(ownerId, chat));
});

router.post('/:chatId/messages', readJson, async (request, response) => {
  const { id: ownerId } = response.locals.user;
  const { chatId } = request.params;
  requireIdle(ownerId, chatId);
  const chat = chatStore.readChat(ownerId, chatId);
  const question = getQuestion(request.body?.question);
  const mode = request.body.mode ?? 'document';
  if (mode !== 'document' && mode !== 'legal') throw new RequestError(400, 'Choose Attachments or Legal search.');

  const activity = beginActivity(ownerId, chatId, 'answering');
  try {
    const history = chat.messages.filter(message => (message.mode ?? 'document') === mode);
    const attachments = Object.values(chat.attachments).filter(Boolean);
    const answer = mode === 'legal'
      ? await answerLegalQuestion(ownerId, question, history, attachments)
      : await answerChatQuestion(ownerId, question, attachments, history);
    if (!chat.messages.length) {
      chat.title = question.length > 55 ? question.slice(0, 54).trimEnd() + '…' : question;
    }
    const context = mode === 'legal' && attachments.length ? { hasAttachmentContext: true } : {};
    const messages = [
      { id: randomUUID(), role: 'user', mode, ...context, content: question },
      { id: randomUUID(), role: 'assistant', mode, ...context, ...answer },
    ];
    chat.updatedAt = Date.now();
    chatStore.appendMessages(ownerId, chat, messages);
    chat.messages.push(...messages);
  } finally {
    finishActivity(ownerId, chatId, activity);
  }
  response.json(chatResponse(ownerId, chat));
});

router.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (sendAskQuotaError(error, response)) return;
  if (error.type === 'entity.too.large') {
    const message = request.is('application/json') ? 'The text is too large.' : 'The file must be 5 MB or smaller.';
    return response.status(413).json({ error: message });
  }
  const message = error instanceof RequestError ? error.message : 'The chat request could not be completed. Try again.';
  response.status(error.status || 500).json({ error: message });
});

function getUserChatCount(userId) {
  return chatStore.getUserChatCount(userId);
}

function deleteUserChats(userId) {
  chatStore.deleteUserChats(userId);
}

module.exports = router;
module.exports.getUserChatCount = getUserChatCount;
module.exports.deleteUserChats = deleteUserChats;
