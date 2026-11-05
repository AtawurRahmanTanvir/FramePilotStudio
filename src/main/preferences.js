// FPSTUDIO-ORIGINAL-SOURCE
// Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

function settingsFile() { return path.join(app.getPath('userData'), 'settings.json'); }
function defaultCsvDirectory() { return path.join(app.getPath('documents'), 'FramePilot Studio', 'CSV'); }
function readSettings() {
  const fallback = { csvOutputDirectory: defaultCsvDirectory(), autoCheckUpdates: true, autoDownloadUpdates: true, largeText: true, reducedMotion: false, claudeProjectUrl: '' };
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    return { ...fallback, ...parsed, csvOutputDirectory: path.resolve(parsed.csvOutputDirectory || fallback.csvOutputDirectory) };
  } catch { return fallback; }
}
function writeSettings(patch) {
  const current = readSettings();
  const next = { ...current };
  if (typeof patch.csvOutputDirectory === 'string' && patch.csvOutputDirectory.trim()) {
    next.csvOutputDirectory = path.resolve(patch.csvOutputDirectory.trim());
    fs.mkdirSync(next.csvOutputDirectory, { recursive: true });
  }
  if (typeof patch.autoCheckUpdates === 'boolean') next.autoCheckUpdates = patch.autoCheckUpdates;
  if (typeof patch.autoDownloadUpdates === 'boolean') next.autoDownloadUpdates = patch.autoDownloadUpdates;
  if (typeof patch.largeText === 'boolean') next.largeText = patch.largeText;
  if (typeof patch.reducedMotion === 'boolean') next.reducedMotion = patch.reducedMotion;
  if (typeof patch.claudeProjectUrl === 'string') next.claudeProjectUrl = patch.claudeProjectUrl.trim();
  const file = settingsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(temp, file);
  return next;
}
function uniquePath(dir, stem, ext) {
  fs.mkdirSync(dir, { recursive: true });
  let candidate = path.join(dir, `${stem}${ext}`);
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem}_${String(index).padStart(2, '0')}${ext}`);
    index += 1;
  }
  return candidate;
}
function createCsvOutputPath(mappingPath) {
  const settings = readSettings();
  const mappingName = path.basename(mappingPath || 'Visual_Mapping', path.extname(mappingPath || ''));
  const safeStem = mappingName.replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^[_ .]+|[_ .]+$/g, '').slice(0, 80) || 'Visual_Mapping';
  return uniquePath(settings.csvOutputDirectory, `${safeStem}_FinalMaster`, '.csv');
}
function createWfpOutputPath(sourceProject, appVersion) {
  const source = path.resolve(sourceProject);
  const parsed = path.parse(source);
  const stem = `${parsed.name}_FramePilotStudio_Enhanced_v${appVersion}`;
  return uniquePath(parsed.dir, stem, parsed.ext || '.wfp');
}
module.exports = { readSettings, writeSettings, defaultCsvDirectory, createCsvOutputPath, createWfpOutputPath };
