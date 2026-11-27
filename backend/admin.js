const express = require('express');
const {
  requireUser,
  listUsers,
  updateUserStatus,
  deleteUser,
  getAuditLogs,
} = require('./auth');
const { getUserChatCount } = require('./chats');
const { getUserUsage, getRecordedTokenUsage } = require('./ask-quota');
const { readAccountById } = require('./auth-store');
const { getUsageLimits, saveUsageLimits } = require('./usage-limit-settings');
const RequestError = require('./request-error');

const router = express.Router();

router.use(requireUser, (_request, response, next) => {
  if (response.locals.user.role !== 'admin') {
    return response.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
});

router.get('/users', (request, response) => {
  const { status } = request.query;
  if (status !== undefined && !['active', 'suspended', 'banned'].includes(status)) {
    throw new RequestError(400, 'Status must be active, suspended, or banned.');
  }
  const recordedUsage = getRecordedTokenUsage();
  const users = listUsers()
    .filter(user => status === undefined || user.status === status)
    .map(user => ({
      ...user,
      chatCount: getUserChatCount(user.id),
      ...(recordedUsage.get(user.id) ?? { recordedTokensToday: 0, recordedTokensTotal: 0 }),
    }));
  response.json(users);
});

router.get('/users/:id/usage', async (request, response) => {
  const { id } = request.params;
  if (!readAccountById(id)) throw new RequestError(404, 'User account not found.');
  response.json({
    ...(await getUserUsage(id)),
    ...(getRecordedTokenUsage().get(id) ?? { recordedTokensToday: 0, recordedTokensTotal: 0 }),
  });
});

router.patch('/users/:id/status', express.json({ limit: '4kb' }), (request, response) => {
  const currentAdmin = response.locals.user;
  const targetUserId = request.params.id;
  const { status } = request.body || {};

  if (targetUserId === currentAdmin.id && !currentAdmin.isSuperAdmin) {
    throw new RequestError(400, 'You cannot suspend or modify the status of your own account.');
  }

  const updated = updateUserStatus(targetUserId, status, currentAdmin.id);
  response.json(updated);
});

router.delete('/users/:id', (request, response) => {
  const currentAdmin = response.locals.user;
  const targetUserId = request.params.id;

  if (targetUserId === currentAdmin.id && !currentAdmin.isSuperAdmin) {
    throw new RequestError(400, 'You cannot delete your own account.');
  }

  response.json(deleteUser(targetUserId, currentAdmin.id));
});

router.get('/audit-logs', (_request, response) => {
  response.json(getAuditLogs());
});

const settingsPaths = ['/usage-limits', '/settings'];
router.get(settingsPaths, (_request, response) => {
  response.json(getUsageLimits());
});

function updateSettings(request, response) {
  response.json(saveUsageLimits(request.body, response.locals.user.id));
}

router.put(settingsPaths, express.json({ limit: '4kb' }), updateSettings);
router.post('/usage-limits', express.json({ limit: '4kb' }), updateSettings);

router.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  const message = error instanceof RequestError ? error.message : 'Could not process the administrator request.';
  response.status(error.status || 500).json({ error: message });
});

module.exports = router;
