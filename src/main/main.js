'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, clipboard } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const preferences = require('./preferences');
const updateService = require('./update-service');

let mainWindow;
let activeChild = null;
let stagedUpdate = null;
const isDev = !app.isPackaged;
const appRoot = isDev ? path.resolve(__dirname, '../..') : process.resourcesPath;
const frozenBackend = path.join(appRoot, 'runtime', 'backend', 'FramePilotBackend', process.platform === 'win32' ? 'FramePilotBackend.exe' : 'FramePilotBackend');
const backendRoot = isDev ? path.join(appRoot, 'backend') : path.join(appRoot, 'runtime', 'backend', 'FramePilotBackend');
const backendScript = path.join(backendRoot, 'framepilot', 'bridge.py');
const rendererRoot = path.resolve(__dirname, '../renderer');
const windowIcon = path.join(appRoot, 'branding', 'framepilot-studio.ico');

if (process.platform === 'win32') app.setAppUserModelId('studio.framepilot.desktop');

protocol.registerSchemesAsPrivileged([{ scheme: 'framepilot', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500, height: 960, minWidth: 1120, minHeight: 720,
    backgroundColor: '#090909', show: false,
    title: 'FramePilot Studio',
    icon: fs.existsSync(windowIcon) ? windowIcon : undefined,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0b0b0c', symbolColor: '#d9b66c', height: 38 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL('framepilot://app/index.html');
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://framepilotstudio.github.io/')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('framepilot://app/')) return;
    event.preventDefault();
    if (url.startsWith('https://framepilotstudio.github.io/')) shell.openExternal(url);
  });
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
function handle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
      throw new Error(`Blocked IPC request from an untrusted frame: ${channel}`);
    }
    return handler(event, ...args);
  });
}

function runBackend(args) {
  if (activeChild) throw new Error('A FramePilot processing job is already running. Wait for it to finish or cancel it.');
  let executable, childArgs;
  if (!isDev && fs.existsSync(frozenBackend)) {
    executable = frozenBackend; childArgs = args;
  } else if (isDev) {
    if (!fs.existsSync(backendScript)) throw new Error(`Backend script not found: ${backendScript}`);
    const configuredPython = process.env.FRAMEPILOT_DEV_PYTHON;
    const projectPython = path.join(appRoot, '.venv', 'Scripts', 'python.exe');
    if (configuredPython) { executable = configuredPython; childArgs = [backendScript, ...args]; }
    else if (process.platform === 'win32' && fs.existsSync(projectPython)) { executable = projectPython; childArgs = [backendScript, ...args]; }
    else if (process.platform === 'win32') { executable = 'py'; childArgs = ['-3.12', backendScript, ...args]; }
    else { executable = 'python3'; childArgs = [backendScript, ...args]; }
  } else {
    throw new Error('The private FramePilot processing runtime is missing. Install the complete official application package.');
  }
  const cancelDirectory = path.join(app.getPath('temp'), 'FramePilotStudio');
  fs.mkdirSync(cancelDirectory, { recursive: true });
  const cancelFile = path.join(cancelDirectory, `job-${randomUUID()}.cancel`);
  const child = spawn(executable, childArgs, {
    cwd: backendRoot,
    detached: process.platform !== 'win32',
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1',
      FRAMEPILOT_DEV_MODE: isDev ? '1' : '0',
      FRAMEPILOT_RUNTIME_ROOT: path.join(appRoot, 'runtime'),
      FRAMEPILOT_VENDOR_ROOT: path.join(appRoot, 'vendor'),
      FRAMEPILOT_CANCEL_FILE: cancelFile,
      PYTHONPATH: isDev ? path.join(appRoot, 'vendor', 'whisperx-source') : (process.env.PYTHONPATH || ''),
      PATH: `${path.join(appRoot, 'runtime', 'ffmpeg')}${path.delimiter}${process.env.PATH || ''}`
    }
  });
  child.framePilotCancelRequested = false;
  child.framePilotCancelFile = cancelFile;
  activeChild = child;
  let buffer = '';
  let lastErrorEvent = null;
  let lastResult = null;
  let stderrTail = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.event === 'error') lastErrorEvent = event;
        if (event.event === 'result') lastResult = event;
        send('job:event', event);
      } catch { send('job:log', { level: 'info', message: line }); }
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    stderrTail = (stderrTail + chunk).slice(-12000);
    send('job:log', { level: 'error', message: chunk.trim() });
  });
  return new Promise((resolve, reject) => {
    child.once('error', err => {
      if (activeChild === child) activeChild = null;
      try { fs.unlinkSync(cancelFile); } catch {}
      err.userMessage = `Could not start the FramePilot engine: ${err.message}`;
      reject(err);
    });
    child.once('close', code => {
      if (activeChild === child) activeChild = null;
      try { fs.unlinkSync(cancelFile); } catch {}
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim());
          if (event.event === 'error') lastErrorEvent = event;
          if (event.event === 'result') lastResult = event;
          send('job:event', event);
        } catch { send('job:log', { level: 'info', message: buffer.trim() }); }
      }
      if (code === 0) return resolve(lastResult || { code });
      if (child.framePilotCancelRequested) {
        const cancelled = new Error('Processing was cancelled by the user.');
        cancelled.userMessage = cancelled.message;
        cancelled.cancelled = true;
        send('job:event', { event: 'cancelled', message: cancelled.message });
        return reject(cancelled);
      }
      const diagnostic = lastErrorEvent?.detail || stderrTail.trim();
      const stderrLines = stderrTail.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const shortMessage = lastErrorEvent?.message || stderrLines[stderrLines.length - 1] || 'The processing engine stopped before returning a structured error. Review the diagnostic log for details.';
      // Keep IPC rejection messages suitable for a toast. Detailed traceback
      // data is already retained separately for Activity & QA diagnostics.
      const error = new Error(shortMessage);
      error.userMessage = shortMessage;
      error.diagnostic = diagnostic;
      error.exitCode = code;
      reject(error);
    });
  });
}

function terminateProcessTree(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32' && child.pid) {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.on('error', () => { try { child.kill(); } catch {} });
    return;
  }
  if (child.pid && process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGTERM'); return; } catch {}
  }
  try { child.kill(); } catch {}
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

async function checkUpdatesInBackground() {
  const settings = preferences.readSettings();
  if (!settings.autoCheckUpdates || !app.isReady()) return;
  try {
    const result = await updateService.checkForUpdates(app.getVersion());
    send('updates:checked', result);
    if (result.update_available && settings.autoDownloadUpdates) {
      send('updates:download-progress', { stage: 'starting', percent: 0, message: `Preparing FramePilot Studio ${result.latest_version}` });
      stagedUpdate = await updateService.downloadRelease(result.latest_version, progress => send('updates:download-progress', progress));
      send('updates:downloaded', stagedUpdate);
    }
  } catch (error) {
    send('updates:error', { message: error.message, automatic: true });
  }
}

app.whenReady().then(() => {
  protocol.handle('framepilot', async request => {
    try {
      const requested = new URL(request.url);
      if (requested.hostname !== 'app') return new Response('Not found', { status: 404 });
      const relative = decodeURIComponent(requested.pathname).replace(/^\/+/, '');
      const filePath = path.resolve(rendererRoot, relative);
      if (filePath !== rendererRoot && !filePath.startsWith(rendererRoot + path.sep)) return new Response('Forbidden', { status: 403 });
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    } catch { return new Response('Bad request', { status: 400 }); }
  });

  handle('dialog:open', async (_event, options = {}) => dialog.showOpenDialog(mainWindow, options));
  handle('dialog:save', async (_event, options = {}) => dialog.showSaveDialog(mainWindow, options));
  handle('dialog:choose-folder', async (_event, title) => dialog.showOpenDialog(mainWindow, { title: title || 'Choose folder', properties: ['openDirectory', 'createDirectory'] }));
  handle('app:file-info', (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'File path'));
    if (!fs.existsSync(target)) throw new Error('The selected file or folder no longer exists. Please select it again.');
    const stat = fs.statSync(target);
    return { path: target, name: path.basename(target), isDirectory: stat.isDirectory(), size: stat.isFile() ? stat.size : null, modifiedAt: stat.mtime.toISOString() };
  });
  handle('app:copy-path', (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'Output path'));
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('The output file no longer exists. Check the output location and run the job again if needed.');
    clipboard.writeText(target);
    return { copied: true, path: target };
  });
  handle('app:show-in-folder', (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'Output path'));
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('The output file no longer exists. Check the output location and run the job again if needed.');
    shell.showItemInFolder(target);
    return true;
  });
  handle('app:copy-master-prompt-and-open-chatgpt', async () => {
    const promptPath = path.join(appRoot, 'Master_promt.txt');
    if (!fs.existsSync(promptPath) || !fs.statSync(promptPath).isFile()) {
      throw new Error(`The bundled Master Prompt is missing: ${promptPath}`);
    }
    const prompt = fs.readFileSync(promptPath, 'utf8');
    if (!prompt.trim()) throw new Error('Master_promt.txt is empty. Restore the original prompt file before continuing.');
    clipboard.writeText(prompt);
    await shell.openExternal('https://chatgpt.com/');
    return { copied: true, opened: true, characters: prompt.length };
  });
  handle('engine:runtime-info', async () => runBackend(['runtime-info']));
  handle('engine:csv-validate', async (_event, csvPath) => runBackend(['validate-csv', requireString(csvPath, 'CSV path')]));
  handle('engine:generate-csv', async (_event, input) => {
    const audio = requireString(input.audio, 'Voiceover audio');
    const mapping = requireString(input.mapping, 'Visual Mapping CSV');
    const output = input.output ? requireString(input.output, 'Output CSV') : preferences.createCsvOutputPath(mapping);
    const outputPath = path.resolve(output);
    const qaPath = path.join(path.dirname(outputPath), `${path.basename(outputPath, path.extname(outputPath))}.QA.txt`);
    if (fs.existsSync(outputPath)) throw new Error(`The Final Master CSV already exists and will not be overwritten: ${outputPath}`);
    if (fs.existsSync(qaPath)) throw new Error(`The QA report already exists and will not be overwritten: ${qaPath}`);
    return runBackend(['generate-csv', audio, mapping, outputPath, input.model || 'medium', input.compute || 'int8', input.device || 'cpu', String(input.threads || 4), String(input.batch || 4)]);
  });
  handle('engine:wfp-analyze', async (_event, input) => runBackend(['analyze-wfp', requireString(input.project, 'Filmora project'), input.csv || '-', input.imageFolder || '-']));
  handle('engine:wfp-export', async (_event, input) => {
    const project = requireString(input.project, 'Filmora project');
    if (path.extname(project).toLowerCase() !== '.wfp') throw new Error('Select a valid Filmora .wfp project file.');
    const parsed = path.parse(project);
    const allowedPrefix = `${parsed.name}_FramePilotStudio_Enhanced_v${app.getVersion()}`;
    let output = preferences.createWfpOutputPath(project, app.getVersion());
    if (input.output) {
      const requested = path.resolve(requireString(input.output, 'Output WFP'));
      const requestedName = path.basename(requested, path.extname(requested));
      const isSafeName = requestedName === allowedPrefix || requestedName.startsWith(`${allowedPrefix}_`);
      const sameSourceFolder = path.dirname(requested) === path.dirname(project);
      if (sameSourceFolder && isSafeName && path.extname(requested).toLowerCase() === '.wfp' && requested !== path.resolve(project) && !fs.existsSync(requested)) output = requested;
    }
    if (path.dirname(output) !== path.dirname(project) || path.resolve(output) === path.resolve(project) || path.extname(output).toLowerCase() !== '.wfp' || fs.existsSync(output)) {
      throw new Error('Could not reserve a safe, unique WFP output path beside the source project. The original project will never be overwritten.');
    }
    return runBackend(['export-wfp', JSON.stringify({ ...input, project, output })]);
  });
  handle('engine:cancel', async () => {
    if (!activeChild) return false;
    activeChild.framePilotCancelRequested = true;
    try { fs.writeFileSync(activeChild.framePilotCancelFile, 'cancelled'); }
    catch (error) { throw new Error(`Could not signal the local engine to cancel safely: ${error.message}`); }
    return true;
  });

  handle('app:version', () => app.getVersion());
  handle('app:get-settings', () => ({ ...preferences.readSettings(), defaultCsvOutputDirectory: preferences.defaultCsvDirectory() }));
  handle('app:set-settings', (_event, patch) => preferences.writeSettings(patch || {}));
  handle('app:choose-csv-folder', async () => {
    const current = preferences.readSettings().csvOutputDirectory;
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose default CSV output folder', defaultPath: current, properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths?.length) return null;
    return preferences.writeSettings({ csvOutputDirectory: result.filePaths[0] });
  });
  handle('app:prepare-wfp-output', (_event, source) => preferences.createWfpOutputPath(requireString(source, 'Source WFP'), app.getVersion()));
  handle('app:open-official-home', async () => { await shell.openExternal('https://framepilotstudio.github.io/'); return true; });
  handle('app:open-download-page', async () => { await shell.openExternal('https://framepilotstudio.github.io/download/'); return true; });

  handle('updates:check', async () => updateService.checkForUpdates(app.getVersion()));
  handle('updates:list-versions', async () => updateService.listVersions());
  handle('updates:download-version', async (_event, version) => {
    const staged = await updateService.downloadRelease(requireString(version, 'Version'), progress => send('updates:download-progress', progress));
    stagedUpdate = staged;
    return staged;
  });
  handle('updates:install', async () => {
    if (!stagedUpdate?.path || !fs.existsSync(stagedUpdate.path)) throw new Error('No verified update installer is ready.');
    if (process.platform !== 'win32' || path.extname(stagedUpdate.path).toLowerCase() !== '.exe') throw new Error('The staged release does not contain a supported Windows installer.');
    await updateService.verifyStagedInstaller(stagedUpdate);
    const error = await shell.openPath(stagedUpdate.path);
    if (error) throw new Error(`Could not open the installer: ${error}`);
    app.quit();
    return true;
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  setTimeout(checkUpdatesInBackground, 1800);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (activeChild) terminateProcessTree(activeChild); });
