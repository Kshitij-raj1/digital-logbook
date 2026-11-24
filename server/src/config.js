// App settings. Each one can be overridden with an environment variable.
import path from 'node:path';

const serverRoot = path.resolve(import.meta.dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',

  // Folder where everything is saved (templates, documents, versions)
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(serverRoot, 'data')),
  // The built React app, served by Express in production
  clientDist: path.resolve(serverRoot, '..', 'client', 'dist'),

  maxPdfBytes: 15 * 1024 * 1024,
  maxPages: 200,
};

// Users for the login stub. The second user exists so we can test that one student can't see another's files. A real app would use college SSO or a users table.
export const DEMO_USERS = [
  { id: 'u_kshitij', username: 'kshitij', name: 'Kshitij Raj', password: 'pass123' },
  { id: 'u_alice', username: 'alice', name: 'Alice Student', password: 'pass123' },
];
