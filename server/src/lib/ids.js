import { randomUUID } from 'node:crypto';
import { badRequest } from './httpError.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const USER_ID = /^u_[a-z0-9_]{1,32}$/;

export const newId = () => randomUUID();

// Ids end up in file paths, so we check them first. This stops "../" tricks.
export function assertUuid(id) {
  if (typeof id !== 'string' || !UUID.test(id)) throw badRequest('Invalid id');
  return id;
}
export function assertUserId(id) {
  if (typeof id !== 'string' || !USER_ID.test(id)) throw badRequest('Invalid user');
  return id;
}
export const isUuid = (id) => typeof id === 'string' && UUID.test(id);
