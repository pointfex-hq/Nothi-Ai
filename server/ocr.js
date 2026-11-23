const express = require('express');
const sharp = require('sharp');
const { createWorker, OEM } = require('tesseract.js');
const { langPath } = require('@tesseract.js-data/eng');
const RequestError = require('./request-error');

const ocrRouter = express.Router();
const readPhoto = express.raw({ type: ['image/jpeg', 'image/png'], limit: '5mb', inflate: false });
const invalidPhoto = 'This image could not be read. Choose a valid JPG, JPEG, or PNG photo.';

async function extractPhoto(bytes) {
  let image;
  try {
    const photo = sharp(bytes);
    const { format, pages } = await photo.metadata();
    if (!['jpeg', 'png'].includes(format) || pages > 1) {
      throw new Error('Unsupported photo format.');
    }

    image = await photo.autoOrient()
      .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  } catch {
    throw new RequestError(422, invalidPhoto);
  }

  let worker;
  let text;
  try {
    worker = await createWorker('eng', OEM.LSTM_ONLY, {
      langPath,
      cacheMethod: 'none',
      // Tesseract already rejects failed jobs. Suppress its additional global throw.
      errorHandler: () => {},
    });
    const { data } = await worker.recognize(image);
    text = data.text.trim();
  } catch {
    throw new RequestError(500, 'The OCR service could not read this photo. Try again.');
  } finally {
    await worker?.terminate();
  }

  if (!/[\p{L}\p{N}]/u.test(text)) {
    throw new RequestError(422, 'No readable text was found in this photo. Try a clearer photo.');
  }
  return text;
}

ocrRouter.post('/', readPhoto, async (request, response) => {
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    throw new RequestError(400, 'Choose one JPG, JPEG, or PNG photo.');
  }
  response.json({ text: await extractPhoto(request.body) });
});

ocrRouter.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'The photo must be 5 MB or smaller.' });
  }
  const message = error instanceof RequestError ? error.message : 'The photo upload could not be processed.';
  response.status(error.status || 500).json({ error: message });
});

module.exports = { ocrRouter, extractPhoto };
