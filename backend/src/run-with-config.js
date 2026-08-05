import { spawn } from 'node:child_process';
import { loadConfig } from './config.js';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node src/run-with-config.js <command> [args...]');
  process.exit(2);
}

await loadConfig();
const child = spawn(command, args, { env: process.env, stdio: 'inherit', shell: false });
child.on('error', (error) => {
  console.error(`Unable to start ${command}: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
