// Helpers for reading and writing files.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

// Write to a temp file first and then rename it, so a crash can't leave a half-written file.
export async function writeAtomic(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file);
}

export const writeJson = (file, value) => writeAtomic(file, JSON.stringify(value, null, 2));

export async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function listDir(dir) {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Runs tasks with the same key one after another, so two saves at the same time can't get the same version number.
const locks = new Map();
export function withLock(key, task) {
  const next = (locks.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
  locks.set(key, next);
  next.finally(() => locks.get(key) === next && locks.delete(key)).catch(() => {});
  return next;
}
