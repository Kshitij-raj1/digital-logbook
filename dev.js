// Starts the API server and the web app together:  npm run dev
import { spawn } from 'node:child_process';

for (const script of ['server', 'client']) {
  const child = spawn('npm', ['--prefix', script, 'run', 'dev'], { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', () => process.exit());
}
