// Accesso admin: password unica (hash bcrypt in .env) e sessione con cookie httpOnly.
import bcrypt from 'bcrypt';
import session from 'express-session';
import { sendError } from './errors.js';

export const SESSION_COOKIE = 'qrcard.sid';

export function sessionMiddleware(config) {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret || 'sviluppo-non-sicuro',
    resave: false,
    saveUninitialized: false,
    proxy: config.trustProxy,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Con TRUST_PROXY attivo il cookie diventa Secure quando la richiesta arriva via HTTPS.
      secure: config.trustProxy ? 'auto' : false,
      maxAge: 1000 * 60 * 60 * 12,
    },
  });
}

export function requireAuth(req, res, next) {
  if (req.session?.isAdmin) return next();
  return sendError(res, 401, 'UNAUTHORIZED', 'Accesso richiesto');
}

export async function checkPassword(config, password) {
  if (!config.adminPasswordHash || typeof password !== 'string' || !password) return false;
  return bcrypt.compare(password, config.adminPasswordHash);
}
