import { Router } from 'express';
import fs from 'node:fs/promises';
import { HttpError, notFound } from '../../lib/httpError.js';
import { cleanName } from '../../lib/text.js';
import { buildPdf } from '../../pdf/exportPdf.js';
import { getTemplate } from '../templates/templates.store.js';
import { sanitizeState } from './documentState.js';
import * as store from './documents.store.js';

export const documentRoutes = Router();

// Load the document for every route with :id. We only look in the logged-in user's folder,
// so someone else's document id just gives a 404.
documentRoutes.param('id', async (req, _res, next, id) => {
  req.doc = await store.getDocumentMeta(req.user.id, id);
  if (!req.doc) throw notFound('Document not found');
  next();
});

// The version asked for with ?version=N, or the latest one
async function loadVersion(req) {
  const number = req.query.version ? Number(req.query.version) : req.doc.latestVersion;
  const record = await store.readVersion(req.user.id, req.doc.id, number);
  if (!record) throw notFound('Version not found');
  return record;
}

// List my documents
documentRoutes.get('/', async (req, res) => res.json(await store.listDocuments(req.user.id)));

// Start a new document from a template
documentRoutes.post('/', async (req, res) => {
  const { templateId, templateScope, title } = req.body ?? {};
  const template = await getTemplate(req.user.id, templateScope, templateId);
  if (!template) throw notFound('Template not found');
  const doc = await store.createDocument(req.user.id, {
    templateId: template.meta.id,
    templateScope: template.meta.scope,
    title: cleanName(title, template.meta.name),
  });
  res.status(201).json(doc);
});

// Open a document (latest version, or ?version=N)
documentRoutes.get('/:id', async (req, res) => {
  const record = await loadVersion(req);
  res.json({ meta: req.doc, version: record.version, state: record.state });
});

// Save a draft. This always creates a new version.
documentRoutes.put('/:id', async (req, res) => {
  const { state, baseVersion } = req.body ?? {};
  const updated = await store.saveVersion(req.user.id, req.doc.id, {
    state: sanitizeState(state),
    baseVersion: Number.isInteger(baseVersion) ? baseVersion : undefined,
  });
  res.json(updated);
});

documentRoutes.get('/:id/versions', async (req, res) => res.json(await store.listVersions(req.user.id, req.doc.id)));

documentRoutes.delete('/:id', async (req, res) => {
  await store.deleteDocument(req.user.id, req.doc.id);
  res.status(204).end();
});

// Download the final, flattened PDF (latest version, or ?version=N)
documentRoutes.get('/:id/export', async (req, res) => {
  const record = await loadVersion(req);
  const template = await getTemplate(req.user.id, req.doc.templateScope, req.doc.templateId);
  if (!template) throw new HttpError(404, 'Template no longer available');
  const pdf = await buildPdf(await fs.readFile(template.pdfPath), record.state);
  const filename = req.doc.title.replace(/[^\w\-. ]+/g, '_') || 'logbook';
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    'X-Content-Type-Options': 'nosniff',
  }).send(pdf);
});
