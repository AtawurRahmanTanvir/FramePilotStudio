#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const required = [
  'package.json',
  'src/renderer/index.html',
  'src/main/main.js',
  'src/preload/preload.js',
  'src/renderer/motion-studio/motion-studio.js',
  'src/renderer/motion-studio/motion-studio.css',
  'src/main/motion-service.js',
  'backend/motion/bridge.py',
  'backend/motion/word_timing_engine.py',
  'backend/motion/project_import.py',
  'motion-studio/prompts/MOTION_MASTER_PROMPT.md',
  'motion-studio/prompts/COPILOT_START_PROMPT.md',
];

function fail(message) {
  throw new Error(message);
}
function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}
function write(relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}
function replaceExactlyOnce(text, oldValue, newValue, label) {
  const first = text.indexOf(oldValue);
  if (first < 0 || text.indexOf(oldValue, first + oldValue.length) >= 0) {
    fail(`Cannot safely patch ${label}: expected one known source anchor. No project files have been changed.`);
  }
  return text.slice(0, first) + newValue + text.slice(first + oldValue.length);
}
function normalizeLines(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return { text: text.replace(/\r\n/g, '\n'), eol };
}
function restoreLines(text, eol) {
  return eol === '\n' ? text : text.replace(/\n/g, eol);
}

for (const relative of required) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) fail(`Required overlay file is missing: ${relative}. Extract the complete ZIP into the FramePilotStudio project root first.`);
}

const packageText = read('package.json');
let pkg;
try { pkg = JSON.parse(packageText); } catch (error) { fail(`package.json is not valid JSON: ${error.message}`); }
if (pkg.name !== 'framepilot-studio') fail(`This overlay targets FramePilot Studio. Found package name '${pkg.name}'.`);
const versionParts = String(pkg.version || '0.0.0').split('.').map(Number);
if (versionParts.length < 2 || versionParts[0] === 0 && versionParts[1] < 1) fail(`FramePilot Studio v${pkg.version} is older than the supported 0.1.x source.`);

const updates = new Map();

// 1. Renderer HTML: add only the Motion style and entry script.
{
  const original = read('src/renderer/index.html');
  const { text: source, eol } = normalizeLines(original);
  let result = source;
  const oldCsp = `  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none';" />`;
  const newCsp = `  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self' data:; media-src 'self' framepilot:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none';" />`;
  if (!result.includes("media-src 'self' framepilot:")) result = replaceExactlyOnce(result, oldCsp, newCsp, 'Motion preview media policy');
  const styleTag = '<link rel="stylesheet" href="./motion-studio/motion-studio.css" />';
  const scriptTag = '<script src="./motion-studio/motion-studio.js"></script>';
  if (!result.includes(styleTag)) result = replaceExactlyOnce(result, '</head>', `  ${styleTag}\n</head>`, 'Motion stylesheet insertion');
  if (!result.includes(scriptTag)) result = replaceExactlyOnce(result, '<script src="./app.js"></script>', `<script src="./app.js"></script>\n${scriptTag}`, 'Motion script insertion');
  updates.set('src/renderer/index.html', restoreLines(result, eol));
}

// 2. Main process: isolated Motion IPC service and safe local output-media protocol.
{
  const original = read('src/main/main.js');
  const { text: source, eol } = normalizeLines(original);
  let result = source;
  const requireLine = "const { registerMotionService } = require('./motion-service');";
  if (!result.includes(requireLine)) {
    const anchor = "const updateService = require('./update-service');";
    result = replaceExactlyOnce(result, anchor, `${anchor}\n${requireLine}`, 'Motion service import');
  }
  const oldProtocol = [
    "      if (requested.hostname !== 'app') return new Response('Not found', { status: 404 });",
    "      const relative = decodeURIComponent(requested.pathname).replace(/^\\/+/, '');",
    '      const filePath = path.resolve(rendererRoot, relative);',
    "      if (filePath !== rendererRoot && !filePath.startsWith(rendererRoot + path.sep)) return new Response('Forbidden', { status: 403 });",
  ].join('\n');
  const newProtocol = [
    "      const isApplicationAsset = requested.hostname === 'app';",
    "      const isMotionOutput = requested.hostname === 'motion-output';",
    "      if (!isApplicationAsset && !isMotionOutput) return new Response('Not found', { status: 404 });",
    "      const relative = decodeURIComponent(requested.pathname).replace(/^\\/+/, '');",
    '      const contentRoot = isApplicationAsset',
    '        ? rendererRoot',
    "        : path.join(app.getPath('documents'), 'FramePilot Studio', 'Motion Projects');",
    '      const filePath = path.resolve(contentRoot, relative);',
    "      if (filePath !== contentRoot && !filePath.startsWith(contentRoot + path.sep)) return new Response('Forbidden', { status: 403 });",
  ].join('\n');
  if (!result.includes("const isMotionOutput = requested.hostname === 'motion-output';")) {
    result = replaceExactlyOnce(result, oldProtocol, newProtocol, 'Motion output URL path boundary');
  }
  const registerLine = '  registerMotionService({ handle, app, dialog, shell, clipboard, appRoot, isDev, getMainWindow: () => mainWindow });';
  if (!result.includes(registerLine)) {
    const anchor = [
      '  createWindow();',
      "  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });",
    ].join('\n');
    result = replaceExactlyOnce(result, anchor, `${registerLine}\n${anchor}`, 'Motion IPC registration');
  }
  updates.set('src/main/main.js', restoreLines(result, eol));
}

// 3. Preload: expose a narrow allow-list of Motion-specific IPC methods only.
{
  const original = read('src/preload/preload.js');
  const { text: source, eol } = normalizeLines(original);
  let result = source;
  if (!result.includes('motionSelectScript:')) {
    const anchor = "  installUpdate: () => ipcRenderer.invoke('updates:install'),";
    const api = [
      '  motionSelectScript: () => ipcRenderer.invoke(\'motion:select-script\'),',
      '  motionSelectAudio: () => ipcRenderer.invoke(\'motion:select-audio\'),',
      '  motionSelectProjectZip: () => ipcRenderer.invoke(\'motion:select-project-zip\'),',
      '  motionSelectOutputFolder: () => ipcRenderer.invoke(\'motion:select-output-folder\'),',
      '  motionReadPrompt: key => ipcRenderer.invoke(\'motion:read-prompt\', key),',
      '  motionCopyText: text => ipcRenderer.invoke(\'motion:copy-text\', text),',
      '  motionCopyPath: file => ipcRenderer.invoke(\'motion:copy-path\', file),',
      '  motionReadOutputPreview: file => ipcRenderer.invoke(\'motion:read-output-preview\', file),',
      '  motionSavePrompt: key => ipcRenderer.invoke(\'motion:save-prompt\', key),',
      '  motionOpenClaude: () => ipcRenderer.invoke(\'motion:open-claude\'),',
      '  motionReadScriptPreview: file => ipcRenderer.invoke(\'motion:read-script-preview\', file),',
      '  motionGetRuntimeInfo: () => ipcRenderer.invoke(\'motion:runtime-info\'),',
      '  motionGenerateWordTiming: input => ipcRenderer.invoke(\'motion:generate-word-timing\', input),',
      '  motionInspectProject: zip => ipcRenderer.invoke(\'motion:inspect-project\', zip),',
      '  motionImportProject: zip => ipcRenderer.invoke(\'motion:import-project\', zip),',
      '  motionListProjects: () => ipcRenderer.invoke(\'motion:list-projects\'),',
      '  motionOpenProjectFolder: folder => ipcRenderer.invoke(\'motion:open-project-folder\', folder),',
      '  motionShowInFolder: file => ipcRenderer.invoke(\'motion:show-in-folder\', file),',
      '  motionResolveOutputUrl: file => ipcRenderer.invoke(\'motion:resolve-output-url\', file),',
      '  motionStartRender: input => ipcRenderer.invoke(\'motion:start-render\', input),',
      '  motionCancelJob: () => ipcRenderer.invoke(\'motion:cancel-job\'),',
      '  onMotionJobEvent: callback => {',
      "    const listener = (_e, data) => callback(data);",
      "    ipcRenderer.on('motion:job-event', listener);",
      "    return () => ipcRenderer.removeListener('motion:job-event', listener);",
      '  },',
      '  onMotionJobLog: callback => {',
      "    const listener = (_e, data) => callback(data);",
      "    ipcRenderer.on('motion:job-log', listener);",
      "    return () => ipcRenderer.removeListener('motion:job-log', listener);",
      '  },',
    ].join('\n');
    result = replaceExactlyOnce(result, anchor, `${anchor}\n${api}`, 'Motion preload API');
  }
  updates.set('src/preload/preload.js', restoreLines(result, eol));
}

// 4. Preserve every existing electron-builder resource and append only missing Motion resources.
{
  const original = read('package.json');
  const build = pkg.build;
  if (!build || typeof build !== 'object') fail('package.json build configuration is missing.');
  const resources = Array.isArray(build.extraResources) ? [...build.extraResources] : [];
  const additions = [
    { from: 'backend/motion', to: 'backend/motion', filter: ['**/*'] },
    { from: 'motion-studio/prompts', to: 'motion-studio/prompts', filter: ['**/*'] },
    { from: 'runtime/motion', to: 'runtime/motion', filter: ['**/*'] },
  ];
  for (const item of additions) {
    if (!resources.some((resource) => resource && resource.from === item.from)) resources.push(item);
  }
  build.extraResources = resources;
  updates.set('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

// Drop no-op files so a second run is a true no-op (no duplicate backup or rewrite).
for (const [relative, content] of [...updates.entries()]) {
  if (read(relative) === content) updates.delete(relative);
}
if (updates.size === 0) {
  process.stdout.write('Motion Studio overlay hooks are already installed. No files changed.\n');
  process.exit(0);
}

// Validate prepared output before creating backups or writing anything.
const preparedPreload = updates.get('src/preload/preload.js') || read('src/preload/preload.js');
const preparedMain = updates.get('src/main/main.js') || read('src/main/main.js');
for (const api of ['motionSelectScript:', 'motionGenerateWordTiming:', 'motionStartRender:', 'onMotionJobEvent:']) {
  if (!preparedPreload.includes(api)) fail(`Preload verification failed: ${api}`);
}
if (!preparedMain.includes("const isMotionOutput = requested.hostname === 'motion-output';")) fail('Motion output protocol hook is missing after patch preparation.');
if (!preparedMain.includes('registerMotionService({ handle, app, dialog, shell, clipboard, appRoot, isDev, getMainWindow: () => mainWindow });')) fail('Motion service registration is missing after patch preparation.');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(root, 'backups', 'motion-studio-overlay', timestamp);
for (const [relative] of updates) {
  const source = path.join(root, relative);
  const backup = path.join(backupRoot, relative);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.copyFileSync(source, backup, fs.constants.COPYFILE_EXCL);
}

const stageRoot = path.join(root, `.motion-overlay-stage-${timestamp}`);
fs.mkdirSync(stageRoot, { recursive: true });
const applied = [];
try {
  for (const [relative, content] of updates) {
    const staged = path.join(stageRoot, relative);
    fs.mkdirSync(path.dirname(staged), { recursive: true });
    fs.writeFileSync(staged, content, 'utf8');
  }
  for (const [relative] of updates) {
    const staged = path.join(stageRoot, relative);
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(staged, target);
    applied.push(relative);
  }
} catch (error) {
  for (const relative of applied.reverse()) {
    const backup = path.join(backupRoot, relative);
    const target = path.join(root, relative);
    try { fs.copyFileSync(backup, target); } catch { /* preserve the backup for manual recovery */ }
  }
  fail(`Overlay write failed. Previously changed files were restored where possible; backups remain at ${path.relative(root, backupRoot)}. ${error.message}`);
} finally {
  fs.rmSync(stageRoot, { recursive: true, force: true });
}

const report = [
  'FramePilot Studio Motion Studio overlay applied.',
  `Time: ${new Date().toLocaleString()}`,
  `Target version: ${pkg.version}`,
  `Backups: ${path.relative(root, backupRoot)}`,
  `Patched files: ${[...updates.keys()].join(', ')}`,
  'Filmora workflow source files were not directly edited by the overlay patch.',
  'Next: follow motion-studio/COPILOT_FINAL_INTEGRATION_TASK.md. Motion Render remains blocked until the actual runtime and worker isolation are validated.',
  '',
].join('\n');
write('motion-studio/OVERLAY_APPLY_REPORT.txt', report);
process.stdout.write(`${report}\nOverlay apply completed. Open the project in Copilot for the final runtime, security, model and render integration.\n`);
