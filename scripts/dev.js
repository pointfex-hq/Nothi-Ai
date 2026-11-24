const { spawn } = require('node:child_process');

console.log('\x1b[32m%s\x1b[0m', '==> Starting Nothi AI Monorepo (Frontend: 3000 | Backend: 3001)...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Spawn backend process
const backendProcess = spawn(npmCmd, ['--prefix', 'backend', 'run', 'dev'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: process.env.PORT || '3001' },
});

// Spawn frontend process
const frontendProcess = spawn(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: '3000' },
});

function prefixLog(prefix, colorCode, data) {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line}`);
    }
  }
}

backendProcess.stdout?.on('data', (data) => prefixLog('backend', '36', data));
backendProcess.stderr?.on('data', (data) => prefixLog('backend', '31', data));

frontendProcess.stdout?.on('data', (data) => prefixLog('frontend', '35', data));
frontendProcess.stderr?.on('data', (data) => prefixLog('frontend', '31', data));

function cleanup() {
  console.log('\nShutting down Nothi AI monorepo processes...');
  backendProcess.kill('SIGTERM');
  frontendProcess.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
