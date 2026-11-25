const path = require('node:path');
const { loadEnvFile } = require('node:process');

try {
  loadEnvFile(path.join(__dirname, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const express = require('express');
const { authRouter, requireUser } = require('./auth');
const adminRouter = require('./admin');
const { askRouter } = require('./ask');
const { ocrRouter } = require('./ocr');
const { pdfRouter } = require('./pdf');
const chatRouter = require('./chats');
const { auditRouter } = require('./audit');
const { chatStatutoryRouter } = require('./chat-statutory');

// Global process error handlers to prevent unexpected service termination
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const app = express();
app.set('trust proxy', 1);

const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const port = Number(process.env.PORT) || 3001;

// Allowed frontend origins for CORS and CSRF protection
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...[process.env.CLIENT_ORIGIN, process.env.FRONTEND_URL, process.env.NEXT_PUBLIC_APP_URL]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
]);

app.use('/api', (request, response, next) => {
  response.set('Cache-Control', 'no-store');
  const origin = request.get('Origin');
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0].trim();
  const sameHost = origin === request.protocol + '://' + request.get('host') ||
    (forwardedHost && origin === request.protocol + '://' + forwardedHost);
  const isAllowedOrigin = origin && (sameHost || allowedOrigins.has(origin));

  // Configure CORS headers if origin is present and recognized
  if (origin && isAllowedOrigin) {
    response.set('Access-Control-Allow-Origin', origin);
    response.set('Access-Control-Allow-Credentials', 'true');
    response.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-File-Name, Cookie');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.sendStatus(204);
  }

  // CSRF validation for mutating requests
  const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (!isRead && origin && !isAllowedOrigin) {
    return response.status(403).json({ error: 'Open Nothi AI directly to make this request.' });
  }

  next();
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', version: '1.2.0', service: 'Nothi AI' });
});

// Mount live API routers
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/audit', requireUser, auditRouter);
app.use('/api/chat', requireUser, chatStatutoryRouter);
app.use('/api/ask', requireUser, askRouter);
app.use('/api/ocr', requireUser, ocrRouter);
app.use('/api/extract', requireUser, pdfRouter);
app.use('/api/chats', requireUser, chatRouter);

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not found.' });
});

app.get('/', (_request, response) => {
  response.json({
    service: 'Nothi AI Backend Server',
    version: '1.2.0',
    status: 'ok',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      audit: '/api/audit',
      chat: '/api/chat',
      chats: '/api/chats',
      ask: '/api/ask',
      ocr: '/api/ocr',
      extract: '/api/extract',
      admin: '/api/admin',
    },
  });
});

// Global Express error handler
app.use((error, _request, response, _next) => {
  console.error('Server error handled:', error);
  if (response.headersSent) return;
  const status = error.status || 500;
  const message = error.message || 'An unexpected internal server error occurred.';
  response.status(status).json({ error: message });
});

app.listen(port, host, error => {
  if (error) {
    console.error(`Could not start Nothi AI at http://${host}:${port} (${error.code ?? 'unknown error'}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Server listening at http://${host}:${port}`);
});
