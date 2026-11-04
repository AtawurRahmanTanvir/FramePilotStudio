// FramePilot Studio — isolated Motion Studio service layer.
// This module is additive and intentionally does not call the Filmora engine.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const PROMPT_FILES = Object.freeze({
  instructions: 'CLAUDE_PROJECT_INSTRUCTIONS.md',
  master: 'MOTION_MASTER_PROMPT.md',
  contract: 'PROJECT_IMPORT_CONTRACT.md',
  timing: 'WORD_TIMING_CSV_SPEC.md',
  setup: 'UPSTREAM_SKILL_SETUP.md',
  copilot: 'COPILOT_START_PROMPT.md'
});

handle('motion:list-render-history', async () => {
  const history = readRenderHistory();
  return history.filter(item => item && typeof item.outputPath === 'string').map(item => ({
    ...item,
    outputExists: fs.existsSync(item.outputPath) && fs.statSync(item.outputPath).isFile()
  }));
});

function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function readRenderHistory() {
  try {
    const value = JSON.parse(fs.readFileSync(renderHistoryPath, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Motion render history is invalid: ${error.message}`);
    return [];
  }
}

function writeRenderHistory(history) {
  fs.mkdirSync(projectsRoot, { recursive: true });
  const temporary = `${renderHistoryPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(history.slice(0, 100), null, 2), 'utf8');
  fs.renameSync(temporary, renderHistoryPath);
}

function cleanName(value) {
  return String(value || 'Motion Project').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 90) || 'Motion Project';
}

function parseJsonLines(buffer, onEvent, onText) {
  const parts = buffer.split(/\r?\n/);
  const remainder = parts.pop() || '';
  for (const line of parts) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.event === 'result') lastResult = event;
      onEvent(event);
    }
    catch { onText(line); }
  }
  return remainder;
}

function createRunner({ child, send, onFinish }) {
  let buffer = '';
  let stderrTail = '';
  let lastResult = null;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    buffer = parseJsonLines(buffer, event => send('motion:job-event', event), line => send('motion:job-log', { level: 'info', message: line }));
  });
  child.stderr.on('data', chunk => {
    stderrTail = (stderrTail + chunk).slice(-16000);
    send('motion:job-log', { level: 'error', message: chunk.trim() });
  });
  child.once('error', error => onFinish(error, null, stderrTail));
  child.once('close', code => {
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim());
        if (event.event === 'result') lastResult = event;
        send('motion:job-event', event);
      }
      catch { send('motion:job-log', { level: 'info', message: buffer.trim() }); }
    }
    onFinish(null, code, stderrTail, lastResult);
  });
}

function registerMotionService({ handle, app, dialog, shell, clipboard, appRoot, isDev, getMainWindow }) {
  let activeMotionChild = null;
  let activeMotionKind = null;
  const promptsRoot = path.join(appRoot, 'motion-studio', 'prompts');
  const backendRoot = path.join(appRoot, 'backend', 'motion');
  const projectsRoot = path.join(app.getPath('documents'), 'FramePilot Studio', 'Motion Projects');
  const runtimeRoot = path.join(appRoot, 'runtime', 'motion');
  const projectRegistryPath = path.join(projectsRoot, '.motion-projects.json');
  const renderHistoryPath = path.join(projectsRoot, '.motion-render-history.json');

  function requireString(value, label) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
    return value.trim();
  }

  function selectedFile(result) {
    if (result.canceled || !result.filePaths?.length) return null;
    return path.resolve(result.filePaths[0]);
  }

  function readProjectRegistry() {
    try {
      const value = JSON.parse(fs.readFileSync(projectRegistryPath, 'utf8'));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Motion project registry is invalid: ${error.message}`);
      return {};
    }
  }

  function writeProjectRegistry(registry) {
    fs.mkdirSync(projectsRoot, { recursive: true });
    const temporary = `${projectRegistryPath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(registry, null, 2), 'utf8');
    fs.renameSync(temporary, projectRegistryPath);
  }

  function requireProjectDirectory(rawPath, label = 'Motion project') {
    const project = path.resolve(requireString(rawPath, label));
    if (!inside(projectsRoot, project) || project === path.resolve(projectsRoot) || !fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
      throw new Error(`${label} must be an existing folder inside Motion Projects.`);
    }
    if (!fs.existsSync(path.join(project, 'motion-project.json'))) throw new Error(`${label} manifest is missing.`);
    return project;
  }

  function uniqueProjectDirectory(name) {
    const base = cleanName(name);
    let candidate = path.join(projectsRoot, base);
    let suffix = 2;
    while (fs.existsSync(candidate)) candidate = path.join(projectsRoot, `${base}-${suffix++}`);
    return candidate;
  }

  function ensureFile(value, label, extensions) {
    const file = path.resolve(requireString(value, label));
    if (!inside(app.getPath('home'), file) && !inside(app.getPath('documents'), file) && !inside(os.tmpdir(), file)) {
      // Source media may be stored elsewhere; allow an explicit user-selected path,
      // but never accept a non-file or path supplied by an untrusted project manifest.
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`${label} does not exist or is not a file.`);
    if (extensions?.length && !extensions.includes(path.extname(file).toLowerCase())) throw new Error(`${label} must use one of: ${extensions.join(', ')}.`);
    return file;
  }

  function pythonInvocation(scriptPath, args) {
    const frozen = path.join(runtimeRoot, 'backend', 'FramePilotMotionBackend.exe');
    const localPython = path.join(appRoot, '.venv', 'Scripts', 'python.exe');
    const bundledPython = path.join(runtimeRoot, 'python', 'python.exe');
    if (!isDev && fs.existsSync(frozen)) return { executable: frozen, args };
    if (fs.existsSync(bundledPython)) return { executable: bundledPython, args: [scriptPath, ...args] };
    if (isDev && fs.existsSync(localPython)) return { executable: localPython, args: [scriptPath, ...args] };
    if (isDev && process.platform === 'win32') return { executable: 'py', args: ['-3.12', scriptPath, ...args] };
    if (isDev) return { executable: process.platform === 'win32' ? 'python' : 'python3', args: [scriptPath, ...args] };
    throw new Error('Motion Python runtime is not installed. The Filmora Python runtime is intentionally not modified by this overlay.');
  }

  function runMotionPython(kind, scriptPath, args) {
    if (activeMotionChild) throw new Error('A Motion Studio job is already running. Wait for it to finish or cancel it.');
    if (!fs.existsSync(scriptPath)) throw new Error(`Motion engine source is missing: ${scriptPath}`);
    const invocation = pythonInvocation(scriptPath, args);
    const child = spawn(invocation.executable, invocation.args, {
      cwd: appRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONDONTWRITEBYTECODE: '1',
        FRAMEPILOT_RUNTIME_ROOT: path.join(appRoot, 'runtime'),
        FRAMEPILOT_MOTION_RUNTIME_ROOT: runtimeRoot,
        FRAMEPILOT_VENDOR_ROOT: path.join(appRoot, 'vendor'),
        PATH: `${path.join(appRoot, 'runtime', 'ffmpeg')}${path.delimiter}${process.env.PATH || ''}`
      }
    });
    activeMotionChild = child;
    activeMotionKind = kind;
    return new Promise((resolve, reject) => createRunner({
      child,
      send: (channel, payload) => {
        if (channel === 'motion:job-event' && payload.event === 'result') sendToWindow('motion:job-event', payload);
        else sendToWindow(channel, payload);
      },
      onFinish: (error, code, stderr) => {
        if (activeMotionChild === child) { activeMotionChild = null; activeMotionKind = null; }
        if (error) return reject(error);
        if (code === 0) return resolve({ code: 0, kind });
        reject(new Error(stderr.trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] || `${kind} stopped with exit code ${code}.`));
      }
    }));
  }

  function sendToWindow(channel, payload) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  }

  async function chooseFile(title, filters, properties = ['openFile']) {
    const result = await dialog.showOpenDialog(getMainWindow(), { title, properties, filters });
    return selectedFile(result);
  }

  handle('motion:select-script', async () => chooseFile('Select approved video script', [{ name: 'Script files', extensions: ['txt', 'md', 'docx', 'pdf'] }]));
  handle('motion:select-audio', async () => chooseFile('Select voiceover audio', [{ name: 'Audio files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg', 'opus'] }]));
  handle('motion:select-project-zip', async () => chooseFile('Import Remotion project ZIP', [{ name: 'ZIP archives', extensions: ['zip'] }]));
  handle('motion:select-output-folder', async () => {
    fs.mkdirSync(projectsRoot, { recursive: true });
    const result = await dialog.showOpenDialog(getMainWindow(), { title: 'Choose a folder inside Motion Projects', defaultPath: projectsRoot, properties: ['openDirectory', 'createDirectory'] });
    const folder = selectedFile(result);
    if (!folder) return null;
    if (!inside(projectsRoot, folder) || !fs.statSync(folder).isDirectory()) {
      throw new Error(`Choose an output folder inside ${projectsRoot}. Motion output actions are restricted to this workspace.`);
    }
    return folder;
  });

  handle('motion:read-prompt', async (_event, key) => {
    const filename = PROMPT_FILES[String(key || '')];
    if (!filename) throw new Error('Unknown Motion prompt resource.');
    const file = path.resolve(promptsRoot, filename);
    if (!inside(promptsRoot, file) || !fs.existsSync(file)) throw new Error(`Motion prompt file is missing: ${filename}`);
    return { name: filename, content: fs.readFileSync(file, 'utf8') };
  });

  handle('motion:copy-text', async (_event, value) => {
    clipboard.writeText(requireString(value, 'Text to copy'));
    return { copied: true };
  });

  handle('motion:copy-path', async (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'Motion output path'));
    if (!inside(projectsRoot, target) || !fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('Motion output file is invalid.');
    clipboard.writeText(target);
    return { copied: true, path: target };
  });

  handle('motion:read-output-preview', async (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'Motion CSV path'));
    if (!inside(projectsRoot, target) || path.extname(target).toLowerCase() !== '.csv' || !fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('Motion CSV file is invalid.');
    const stat = fs.statSync(target);
    if (stat.size > 10 * 1024 * 1024) throw new Error('Motion CSV preview is limited to 10 MB.');
    return { name: path.basename(target), text: fs.readFileSync(target, 'utf8') };
  });

  handle('motion:save-prompt', async (_event, key) => {
    const filename = PROMPT_FILES[String(key || '')];
    if (!filename) throw new Error('Unknown Motion prompt resource.');
    const source = path.join(promptsRoot, filename);
    if (!fs.existsSync(source)) throw new Error(`Prompt resource is missing: ${filename}`);
    const result = await dialog.showSaveDialog(getMainWindow(), { title: 'Save Motion Studio instruction file', defaultPath: filename, filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (result.canceled || !result.filePath) return { saved: false };
    const target = path.resolve(result.filePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // showSaveDialog owns overwrite confirmation; COPYFILE_EXCL would reject a user-approved overwrite.
    fs.copyFileSync(source, target);
    return { saved: true, path: target };
  });

  handle('motion:open-claude', async () => {
    await shell.openExternal('https://claude.ai/');
    return { opened: true };
  });

  handle('motion:read-script-preview', async (_event, rawPath) => {
    const file = ensureFile(rawPath, 'Script file', ['.txt', '.md']);
    const stat = fs.statSync(file);
    if (stat.size > 10 * 1024 * 1024) throw new Error('Script preview is limited to 10 MB.');
    return { name: path.basename(file), size: stat.size, text: fs.readFileSync(file, 'utf8').slice(0, 200000) };
  });

  handle('motion:runtime-info', async () => {
    const nodeCandidates = [
      path.join(runtimeRoot, 'node', 'node.exe'),
      path.join(runtimeRoot, 'node', 'node'),
      process.env.FRAMEPILOT_MOTION_NODE || ''
    ].filter(Boolean);
    const nodePath = nodeCandidates.find(candidate => fs.existsSync(candidate)) || (isDev ? 'node' : null);
    const rendererRoot = path.join(runtimeRoot, 'renderer');
    const rendererPackage = path.join(rendererRoot, 'package.json');
    const rendererModules = path.join(rendererRoot, 'node_modules', '@remotion', 'renderer');
    const compositorModule = path.join(rendererRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc');
    let rendererVersion = null;
    let compositorVersion = null;
    try { rendererVersion = JSON.parse(fs.readFileSync(path.join(rendererModules, 'package.json'), 'utf8')).version; } catch {}
    try { compositorVersion = JSON.parse(fs.readFileSync(path.join(compositorModule, 'package.json'), 'utf8')).version; } catch {}
    const binariesReady = fs.existsSync(path.join(compositorModule, 'package.json')) && compositorVersion === '4.0.540';
    const browserCandidates = [
      path.join(runtimeRoot, 'browser', 'chrome-headless-shell.exe')
    ];
    const browserPath = browserCandidates.find(candidate => fs.existsSync(candidate)) || null;
    const motionBackend = path.join(runtimeRoot, 'backend', 'FramePilotMotionBackend.exe');
    const bundledPython = path.join(runtimeRoot, 'python', 'python.exe');
    const sourceWordEngine = path.join(backendRoot, 'word_timing_engine.py');
    const sourceImporter = path.join(backendRoot, 'project_import.py');
    const motionSourcesReady = fs.existsSync(sourceWordEngine) && fs.existsSync(sourceImporter) && fs.existsSync(path.join(backendRoot, 'bridge.py'));
    const pythonBackendReady = isDev ? motionSourcesReady : (fs.existsSync(motionBackend) || (fs.existsSync(bundledPython) && motionSourcesReady));
    const remotionReady = Boolean(nodePath && rendererVersion === '4.0.540' && fs.existsSync(rendererPackage) && fs.existsSync(rendererModules) && browserPath && binariesReady);
    const executionPolicyPath = path.join(runtimeRoot, 'security', 'worker-policy.json');
    let executionPolicy = { isolationStatus: 'not-validated' };
    if (fs.existsSync(executionPolicyPath)) {
      try { executionPolicy = JSON.parse(fs.readFileSync(executionPolicyPath, 'utf8')); } catch { executionPolicy = { isolationStatus: 'invalid-policy' }; }
    }
    const projectExecutionAllowed = executionPolicy.isolationStatus === 'validated' && executionPolicy.networkAccess === false && executionPolicy.filesystemScope === 'project-only';
    return {
      runtimeRoot,
      pythonBackendAvailable: pythonBackendReady,
      wordTimingSourceAvailable: fs.existsSync(sourceWordEngine) || fs.existsSync(motionBackend),
      projectImporterAvailable: fs.existsSync(sourceImporter),
      nodeRuntimeAvailable: Boolean(nodePath),
      nodePath: nodePath || null,
      remotionRendererAvailable: fs.existsSync(rendererModules) && rendererVersion === '4.0.540',
      remotionRendererVersion: rendererVersion,
      remotionCompositorAvailable: binariesReady,
      remotionCompositorVersion: compositorVersion,
      remotionBinariesAvailable: binariesReady,
      remotionPlayerAvailable: fs.existsSync(path.join(rendererRoot, 'node_modules', '@remotion', 'player')),
      browserAvailable: Boolean(browserPath),
      browserPath,
      motionRenderReady: remotionReady && projectExecutionAllowed,
      projectExecutionAllowed,
      executionPolicy,
      promptPackAvailable: Object.values(PROMPT_FILES).every(filename => fs.existsSync(path.join(promptsRoot, filename))),
      projectRoot: projectsRoot
    };
  });

  handle('motion:generate-word-timing', async (_event, input = {}) => {
    const script = ensureFile(input.scriptPath, 'Approved script', ['.txt', '.md', '.docx', '.pdf']);
    const audio = ensureFile(input.audioPath, 'Voiceover audio', ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.opus']);
    const outputFolder = input.outputFolder ? path.resolve(requireString(input.outputFolder, 'Output folder')) : path.join(projectsRoot, 'Word Timing');
    if (!inside(projectsRoot, outputFolder)) throw new Error('Choose a CSV output folder inside Documents / FramePilot Studio / Motion Projects.');
    fs.mkdirSync(outputFolder, { recursive: true });
    const base = cleanName(input.projectName || path.parse(script).name);
    let output = path.join(outputFolder, `${base}_Motion_Word_Timing.csv`);
    let suffix = 2;
    while (fs.existsSync(output) || fs.existsSync(output.replace(/\.csv$/i, '.QA.json'))) {
      output = path.join(outputFolder, `${base}_Motion_Word_Timing_${suffix++}.csv`);
    }
    const scriptPath = path.join(backendRoot, 'bridge.py');
    return runMotionPython('word-timing', scriptPath, [
      'word-timing', '--script', script, '--audio', audio, '--output', output,
      '--runtime-root', path.join(appRoot, 'runtime'), '--backend-root', path.join(appRoot, 'backend')
    ]).then(result => ({ ...result, outputPath: output, qaPath: output.replace(/\.csv$/i, '.QA.json') }));
  });

  handle('motion:inspect-project', async (_event, rawZip) => {
    const zip = ensureFile(rawZip, 'Project ZIP', ['.zip']);
    const importer = path.join(backendRoot, 'bridge.py');
    return runMotionPython('inspect-project', importer, ['inspect', zip]);
  });

  handle('motion:import-project', async (_event, rawZip) => {
    const zip = ensureFile(rawZip, 'Project ZIP', ['.zip']);
    fs.mkdirSync(projectsRoot, { recursive: true });
    const importer = path.join(backendRoot, 'bridge.py');
    return runMotionPython('import-project', importer, ['import', zip, '--projects-root', projectsRoot]).then(result => {
      if (result?.projectPath) {
        const registry = readProjectRegistry();
        registry[result.projectPath] = { importedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() };
        writeProjectRegistry(registry);
      }
      return result;
    });
  });

  handle('motion:list-projects', async () => {
    fs.mkdirSync(projectsRoot, { recursive: true });
    const registry = readProjectRegistry();
    const projects = [];
    for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'Word Timing') continue;
      const directory = path.join(projectsRoot, entry.name);
      const manifestPath = path.join(directory, 'motion-project.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const metadata = registry[directory] || {};
        projects.push({ name: manifest.projectName || entry.name, path: directory, compositionId: manifest.compositionId, width: manifest.width, height: manifest.height, fps: manifest.fps, durationInFrames: manifest.durationInFrames, remotionVersion: manifest.remotionVersion, importedAt: metadata.importedAt || null, lastOpenedAt: metadata.lastOpenedAt || null });
      } catch { /* malformed manifests are omitted from the ready project list */ }
    }
    return projects.sort((a, b) => a.name.localeCompare(b.name));
  });

  handle('motion:rename-project', async (_event, input = {}) => {
    const project = requireProjectDirectory(input.projectPath);
    const name = cleanName(requireString(input.name, 'Project name'));
    const destination = path.join(projectsRoot, name);
    if (destination !== project && fs.existsSync(destination)) throw new Error(`A Motion project named "${name}" already exists.`);
    const manifestPath = path.join(project, 'motion-project.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.projectName = name;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    if (destination !== project) fs.renameSync(project, destination);
    const registry = readProjectRegistry();
    if (registry[project]) { registry[destination] = registry[project]; delete registry[project]; }
    writeProjectRegistry(registry);
    return { path: destination, name };
  });

  handle('motion:duplicate-project', async (_event, rawPath) => {
    const project = requireProjectDirectory(rawPath);
    const manifest = JSON.parse(fs.readFileSync(path.join(project, 'motion-project.json'), 'utf8'));
    const destination = uniqueProjectDirectory(`${manifest.projectName || path.basename(project)} Copy`);
    fs.cpSync(project, destination, { recursive: true, errorOnExist: true, filter: source => path.resolve(source) !== path.resolve(projectRegistryPath) });
    const copiedManifestPath = path.join(destination, 'motion-project.json');
    const copiedManifest = JSON.parse(fs.readFileSync(copiedManifestPath, 'utf8'));
    copiedManifest.projectName = path.basename(destination);
    fs.writeFileSync(copiedManifestPath, JSON.stringify(copiedManifest, null, 2), 'utf8');
    const registry = readProjectRegistry();
    registry[destination] = { duplicatedFrom: project, importedAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() };
    writeProjectRegistry(registry);
    return { path: destination, name: copiedManifest.projectName };
  });

  handle('motion:delete-project', async (_event, rawPath) => {
    const project = requireProjectDirectory(rawPath);
    fs.rmSync(project, { recursive: true, force: false });
    const registry = readProjectRegistry();
    delete registry[project];
    writeProjectRegistry(registry);
    return { deleted: true, path: project };
  });

  handle('motion:show-in-folder', async (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'Output path'));
    if (!inside(projectsRoot, target) || !fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('Motion output file is invalid.');
    shell.showItemInFolder(target);
    return { opened: true };
  });

  handle('motion:resolve-output-url', async (_event, rawPath) => {
    const target = path.resolve(requireString(rawPath, 'Motion output path'));
    if (!inside(projectsRoot, target) || !fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error('Motion preview file is invalid.');
    const relative = path.relative(projectsRoot, target).split(path.sep).map(encodeURIComponent).join('/');
    return `framepilot://motion-output/${relative}`;
  });

  handle('motion:open-project-folder', async (_event, rawPath) => {
    const project = path.resolve(requireString(rawPath, 'Project path'));
    if (!inside(projectsRoot, project) || !fs.existsSync(project) || !fs.statSync(project).isDirectory()) throw new Error('Motion project folder is invalid.');
    shell.openPath(project).then(error => { if (error) sendToWindow('motion:job-log', { level: 'error', message: error }); });
    return { opened: true };
  });

  handle('motion:start-render', async (_event, input = {}) => {
    if (activeMotionChild) throw new Error('A Motion Studio job is already running.');
    const project = path.resolve(requireString(input.projectPath, 'Motion project'));
    if (!inside(projectsRoot, project) || !fs.existsSync(project)) throw new Error('Select an imported Motion project inside the Motion Projects folder.');
    const policyPath = path.join(runtimeRoot, 'security', 'worker-policy.json');
    let policy = {};
    try { policy = JSON.parse(fs.readFileSync(policyPath, 'utf8')); } catch {}
    if (!(policy.isolationStatus === 'validated' && policy.networkAccess === false && policy.filesystemScope === 'project-only')) {
      throw new Error('Rendering is locked until the Motion worker isolation policy is implemented and validated. This protects the PC from untrusted JavaScript inside imported Remotion projects. Ask Copilot to complete the sandbox task in motion-studio/COPILOT_FINAL_INTEGRATION_TASK.md.');
    }
    const infoPath = path.join(runtimeRoot, 'renderer', 'package.json');
    const nodeCandidates = [path.join(runtimeRoot, 'node', 'node.exe'), process.env.FRAMEPILOT_MOTION_NODE || 'node'];
    const node = nodeCandidates.find(candidate => candidate && (candidate === 'node' || fs.existsSync(candidate)));
    const runner = path.join(runtimeRoot, 'renderer', 'runner.mjs');
    if (!node || !fs.existsSync(infoPath) || !fs.existsSync(runner)) throw new Error('The bundled Motion Node/Remotion runtime is incomplete.');
    const mode = input.mode === 'preview' ? 'preview' : 'render';
    const outputDirectory = path.join(project, 'outputs');
    fs.mkdirSync(outputDirectory, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(project, 'motion-project.json'), 'utf8'));
    const outputPath = mode === 'preview'
      ? path.join(outputDirectory, 'FramePilot_Preview.mp4')
      : path.join(outputDirectory, `${cleanName(manifest.projectName)}_Final.mp4`);
    if (fs.existsSync(outputPath)) throw new Error(`Output already exists and will not be overwritten: ${outputPath}`);
    const child = spawn(node, [runner, '--project', project, '--mode', mode, '--output', outputPath], {
      cwd: path.join(runtimeRoot, 'renderer'),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FRAMEPILOT_MOTION_BROWSER: path.join(runtimeRoot, 'browser', 'chrome-headless-shell.exe'),
        FRAMEPILOT_MOTION_COMPOSITOR_DIRECTORY: path.join(runtimeRoot, 'renderer', 'node_modules', '@remotion', 'compositor-win32-x64-msvc'),
        FRAMEPILOT_MOTION_RUNTIME_ROOT: runtimeRoot,
        FRAMEPILOT_MOTION_PROJECT: project
      }
    });
    activeMotionChild = child;
    activeMotionKind = `render-${mode}`;
    return new Promise((resolve, reject) => createRunner({
      child,
      send: sendToWindow,
      onFinish: (error, code, stderr, result) => {
        if (activeMotionChild === child) { activeMotionChild = null; activeMotionKind = null; }
        if (error) return reject(error);
        if (code === 0) {
          const history = readRenderHistory();
          history.unshift({
            id: `${Date.now()}-${path.basename(outputPath)}`,
            projectPath: project,
            projectName: manifest.projectName || path.basename(project),
            outputPath,
            mode,
            createdAt: new Date().toISOString(),
            durationInFrames: result?.durationInFrames || manifest.durationInFrames,
            outputDurationSeconds: result?.outputDurationSeconds || null,
            outputSizeBytes: result?.outputSizeBytes || (fs.existsSync(outputPath) ? fs.statSync(outputPath).size : null)
          });
          writeRenderHistory(history);
          return resolve({ outputPath, mode, code, ...result });
        }
        reject(new Error(stderr.trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] || `Motion ${mode} stopped with exit code ${code}.`));
      }
    }));
  });

  handle('motion:cancel-job', async () => {
    if (!activeMotionChild) return { cancelled: false };
    const child = activeMotionChild;
    const kind = activeMotionKind;
    activeMotionChild = null;
    activeMotionKind = null;
    if (process.platform === 'win32' && child.pid) {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.on('error', () => { try { child.kill(); } catch {} });
    } else {
      try { child.kill('SIGTERM'); } catch {}
    }
    sendToWindow('motion:job-event', { event: 'cancelled', kind, message: 'Motion Studio job cancellation requested.' });
    return { cancelled: true };
  });
}

module.exports = { registerMotionService };
