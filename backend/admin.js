const express = require('express');
const {
  requireUser,
  listUsers,
  updateUserStatus,
  deleteUser,
  recordAuditLog,
  getAuditLogs,
} = require('./auth');
const { getUserChatCount, deleteUserChats } = require('./chats');
const chatStore = require('./chat-store');
const { getUserUsage } = require('./ask-quota');
const { getLegalCollectionStatus, ingestLegalCorpus } = require('./legal-retrieval');
const { getUsageLimits, saveUsageLimits } = require('./usage-limit-settings');
const RequestError = require('./request-error');

const router = express.Router();

router.use(requireUser, (_request, response, next) => {
  if (response.locals.user.role !== 'admin') {
    return response.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
});

router.get('/users', async (_request, response) => {
  const users = await Promise.all(listUsers().map(async user => ({
    ...user,
    chatCount: typeof getUserChatCount === 'function' ? getUserChatCount(user.id) : 0,
    usage: await getUserUsage(user.id),
  })));
  response.json(users);
});

router.patch('/users/:id/status', express.json({ limit: '4kb' }), (request, response) => {
  const currentAdmin = response.locals.user;
  const targetUserId = request.params.id;
  const { status } = request.body || {};

  if (targetUserId === currentAdmin.id) {
    throw new RequestError(400, 'You cannot suspend or modify the status of your own account.');
  }

  const updated = updateUserStatus(targetUserId, status, currentAdmin.id, currentAdmin.isSuperAdmin);
  response.json(updated);
});

router.delete('/users/:id', (request, response) => {
  const currentAdmin = response.locals.user;
  const targetUserId = request.params.id;

  if (targetUserId === currentAdmin.id) {
    throw new RequestError(400, 'You cannot delete your own account.');
  }

  const result = deleteUser(targetUserId, currentAdmin.id);
  if (typeof deleteUserChats === 'function') {
    deleteUserChats(targetUserId);
  }
  response.json(result);
});

router.get('/audit-logs', (_request, response) => {
  response.json(getAuditLogs());
});

router.get('/entry-logs', (request, response) => {
  const requestedLimit = Number.parseInt(request.query.limit, 10);
  const requestedOffset = Number.parseInt(request.query.offset, 10);
  response.json(chatStore.listAccessEvents(requestedLimit, requestedOffset));
});

router.get('/rag/status', async (_request, response) => {
  response.json(await getLegalCollectionStatus());
});

router.post('/rag/seed', express.json({ limit: '10mb' }), async (request, response) => {
  const { corpus } = request.body ?? {};
  const indexedPoints = await ingestLegalCorpus(corpus);
  recordAuditLog({
    action: 'RAG_INGESTED',
    adminId: response.locals.user.id,
    details: `Indexed ${indexedPoints} verified legal passage records`,
  });
  response.status(201).json({ indexedPoints });
});

router.get('/usage-limits', (_request, response) => {
  response.json(getUsageLimits());
});

router.put('/usage-limits', express.json({ limit: '4kb' }), (request, response) => {
  const currentAdmin = response.locals.user;
  const updated = saveUsageLimits(request.body);
  recordAuditLog({
    action: 'QUOTA_UPDATED',
    adminId: currentAdmin.id,
    details: 'System rate limits and daily quota updated',
  });
  response.json(updated);
});

router.post('/usage-limits', express.json({ limit: '4kb' }), (request, response) => {
  const currentAdmin = response.locals.user;
  const updated = saveUsageLimits(request.body);
  recordAuditLog({
    action: 'QUOTA_UPDATED',
    adminId: currentAdmin.id,
    details: 'System rate limits and daily quota updated',
  });
  response.json(updated);
});

router.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  const message = error instanceof RequestError ? error.message : 'Could not process the administrator request.';
  response.status(error.status || 500).json({ error: message });
});

module.exports = router;
