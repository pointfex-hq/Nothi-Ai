const express = require('express');
const path = require('node:path');
const RequestError = require('./request-error');
const { readDocument, getUploadMime, uploadName, uploadErrors } = require('./document-upload');

const pdfRouter = express.Router();
const pdfAssets = path.dirname(require.resolve('pdfjs-dist/package.json'));

async function readPdfDocument(bytes, read) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw new RequestError(400, 'Choose one PDF to upload.');
  if (!/^%PDF-[0-9]\.[0-9](?:\r|\n)/.test(bytes.subarray(0, 12).toString('latin1'))) {
    throw new RequestError(422, 'The file is not a valid PDF.');
  }

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

  try {
    const pdf = await task.promise;
    return await read(pdf);
  } catch (error) {
    if (error instanceof RequestError) throw error;
    const message = error.name === 'PasswordException'
      ? 'This PDF is password-protected and cannot be read.'
      : 'This PDF could not be read. Try opening it in a PDF viewer and saving a new copy.';
    throw new RequestError(422, message);
  } finally {
    await task.destroy();
  }
}

async function validatePdf(bytes) {
  await readPdfDocument(bytes, pdf => pdf.getPage(pdf.numPages));
}

async function extractPdf(bytes) {
  return readPdfDocument(bytes, async pdf => {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const { items } = await page.getTextContent();
      const text = items.map(item => item.str + (item.hasEOL ? '\n' : '')).join('').trim();
      pages.push({ pageNumber, text });
      page.cleanup();
    }
    if (!pages.some(page => page.text)) {
      throw new RequestError(422, 'This PDF has no selectable text.');
    }
    return pages;
  });
}

pdfRouter.post('/', (request, response, next) => {
  if (getUploadMime(request) !== 'application/pdf') return next(new RequestError(415, 'Choose a PDF.'));
  readDocument(request, response, next);
}, async (request, response) => {
  uploadName(request, false);
  response.json({ pages: await extractPdf(request.body) });
});

pdfRouter.use(uploadErrors('extract'));

module.exports = { pdfRouter, validatePdf, extractPdf };
