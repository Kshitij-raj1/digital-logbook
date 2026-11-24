import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { templateRoutes } from './modules/templates/templates.routes.js';
import { documentRoutes } from './modules/documents/documents.routes.js';

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '8mb' })); // a draft with lots of pen strokes can be a few MB

  // login (no token needed), with a limit on attempts
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 50 }));
  app.use('/api/auth', authRoutes);

  // everything else needs a valid token
  app.use('/api/templates', requireAuth, templateRoutes);
  app.use('/api/documents', requireAuth, documentRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // in production, serve the built React app from this same server
  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
