// This file is the only place that knows where things are stored on disk:
//
//   data/
//     shared-templates/<id>.pdf + <id>.json         templates from the college
//     users/<userId>/templates/<id>.pdf + .json     templates the user uploaded
//     users/<userId>/documents/<docId>/
//         meta.json                                 title, template, latest version
//         versions/v1.json, v2.json, ...            one file per saved version
import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../config.js';
import { assertUserId, assertUuid } from './ids.js';

const root = () => config.dataDir;

export const sharedTemplatesDir = () => path.join(root(), 'shared-templates');
const userDir = (userId) => path.join(root(), 'users', assertUserId(userId));

export const userTemplatesDir = (userId) => path.join(userDir(userId), 'templates');
export const userDocumentsDir = (userId) => path.join(userDir(userId), 'documents');
export const documentDir = (userId, docId) => path.join(userDocumentsDir(userId), assertUuid(docId));
export const versionFile = (userId, docId, version) => path.join(documentDir(userId, docId), 'versions', `v${version}.json`);
export const metaFile = (userId, docId) => path.join(documentDir(userId, docId), 'meta.json');

export async function ensureDataDirs() {
  await fs.mkdir(sharedTemplatesDir(), { recursive: true });
  await fs.mkdir(path.join(root(), 'users'), { recursive: true });
}
