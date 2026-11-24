const express = require('express');
const { requireUser } = require('./auth');
const { getUsageLimits, saveUsageLimits } = require('./usage-limit-settings');
const RequestError = require('./request-error');

const router = express.Router();

router.use(requireUser, (_request, response, next) => {
  if (response.locals.user.role !== 'admin') {
    return response.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
});

router.get('/usage-limits', (_request, response) => {
  response.json(getUsageLimits());
});

router.put('/usage-limits', express.json({ limit: '4kb' }), (request, response) => {
  response.json(saveUsageLimits(request.body));
});

router.post('/usage-limits', express.json({ limit: '4kb' }), (request, response) => {
  response.json(saveUsageLimits(request.body));
});

router.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  const message = error instanceof RequestError ? error.message : 'Could not process the usage limits request.';
  response.status(error.status || 500).json({ error: message });
});

module.exports = router;
