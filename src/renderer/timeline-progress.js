// FPSTUDIO-ORIGINAL-SOURCE
// Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
'use strict';
(function attachFramePilotTimelineProgress(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FramePilotTimelineProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTimelineProgress() {
  const STAGES = Object.freeze({
    analyze: Object.freeze([
      { id: 'check', label: 'Check inputs', detail: 'Validate the selected WFP project and Final Master CSV', end: 18 },
      { id: 'inspect', label: 'Inspect project', detail: 'Read tracks, image clips, native markers and frame rate', end: 100 },
      { id: 'complete', label: 'Complete', detail: 'Project analysis finished', end: 101 }
    ]),
    export: Object.freeze([
      { id: 'check', label: 'Check project', detail: 'Validate WFP structure, image clips and marker timing', end: 32 },
      { id: 'motion', label: 'Apply motion', detail: 'Align image clips and write motion keyframes', end: 75 },
      { id: 'build', label: 'Build Filmora project', detail: 'Create the new editable WFP archive', end: 90 },
      { id: 'verify', label: 'Verify output', detail: 'Check archive, timeline, markers and applied effects', end: 100 },
      { id: 'complete', label: 'Complete', detail: 'The new Filmora project is ready', end: 101 }
    ])
  });
  function getTimelineProgress(percent, operation = 'export') {
    const numeric = Number(percent);
    const value = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
    const stages = STAGES[operation] || STAGES.export;
    let currentIndex = stages.findIndex(stage => value < stage.end);
    if (currentIndex < 0) currentIndex = stages.length - 1;
    const isComplete = value >= 100;
    const steps = stages.map((stage, index) => ({
      ...stage,
      state: isComplete || index < currentIndex ? 'complete' : index === currentIndex ? 'active' : 'pending'
    }));
    return Object.freeze({ percent: value, currentIndex, activeLabel: stages[currentIndex].label, steps });
  }
  return Object.freeze({ getTimelineProgress, stages: STAGES });
});
