import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const execFileAsync = promisify(execFile);

function emit(event, payload = {}) {
  process.stdout.write(`${JSON.stringify({ event, ...payload })}\n`);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    result[arg.slice(2)] = argv[i + 1];
    i += 1;
  }
  return result;
}

function safeJoin(root, relative) {
  if (typeof relative !== 'string' || !relative.trim()) throw new Error('Manifest path is missing.');
  const normalized = relative.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe project-relative path: ${relative}`);
  }
  const target = path.resolve(root, ...normalized.split('/'));
  const rel = path.relative(path.resolve(root), target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`Path escapes project root: ${relative}`);
  return target;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(args.project || '');
  const mode = args.mode === 'preview' ? 'preview' : 'render';
  const output = path.resolve(args.output || '');
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) throw new Error('Project folder does not exist.');
  if (!output) throw new Error('Output file path is required.');
  const outputRoot = path.join(projectRoot, 'outputs');
  const outputRelative = path.relative(outputRoot, output);
  if (outputRelative.startsWith('..') || path.isAbsolute(outputRelative)) throw new Error("Render output must remain inside the selected project outputs folder.");
  if (fs.existsSync(output)) throw new Error('Refusing to overwrite an existing render output.');
  const manifestPath = path.join(projectRoot, 'motion-project.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entryPoint = safeJoin(projectRoot, manifest.entryPoint);
  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(entryPoint)) throw new Error(`Remotion entry point is missing: ${manifest.entryPoint}`);
  if (manifest.remotionVersion !== '4.0.540') throw new Error(`Unsupported Remotion version: ${manifest.remotionVersion}`);
  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) throw new Error('package.json is missing from the imported project.');

  const workerRoot = path.dirname(fileURLToPath(import.meta.url));
  const cacheRoot = path.join(workerRoot, '.bundle-cache');
  fs.mkdirSync(cacheRoot, { recursive: true });
  const bundleDir = path.join(cacheRoot, `${path.basename(projectRoot).replace(/[^A-Za-z0-9._-]/g, '-')}-${Date.now()}`);
  const browserExecutable = process.env.FRAMEPILOT_MOTION_BROWSER;
  if (!browserExecutable || !fs.existsSync(browserExecutable)) throw new Error('Bundled Chromium Headless Shell is missing.');
  const binariesDirectory = process.env.FRAMEPILOT_MOTION_COMPOSITOR_DIRECTORY || path.join(workerRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc');
  const compositorPackage = path.join(binariesDirectory, 'package.json');
  if (!fs.existsSync(compositorPackage)) {
    throw new Error('The pinned @remotion/compositor-win32-x64-msvc package is missing. It supplies Remotion FFmpeg/FFprobe, native renderer and required Windows libraries.');
  }
  const compositorManifest = JSON.parse(fs.readFileSync(compositorPackage, 'utf8'));
  if (compositorManifest.version !== '4.0.540') {
    throw new Error(`The Windows Remotion compositor must be 4.0.540; found ${compositorManifest.version || 'unknown'}.`);
  }

  emit('progress', { percent: 2, stage: 'bundle', message: 'Compiling the imported Remotion project' });
  const bundleOptions = {
    entryPoint,
    rootDir: projectRoot,
    outDir: bundleDir,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        modules: [path.join(workerRoot, 'node_modules'), ...(config.resolve?.modules || ['node_modules'])],
      },
    }),
    publicDir: fs.existsSync(publicDir) ? publicDir : undefined,
    onProgress: (progress) => {
      const value = Math.max(0, Math.min(1, Number(progress) || 0));
      emit('progress', { percent: Math.round(2 + value * 20), stage: 'bundle', message: `Bundling Remotion project (${Math.round(value * 100)}%)` });
    },
  };
  const serveUrl = await bundle(bundleOptions);

  const composition = await selectComposition({
    serveUrl,
    id: String(manifest.compositionId),
    inputProps: manifest.inputProps || {},
    browserExecutable,
    binariesDirectory,
  });
  if (composition.width !== Number(manifest.width) || composition.height !== Number(manifest.height) || composition.fps !== Number(manifest.fps)) {
    throw new Error('Imported Composition settings do not match motion-project.json. Update the manifest or composition.');
  }
  if (composition.durationInFrames !== Number(manifest.durationInFrames)) {
    throw new Error('Imported Composition duration does not match motion-project.json. Update the manifest or composition.');
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (mode === 'preview') {
    emit('progress', { percent: 25, stage: 'preview', message: 'Rendering low-resolution preview' });
  } else {
    emit('progress', { percent: 25, stage: 'render', message: 'Starting final-quality render' });
  }

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: output,
    browserExecutable,
    binariesDirectory,
    inputProps: manifest.inputProps || {},
    concurrency: Math.max(1, Math.min(4, Math.floor((os.cpus()?.length || 2) / 2))),
    imageFormat: 'jpeg',
    pixelFormat: 'yuv420p',
    crf: mode === 'preview' ? 26 : 18,
    scale: mode === 'preview' ? 0.5 : 1,
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const value = Math.max(0, Math.min(1, Number(progress) || 0));
      emit('progress', {
        percent: Math.round(25 + value * 74),
        stage: mode,
        message: `${mode === 'preview' ? 'Preview' : 'Render'} ${Math.round(value * 100)}% · ${renderedFrames || 0}/${composition.durationInFrames} frames`,
        renderedFrames: renderedFrames || 0,
        encodedFrames: encodedFrames || 0,
      });
    },
  });

  if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
    throw new Error('Remotion completed without producing a non-empty output file.');
  }
  const ffprobePath = path.join(binariesDirectory, 'ffprobe.exe');
  if (!fs.existsSync(ffprobePath)) throw new Error('FFprobe is missing; output verification cannot be completed.');
  let probe;
  try {
    const result = await execFileAsync(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration,size',
      '-of', 'json',
      output,
    ], { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
    probe = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Rendered output failed FFprobe verification: ${error.message}`);
  }
  const duration = Number(probe?.format?.duration);
  const size = Number(probe?.format?.size);
  const expectedDuration = Number(composition.durationInFrames) / Number(composition.fps);
  if (!Number.isFinite(duration) || !Number.isFinite(size) || size <= 0 || duration <= 0 || Math.abs(duration - expectedDuration) > (1 / Number(composition.fps)) + 0.05) {
    throw new Error(`Rendered output failed duration/size verification (duration=${duration}, expected=${expectedDuration}, size=${size}).`);
  }

  const stillPath = output.replace(/\.mp4$/i, '_first-frame.png');
  try {
    await renderStill({
      composition,
      serveUrl,
      output: stillPath,
      frame: 0,
      browserExecutable,
      binariesDirectory,
      inputProps: manifest.inputProps || {},
    });
  } catch (error) {
    emit('warning', { message: `MP4 rendered, but first-frame QA still failed: ${error.message}` });
  }
  emit('progress', { percent: 100, stage: 'complete', message: 'Render completed' });
  emit('result', {
    output,
    still: fs.existsSync(stillPath) ? stillPath : null,
    mode,
    compositionId: composition.id,
    durationInFrames: composition.durationInFrames,
    outputDurationSeconds: duration,
    outputSizeBytes: size,
  });
}

main().catch((error) => {
  emit('error', { message: error?.message || String(error), stack: error?.stack || '' });
  process.exitCode = 1;
});
