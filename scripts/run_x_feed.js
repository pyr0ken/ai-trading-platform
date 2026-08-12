#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const engineDir = path.join(__dirname, 'x_feed_engine');

let pythonExe;
if (process.platform === 'win32') {
    pythonExe = path.join(engineDir, '.venv', 'Scripts', 'python.exe');
} else {
    pythonExe = path.join(engineDir, '.venv', 'bin', 'python');
}

const mainPy = path.join(engineDir, 'main.py');

if (!fs.existsSync(pythonExe)) {
    console.error('❌ Python virtual environment not found at:', pythonExe);
    console.error('   Please run "npm run x:setup" first to install the scraper.');
    process.exit(1);
}

if (!fs.existsSync(mainPy)) {
    console.error('❌ Main Python script not found at:', mainPy);
    process.exit(1);
}

const args = [
    'main.py',
    '--non-interactive',
    '--auth-mode', 'existing',
    '--export-age-hours', '48',
    '--reset',
];

console.log('🚀 Starting X Feed Engine (live logs below)…\n');
console.log(`   Working dir: ${engineDir}`);
console.log(`   Command: ${pythonExe} ${args.join(' ')}\n`);

const child = spawn(pythonExe, args, {
    cwd: engineDir,
    stdio: 'inherit',
});

child.on('error', (err) => {
    console.error('❌ Failed to start Python script:', err.message);
    process.exit(1);
});

child.on('exit', (code) => {
    console.log('\n' + '='.repeat(50));
    if (code === 0) {
        console.log('✅ X Feed Engine finished successfully.');
        console.log('   Output JSON: scripts/x_feed_engine/data/tweets_ai_feed.json');
    } else {
        console.log(`⚠️ X Feed Engine exited with code ${code}.`);
    }
    process.exit(code || 0);
});
