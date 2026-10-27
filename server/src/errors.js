// Errori applicativi nel formato { error: { code, message } }.
import multer from 'multer';

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendError(res, status, code, message, details) {
  const body = { error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

export function notFoundApi(req, res) {
  sendError(res, 404, 'NOT_FOUND', 'Risorsa non trovata');
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return sendError(res, err.status, err.code, err.message, err.details);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return sendError(res, 413, 'FILE_TOO_LARGE', 'Il file supera il limite consentito');
    return sendError(res, 400, 'UPLOAD_ERROR', 'Caricamento non valido');
  }
  if (err?.type === 'entity.parse.failed') return sendError(res, 400, 'INVALID_JSON', 'JSON non valido');
  if (err?.type === 'entity.too.large') return sendError(res, 413, 'BODY_TOO_LARGE', 'Richiesta troppo grande');
  console.error('[errore]', err?.message || err);
  return sendError(res, 500, 'INTERNAL', 'Errore interno del server');
}

/** Avvolge un handler async per inoltrare gli errori al gestore centrale. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
