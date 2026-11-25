const { spawn } = require('node:child_process');

const services = [
  {
    name: 'backend',
    args: ['index.js'],
    cwd: '/app/backend',
    env: { HOST: '0.0.0.0', PORT: '3001' },
  },
  {
    name: 'frontend',
    args: ['server.js'],
    cwd: '/app/frontend',
    env: { HOSTNAME: '0.0.0.0', PORT: '3000' },
  },
];

let stopping = false;
const children = services.map(service => {
  const child = spawn(process.execPath, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...service.env },
    stdio: 'inherit',
  });

  child.on('error', error => {
    console.error(`${service.name} failed to start:`, error);
    process.exitCode = 1;
    stop();
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${service.name} exited (${signal || code}). Stopping the application.`);
    process.exitCode = code || 1;
    stop();
  });

  return child;
});

function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
