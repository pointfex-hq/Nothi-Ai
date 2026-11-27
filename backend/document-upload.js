const express = require('express');
const { extname, win32 } = require('node:path');
const sharp = require('sharp');
const { recordAuditLog } = require('./auth-store');
const RequestError = require('./request-error');

const formatsByMime = {
  'image/jpeg': { format: 'jpeg', extensions: ['.jpg', '.jpeg'] },
  'image/png': { format: 'png', extensions: ['.png'] },
  'image/webp': { format: 'webp', extensions: ['.webp'] },
};
const imageLimit = 5 * 1024 * 1024;
const pdfMime = 'application/pdf';
const imageTypes = 'Choose a JPG, JPEG, PNG, or WebP image.';
const documentTypes = 'Choose a PDF, JPG, JPEG, PNG, or WebP file.';
const parseUploadBody = express.raw({ type: [pdfMime, ...Object.keys(formatsByMime)], limit: imageLimit, inflate: false });

function getUploadMime(request) {
  return (request.get('Content-Type') || '').split(';', 1)[0].trim().toLowerCase();
}

function readImage(request, response, next) {
  if (!Object.hasOwn(formatsByMime, getUploadMime(request))) return next(new RequestError(415, imageTypes));
  parseUploadBody(request, response, next);
}

function readDocument(request, response, next) {
  const mimeType = getUploadMime(request);
  if (mimeType !== pdfMime && !Object.hasOwn(formatsByMime, mimeType)) {
    return next(new RequestError(415, documentTypes));
  }
  parseUploadBody(request, response, next);
}

function uploadName(request, required = true) {
  const header = request.get('X-File-Name');
  if (header === undefined && !required) return undefined;
  let name;
  try {
    name = win32.basename(decodeURIComponent(header ?? '')).trim();
  } catch {
    throw new RequestError(400, 'Choose a file with a valid name.');
  }
  if (!name || name.length > 255 || /[\x00-\x1f\x7f]/u.test(name)) {
    throw new RequestError(400, 'Choose a file with a valid name.');
  }
  if (!validDocumentExtension(name, getUploadMime(request))) throw new RequestError(415, documentTypes);
  return name;
}

function validDocumentExtension(name, mimeType) {
  if (mimeType === pdfMime) return typeof name === 'string' && extname(name).toLowerCase() === '.pdf';
  return typeof name === 'string' && Object.hasOwn(formatsByMime, mimeType) &&
    formatsByMime[mimeType].extensions.includes(extname(name).toLowerCase());
}

async function prepareImage(bytes, mimeType) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new RequestError(400, imageTypes);
  if (bytes.length > imageLimit) throw new RequestError(413, 'The image must be 5 MB or smaller.');
  if (!Object.hasOwn(formatsByMime, mimeType)) throw new RequestError(415, imageTypes);

  try {
    const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== formatsByMime[mimeType].format || (metadata.pages ?? 1) !== 1) {
      throw new Error('Image format mismatch or multiple frames.');
    }
    return await image.autoOrient()
      .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  } catch {
    throw new RequestError(422, 'The image is invalid or does not match its declared format. Choose a valid JPG, JPEG, PNG, or WebP image.');
  }
}

function logRejectedUpload(response, route, status) {
  const user = response.locals.user;
  if (!user || status < 400 || status >= 500) return;
  recordAuditLog({
    action: 'UPLOAD_REJECTED', targetId: user.id,
    details: JSON.stringify({ username: user.username, route, status }),
  });
}

function uploadErrors(route) {
  return (error, _request, response, next) => {
    if (response.headersSent) return next(error);
    const status = error.status || 500;
    logRejectedUpload(response, route, status);
    if (status === 413) return response.status(413).json({ error: 'The file must be 5 MB or smaller.' });
    const message = error instanceof RequestError ? error.message : 'The file upload could not be processed.';
    response.status(status).json({ error: message });
  };
}

module.exports = {
  getUploadMime, readImage, readDocument, uploadName, imageLimit, documentTypes, validDocumentExtension,
  prepareImage, logRejectedUpload, uploadErrors,
};
