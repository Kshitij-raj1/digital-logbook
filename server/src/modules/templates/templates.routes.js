import { Router } from 'express';
import fs from 'node:fs/promises';
import { HttpError, badRequest, notFound } from '../../lib/httpError.js';
import { cleanName } from '../../lib/text.js';
import { uploadPdf } from '../../middleware/upload.js';
import { validatePdf } from '../../pdf/validatePdf.js';
import { listDocuments } from '../documents/documents.store.js';
import * as store from './templates.store.js';

export const templateRoutes = Router();

templateRoutes.get('/', async (req, res) => res.json(await store.listTemplates(req.user.id)));

templateRoutes.post('/', uploadPdf, async (req, res) => {
  if (!req.file) throw badRequest('Attach a PDF in the "file" field');
  const { pages } = await validatePdf(req.file.buffer);
  const meta = await store.saveTemplate({
    scope: 'mine',
    userId: req.user.id,
    name: cleanName(req.body?.name || req.file.originalname, 'Template'),
    pdfBytes: req.file.buffer,
    pages,
  });
  res.status(201).json(meta);
});

// Anyone logged in can read shared templates. "mine" is only found in the user's own folder.
templateRoutes.get('/:scope/:id/file', async (req, res) => {
  const template = await store.getTemplate(req.user.id, req.params.scope, req.params.id);
  if (!template) throw notFound('Template not found');
  res.type('application/pdf').set('X-Content-Type-Options', 'nosniff').send(await fs.readFile(template.pdfPath));
});

templateRoutes.delete('/:id', async (req, res) => {
  const template = await store.getTemplate(req.user.id, 'mine', req.params.id);
  if (!template) throw notFound('Template not found');
  const inUse = (await listDocuments(req.user.id)).some((d) => d.templateId === template.meta.id);
  if (inUse) throw new HttpError(409, 'Template is used by one or more documents');
  await store.deleteTemplate(req.user.id, template.meta.id);
  res.status(204).end();
});
