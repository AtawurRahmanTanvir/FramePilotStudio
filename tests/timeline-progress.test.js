'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getTimelineProgress } = require('../src/renderer/timeline-progress');

test('analysis progress starts with input validation', () => {
  const p = getTimelineProgress(0, 'analyze');
  assert.equal(p.activeLabel, 'Check inputs');
  assert.equal(p.steps[0].state, 'active');
});

test('analysis moves to project inspection using backend percentage', () => {
  const p = getTimelineProgress(36, 'analyze');
  assert.equal(p.activeLabel, 'Inspect project');
  assert.equal(p.steps[0].state, 'complete');
  assert.equal(p.steps[1].state, 'active');
});

test('export progress maps to motion, build and verification stages', () => {
  assert.equal(getTimelineProgress(50, 'export').activeLabel, 'Apply motion');
  assert.equal(getTimelineProgress(80, 'export').activeLabel, 'Build Filmora project');
  assert.equal(getTimelineProgress(94, 'export').activeLabel, 'Verify output');
  const complete = getTimelineProgress(100, 'export');
  assert.equal(complete.activeLabel, 'Complete');
  assert.ok(complete.steps.every(step => step.state === 'complete'));
});

test('invalid percentages are clamped and never produce invalid states', () => {
  assert.equal(getTimelineProgress(-10, 'export').percent, 0);
  assert.equal(getTimelineProgress(120, 'export').percent, 100);
  assert.equal(getTimelineProgress('not-a-number', 'export').percent, 0);
});
