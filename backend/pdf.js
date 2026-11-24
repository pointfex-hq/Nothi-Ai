const express = require('express');
const path = require('node:path');
const RequestError = require('./request-error');

const pdfRouter = express.Router();
const pdfAssets = path.dirname(require.resolve('pdfjs-dist/package.json'));
const readPdf = express.raw({ type: 'application/pdf', limit: '5mb', inflate: false });

async function extractPdf(bytes) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(bytes),
    stopAtErrors: true,
    enableXfa: false,
    useSystemFonts: false,
    cMapUrl: path.join(pdfAssets, 'cmaps') + '/',
    cMapPacked: true,
    standardFontDataUrl: path.join(pdfAssets, 'standard_fonts') + '/',
  });

  const pages = [];
  try {
    const pdf = await task.promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const { items } = await page.getTextContent();
      const text = items.map(item => item.str + (item.hasEOL ? '\n' : '')).join('').trim();
      pages.push({ pageNumber, text });
      page.cleanup();
    }
  } catch (error) {
    const message = error.name === 'PasswordException'
      ? 'This PDF is password-protected and cannot be read.'
      : 'This PDF could not be read. Try opening it in a PDF viewer and saving a new copy.';
    throw new RequestError(422, message);
  } finally {
    await task.destroy();
  }

  if (!pages.some(page => page.text)) {
    throw new RequestError(422, 'This PDF has no selectable text.');
  }
  return pages;
}

pdfRouter.post('/', readPdf, async (request, response) => {
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    throw new RequestError(400, 'Choose one PDF to upload.');
  }
  response.json({ pages: await extractPdf(request.body) });
});

pdfRouter.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'The PDF must be 5 MB or smaller.' });
  }
  const message = error instanceof RequestError ? error.message : 'The PDF upload could not be processed.';
  response.status(error.status || 500).json({ error: message });
});

module.exports = { pdfRouter, extractPdf };
