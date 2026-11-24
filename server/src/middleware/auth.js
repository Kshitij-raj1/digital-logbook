import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../lib/httpError.js';

// Checks the "Authorization: Bearer <token>" header and sets req.user.
// The rest of the code only uses req.user.id, so real SSO can replace this later without other changes.
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentication required');
  try {
    const { id, username, name } = jwt.verify(token, config.jwtSecret);
    req.user = { id, username, name };
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}
