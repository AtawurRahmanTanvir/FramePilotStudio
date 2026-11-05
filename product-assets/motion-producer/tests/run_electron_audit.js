const { spawn } = require('child_process');
const path = require('path');

const electronBin = require('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

console.log('Launching electron visual audit at:', electronBin);
const child = spawn(electronBin, ['--no-sandbox', '--disable-gpu', 'tools/visual_audit_full.js'], {
  env,
  stdio: 'inherit'
});
child.on('close', code => {
  console.log('CHILD_CLOSED_WITH:', code);
  process.exit(code || 0);
});
