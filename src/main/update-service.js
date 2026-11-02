// FPSTUDIO-ORIGINAL-SOURCE
// Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { pipeline } = require('node:stream/promises');
const { spawnSync } = require('node:child_process');
const { app } = require('electron');

// The official website is the sole update catalogue and download entry point.
const SITE_ORIGIN = 'https://framepilotstudio.github.io';
const MANIFEST_URL = `${SITE_ORIGIN}/updates/manifest.json`;
const VERSIONS_URL = `${SITE_ORIGIN}/updates/versions.json`;
const MAX_INSTALLER_BYTES = 8 * 1024 * 1024 * 1024;

function parseVersion(value) {
  const match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return { major: +match[1], minor: +match[2], patch: +match[3], pre: match[4] ? match[4].split('.') : [] };
}
function compareVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  for (const key of ['major', 'minor', 'patch']) if (x[key] !== y[key]) return x[key] > y[key] ? 1 : -1;
  if (!x.pre.length && y.pre.length) return 1;
  if (x.pre.length && !y.pre.length) return -1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    if (x.pre[i] === undefined) return -1;
    if (y.pre[i] === undefined) return 1;
    if (x.pre[i] === y.pre[i]) continue;
    const xn = /^\d+$/.test(x.pre[i]), yn = /^\d+$/.test(y.pre[i]);
    if (xn && yn) return +x.pre[i] > +y.pre[i] ? 1 : -1;
    if (xn !== yn) return xn ? -1 : 1;
    return x.pre[i].localeCompare(y.pre[i]);
  }
  return 0;
}
async function getJson(url) {
  const response = await fetch(url, { headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': `FramePilot-Studio/${app.getVersion()}` }, signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`Official update service returned HTTP ${response.status} for ${new URL(url).pathname}`);
  const text = await response.text();
  if (text.length > 5 * 1024 * 1024) throw new Error('Update catalogue is unexpectedly large; request stopped.');
  try { return JSON.parse(text); } catch { throw new Error(`Invalid JSON from official update service: ${url}`); }
}
function validateCatalog(manifest, versions) {
  if (manifest.product !== 'FramePilot Studio' || manifest.schema_version !== 1) throw new Error('This update catalogue is not a supported FramePilot Studio catalogue.');
  if (!Array.isArray(versions)) throw new Error('The official versions catalogue must be a JSON array.');
  const seen = new Set();
  const releases = versions.map(item => {
    const version = String(item.version || '').replace(/^v/i, '');
    parseVersion(version);
    if (seen.has(version)) throw new Error(`Duplicate release version in catalogue: ${version}`);
    seen.add(version);
    return { ...item, version };
  }).sort((a, b) => compareVersions(b.version, a.version));
  if (!releases.length && manifest.status === 'not-published') return { releases, latest: null };
  if (!releases.length) throw new Error('No published versions are currently listed on the official website.');
  const latest = String(manifest.latest_version || '').replace(/^v/i, '');
  parseVersion(latest);
  if (!releases.some(item => item.version === latest)) throw new Error('The latest version in manifest.json is missing from versions.json.');
  return { releases, latest };
}
async function fetchCatalog() {
  const [manifest, versions] = await Promise.all([getJson(MANIFEST_URL), getJson(VERSIONS_URL)]);
  const checked = validateCatalog(manifest, versions);
  return { manifest, ...checked };
}
async function checkForUpdates(currentVersion) {
  const catalog = await fetchCatalog();
  const latest = catalog.latest ? catalog.releases.find(item => item.version === catalog.latest) : null;
  return { current_version: currentVersion, latest_version: catalog.latest, update_available: Boolean(catalog.latest && compareVersions(catalog.latest, currentVersion) > 0), latest, release_count: catalog.releases.length, releases: catalog.releases.map(({ version, name, published_at, channel, notes, notes_url, installer, size_bytes }) => ({ version, name, published_at, channel, notes, notes_url, installer, size_bytes })), download_page: catalog.manifest.download_page || `${SITE_ORIGIN}/download/` };
}
async function listVersions() {
  const catalog = await fetchCatalog();
  return { latest_version: catalog.latest, releases: catalog.releases, download_page: catalog.manifest.download_page || `${SITE_ORIGIN}/download/` };
}
function allowedDownloadUrl(raw) {
  const url = new URL(raw, SITE_ORIGIN);
  const allowed = new Set(['framepilotstudio.github.io', 'github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com']);
  if (url.protocol !== 'https:' || !allowed.has(url.hostname)) throw new Error('Installer URL is not hosted on an approved HTTPS distribution domain.');
  return url;
}
function verifyWindowsAuthenticode(installerPath, expectedThumbprint) {
  if (process.platform !== 'win32') throw new Error('Windows installer signature verification is available only on Windows.');
  const expected = String(expectedThumbprint || '').replace(/\s+/g, '').toUpperCase();
  if (!/^(?:[A-F0-9]{40}|[A-F0-9]{64})$/.test(expected)) {
    throw new Error('The official release catalogue does not contain a valid code-signing publisher thumbprint. The installer cannot be trusted yet.');
  }
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$signature = Get-AuthenticodeSignature -LiteralPath $env:FRAMEPILOT_INSTALLER_PATH",
    "if ($signature.Status -ne 'Valid') { [Console]::Error.WriteLine(('Authenticode status: ' + $signature.Status + ' — ' + $signature.StatusMessage)); exit 31 }",
    "$actual = ($signature.SignerCertificate.Thumbprint -replace '\s','').ToUpperInvariant()",
    "if ($actual -ne $env:FRAMEPILOT_EXPECTED_THUMBPRINT) { [Console]::Error.WriteLine(('Publisher thumbprint mismatch: ' + $actual)); exit 32 }",
    "[Console]::Out.WriteLine($actual)"
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8', windowsHide: true, timeout: 30000,
    env: { ...process.env, FRAMEPILOT_INSTALLER_PATH: path.resolve(installerPath), FRAMEPILOT_EXPECTED_THUMBPRINT: expected }
  });
  if (result.error) throw new Error(`Could not verify the Windows installer signature: ${result.error.message}`);
  if (result.status !== 0) throw new Error((result.stderr || 'Windows Authenticode signature validation failed.').trim());
  return { valid: true, publisher_thumbprint: String(result.stdout || '').trim() };
}
function downloadToFile(rawUrl, destination, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    const url = allowedDownloadUrl(rawUrl);
    const request = https.get(url, { headers: { 'User-Agent': `FramePilot-Studio/${app.getVersion()}` } }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
        response.resume();
        if (redirects >= 6) return reject(new Error('Too many redirects while downloading the installer.'));
        return resolve(downloadToFile(new URL(response.headers.location, url).toString(), destination, onProgress, redirects + 1));
      }
      if (response.statusCode !== 200) { response.resume(); return reject(new Error(`Installer download failed with HTTP ${response.statusCode}.`)); }
      const total = Number(response.headers['content-length'] || 0);
      if (total > MAX_INSTALLER_BYTES) { response.resume(); return reject(new Error('Installer exceeds the 8 GB safety limit. Download stopped.')); }
      let received = 0;
      const output = fs.createWriteStream(destination);
      response.on('data', chunk => { received += chunk.length; if (received > MAX_INSTALLER_BYTES) { request.destroy(new Error('Installer exceeded the 8 GB safety limit.')); output.destroy(new Error('Installer exceeded the 8 GB safety limit.')); return; } onProgress?.({ received, total, percent: total ? Math.min(100, received / total * 100) : null }); });
      pipeline(response, output).then(() => resolve({ received, total })).catch(reject);
    });
    request.setTimeout(30000, () => request.destroy(new Error('Installer download timed out.')));
    request.on('error', reject);
  });
}
async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}
async function verifyStagedInstaller(staged) {
  if (!staged?.path || !fs.existsSync(staged.path) || !fs.statSync(staged.path).isFile()) throw new Error('The downloaded installer file is missing. Download it again from the official catalogue.');
  if (path.extname(staged.path).toLowerCase() !== '.exe') throw new Error('The staged update is not a Windows executable installer.');
  const expectedHash = String(staged.sha256 || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('The staged update does not contain a valid SHA-256 verification record.');
  const actualHash = await hashFile(staged.path);
  if (actualHash !== expectedHash) throw new Error('The staged installer changed after download. SHA-256 verification failed; download it again.');
  const signature = verifyWindowsAuthenticode(staged.path, staged.publisher_thumbprint);
  return { sha256: actualHash, ...signature };
}

async function downloadRelease(version, onProgress) {
  const catalog = await fetchCatalog();
  const release = catalog.releases.find(item => item.version === version);
  if (!release) throw new Error(`Version ${version} is not listed on the official website.`);
  const installer = release.installer || {};
  const url = installer.url || release.download_url;
  const expectedHash = String(installer.sha256 || release.sha256 || '').toLowerCase();
  const publisherThumbprint = String(installer.publisher_thumbprint || release.publisher_thumbprint || '').replace(/\s+/g, '').toUpperCase();
  if (!url) throw new Error(`The official website has not published a Windows installer URL for version ${version} yet.`);
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error(`The official website has not published a valid SHA-256 checksum for version ${version}. Download stopped for safety.`);
  if (!/^(?:[A-F0-9]{40}|[A-F0-9]{64})$/.test(publisherThumbprint)) throw new Error(`The official website has not published the approved code-signing publisher thumbprint for version ${version}. The installer cannot be authenticated, so the download was stopped.`);
  const safeUrl = allowedDownloadUrl(url);
  if (!safeUrl.pathname.toLowerCase().endsWith('.exe')) throw new Error(`Version ${version} does not provide a Windows .exe installer. The version switch was stopped.`);
  const ext = '.exe';
  const updateDir = path.join(app.getPath('userData'), 'updates', version);
  fs.mkdirSync(updateDir, { recursive: true });
  const dest = path.join(updateDir, `FramePilot-Studio-${version}${ext}`);
  const part = `${dest}.download`;
  try {
    onProgress?.({ stage: 'download', percent: 0, message: `Downloading FramePilot Studio ${version}` });
    const result = await downloadToFile(safeUrl.toString(), part, progress => onProgress?.({ stage: 'download', ...progress, message: 'Downloading installer' }));
    const hash = crypto.createHash('sha256');
    await new Promise((resolve, reject) => { const stream = fs.createReadStream(part); stream.on('data', chunk => hash.update(chunk)); stream.on('error', reject); stream.on('end', resolve); });
    const actualHash = hash.digest('hex');
    if (actualHash !== expectedHash) throw new Error(`Installer SHA-256 mismatch. Expected ${expectedHash}, received ${actualHash}.`);
    onProgress?.({ stage: 'signature', percent: 100, message: 'Checking the Windows publisher signature' });
    const signature = verifyWindowsAuthenticode(part, publisherThumbprint);
    fs.renameSync(part, dest);
    onProgress?.({ stage: 'verified', percent: 100, message: `Version ${version} SHA-256 and publisher signature verified` });
    return { version, path: dest, bytes: result.received, sha256: actualHash, publisher_thumbprint: signature.publisher_thumbprint, name: release.name || `FramePilot Studio ${version}` };
  } catch (error) {
    try { fs.rmSync(part, { force: true }); } catch {}
    throw error;
  }
}
module.exports = { MANIFEST_URL, VERSIONS_URL, compareVersions, checkForUpdates, listVersions, downloadRelease, verifyWindowsAuthenticode, verifyStagedInstaller };
