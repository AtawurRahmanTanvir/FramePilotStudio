// FPSTUDIO-ORIGINAL-SOURCE
// Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('framepilot', {
  openDialog: options => ipcRenderer.invoke('dialog:open', options),
  saveDialog: options => ipcRenderer.invoke('dialog:save', options),
  chooseFolder: title => ipcRenderer.invoke('dialog:choose-folder', title),
  getRuntimeInfo: () => ipcRenderer.invoke('engine:runtime-info'),
  validateCsv: file => ipcRenderer.invoke('engine:csv-validate', file),
  generateCsv: input => ipcRenderer.invoke('engine:generate-csv', input),
  analyzeWfp: input => ipcRenderer.invoke('engine:wfp-analyze', input),
  exportWfp: input => ipcRenderer.invoke('engine:wfp-export', input),
  cancelJob: () => ipcRenderer.invoke('engine:cancel'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  getFileInfo: file => ipcRenderer.invoke('app:file-info', file),
  copyPath: file => ipcRenderer.invoke('app:copy-path', file),
  showInFolder: file => ipcRenderer.invoke('app:show-in-folder', file),
  copyMasterPromptAndOpenChatGPT: () => ipcRenderer.invoke('app:copy-master-prompt-and-open-chatgpt'),
  getSettings: () => ipcRenderer.invoke('app:get-settings'),
  setSettings: patch => ipcRenderer.invoke('app:set-settings', patch),
  chooseCsvFolder: () => ipcRenderer.invoke('app:choose-csv-folder'),
  prepareWfpOutput: source => ipcRenderer.invoke('app:prepare-wfp-output', source),
  openOfficialHome: () => ipcRenderer.invoke('app:open-official-home'),
  openDownloadPage: () => ipcRenderer.invoke('app:open-download-page'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  listVersions: () => ipcRenderer.invoke('updates:list-versions'),
  downloadVersion: version => ipcRenderer.invoke('updates:download-version', version),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onJobEvent: callback => { const listener = (_e, data) => callback(data); ipcRenderer.on('job:event', listener); return () => ipcRenderer.removeListener('job:event', listener); },
  onJobLog: callback => { const listener = (_e, data) => callback(data); ipcRenderer.on('job:log', listener); return () => ipcRenderer.removeListener('job:log', listener); },
  onUpdateEvent: callback => {
    const channels = ['updates:checked', 'updates:error', 'updates:download-progress', 'updates:downloaded'];
    const listeners = channels.map(channel => { const fn = (_e, data) => callback({ channel, ...data }); ipcRenderer.on(channel, fn); return [channel, fn]; });
    return () => listeners.forEach(([channel, fn]) => ipcRenderer.removeListener(channel, fn));
  }
});
