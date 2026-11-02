'use strict';
const $ = id => document.getElementById(id);
const state = {
  page: 'dashboard', audio: null, mapping: null, scriptFile: null, wfp: null, timelineCsv: null, imageFolder: null,
  audioOutput: null, outputWfp: null, analysis: null, analyzed: false, runtime: null, wfpOperation: 'export',
  settings: null, log: [], job: null, jobKind: null, jobStartedAt: 0, jobClock: null, lastEngineError: null,
  latestRelease: null, stagedUpdate: null, releases: []
};
const labels = { dashboard: 'Overview', audio: 'Audio to CSV', 'script-mapping': 'Script-to-Image Mapping', timeline: 'Timeline Engine', activity: 'Activity & QA', settings: 'Settings', help: 'Help & Guide' };
const $all = (selector, root = document) => [...root.querySelectorAll(selector)];

function toast(message, error = false, duration = 5200) {
  const host = $('toast-region');
  const el = document.createElement('div');
  el.className = `toast${error ? ' error' : ''}`;
  el.textContent = message;
  host.append(el);
  window.setTimeout(() => el.remove(), duration);
}
function log(message, level = 'info') {
  state.log.unshift({ message: String(message), level, time: new Date().toLocaleTimeString() });
  if (state.log.length > 300) state.log.length = 300;
  renderLog();
}
function renderLog() {
  const host = $('activity-log');
  if (!host) return;
  host.replaceChildren();
  if (!state.log.length) {
    const empty = document.createElement('div'); empty.className = 'empty-activity';
    empty.innerHTML = '<div class="empty-icon">⌁</div><div><strong>Nothing to report yet</strong><p>Engine output will appear here as you work.</p></div>';
    host.append(empty); return;
  }
  for (const item of state.log) {
    const row = document.createElement('div'); row.className = 'log-row';
    const time = document.createElement('span'); time.className = 'log-time'; time.textContent = item.time;
    const msg = document.createElement('span'); msg.className = `log-message ${item.level === 'error' ? 'error' : item.level === 'success' ? 'success' : ''}`; msg.textContent = item.message;
    row.append(time, msg); host.append(row);
  }
}
function navigate(page) {
  if (!labels[page]) return;
  state.page = page;
  $all('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
  $all('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const crumb = $('page-crumb'); if (crumb) crumb.textContent = labels[page];
  window.scrollTo({ top: 0, behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
}
function basename(p) { return String(p || '').split(/[\\/]/).filter(Boolean).pop() || p; }
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'Folder';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB']; let value = bytes / 1024; let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}
function setFileField({ key, path, nameId, metaId, badgeId, buttonId, folder = false }) {
  const name = $(nameId), meta = $(metaId), badge = $(badgeId), button = $(buttonId);
  const row = name?.closest('.file-field');
  if (!path) {
    if (name) { name.textContent = folder ? 'No folder selected' : 'No file selected'; name.removeAttribute('title'); }
    if (meta) meta.textContent = folder ? 'Optional folder' : 'Choose a source file';
    if (badge) badge.hidden = true;
    if (button) button.textContent = folder ? 'Choose folder' : 'Add file';
    row?.classList.remove('selected');
    return;
  }
  const infoPromise = window.framepilot.getFileInfo(path).catch(() => ({ name: basename(path), path, size: null, isDirectory: folder }));
  infoPromise.then(info => {
    if (state[key] !== path) return;
    if (name) { name.textContent = info.name; name.title = info.path; }
    if (meta) meta.textContent = `${info.isDirectory ? 'Folder' : (info.name.split('.').pop() || 'File').toUpperCase()} · ${info.isDirectory ? 'Directory selected' : formatBytes(info.size)} · Added to this session`;
  });
  if (name) { name.textContent = basename(path); name.title = path; }
  if (badge) badge.hidden = false;
  if (button) button.textContent = folder ? 'Change folder' : 'Change file';
  row?.classList.add('selected');
}
function updateAudioFileCount() {
  const count = Number(Boolean(state.audio)) + Number(Boolean(state.mapping));
  $('audio-files-count').textContent = `${count} / 2 FILES ADDED`;
  $('audio-files-count').classList.toggle('all-ready', count === 2);
  updateAudioButtonState();
}
function updateAudioButtonState() {
  const ready = Boolean(state.audio && state.mapping && state.runtime?.audio_engine_ready && !state.job);
  $('start-audio').disabled = !ready;
  if (!state.audio || !state.mapping) $('audio-engine-readiness').textContent = 'Add both files to continue.';
  else if (!state.runtime) $('audio-engine-readiness').textContent = 'Engine status could not be checked. See Activity & QA.';
  else if (!state.runtime.audio_engine_ready) $('audio-engine-readiness').textContent = runtimeReadinessReason(state.runtime);
  else $('audio-engine-readiness').textContent = 'Ready. Your Final Master CSV will be saved automatically in the default folder.';
}
function runtimeReadinessReason(runtime) {
  const reason = runtime?.missing_components?.[0] || runtime?.model_manifest_error;
  return reason ? `Engine not ready: ${reason}` : 'Engine is not ready. Open Activity & QA for diagnostics.';
}
function updateTimelineButtonState() {
  const button = $('analyze-wfp');
  if (button) button.disabled = !(state.wfp && state.timelineCsv && !state.job);
}
async function chooseFile({ dialogFilters, key, nameId, metaId, badgeId, buttonId, folder = false }) {
  try {
    const options = folder
      ? { properties: ['openDirectory', 'createDirectory'] }
      : { properties: ['openFile'], filters: dialogFilters };
    const result = await window.framepilot.openDialog(options);
    if (result.canceled || !result.filePaths?.length) return;
    const selected = result.filePaths[0];
    state[key] = selected;
    setFileField({ key, path: selected, nameId, metaId, badgeId, buttonId, folder });
    if (key === 'audio' || key === 'mapping') {
      state.audioOutput = null;
      $('audio-output-result').hidden = true;
    }
    if (key === 'wfp') {
      state.analyzed = false; state.analysis = null; $('export-wfp').disabled = true;
      $('analysis-status').textContent = 'NOT ANALYZED'; $('analysis-status').className = 'runtime-check pending';
      state.outputWfp = await window.framepilot.prepareWfpOutput(selected);
      $('output-wfp-name').textContent = state.outputWfp;
      $('output-wfp-name').title = state.outputWfp;
    }
    if (key === 'timelineCsv' || key === 'wfp' || key === 'imageFolder') {
      if (key !== 'wfp') state.outputWfp = null;
      state.analyzed = false; $('export-wfp').disabled = true; $('wfp-output-result').hidden = true;
      $('analysis-status').textContent = 'NOT ANALYZED'; $('analysis-status').className = 'runtime-check pending';
      $('analysis-message').textContent = 'Inputs changed. Analyze the project again.';
    }
    updateAudioFileCount();
    updateTimelineButtonState();
    if (key === 'scriptFile') {
      $('script-file-state').textContent = 'SCRIPT ADDED';
      $('copy-mapping-prompt').disabled = false;
      $('script-prompt-status').textContent = `Selected: ${basename(selected)}. The file will be attached manually in ChatGPT after it opens.`;
    }
    if (key === 'wfp') $('wfp-output-result').hidden = true;
    log(`Added ${folder ? 'folder' : 'file'}: ${basename(selected)}`, 'success');
  } catch (error) { showEngineError(error, 'Could not add the selected item.'); }
}
function bindInputButtons() {
  $('pick-audio').addEventListener('click', () => chooseFile({ key: 'audio', nameId: 'audio-name', metaId: 'audio-file-meta', badgeId: 'audio-selected-badge', buttonId: 'pick-audio', dialogFilters: [{ name: 'Voiceover audio', extensions: ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg', 'opus'] }] }));
  $('pick-mapping').addEventListener('click', () => chooseFile({ key: 'mapping', nameId: 'mapping-name', metaId: 'mapping-file-meta', badgeId: 'mapping-selected-badge', buttonId: 'pick-mapping', dialogFilters: [{ name: 'Visual Mapping CSV', extensions: ['csv'] }] }));
  $('pick-script-file').addEventListener('click', () => chooseFile({ key: 'scriptFile', nameId: 'script-file-name', metaId: 'script-file-meta', badgeId: 'script-file-selected-badge', buttonId: 'pick-script-file', dialogFilters: [{ name: 'Script files', extensions: ['txt', 'md', 'docx', 'pdf'] }] }));
  $('pick-wfp').addEventListener('click', () => chooseFile({ key: 'wfp', nameId: 'wfp-name', metaId: 'wfp-file-meta', badgeId: 'wfp-selected-badge', buttonId: 'pick-wfp', dialogFilters: [{ name: 'Filmora Project', extensions: ['wfp'] }] }));
  $('pick-timeline-csv').addEventListener('click', () => chooseFile({ key: 'timelineCsv', nameId: 'timeline-csv-name', metaId: 'timeline-csv-meta', badgeId: 'timeline-csv-selected-badge', buttonId: 'pick-timeline-csv', dialogFilters: [{ name: 'Final Master CSV', extensions: ['csv'] }] }));
  $('pick-image-folder').addEventListener('click', () => chooseFile({ key: 'imageFolder', nameId: 'image-folder-name', metaId: 'image-folder-meta', badgeId: 'image-folder-selected-badge', buttonId: 'pick-image-folder', folder: true }));
}

function openProgress(kind, title, operation = 'export') {
  state.job = title; state.jobKind = kind; state.wfpOperation = operation; state.jobStartedAt = Date.now(); state.lastEngineError = null;
  updateTimelineButtonState(); updateAudioButtonState();
  const panel = kind === 'wfp' ? $('wfp-progress-panel') : $('audio-progress-panel');
  panel.hidden = false;
  if (kind === 'wfp') { $('wfp-progress-status').textContent = 'RUNNING'; $('wfp-progress-status').className = 'progress-status'; }
  else $('audio-progress-status').textContent = 'RUNNING';
  if (kind === 'wfp') { $('wfp-progress-stage').textContent = title; $('wfp-progress-message').textContent = 'Preparing Filmora project…'; updateWfpProgress(0, title, 'Starting local processing…'); }
  else { $('audio-progress-stage').textContent = title; $('audio-progress-message').textContent = 'Preparing engine…'; updateProgress(0, title, 'Starting local processing…'); }
  if (state.jobClock) clearInterval(state.jobClock);
  state.jobClock = setInterval(() => {
    const elapsed = Math.max(0, Math.floor((Date.now() - state.jobStartedAt) / 1000));
    const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    if (state.jobKind === 'wfp') $('wfp-progress-elapsed').textContent = time; else $('audio-progress-elapsed').textContent = time;
  }, 1000);
}
function updateProgress(percent, stage, message) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  $('audio-progress-number').textContent = `${Math.round(clamped)}%`;
  $('audio-progress-fill').style.width = `${clamped}%`;
  const circle = $('audio-progress-ring');
  const circumference = 2 * Math.PI * 49;
  circle.style.strokeDasharray = String(circumference);
  circle.style.strokeDashoffset = String(circumference * (1 - clamped / 100));
  if (stage) $('audio-progress-stage').textContent = stage;
  if (message) $('audio-progress-message').textContent = message;
}
function renderWfpStageList(percent, operation, terminalState = 'running') {
  const host = $('wfp-stage-list');
  if (!host || !window.FramePilotTimelineProgress) return;
  const model = window.FramePilotTimelineProgress.getTimelineProgress(percent, operation);
  host.replaceChildren();
  model.steps.forEach((step, index) => {
    const item = document.createElement('li');
    item.className = `timeline-stage-card is-${step.state}${terminalState === 'failed' && step.state === 'active' ? ' is-failed' : ''}`;
    const marker = document.createElement('span');
    marker.className = 'timeline-stage-marker';
    marker.textContent = step.state === 'complete' ? '✓' : String(index + 1);
    const copy = document.createElement('span');
    copy.className = 'timeline-stage-copy';
    const title = document.createElement('strong'); title.textContent = step.label;
    const detail = document.createElement('small'); detail.textContent = step.detail;
    copy.append(title, detail); item.append(marker, copy); host.append(item);
  });
  const active = model.steps[model.currentIndex];
  $('wfp-progress-stage').textContent = terminalState === 'failed' ? 'Processing stopped' : (active?.label || 'Processing Filmora project');
}
function updateWfpProgress(percent, stage, message) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  $('wfp-progress-number').textContent = `${Math.round(clamped)}%`;
  $('wfp-progress-fill').style.width = `${clamped}%`;
  renderWfpStageList(clamped, state.wfpOperation || 'export');
  if (message) $('wfp-progress-message').textContent = message;
}
function setOutputResult(kind, filePath) {
  if (!filePath) return;
  const prefix = kind === 'audio' ? 'audio' : 'wfp';
  const panel = $(`${prefix}-output-result`);
  const name = $(`${prefix}-output-file-name`);
  const pathNode = $(`${prefix}-output-file-path`);
  if (!panel || !name || !pathNode) return;
  name.textContent = basename(filePath);
  pathNode.textContent = filePath;
  pathNode.title = filePath;
  panel.hidden = false;
}
async function copyOutputPath(kind) {
  const filePath = kind === 'audio' ? state.audioOutput : state.outputWfp;
  if (!filePath) { toast('No output file is available yet.', true); return; }
  try { await window.framepilot.copyPath(filePath); toast('Output path copied to clipboard.'); }
  catch (error) { showEngineError(error, 'Could not copy the output path.'); }
}
async function revealOutput(kind) {
  const filePath = kind === 'audio' ? state.audioOutput : state.outputWfp;
  if (!filePath) { toast('No output file is available yet.', true); return; }
  try { await window.framepilot.showInFolder(filePath); }
  catch (error) { showEngineError(error, 'Could not open the output folder.'); }
}
async function copyScriptPromptAndOpenChatGPT() {
  if (!state.scriptFile) { toast('Choose a script file first.', true); return; }
  const button = $('copy-mapping-prompt');
  button.disabled = true;
  const label = button.querySelector('span');
  if (label) label.textContent = 'Copying prompt…';
  try {
    const result = await window.framepilot.copyMasterPromptAndOpenChatGPT();
    $('script-prompt-status').textContent = `Master Prompt copied (${Number(result.characters || 0).toLocaleString()} characters). ChatGPT is open. Attach “${basename(state.scriptFile)}” manually, paste the prompt, then send it.`;
    toast('Master Prompt copied. ChatGPT opened — attach your script and paste the prompt.', false, 9000);
    log(`Master Prompt copied and ChatGPT opened for script: ${basename(state.scriptFile)}.`, 'success');
  } catch (error) {
    showEngineError(error, 'Could not copy the Master Prompt or open ChatGPT.');
    $('script-prompt-status').textContent = userFacingErrorMessage(error);
  } finally {
    if (label) label.textContent = 'Copy Master Prompt & Open ChatGPT';
    button.disabled = !state.scriptFile;
  }
}
function closeProgress(success, message) {
  const kind = state.jobKind;
  if (!kind) return;
  if (state.jobClock) clearInterval(state.jobClock);
  state.jobClock = null; state.job = null; state.jobKind = null;
  if (kind === 'wfp') {
    if (success) { updateWfpProgress(100, 'Processing completed', message || 'Filmora project output completed.'); $('wfp-progress-status').textContent = 'COMPLETE'; $('wfp-progress-status').className = 'progress-status success'; }
    else { $('wfp-progress-status').textContent = 'FAILED'; $('wfp-progress-status').className = 'progress-status failed'; renderWfpStageList(Number.parseFloat($('wfp-progress-number').textContent) || 0, state.wfpOperation || 'export', 'failed'); $('wfp-progress-message').textContent = message || 'The engine returned an error.'; }
  } else {
    if (success) { updateProgress(100, 'Processing completed', message || 'All output validation steps completed.'); $('audio-progress-status').textContent = 'COMPLETE'; $('audio-progress-status').className = 'progress-status success'; }
    else { $('audio-progress-status').textContent = 'FAILED'; $('audio-progress-status').className = 'progress-status failed'; $('audio-progress-stage').textContent = 'Processing stopped'; $('audio-progress-message').textContent = message || 'The engine returned an error.'; }
  }
  updateAudioButtonState();
  updateTimelineButtonState();
}
function userFacingErrorMessage(error, fallback = 'The engine could not complete this operation.') {
  const raw = String(error?.userMessage || error?.message || fallback);
  const normalized = raw.replace(/^Error invoking remote method '[^']+': Error:\s*/, '');
  return normalized.split(/\r?\n/, 1)[0].trim() || fallback;
}
function showEngineError(error, fallback = 'The engine could not complete this operation.') {
  const message = userFacingErrorMessage(error, fallback);
  if (state.lastEngineError?.message === message) return;
  toast(message, true, 7800);
  log(message, 'error');
  if (error?.diagnostic) log(`Technical diagnostic: ${error.diagnostic}`, 'error');
}

async function startAudioEngine() {
  if (!state.audio || !state.mapping) { toast('Add both the voiceover audio and Visual Mapping CSV first.', true); return; }
  if (!state.runtime?.audio_engine_ready) { toast($('audio-engine-readiness').textContent, true, 8000); return; }
  const model = $('model-size').value;
  const device = 'cpu';
  const compute = 'int8';
  $('audio-output-result').hidden = true;
  $('start-audio').disabled = true;
  $('start-audio').querySelector('span').textContent = 'Processing…';
  openProgress('audio', 'Preparing voiceover analysis');
  log('Starting Audio Intelligence pipeline.');
  try {
    await window.framepilot.generateCsv({ audio: state.audio, mapping: state.mapping, model, compute, device, threads: 0, batch: 4 });
  } catch (error) {
    closeProgress(false, userFacingErrorMessage(error, 'Audio-to-CSV processing failed.'));
    showEngineError(error, 'Audio-to-CSV processing failed.');
  } finally {
    $('start-audio').querySelector('span').textContent = 'Generate CSV';
    updateAudioButtonState();
  }
}
async function analyzeWfp() {
  if (!state.wfp || !state.timelineCsv) { toast('Add a Filmora WFP project and Final Master CSV.', true); return; }
  state.analyzed = false; $('export-wfp').disabled = true;
  $('analysis-status').textContent = 'RUNNING'; $('analysis-status').className = 'runtime-check pending';
  $('analysis-message').textContent = 'Checking the project and CSV. The source project will not be changed.';
  ['metric-images', 'metric-markers', 'metric-fps', 'metric-duration'].forEach(id => $(id).textContent = '—');
  log('Starting non-destructive WFP structural analysis.');
  openProgress('wfp', 'Analyzing source Filmora project', 'analyze');
  try { await window.framepilot.analyzeWfp({ project: state.wfp, csv: state.timelineCsv, imageFolder: state.imageFolder }); }
  catch (error) { const message = userFacingErrorMessage(error, 'Filmora project analysis failed.'); if (!/cancelled by the user/i.test(message)) { closeProgress(false, message); showEngineError(error, 'Filmora project analysis failed.'); } $('analysis-status').textContent = /cancelled by the user/i.test(message) ? 'CANCELLED' : 'FAILED'; $('analysis-status').className = 'runtime-check'; $('analysis-message').textContent = message; }
}
async function exportWfp() {
  if (!state.analyzed || !state.wfp) { toast('Analyze the WFP project successfully before generating the output.', true); return; }
  const presets = $all('.motion-preset:checked').map(item => item.value);
  if (!presets.length) { toast('Select at least one motion preset.', true); return; }
  $('wfp-output-result').hidden = true;
  $('export-wfp').disabled = true;
  $('export-wfp').querySelector('span').textContent = 'Generating…';
  log('Generating a non-destructive Filmora output beside the source WFP.');
  openProgress('wfp', 'Generating editable Filmora output', 'export');
  try {
    state.outputWfp = await window.framepilot.prepareWfpOutput(state.wfp);
    $('output-wfp-name').textContent = state.outputWfp;
    $('output-wfp-name').title = state.outputWfp;
    await window.framepilot.exportWfp({ project: state.wfp, csv: state.timelineCsv, imageFolder: state.imageFolder, output: state.outputWfp, presets, mode: $('motion-mode').value, avoidRepeat: $('avoid-repeat').checked, seed: Number($('motion-seed').value || 20261101), strength: $('motion-strength').value });
  } catch (error) { const message = userFacingErrorMessage(error, 'Filmora output generation failed.'); if (!/cancelled by the user/i.test(message)) { closeProgress(false, message); showEngineError(error, 'Filmora output generation failed.'); } }
  finally { $('export-wfp').querySelector('span').textContent = 'Generate WFP'; $('export-wfp').disabled = !state.analyzed; }
}

function applyRuntime(runtime) {
  state.runtime = runtime;
  const audioReady = Boolean(runtime.audio_engine_ready);
  const setText = (id, text) => { const item = $(id); if (item) item.textContent = text; };
  setText('runtime-audio-sidebar', audioReady ? 'READY' : 'NOT READY');
  setText('runtime-timeline-sidebar', 'AVAILABLE');
  setText('runtime-state', audioReady ? 'READY' : 'INCOMPLETE');
  setText('runtime-sidebar-note', audioReady ? 'Ready' : (runtime.missing_components?.[0] || 'Engine needs attention'));
  setText('runtime-summary', audioReady ? 'READY' : 'AUDIO ENGINE NOT READY');
  setText('dashboard-runtime-label', audioReady ? 'READY' : 'NOT READY');
  setText('runtime-audio-card', audioReady ? 'READY' : 'SETUP REQUIRED');
  setText('runtime-timeline-card', 'AVAILABLE');
  const modelSelect = $('model-size');
  modelSelect.replaceChildren();
  if (runtime.asr_models?.length) {
    for (const item of runtime.asr_models) {
      const opt = document.createElement('option');
      opt.value = item.name;
      const friendly = { tiny: 'Fastest', base: 'Fast', small: 'Fast', medium: 'Balanced · recommended', 'large-v2': 'High accuracy', 'large-v3': 'Highest accuracy' };
      opt.textContent = friendly[item.name] || 'Available model';
      modelSelect.append(opt);
    }
    if (runtime.default_asr_model) modelSelect.value = runtime.default_asr_model;
    modelSelect.disabled = false;
  } else {
    const option = document.createElement('option'); option.value = 'medium'; option.textContent = 'Available with the official engine pack'; modelSelect.append(option); modelSelect.disabled = true;
  }
  if (!audioReady) $('audio-engine-readiness').textContent = runtimeReadinessReason(runtime);
  else $('audio-engine-readiness').textContent = 'Ready. Your Final Master CSV will be saved automatically in the default folder.';
  updateAudioButtonState();
  log(`Audio processing: ${audioReady ? 'ready' : 'not ready'}. Filmora timeline processing: available.`, audioReady ? 'success' : 'warning');
  for (const missing of runtime.missing_components || []) log(`Audio runtime: ${missing}`, 'warning');
}
async function refreshRuntime() {
  try {
    const result = await window.framepilot.getRuntimeInfo();
    if (result?.runtime) applyRuntime(result.runtime);
    else throw new Error('Runtime status response was incomplete.');
  } catch (error) {
    state.runtime = null;
    const summary = $('runtime-summary'); if (summary) summary.textContent = 'STATUS CHECK FAILED';
    const sidebarNote = $('runtime-sidebar-note'); if (sidebarNote) sidebarNote.textContent = 'Status could not be verified.';
    $('audio-engine-readiness').textContent = error.userMessage || error.message;
    updateAudioButtonState();
    log(`Runtime preflight failed: ${error.userMessage || error.message}`, 'error');
  }
}

function displayPath(value) {
  if (!value) return 'Documents / FramePilot Studio / CSV';
  return value.replace(/\\/g, ' / ').replace(/\//g, ' / ').replace(/\s+\/\s+/g, ' / ');
}
async function loadSettings() {
  try {
    state.settings = await window.framepilot.getSettings();
    const folder = state.settings.csvOutputDirectory;
    $('audio-output-directory').textContent = folder;
    $('audio-output-directory').title = folder;
    $('settings-csv-folder').textContent = folder;
    $('settings-csv-folder').title = folder;
    $('auto-check-updates').checked = state.settings.autoCheckUpdates !== false;
    $('auto-download-updates').checked = state.settings.autoDownloadUpdates !== false;
    $('large-text').checked = state.settings.largeText !== false;
    document.documentElement.classList.toggle('large-text', $('large-text').checked);
    $('reduced-motion').checked = state.settings.reducedMotion === true;
    document.documentElement.classList.toggle('reduce-motion', $('reduced-motion').checked);
  } catch (error) { log(`Could not load preferences: ${error.message}`, 'error'); }
}
async function changeCsvFolder() {
  try {
    const settings = await window.framepilot.chooseCsvFolder();
    if (!settings) return;
    state.settings = settings;
    $('audio-output-directory').textContent = settings.csvOutputDirectory;
    $('audio-output-directory').title = settings.csvOutputDirectory;
    $('settings-csv-folder').textContent = settings.csvOutputDirectory;
    $('settings-csv-folder').title = settings.csvOutputDirectory;
    toast('Default CSV folder saved. Future CSV files will use this folder.');
    log(`Default CSV destination changed: ${settings.csvOutputDirectory}`, 'success');
  } catch (error) { showEngineError(error, 'Could not save the default output folder.'); }
}
async function updatePreference(key, checked) {
  try { state.settings = await window.framepilot.setSettings({ [key]: checked }); log(`${key} ${checked ? 'enabled' : 'disabled'}.`, 'success'); }
  catch (error) { toast(error.message, true); }
}

function setUpdateSummary(title, detail, tone = 'info') {
  $('update-center-status').textContent = title;
  $('update-center-status').className = `update-status-text ${tone}`;
  $('update-center-detail').textContent = detail || '';
}
function addReleaseRow(release, latestVersion) {
  const row = document.createElement('div'); row.className = 'version-row';
  const info = document.createElement('div'); info.className = 'version-info';
  const title = document.createElement('strong'); title.textContent = release.name || `FramePilot Studio ${release.version}`;
  const detail = document.createElement('span');
  const badges = [];
  if (release.version === latestVersion) badges.push('LATEST');
  if (release.version === state.currentVersion) badges.push('INSTALLED');
  if (release.channel) badges.push(String(release.channel).toUpperCase());
  detail.textContent = `v${release.version}${release.published_at ? ` · ${new Date(release.published_at).toLocaleDateString()}` : ''}${badges.length ? ` · ${badges.join(' · ')}` : ''}`;
  info.append(title, detail);
  const button = document.createElement('button'); button.className = 'outline-button version-action';
  button.textContent = release.version === state.currentVersion ? 'Current version' : 'Switch to this version';
  button.disabled = release.version === state.currentVersion || !(release.installer?.url || release.download_url);
  button.addEventListener('click', () => downloadVersion(release.version));
  row.append(info, button); return row;
}
function renderVersions(releases, latestVersion) {
  const list = $('versions-list'); list.replaceChildren();
  if (!releases?.length) { list.hidden = false; const empty = document.createElement('p'); empty.className = 'versions-empty'; empty.textContent = 'No public releases are listed on the official website yet.'; list.append(empty); return; }
  for (const release of releases) list.append(addReleaseRow(release, latestVersion));
  list.hidden = false;
}
async function checkUpdates() {
  $('check-updates').disabled = true;
  setUpdateSummary('Checking official update channel…', 'Contacting framepilotstudio.github.io/updates/manifest.json');
  try {
    const result = await window.framepilot.checkUpdates();
    state.latestRelease = result.latest;
    state.releases = result.releases || [];
    setUpdateSummary(result.update_available ? `Update available: v${result.latest_version}` : (result.latest_version ? `You are using the latest version (v${result.current_version}).` : 'Official release channel is not published yet.'), `${result.release_count} published version(s) in the official catalogue. Downloads are verified with SHA-256 before switching.`, result.update_available ? 'gold' : (result.latest_version ? 'success' : 'info'));
    $('check-all-versions').disabled = false;
    log(`Update check complete: current v${result.current_version}, latest v${result.latest_version}.`, 'success');
    if (result.update_available) {
      renderVersions(result.releases, result.latest_version);
      if (result.latest?.installer?.url || result.latest?.download_url) {
        const btn = document.createElement('button'); btn.className = 'primary-button small-primary'; btn.textContent = `Download v${result.latest_version}`; btn.addEventListener('click', () => downloadVersion(result.latest_version));
        $('update-center-detail').append(' '); $('update-center-detail').append(btn);
      }
    }
    return result;
  } catch (error) {
    setUpdateSummary('Update catalogue not available', error.message, 'failed');
    log(`Update check failed: ${error.message}`, 'error');
    throw error;
  } finally { $('check-updates').disabled = false; }
}
async function checkAllVersions() {
  $('check-all-versions').disabled = true;
  setUpdateSummary('Loading version history…', 'Reading every public release from the official website.');
  try {
    const result = await window.framepilot.listVersions();
    state.releases = result.releases || [];
    renderVersions(state.releases, result.latest_version);
    setUpdateSummary(result.latest_version ? `${state.releases.length} version(s) found` : 'Official release channel is not published yet', result.latest_version ? `Latest published version: v${result.latest_version}. Choose any available release to download and switch versions.` : 'No public release is available yet. The version manager will become active when the website publishes its release catalogue.', result.latest_version ? 'success' : 'info');
    log(`Loaded ${state.releases.length} official release version(s).`, 'success');
  } catch (error) {
    setUpdateSummary('Version history unavailable', error.message, 'failed');
    log(`Could not load version history: ${error.message}`, 'error');
    toast(error.message, true);
  } finally { $('check-all-versions').disabled = false; }
}
async function downloadVersion(version) {
  setUpdateSummary(`Preparing v${version}`, 'The installer will be downloaded and SHA-256 verified before it can be opened.', 'gold');
  $('update-progress').hidden = false;
  $('update-progress-fill').style.width = '0%';
  $('update-progress-label').textContent = 'Starting secure download…';
  try {
    const staged = await window.framepilot.downloadVersion(version);
    state.stagedUpdate = staged;
    setUpdateSummary(`v${version} is ready to install`, 'SHA-256 and Windows publisher-signature verification passed. Start the installer to switch to this version.', 'success');
    $('update-progress-label').textContent = 'Download verified';
    $('update-progress-fill').style.width = '100%';
    showInstallButton();
    toast(`FramePilot Studio v${version} is downloaded and verified.`);
    log(`Staged version v${version}: ${staged.path}`, 'success');
  } catch (error) {
    setUpdateSummary(`Could not prepare v${version}`, error.message, 'failed');
    $('update-progress-label').textContent = 'Download stopped';
    showEngineError(error, 'Could not download the selected version.');
  }
}
function showInstallButton() {
  let btn = $('install-staged-update');
  if (!btn) {
    btn = document.createElement('button'); btn.id = 'install-staged-update'; btn.className = 'primary-button small-primary';
    $('update-actions-slot').append(btn);
  }
  btn.textContent = `Install / Switch to v${state.stagedUpdate.version}`;
  btn.hidden = false;
  btn.onclick = async () => {
    const confirmed = window.confirm(`FramePilot Studio will open the verified installer for version ${state.stagedUpdate.version}. Continue?`);
    if (!confirmed) return;
    try { await window.framepilot.installUpdate(); } catch (error) { showEngineError(error, 'Could not launch the installer.'); }
  };
}
function handleUpdateEvent(event) {
  if (event.channel === 'updates:checked') {
    const result = event;
    state.latestRelease = result.latest;
    if (result.update_available) setUpdateSummary(`Update available: v${result.latest_version}`, 'The application checked the official website in the background.', 'gold');
    else setUpdateSummary(result.latest_version ? `Up to date · v${result.current_version}` : 'Official release channel is not published yet', `${result.release_count} official release(s) indexed.`, result.latest_version ? 'success' : 'info');
  }
  if (event.channel === 'updates:download-progress') {
    const percent = event.percent;
    $('update-progress').hidden = false;
    if (Number.isFinite(percent)) $('update-progress-fill').style.width = `${Math.max(0, Math.min(100, percent))}%`;
    $('update-progress-label').textContent = event.message || (Number.isFinite(percent) ? `Downloading ${Math.round(percent)}%` : 'Preparing update…');
    setUpdateSummary('Preparing a verified update…', event.message || 'Background update process is active.', 'gold');
  }
  if (event.channel === 'updates:downloaded') {
    state.stagedUpdate = { version: event.version, path: event.path, sha256: event.sha256, bytes: event.bytes };
    $('update-progress').hidden = false; $('update-progress-fill').style.width = '100%'; $('update-progress-label').textContent = 'Download and publisher signature verified';
    setUpdateSummary(`v${event.version} is ready`, 'The SHA-256 checksum and publisher signature passed. Install when you are ready.', 'success');
    showInstallButton();
    toast(`Update v${event.version} downloaded and verified.`);
  }
  if (event.channel === 'updates:error') { setUpdateSummary('Update service unavailable', event.message, 'failed'); if (!event.automatic) toast(event.message, true); }
}

function bindGeneralControls() {
  $all('[data-page]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.page)));
  $all('[data-navigate]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.navigate)));
  $all('[data-open]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.open)));
  $('clear-log').addEventListener('click', () => { state.log = []; renderLog(); });
  $('reduced-motion').addEventListener('change', async event => {
    document.documentElement.classList.toggle('reduce-motion', event.target.checked);
    const art = document.querySelector('.orbit-art'); if (art) art.src = event.target.checked ? './assets/production-orbit-static.svg' : './assets/production-orbit.svg';
    await updatePreference('reducedMotion', event.target.checked);
  });
  $('large-text').addEventListener('change', async event => {
    document.documentElement.classList.toggle('large-text', event.target.checked);
    await updatePreference('largeText', event.target.checked);
  });
  $('official-home-link')?.addEventListener('click', event => { event.preventDefault(); window.framepilot.openOfficialHome(); });
  $('open-download-page')?.addEventListener('click', () => window.framepilot.openDownloadPage());
  $('start-audio').addEventListener('click', startAudioEngine);
  $('cancel-audio-job').addEventListener('click', async () => {
    try { await window.framepilot.cancelJob(); $('audio-progress-status').textContent = 'CANCELLING'; $('audio-progress-message').textContent = 'Stopping the local processing engine…'; }
    catch (error) { showEngineError(error, 'Could not cancel the job.'); }
  });
  $('cancel-wfp-job').addEventListener('click', async () => { try { await window.framepilot.cancelJob(); $('wfp-progress-status').textContent = 'CANCELLING'; $('wfp-progress-message').textContent = 'Stopping the Filmora engine…'; } catch (error) { showEngineError(error); } });
  $('analyze-wfp').addEventListener('click', analyzeWfp);
  $('export-wfp').addEventListener('click', exportWfp);
  $('copy-mapping-prompt').addEventListener('click', copyScriptPromptAndOpenChatGPT);
  $all('[data-output-copy]').forEach(button => button.addEventListener('click', () => copyOutputPath(button.dataset.outputCopy)));
  $all('[data-output-reveal]').forEach(button => button.addEventListener('click', () => revealOutput(button.dataset.outputReveal)));
  $('change-csv-folder').addEventListener('click', changeCsvFolder);
  $('auto-check-updates').addEventListener('change', event => updatePreference('autoCheckUpdates', event.target.checked));
  $('auto-download-updates').addEventListener('change', event => updatePreference('autoDownloadUpdates', event.target.checked));
  $('check-updates').addEventListener('click', () => checkUpdates().catch(() => {}));
  $('check-all-versions').addEventListener('click', checkAllVersions);
  $('check-all-versions').disabled = false;
}

window.framepilot.onJobEvent(event => {
  if (event.event === 'progress') {
    if (state.jobKind === 'wfp') { updateWfpProgress(event.percent, event.message, event.message); $('wfp-progress-status').textContent = `${Math.round(event.percent || 0)}%`; }
    else if (state.jobKind === 'audio') { updateProgress(event.percent, event.message, event.message); $('audio-progress-status').textContent = `${Math.round(event.percent || 0)}%`; }
    else log(`${Math.round(event.percent || 0)}% — ${event.message || 'Processing'}`);
  }
  if (event.event === 'result') {
    if (event.runtime) applyRuntime(event.runtime);
    if (event.report) {
      const report = event.report;
      log(`CSV verified: ${report.rows} rows / ${report.columns} columns; ${report.issues?.length || 0} QA note(s).`, report.can_continue ? 'success' : 'error');
    }
    if (event.csv_output) {
      const result = event.csv_output;
      state.audioOutput = result.output;
      setOutputResult('audio', result.output);
      $('audio-output-directory').textContent = result.output;
      $('audio-output-directory').title = result.output;
      closeProgress(true, `Final Master CSV created: ${basename(result.output)} · ${result.rows} images · ${result.language}`);
      toast(`Final Master CSV created: ${result.rows} images.`, false, 7000);
      log(`Final Master CSV: ${result.output}; alignment status ${JSON.stringify(result.statuses)}.`, 'success');
    }
    if (event.analysis) {
      closeProgress(true, 'Filmora project structure passed validation.');
      state.analysis = event.analysis; state.analyzed = true;
      $('export-wfp').disabled = false;
      const a = event.analysis;
      $('metric-images').textContent = a.image_count; $('metric-markers').textContent = a.marker_count;
      $('metric-fps').textContent = Number(a.fps).toFixed(3); $('metric-duration').textContent = `${Number(a.audio_end_seconds).toFixed(2)}s`;
      $('analysis-status').textContent = 'ANALYSIS PASSED'; $('analysis-status').className = 'runtime-check success';
      $('analysis-message').textContent = `Detected ${a.image_count} image clips and ${a.marker_count} native markers. Alignment source: ${a.alignment_source}. ${a.warnings?.length || 0} warning(s).`;
      log('WFP structural analysis completed.', 'success');
    }
    if (event.export) {
      closeProgress(true, 'Motion effects applied and editable WFP output verified.');
      state.outputWfp = event.export.output;
      $('output-wfp-name').textContent = event.export.output; $('output-wfp-name').title = event.export.output;
      setOutputResult('wfp', event.export.output);
      $('export-wfp').disabled = false;
      toast('New Filmora project generated. The source project remains untouched.', false, 8000);
      log(`Generated Filmora project: ${event.export.output}`, 'success');
    }
  }
  if (event.event === 'cancelled') {
    const kind = state.jobKind;
    if (kind) {
      if (state.jobClock) clearInterval(state.jobClock);
      state.jobClock = null; state.job = null; state.jobKind = null;
      const prefix = kind === 'wfp' ? 'wfp' : 'audio';
      $(`${prefix}-progress-status`).textContent = 'CANCELLED';
      $(`${prefix}-progress-status`).className = 'progress-status';
      $(`${prefix}-progress-stage`).textContent = 'Processing cancelled';
      $(`${prefix}-progress-message`).textContent = 'The engine was stopped safely. No estimated output was written.';
      updateAudioButtonState(); updateTimelineButtonState();
      log('Processing cancelled by user.', 'warning');
    }
  }
  if (event.event === 'error') {
    state.lastEngineError = event;
    if (state.job) closeProgress(false, event.message || 'The processing engine returned an error.');
    log(`Engine error: ${event.message || 'Unknown engine error'}`, 'error');
    if (event.detail) log(`Diagnostic: ${event.detail}`, 'error');
    if (!state.errorToastAt || Date.now() - state.errorToastAt > 1800) { toast(event.message || 'The processing engine stopped. See Activity & QA for details.', true, 9000); state.errorToastAt = Date.now(); }
  }
});
window.framepilot.onJobLog(event => log(event.message, event.level || 'info'));
window.framepilot.onUpdateEvent(handleUpdateEvent);

async function init() {
  bindGeneralControls(); bindInputButtons(); renderLog();
  updateTimelineButtonState();
  state.currentVersion = await window.framepilot.getVersion().catch(() => '0.1.4');
  $('app-version').textContent = `v${state.currentVersion}`;
  await Promise.all([loadSettings(), refreshRuntime()]);
}
init().catch(error => { toast(error.message, true); log(error.message, 'error'); });
