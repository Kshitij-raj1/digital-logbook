import fs from 'node:fs/promises';
import path from 'node:path';
import { newId, assertUuid } from '../../lib/ids.js';
import { badRequest } from '../../lib/httpError.js';
import { listDir, readJson, writeAtomic, writeJson } from '../../lib/files.js';
import { sharedTemplatesDir, userTemplatesDir } from '../../lib/paths.js';

// scope is "shared" (from the college) or "mine" (uploaded by this user).
function dirFor(scope, userId) {
  if (scope === 'shared') return sharedTemplatesDir();
  if (scope === 'mine') return userTemplatesDir(userId);
  throw badRequest('Invalid scope');
}

export async function saveTemplate({ scope, userId, name, pdfBytes, pages }) {
  const id = newId();
  const dir = dirFor(scope, userId);
  const meta = { id, name, scope, pages, size: pdfBytes.length, createdAt: new Date().toISOString() };
  await writeAtomic(path.join(dir, `${id}.pdf`), pdfBytes);
  await writeJson(path.join(dir, `${id}.json`), meta);
  return meta;
}

async function listScope(scope, userId) {
  const dir = dirFor(scope, userId);
  const metas = await Promise.all(
    (await listDir(dir)).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(dir, f))),
  );
  return metas.filter(Boolean).map((m) => ({ ...m, scope }));
}

export async function listTemplates(userId) {
  const all = [...(await listScope('shared', userId)), ...(await listScope('mine', userId))];
  return all.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Returns { meta, pdfPath }, or null if it doesn't exist. "mine" is only looked up in the user's own folder.
export async function getTemplate(userId, scope, id) {
  const dir = dirFor(scope, userId);
  assertUuid(id);
  const meta = await readJson(path.join(dir, `${id}.json`));
  return meta ? { meta: { ...meta, scope }, pdfPath: path.join(dir, `${id}.pdf`) } : null;
}

export async function deleteTemplate(userId, id) {
  const dir = dirFor('mine', userId);
  assertUuid(id);
  await Promise.all([
    fs.rm(path.join(dir, `${id}.pdf`), { force: true }),
    fs.rm(path.join(dir, `${id}.json`), { force: true }),
  ]);
}
