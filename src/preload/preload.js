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
  motionSelectScript: () => ipcRenderer.invoke('motion:select-script'),
  motionSelectAudio: () => ipcRenderer.invoke('motion:select-audio'),
  motionSelectProjectZip: () => ipcRenderer.invoke('motion:select-project-zip'),
  motionSelectOutputFolder: () => ipcRenderer.invoke('motion:select-output-folder'),
  motionReadPrompt: key => ipcRenderer.invoke('motion:read-prompt', key),
  motionCopyText: text => ipcRenderer.invoke('motion:copy-text', text),
  motionCopyPath: file => ipcRenderer.invoke('motion:copy-path', file),
  motionReadOutputPreview: file => ipcRenderer.invoke('motion:read-output-preview', file),
  motionSavePrompt: key => ipcRenderer.invoke('motion:save-prompt', key),
  motionSaveProducerSkill: () => ipcRenderer.invoke('motion:save-producer-skill'),
  motionRebuildSkillZip: () => ipcRenderer.invoke('motion:rebuild-skill-zip'),
  motionVerifySkillPackage: () => ipcRenderer.invoke('motion:verify-skill-package'),
  motionListWordTimingSessions: () => ipcRenderer.invoke('motion:list-word-timing-sessions'),
  motionGenerateHandoffZip: (input) => ipcRenderer.invoke('motion:generate-handoff-zip', input),
  motionClaudeKitInfo: () => ipcRenderer.invoke('motion:claude-kit-info'),
  motionSaveClaudeProjectUrl: url => ipcRenderer.invoke('motion:save-claude-project-url', url),
  motionOpenClaude: () => ipcRenderer.invoke('motion:open-claude'),
  motionReadScriptPreview: file => ipcRenderer.invoke('motion:read-script-preview', file),
  motionGetRuntimeInfo: () => ipcRenderer.invoke('motion:runtime-info'),
  motionGetSecurityStatus: () => ipcRenderer.invoke('motion:security-status'),
  motionManageRuntime: operation => ipcRenderer.invoke('motion:manage-runtime', operation),
  motionGenerateWordTiming: input => ipcRenderer.invoke('motion:generate-word-timing', input),
  motionInspectProject: zip => ipcRenderer.invoke('motion:inspect-project', zip),
  motionImportProject: zip => ipcRenderer.invoke('motion:import-project', zip),
  motionListProjects: () => ipcRenderer.invoke('motion:list-projects'),
  motionListRenderHistory: () => ipcRenderer.invoke('motion:list-render-history'),
  motionRenameProject: input => ipcRenderer.invoke('motion:rename-project', input),
  motionDuplicateProject: folder => ipcRenderer.invoke('motion:duplicate-project', folder),
  motionDeleteProject: folder => ipcRenderer.invoke('motion:delete-project', folder),
  motionOpenProjectFolder: folder => ipcRenderer.invoke('motion:open-project-folder', folder),
  motionShowInFolder: file => ipcRenderer.invoke('motion:show-in-folder', file),
  motionStartRender: input => ipcRenderer.invoke('motion:start-render', input),
  motionCancelJob: () => ipcRenderer.invoke('motion:cancel-job'),
  onMotionJobEvent: callback => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('motion:job-event', listener);
    return () => ipcRenderer.removeListener('motion:job-event', listener);
  },
  onMotionJobLog: callback => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('motion:job-log', listener);
    return () => ipcRenderer.removeListener('motion:job-log', listener);
  },
  onMotionRuntimeEvent: callback => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('motion:runtime-event', listener);
    return () => ipcRenderer.removeListener('motion:runtime-event', listener);
  },
  onJobEvent: callback => { const listener = (_e, data) => callback(data); ipcRenderer.on('job:event', listener); return () => ipcRenderer.removeListener('job:event', listener); },
  onJobLog: callback => { const listener = (_e, data) => callback(data); ipcRenderer.on('job:log', listener); return () => ipcRenderer.removeListener('job:log', listener); },
  onUpdateEvent: callback => {
    const channels = ['updates:checked', 'updates:error', 'updates:download-progress', 'updates:downloaded'];
    const listeners = channels.map(channel => { const fn = (_e, data) => callback({ channel, ...data }); ipcRenderer.on(channel, fn); return [channel, fn]; });
    return () => listeners.forEach(([channel, fn]) => ipcRenderer.removeListener(channel, fn));
  }
});
