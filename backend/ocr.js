const express = require('express');
const { createWorker, OEM } = require('tesseract.js');
const { langPath } = require('@tesseract.js-data/eng');
const RequestError = require('./request-error');

const { readImage, uploadName, getUploadMime, prepareImage, uploadErrors } = require('./document-upload');
const ocrRouter = express.Router();

async function extractPhoto(bytes, mimeType) {
  const image = await prepareImage(bytes, mimeType);
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

ocrRouter.post('/', readImage, async (request, response) => {
  uploadName(request, false);
  response.json({ text: await extractPhoto(request.body, getUploadMime(request)) });
});

ocrRouter.use(uploadErrors('ocr'));

module.exports = { ocrRouter, extractPhoto };
