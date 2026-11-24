import jwt from 'jsonwebtoken';
import { config, DEMO_USERS } from '../../config.js';

export function login(username, password) {
  const found = DEMO_USERS.find((u) => u.username === String(username).toLowerCase());
  if (!found || found.password !== password) return null;
  const user = { id: found.id, username: found.username, name: found.name };
  return { token: jwt.sign(user, config.jwtSecret, { expiresIn: '12h' }), user };
}
