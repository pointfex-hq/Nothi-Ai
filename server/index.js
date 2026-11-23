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

const app = express();
const host = '127.0.0.1';
const port = 3001;

app.use('/api', (request, response, next) => {
  response.set('Cache-Control', 'no-store');
  const origin = request.get('Origin');
  const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (!isRead && origin && origin !== request.protocol + '://' + request.get('host')) {
    return response.status(403).json({ error: 'Open Nothi AI directly to make this request.' });
  }
  next();
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ask', requireUser, askRouter);
app.use('/api/ocr', requireUser, ocrRouter);
app.use('/api/extract', requireUser, pdfRouter);
app.use('/api/chats', chatRouter);

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not found.' });
});

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild, { dotfiles: 'deny' }));

app.listen(port, host, error => {
  if (error) {
    console.error(`Could not start Nothi AI at http://${host}:${port} (${error.code ?? 'unknown error'}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Server listening at http://${host}:${port}`);
});
