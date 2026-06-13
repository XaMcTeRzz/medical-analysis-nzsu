const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const inputDir = path.join(__dirname, '../json_inputs');
const scriptFile = path.join(__dirname, 'generateUsers.js');

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

function log(message) {
  console.log(`[watch-json] ${message}`);
}

let timeout = null;

function runGenerator() {
  log('Running user generation from latest JSON...');

  const child = spawn('node', [scriptFile], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    log(`generateUsers.js exited with code ${code}`);
  });
}

function scheduleGeneration() {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(runGenerator, 500);
}

fs.watch(inputDir, { persistent: true }, (eventType, filename) => {
  if (!filename || !filename.toLowerCase().endsWith('.json')) {
    return;
  }

  log(`Detected ${eventType} on ${filename}`);
  scheduleGeneration();
});

log(`Watching JSON folder: ${inputDir}`);
runGenerator();
