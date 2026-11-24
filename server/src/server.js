// Entry point:  node src/server.js
import { config } from './config.js';
import { ensureDataDirs } from './lib/paths.js';
import { createApp } from './app.js';

await ensureDataDirs();

const server = createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}  (data: ${config.dataDir})`);
  console.log('Logins: kshitij / pass123  or  alice / pass123');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other program using it, or start with PORT=4001 (and update client/vite.config.js).`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
