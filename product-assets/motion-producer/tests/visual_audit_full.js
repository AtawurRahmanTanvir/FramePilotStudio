const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerMotionService } = require('../src/main/motion-service');

app.disableHardwareAcceleration();

const outDir = path.join(__dirname, '../product-assets/motion-producer/tests/visual_audit');
fs.mkdirSync(outDir, { recursive: true });

const resolutions = [
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' }
];

const pages = [
  'motion-overview',
  'motion-word-timing',
  'motion-claude-kit',
  'motion-import',
  'motion-render',
  'motion-project-manager',
  'motion-render-history',
  'motion-runtime-manager'
];

let mainWindow = null;

function mockBaseHandlers() {
  const handlers = {
    'app:version': () => '0.1.4',
    'app:get-settings': () => ({
      csvOutputDirectory: 'E:/FramePilot_Studio/projects',
      defaultCsvOutputDirectory: 'E:/FramePilot_Studio/projects'
    }),
    'engine:runtime-info': () => ({
      pythonReady: true,
      ffmpegReady: true,
      modelsReady: true
    }),
    'engine:cancel': () => true,
    'updates:check': () => ({ updateAvailable: false }),
    'app:set-settings': () => true,
  };

  for (const [ch, fn] of Object.entries(handlers)) {
    try {
      ipcMain.handle(ch, fn);
    } catch {}
  }
}

app.whenReady().then(async () => {
  mockBaseHandlers();

  const mockApp = {
    getPath: (name) => {
      try {
        return app.getPath(name);
      } catch {
        const p = path.join(__dirname, '../product-assets/motion-producer/tests/visual_audit_temp', name);
        fs.mkdirSync(p, { recursive: true });
        return p;
      }
    },
    getVersion: () => '0.1.4'
  };

  // Register real motion service
  registerMotionService({
    handle: (ch, fn) => {
      try { ipcMain.handle(ch, fn); } catch {}
    },
    app: mockApp,
    dialog: {},
    shell: { openExternal: () => {} },
    clipboard: { writeText: () => {} },
    appRoot: path.resolve(__dirname, '..'),
    isDev: true,
    getMainWindow: () => mainWindow
  });

  const auditReport = [];

  for (const res of resolutions) {
    console.log(`\n=== AUDITING RESOLUTION: ${res.label} ===`);
    mainWindow = new BrowserWindow({
      width: res.width,
      height: res.height,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../src/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    });

    const indexPath = path.join(__dirname, '../src/renderer/index.html');
    await mainWindow.loadFile(indexPath);
    await new Promise(r => setTimeout(r, 1200));

    for (const pageId of pages) {
      // Navigate to the target Motion page
      const navResult = await mainWindow.webContents.executeJavaScript(`
        (() => {
          const btn = document.querySelector('[data-motion-page="${pageId}"]');
          if (btn) {
            btn.click();
            const pageEl = document.getElementById('page-${pageId}');
            const body = document.body;
            const hasHOverflow = body.scrollWidth > body.clientWidth;
            return {
              clicked: true,
              active: pageEl ? pageEl.classList.contains('active') : false,
              hasHOverflow,
              scrollWidth: body.scrollWidth,
              clientWidth: body.clientWidth
            };
          }
          return { clicked: false };
        })()
      `);

      await new Promise(r => setTimeout(r, 600));

      const screenshot = await mainWindow.webContents.capturePage();
      const filename = `audit_${res.label}_${pageId}.png`;
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, screenshot.toPNG());

      const item = {
        resolution: res.label,
        page: pageId,
        navigated: navResult.clicked && navResult.active,
        horizontalOverflow: navResult.hasHOverflow,
        filename,
        sizeBytes: screenshot.toPNG().length
      };
      auditReport.push(item);
      console.log(`  [${navResult.active ? 'PASS' : 'FAIL'}] Page: ${pageId} | Overflow: ${navResult.hasHOverflow ? 'YES (Defect)' : 'NO (Clean)'} | Size: ${item.sizeBytes} bytes`);
    }

    mainWindow.close();
  }

  const reportPath = path.join(outDir, 'AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`\nVisual audit complete. ${auditReport.length} views captured.`);
  console.log(`Saved report to ${reportPath}`);
  app.quit();
}).catch(err => {
  console.error('VISUAL AUDIT ERROR:', err);
  app.quit();
});
