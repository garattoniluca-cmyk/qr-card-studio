// Generazione del QR al volo: mai salvato su disco né nel database.
import QRCode from 'qrcode';

export const QR_DEFAULT_SIZE = 512;
const OPTS = { errorCorrectionLevel: 'M', margin: 4 };

export function clampSize(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return QR_DEFAULT_SIZE;
  return Math.min(2048, Math.max(64, n));
}

export function qrPng(text, size) {
  return QRCode.toBuffer(text, { ...OPTS, type: 'png', width: size });
}

export function qrSvg(text, size) {
  return QRCode.toString(text, { ...OPTS, type: 'svg', width: size });
}
