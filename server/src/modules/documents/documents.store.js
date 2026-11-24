import fs from 'node:fs/promises';
import path from 'node:path';
import { newId, isUuid } from '../../lib/ids.js';
import { HttpError, badRequest } from '../../lib/httpError.js';
import { listDir, readJson, withLock, writeJson } from '../../lib/files.js';
import { documentDir, metaFile, userDocumentsDir, versionFile } from '../../lib/paths.js';
import { emptyState } from './documentState.js';

export async function createDocument(userId, { title, templateId, templateScope }) {
  const id = newId();
  const now = new Date().toISOString();
  const meta = { id, title, templateId, templateScope, latestVersion: 1, createdAt: now, updatedAt: now };
  await writeJson(versionFile(userId, id, 1), { version: 1, savedAt: now, state: emptyState() });
  await writeJson(metaFile(userId, id), meta);
  return meta;
}

export const getDocumentMeta = (userId, docId) => readJson(metaFile(userId, docId));

export async function listDocuments(userId) {
  const dir = userDocumentsDir(userId);
  const metas = await Promise.all(
    (await listDir(dir)).filter(isUuid).map((id) => readJson(path.join(dir, id, 'meta.json'))),
  );
  return metas.filter(Boolean).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function readVersion(userId, docId, version) {
  if (!Number.isInteger(version) || version < 1) throw badRequest('Invalid version');
  return readJson(versionFile(userId, docId, version));
}

export async function listVersions(userId, docId) {
  const meta = await getDocumentMeta(userId, docId);
  const versions = [];
  for (let number = meta.latestVersion; number >= 1; number--) {
    const record = await readVersion(userId, docId, number);
    versions.push({ version: number, savedAt: record.savedAt });
  }
  return versions;
}

// Adds a new version. baseVersion is the version the user was editing. If someone saved in between
// (another tab or device) we refuse, instead of overwriting their work.
export function saveVersion(userId, docId, { state, baseVersion }) {
  return withLock(`${userId}/${docId}`, async () => {
    const meta = await getDocumentMeta(userId, docId);
    if (baseVersion !== undefined && baseVersion !== meta.latestVersion) {
      throw new HttpError(409, 'Document was changed elsewhere. Reload to get the latest version.');
    }
    const version = meta.latestVersion + 1;
    const now = new Date().toISOString();
    await writeJson(versionFile(userId, docId, version), { version, savedAt: now, state });
    const updated = { ...meta, latestVersion: version, updatedAt: now };
    await writeJson(metaFile(userId, docId), updated);
    return updated;
  });
}

export const deleteDocument = (userId, docId) => fs.rm(documentDir(userId, docId), { recursive: true, force: true });
