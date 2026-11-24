import { Router } from 'express';
import { HttpError } from '../../lib/httpError.js';
import { requireAuth } from '../../middleware/auth.js';
import { login } from './auth.service.js';

export const authRoutes = Router();

authRoutes.post('/login', (req, res) => {
  const result = login(req.body?.username ?? '', req.body?.password ?? '');
  if (!result) throw new HttpError(401, 'Invalid username or password');
  res.json(result);
});

authRoutes.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
