/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptPath = path.join(__dirname, 'setup_x_feed.py');
if (!fs.existsSync(scriptPath)) {
  console.error(`Error: Python setup script not found at ${scriptPath}`);
  process.exit(1);
}

const pyProc = spawn('python3', [scriptPath], {
  stdio: 'inherit',
});

pyProc.on('close', (code) => {
  process.exit(code || 0);
});
