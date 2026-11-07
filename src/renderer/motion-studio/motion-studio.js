/* FramePilot Studio — Motion Studio UI Layer v4.0
   Filmora-Inspired Simplicity · Desktop Ergonomics · High-DPI Readability
   Additive architecture; Filmora Studio is 100% preserved and untouched.
*/
(() => {
  'use strict';
  if (window.__framePilotMotionStudioLoaded) return;
  window.__framePilotMotionStudioLoaded = true;

  const $ = (id) => document.getElementById(id);
  const state = {
    scriptPath: null,
    audioPath: null,
    projectZip: null,
    outputFolder: null,
    wordCsv: null,
    wordQa: null,
    projects: [],
    selectedProject: null,
    lastProjectInfo: null,
    lastRenderOutput: null,
    renderHistory: [],
    claudeProjectUrl: '',
    currentPage: 'motion-overview',
    currentDiagTab: 'tab-runtime',
    runtime: null,
    securityStatus: null,
    busy: false,
  };

  const pageLabels = {
    'motion-overview': 'Overview',
    'motion-word-timing': 'Word Timing',
    'motion-claude-kit': 'Claude Project',
    'motion-import': 'Import Project',
    'motion-render': 'Render Video',
    'motion-project-manager': 'Project Manager',
    'motion-render-history': 'Render History',
    'motion-diagnostics': 'Help & Diagnostics',
    'motion-runtime-manager': 'Help & Diagnostics', // backward compatibility
  };

  const navIcon = {
    overview: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    timing: '<path d="M4 9v6m4-11v16m4-20v24m4-15v6m4-10v14"/>',
    kit: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    import: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    render: '<path d="M5 4h14v16H5z"/><path d="m10 8 6 4-6 4z"/>',
    projectManager: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="2" cy="6" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="2" cy="18" r="1"/>',
    renderHistory: '<path d="M12 8v4l3 3M3 12a9 9 0 1 0 2-5.6M3 3v4h4"/>',
    diagnostics: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>',
    shield: '<path d="M12 2 4 5v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V5z"/>',
  };

  function toast(message, isError = false) {
    const region = $('toast-region');
    if (!region) return;
    const item = document.createElement('div');
    item.className = `toast${isError ? ' error' : ''}`;
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 5200);
  }

  function basename(value) {
    return String(value || '').split(/[\\/]/).filter(Boolean).pop() || '';
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return 'Size unavailable';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[index]}`;
  }

  function icon(kind) {
    const paths = {
      folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
      audio: '<path d="M4 9v6m4-11v16m4-20v24m4-15v6m4-10v14"/>',
      file: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
      check: '<path d="m4 12 5 5L20 6"/>',
      arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
      render: '<path d="M5 4h14v16H5z"/><path d="m10 8 6 4-6 4z"/>',
      shield: '<path d="M12 2 4 5v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V5z"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.file}</svg>`;
  }

  function injectNavigation() {
    const originalLabel = document.querySelector('.sidebar .workspace-label');
    if (originalLabel && originalLabel.textContent.trim() === 'WORKSPACE') originalLabel.textContent = 'FILMORA STUDIO';
    const supportLabel = [...document.querySelectorAll('.sidebar .workspace-label')].find(el => el.textContent.trim() === 'SUPPORT');
    if (!supportLabel || $('motion-nav-group')) return;

    const group = document.createElement('div');
    group.id = 'motion-nav-group';
    group.innerHTML = `
      <div class="sidebar-divider motion-sidebar-divider"></div>
      <div class="workspace-label motion-workspace-label">MOTION STUDIO <span>PRO</span></div>
      <nav class="nav-list motion-nav-list" aria-label="Motion Studio workflow">
        <button class="nav-item motion-nav-item" data-motion-page="motion-overview"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.overview}</svg></span><span>Overview</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-word-timing"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.timing}</svg></span><span>Word Timing</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-claude-kit"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.kit}</svg></span><span>Claude Project</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-import"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.import}</svg></span><span>Import Project</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-render"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.render}</svg></span><span>Render Video</span></button>
      </nav>
      <div class="sidebar-divider motion-sidebar-subdivider"></div>
      <div class="workspace-label motion-sub-label">PROJECT LIBRARY</div>
      <nav class="nav-list motion-nav-list" aria-label="Project Library">
        <button class="nav-item motion-nav-item" data-motion-page="motion-project-manager"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.projectManager}</svg></span><span>Project Manager</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-render-history"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.renderHistory}</svg></span><span>Render History</span></button>
      </nav>
      <div class="sidebar-divider motion-sidebar-subdivider"></div>
      <div class="workspace-label motion-sub-label">HELP &amp; DIAGNOSTICS</div>
      <nav class="nav-list motion-nav-list" aria-label="Help and Diagnostics">
        <button class="nav-item motion-nav-item" data-motion-page="motion-diagnostics"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.diagnostics}</svg></span><span>Help &amp; Diagnostics</span></button>
      </nav>`;
    supportLabel.parentNode.insertBefore(group, supportLabel);
  }

  function pageHeading(title, subtitle, kicker = 'MOTION STUDIO') {
    return `<div class="page-heading motion-page-heading"><div><div class="motion-kicker"><span></span>${kicker}</div><h1>${title}</h1><p class="page-intro">${subtitle}</p></div></div>`;
  }

  function injectPages() {
    const main = document.querySelector('.main-area');
    const anchor = $('page-activity');
    if (!main || !anchor || $('page-motion-overview')) return;

    const pages = `
      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 1: OVERVIEW (Clean 4-Step Pipeline, Smart Next Action)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-overview">
        ${pageHeading('Motion Studio', 'A streamlined 4-step workflow: Word Timing, Claude generation, Project Import, and Secure Local Rendering.')}

        <div class="motion-hero-panel">
          <div class="motion-hero-glow"></div>
          <div class="motion-hero-content">
            <span class="motion-hero-kicker">LOCAL-FIRST MOTION PRODUCTION</span>
            <h2>From approved script<br/>to <em>cinematic video.</em></h2>
            <p>Produce professional documentary motion graphics with AI-guided Remotion code, precise word alignment, and secure offline rendering.</p>
            <div class="motion-hero-actions">
              <button class="primary-button" data-motion-go="motion-word-timing">Start Word Timing <svg viewBox="0 0 20 20"><path d="M3 10h13M10 4l6 6-6 6"/></svg></button>
              <button class="outline-button" data-motion-go="motion-import">Import Project ZIP</button>
            </div>
          </div>
          <div class="motion-hero-orbit" aria-hidden="true">
            <div class="orbit-ring ring-one"></div>
            <div class="orbit-ring ring-two"></div>
            <div class="orbit-core">FP</div>
            <span class="orbit-node node-a">TIMING</span>
            <span class="orbit-node node-b">CLAUDE</span>
            <span class="orbit-node node-c">RENDER</span>
          </div>
        </div>

        <div class="motion-section-head">
          <div>
            <h2>Production Pipeline</h2>
            <p>Follow the 4 simple stages to produce your motion video.</p>
          </div>
          <span class="motion-section-tag">STEP-BY-STEP</span>
        </div>

        <div class="motion-pipeline-grid">
          <div class="motion-pipeline-card" data-motion-go="motion-word-timing">
            <div class="motion-step-badge">STEP 1</div>
            <div class="motion-card-icon gold">${icon('audio')}</div>
            <h3>Word Timing</h3>
            <p>Upload voiceover + script to create precise word timestamps.</p>
            <span class="motion-pipeline-action">Open Word Timing ↗</span>
          </div>
          <div class="motion-pipeline-card" data-motion-go="motion-claude-kit">
            <div class="motion-step-badge">STEP 2</div>
            <div class="motion-card-icon violet">${icon('file')}</div>
            <h3>Claude Project</h3>
            <p>Use Master Instructions & Skill to author complete Remotion code.</p>
            <span class="motion-pipeline-action">Open Project Kit ↗</span>
          </div>
          <div class="motion-pipeline-card" data-motion-go="motion-import">
            <div class="motion-step-badge">STEP 3</div>
            <div class="motion-card-icon red">${icon('import')}</div>
            <h3>Import Project</h3>
            <p>Drag and drop the Claude-generated ZIP to validate and register it.</p>
            <span class="motion-pipeline-action">Import Project ↗</span>
          </div>
          <div class="motion-pipeline-card" data-motion-go="motion-render">
            <div class="motion-step-badge">STEP 4</div>
            <div class="motion-card-icon green">${icon('render')}</div>
            <h3>Render Video</h3>
            <p>Verify project integrity and produce the final high-definition MP4.</p>
            <span class="motion-pipeline-action">Open Render Center ↗</span>
          </div>
        </div>

        <!-- Smart Next Action Banner -->
        <section class="surface-panel motion-next-action-panel" id="motion-overview-next-action">
          <div class="motion-next-action-copy">
            <span class="motion-next-action-kicker">RECOMMENDED NEXT ACTION</span>
            <h3 id="motion-overview-next-title">Create your first Word Timing</h3>
            <p id="motion-overview-next-desc">Upload your approved script and voiceover audio to generate verified word timestamps.</p>
          </div>
          <button class="primary-button" id="motion-overview-next-btn" data-motion-go="motion-word-timing">Start Step 1: Word Timing</button>
        </section>

        <!-- Recent Projects & Diagnostics Quick Access -->
        <div class="motion-dashboard-grid">
          <section class="surface-panel motion-recent-panel">
            <div class="panel-heading">
              <div>
                <h3>Imported Motion Projects</h3>
                <p class="motion-panel-sub">Recent projects ready for preview or rendering.</p>
              </div>
              <button class="text-button" data-motion-go="motion-project-manager">View all in Project Manager ↗</button>
            </div>
            <div class="motion-project-list" id="motion-recent-projects">
              <div class="motion-empty-line">No Motion Projects imported yet.</div>
            </div>
          </section>

          <section class="surface-panel motion-quick-help-panel">
            <div class="panel-heading">
              <div>
                <h3>Help &amp; Diagnostics</h3>
                <p class="motion-panel-sub">System status and troubleshooting assistance.</p>
              </div>
              <button class="text-button" data-motion-go="motion-diagnostics">Open Diagnostics ↗</button>
            </div>
            <div class="motion-quick-help-content">
              <div class="motion-quick-status-item">
                <div class="motion-quick-status-dot green"></div>
                <div>
                  <strong>Word Timing Engine</strong>
                  <span>Dedicated Python runtime &amp; offline speech models active</span>
                </div>
              </div>
              <div class="motion-quick-status-item">
                <div class="motion-quick-status-dot amber"></div>
                <div>
                  <strong>Secure Rendering Protection</strong>
                  <span>Worker isolation active; rendering locked to protect your files</span>
                </div>
              </div>
              <p class="motion-quick-help-note">Need to verify runtime components or review security status?</p>
              <button class="outline-button" data-motion-go="motion-diagnostics" style="width:100%;margin-top:6px">Open Help &amp; Diagnostics Center</button>
            </div>
          </section>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 2: WORD TIMING (Simple 4-Step Linear Flow)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-word-timing">
        ${pageHeading('Word Timing', 'Upload your approved script and voiceover audio to generate verified, word-level timestamps.')}

        <div class="motion-process-steps-bar">
          <div class="motion-step-node active" id="motion-wt-step-1">
            <span class="motion-step-num">1</span>
            <span>Upload Files</span>
          </div>
          <div class="motion-step-line"></div>
          <div class="motion-step-node" id="motion-wt-step-2">
            <span class="motion-step-num">2</span>
            <span>Local Alignment</span>
          </div>
          <div class="motion-step-line"></div>
          <div class="motion-step-node" id="motion-wt-step-3">
            <span class="motion-step-num">3</span>
            <span>Review QA</span>
          </div>
          <div class="motion-step-line"></div>
          <div class="motion-step-node" id="motion-wt-step-4">
            <span class="motion-step-num">4</span>
            <span>Export CSV</span>
          </div>
        </div>

        <div class="motion-two-column-layout">
          <div class="motion-column-main">
            <!-- Source Files Selection -->
            <section class="surface-panel" style="padding:24px 26px">
              <div class="panel-heading" style="margin-bottom:18px">
                <div>
                  <h3>Select Input Files</h3>
                  <p class="motion-panel-sub">Script provides reference wording; voiceover provides the acoustic timing.</p>
                </div>
                <span class="required-label" id="motion-input-state">0 / 2 READY</span>
              </div>

              <!-- Script File Card -->
              <div class="motion-file-card-box" id="motion-script-row">
                <div class="motion-file-card-icon">${icon('file')}</div>
                <div class="motion-file-card-info">
                  <strong>Approved Video Script</strong>
                  <span id="motion-script-name">No script selected</span>
                  <small>TXT · MD · DOCX · PDF</small>
                </div>
                <button class="outline-button" id="motion-pick-script" type="button">Select Script</button>
              </div>

              <!-- Audio File Card -->
              <div class="motion-file-card-box" id="motion-audio-row">
                <div class="motion-file-card-icon audio">${icon('audio')}</div>
                <div class="motion-file-card-info">
                  <strong>Voiceover Audio</strong>
                  <span id="motion-audio-name">No voiceover selected</span>
                  <small>WAV · MP3 · M4A · FLAC · AAC · OGG</small>
                </div>
                <button class="outline-button" id="motion-pick-audio" type="button">Select Voiceover</button>
              </div>

              <div class="motion-script-preview" id="motion-script-preview" hidden></div>

              <!-- Collapsible Advanced Settings -->
              <button class="motion-advanced-toggle" id="motion-wt-advanced-toggle" type="button">
                ${icon('chevron')} <span>Advanced Alignment Options</span>
              </button>
              <div class="motion-advanced-drawer" id="motion-wt-advanced-drawer" hidden>
                <div class="motion-advanced-grid">
                  <div class="motion-form-group">
                    <label for="motion-asr-model">Recognition Model</label>
                    <select id="motion-asr-model">
                      <option value="">Default Offline Model (Medium)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="large-v3">Large v3 (If installed)</option>
                    </select>
                  </div>
                  <div class="motion-form-group">
                    <label for="motion-project-name">Project Label (Optional)</label>
                    <input id="motion-project-name" type="text" placeholder="e.g. Apollo Documentary" maxlength="90"/>
                  </div>
                  <div class="motion-form-group" style="grid-column:1/-1">
                    <label for="motion-output-folder">Custom Save Folder (Optional)</label>
                    <div style="display:flex;gap:10px">
                      <input id="motion-output-folder" type="text" placeholder="Default: Documents / FramePilot Studio / Motion Projects / Word Timing" readonly style="flex:1"/>
                      <button class="outline-button" id="motion-pick-output-folder" type="button">Browse</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Card -->
              <div class="motion-action-card-large">
                <div>
                  <h3>Generate Word Timing</h3>
                  <p id="motion-word-readiness">Select both script and audio to begin local alignment.</p>
                </div>
                <button class="primary-button" id="motion-generate-word-csv" disabled type="button">Generate Motion CSV ${icon('arrow')}</button>
              </div>

              <!-- Progress Panel -->
              <div class="surface-panel motion-job-card" id="motion-word-progress" hidden style="margin-top:20px">
                <div class="motion-progress-top">
                  <div>
                    <span class="motion-small-kicker">LOCAL SPEECH ALIGNMENT</span>
                    <h3 id="motion-word-stage">Preparing speech engine</h3>
                  </div>
                  <strong id="motion-word-percent">0%</strong>
                </div>
                <div class="motion-progress-track"><span id="motion-word-fill"></span></div>
                <div class="motion-progress-foot">
                  <span id="motion-word-message">Waiting for engine…</span>
                  <span id="motion-word-job-state" class="motion-job-state">RUNNING</span>
                </div>
                <button class="text-button motion-cancel-link" id="motion-cancel-job" type="button">Cancel alignment</button>
              </div>

              <!-- Result Output Panel -->
              <div class="surface-panel motion-output-card" id="motion-word-result" hidden style="margin-top:20px">
                <div class="motion-output-top">
                  <div>
                    <span class="motion-small-kicker">OUTPUT VERIFIED</span>
                    <h3 id="motion-word-output-name">Motion_Word_Timing.csv</h3>
                  </div>
                  <span class="motion-status-pill success" id="motion-word-output-state">READY</span>
                </div>
                <code id="motion-word-output-path"></code>
                <div class="motion-output-actions">
                  <button class="outline-button" id="motion-copy-csv-path" type="button">Copy Path</button>
                  <button class="outline-button" id="motion-show-csv" type="button">Show in Folder</button>
                  <button class="primary-button small-primary" id="motion-open-word-table" type="button">Review Words</button>
                </div>
                <div class="motion-qa-summary" id="motion-word-qa"></div>
              </div>

              <!-- Word Timing Table Preview -->
              <div class="surface-panel motion-word-table-card" id="motion-word-table-card" hidden style="margin-top:20px">
                <div class="panel-heading">
                  <div>
                    <h3>Word Timing Preview</h3>
                    <p class="motion-panel-sub">First rows from generated CSV. The full file is saved beside your project.</p>
                  </div>
                  <span class="required-label" id="motion-word-row-count">0 WORDS</span>
                </div>
                <div class="motion-table-wrapper">
                  <table class="motion-table-large">
                    <thead>
                      <tr><th>Index</th><th>Script Word</th><th>Recognized Word</th><th>Start (ms)</th><th>End (ms)</th></tr>
                    </thead>
                    <tbody id="motion-word-table-body">
                      <tr><td colspan="5">No timing rows yet.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <!-- Sidebar Guide -->
          <aside class="motion-side-stack">
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon">1</span>
              <h3>Why upload the script?</h3>
              <p>The script provides reference wording. Motion Studio compares intended words with the spoken voiceover to identify omissions or mismatches.</p>
            </section>
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon violet">2</span>
              <h3>Precise Word Timestamps</h3>
              <p>Each row in the 5-column CSV contains start and end milliseconds derived from acoustic forced alignment. No timestamps are estimated.</p>
            </section>
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon red">3</span>
              <h3>Next Step: Claude Project</h3>
              <p>Once your CSV is created, open Claude Project to generate your Remotion project ZIP using the FramePilot Motion Producer Skill.</p>
            </section>
          </aside>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 3: CLAUDE PROJECT (Simple One-Time Setup + Per-Video Handoff)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-claude-kit">
        ${pageHeading('Claude Project', 'Prepare the Claude Motion Producer once, then hand off each video without uploading files automatically.')}

        <div class="motion-kit-grid-cards">
          <!-- Card 1: One-Time Setup -->
          <div class="motion-kit-box">
            <span class="motion-kicker"><span></span>ONE-TIME SETUP</span>
            <h3>1. Configure Claude Project</h3>
            <p>Upload the Master Instructions and Skill ZIP to your private Claude Project once. They apply to all future videos.</p>

            <div class="motion-kit-button-stack">
              <button class="primary-button" id="motion-copy-master-instructions" type="button">Copy Master Instructions</button>
              <button class="outline-button" id="motion-save-master-instructions" type="button">Save Master Instructions (.md)</button>
              <button class="outline-button" id="motion-save-producer-skill" type="button">Save Producer Skill ZIP</button>
            </div>

            <div style="margin-top:24px;border-top:1px solid #2d2822;padding-top:18px">
              <label for="motion-claude-project-url" style="display:block;font-size:13px;font-weight:650;color:#c7beaf;margin-bottom:8px">Your Private Claude Project URL</label>
              <div class="motion-url-input-row">
                <input id="motion-claude-project-url" type="url" placeholder="https://claude.ai/project/…" autocomplete="off"/>
                <button class="outline-button" id="motion-save-project-link" type="button">Save Link</button>
              </div>
              <button class="primary-button" id="motion-open-claude" type="button" style="width:100%">Open Claude Project ${icon('arrow')}</button>
            </div>
          </div>

          <!-- Card 2: Per-Video Production Handoff -->
          <div class="motion-kit-box">
            <span class="motion-kicker"><span></span>PER-VIDEO PRODUCTION</span>
            <h3>2. Package Video Handoff</h3>
            <p>Select your Word Timing session to generate a clean handoff ZIP containing your script, timing CSV, QA report, and intake prompt.</p>

            <div class="motion-form-group" style="margin-bottom:20px">
              <label for="motion-handoff-project-select">Word Timing Session</label>
              <select id="motion-handoff-project-select">
                <option value="">Select Word Timing session…</option>
              </select>
            </div>

            <div class="motion-kit-button-stack">
              <button class="primary-button" id="motion-generate-handoff-zip" type="button">Generate Handoff ZIP</button>
              <button class="outline-button" id="motion-copy-per-video-handoff" type="button">Copy Handoff Prompt Text</button>
            </div>

            <!-- Collapsible Advanced Developer Tools -->
            <div style="margin-top:24px;border-top:1px solid #2d2822;padding-top:14px">
              <button class="motion-advanced-toggle" id="motion-skill-adv-toggle" type="button">
                ${icon('chevron')} <span>Advanced Skill Maintenance</span>
              </button>
              <div id="motion-skill-adv-drawer" hidden style="margin-top:10px">
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                  <button class="outline-button" id="motion-rebuild-skill-zip" type="button" style="font-size:12.5px">Rebuild Skill ZIP</button>
                  <button class="outline-button" id="motion-verify-skill-package" type="button" style="font-size:12.5px">Verify Package</button>
                </div>
                <p id="motion-skill-pkg-status" style="font-size:12px;color:#8c8475;margin-top:8px"></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 4: IMPORT PROJECT (Large Dropzone, Clear Status, Verification)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-import">
        ${pageHeading('Import Project', 'Import the Remotion project ZIP generated by Claude. Project files are statically validated before addition.')}

        <div class="motion-import-layout">
          <div class="motion-column-main">
            <!-- Large Drag-and-Drop Dropzone -->
            <div class="motion-drag-drop-zone" id="motion-import-dropzone">
              <div class="motion-drag-drop-icon">ZIP</div>
              <h2>Import Remotion Project ZIP</h2>
              <p>Drag and drop the complete ZIP file returned by Claude here, or click to choose from your files.</p>
              <button class="primary-button" id="motion-pick-project-zip" type="button">Choose Project ZIP ${icon('arrow')}</button>
              <div class="motion-selected-zip" id="motion-selected-zip" style="margin-top:14px;font-size:13.5px;color:#d5aa5b">No project ZIP selected</div>
            </div>

            <!-- Validation Report Card -->
            <section class="surface-panel" id="motion-import-report" hidden style="padding:24px 28px;margin-top:20px">
              <div class="panel-heading">
                <div>
                  <h3>Project Validation Report</h3>
                  <p class="motion-panel-sub">Static security analysis. Imported JavaScript code is not executed.</p>
                </div>
                <span class="motion-status-pill pending" id="motion-import-status">CHECKING</span>
              </div>
              <div class="motion-import-metrics" id="motion-import-metrics"></div>
              <div class="motion-import-checks" id="motion-import-checks"></div>
              <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px">
                <button class="outline-button" id="motion-reinspect-project" type="button">Re-check ZIP</button>
                <button class="primary-button" id="motion-confirm-import" disabled type="button">Import to Motion Studio ${icon('arrow')}</button>
              </div>
            </section>

            <!-- Quick Project Library -->
            <section class="surface-panel motion-imported-projects" style="margin-top:20px;padding:24px 28px">
              <div class="panel-heading">
                <div>
                  <h3>Motion Project Library</h3>
                  <p class="motion-panel-sub">Projects stored inside Documents / FramePilot Studio / Motion Projects.</p>
                </div>
                <button class="text-button" id="motion-refresh-projects" type="button">Refresh list ↻</button>
              </div>
              <div id="motion-imported-project-list" class="motion-project-list">
                <div class="motion-empty-line">No imported projects yet.</div>
              </div>
            </section>
          </div>

          <!-- Sidebar Guide -->
          <aside class="motion-side-stack">
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon">1</span>
              <h3>Required ZIP Structure</h3>
              <p>The ZIP must include <code>motion-project.json</code>, <code>package.json</code>, entry point, declared scenes, voiceover audio, and SFX assets.</p>
            </section>
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon violet">2</span>
              <h3>Static Validation</h3>
              <p>FramePilot inspects archive paths, dependencies, and manifest values without executing the project's JavaScript code.</p>
            </section>
          </aside>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 5: RENDER VIDEO (One Prominent Button, Gate Explanation)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-render">
        ${pageHeading('Render Video', 'Select an imported project and generate its final high-definition MP4.')}

        <div class="motion-render-layout">
          <div class="motion-column-main">
            <!-- Project Selection & Specs Card -->
            <div class="motion-render-hero-card">
              <div class="motion-render-project-select-row">
                <label for="motion-project-select">Select Project to Render</label>
                <select id="motion-project-select">
                  <option value="">Select an imported project…</option>
                </select>
              </div>

              <div class="motion-render-specs-grid" id="motion-render-specs">
                <div class="motion-render-spec-cell"><span>Resolution</span><strong>—</strong></div>
                <div class="motion-render-spec-cell"><span>Frame Rate</span><strong>—</strong></div>
                <div class="motion-render-spec-cell"><span>Duration</span><strong>—</strong></div>
                <div class="motion-render-spec-cell"><span>Composition</span><strong>—</strong></div>
              </div>

              <!-- Security Gate Protection Banner (Required by Part 1 & Part 2) -->
              <div class="motion-security-banner-card" id="motion-render-security-banner">
                <div class="motion-security-shield-icon">${icon('shield')}</div>
                <div class="motion-security-banner-copy">
                  <h4>Secure Rendering Protection Active</h4>
                  <p id="motion-render-gate-text">Secure rendering is not yet enabled because Windows project isolation has not passed verification. Your project has not been executed.</p>
                  <button type="button" data-motion-go="motion-diagnostics" data-diag-tab="tab-security">Open Help &amp; Diagnostics to view isolation requirements →</button>
                </div>
              </div>

              <!-- The Single Prominent Render Button -->
              <button class="primary-button motion-big-render-button" id="motion-render-final" disabled type="button">
                RENDER VIDEO <svg viewBox="0 0 20 20"><path d="M3 10h13M10 4l6 6-6 6"/></svg>
              </button>
            </div>

            <!-- Progress Panel -->
            <section class="surface-panel motion-render-progress" id="motion-render-progress" hidden style="padding:24px 28px">
              <div class="motion-progress-top">
                <div>
                  <span class="motion-small-kicker">REMOTION RENDERING</span>
                  <h3 id="motion-render-stage">Preparing render…</h3>
                </div>
                <strong id="motion-render-percent">0%</strong>
              </div>
              <div class="motion-progress-track"><span id="motion-render-fill"></span></div>
              <div class="motion-progress-foot">
                <span id="motion-render-message">Waiting for worker…</span>
                <span id="motion-render-state" class="motion-job-state">RUNNING</span>
              </div>
              <button class="text-button motion-cancel-link" id="motion-cancel-render" type="button">Cancel Render</button>
            </section>

            <!-- Output Result Card -->
            <section class="surface-panel motion-render-result" id="motion-render-result" hidden style="padding:24px 28px;margin-top:20px">
              <div class="motion-output-top">
                <div>
                  <span class="motion-small-kicker">VIDEO CREATED SUCCESSFULLY</span>
                  <h3 id="motion-render-output-name">Final_Output.mp4</h3>
                </div>
                <span class="motion-status-pill success">COMPLETED</span>
              </div>
              <code id="motion-render-output-path"></code>
              <div class="motion-output-actions">
                <button class="primary-button" id="motion-show-render-folder" type="button">Open Output Folder</button>
                <button class="outline-button" id="motion-copy-render-path" type="button">Copy Path</button>
              </div>
            </section>
          </div>

          <!-- Sidebar Information -->
          <aside class="motion-side-stack">
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon green">★</span>
              <h3>Offline Quality</h3>
              <p>Renders at full native resolution with high-fidelity H.264 video and 48 kHz stereo audio, verified by FFprobe.</p>
            </section>
            <section class="surface-panel motion-info-card">
              <span class="motion-side-icon">?</span>
              <h3>Render Protection</h3>
              <p>Imported project code is untrusted. Rendering is isolated within Windows Job Objects to prevent workstation tampering.</p>
              <button class="text-button" data-motion-go="motion-diagnostics" data-diag-tab="tab-security" style="padding-left:0;margin-top:8px">Learn more ↗</button>
            </section>
          </aside>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 6: PROJECT MANAGER (Full Library, Search, Pagination)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-project-manager">
        ${pageHeading('Project Manager', 'Browse, search and manage every imported Motion project in your library.')}

        <div class="motion-pm-search">
          <input type="text" id="motion-pm-search-input" placeholder="Search projects by name…" autocomplete="off"/>
          <button class="outline-button" id="motion-pm-refresh" type="button">Refresh ↻</button>
        </div>
        <div class="motion-pm-count" id="motion-pm-count">Loading projects…</div>
        <section class="surface-panel" style="padding:0 24px">
          <div class="motion-project-list" id="motion-pm-project-list">
            <div class="motion-empty-line">No Motion Projects imported yet.</div>
          </div>
        </section>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end" id="motion-pm-pagination"></div>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 7: RENDER HISTORY (Dedicated Full-Page Render Log)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-render-history">
        ${pageHeading('Render History', 'Full dedicated log of every completed local Motion render with output status.')}

        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="outline-button" id="motion-rh-refresh" type="button">Refresh history ↻</button>
        </div>
        <section class="surface-panel" style="padding:0 24px">
          <div id="motion-rh-list" class="motion-project-list">
            <div class="motion-empty-line">No completed renders recorded.</div>
          </div>
        </section>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════
           PAGE 8: HELP & DIAGNOSTICS (Moved out of main workflow)
           ════════════════════════════════════════════════════════════════════ -->
      <section class="page motion-page" id="page-motion-diagnostics">
        ${pageHeading('Help & Diagnostics', 'Comprehensive diagnostic center for runtime components, security isolation, logs and troubleshooting.')}

        <!-- Tab Navigation Bar -->
        <div class="motion-diag-tabs-bar">
          <button class="motion-diag-tab-btn active" data-diag-tab-target="tab-runtime" type="button">Runtime Manager</button>
          <button class="motion-diag-tab-btn" data-diag-tab-target="tab-security" type="button">Security &amp; Sandbox</button>
          <button class="motion-diag-tab-btn" data-diag-tab-target="tab-logs" type="button">Technical Logs</button>
          <button class="motion-diag-tab-btn" data-diag-tab-target="tab-install" type="button">Installation Help</button>
          <button class="motion-diag-tab-btn" data-diag-tab-target="tab-troubleshoot" type="button">Troubleshooting</button>
          <button class="motion-diag-tab-btn" data-diag-tab-target="tab-about" type="button">About</button>
        </div>

        <!-- Tab 1: Runtime Manager -->
        <div class="motion-diag-tab-pane active" id="pane-tab-runtime">
          <section class="surface-panel" style="padding:24px 28px">
            <div class="panel-heading" style="margin-bottom:18px">
              <div>
                <h3>Runtime Component Status</h3>
                <p class="motion-panel-sub">Manage and verify private offline components without using a terminal.</p>
              </div>
              <div style="display:flex;gap:10px">
                <button class="outline-button" id="motion-rm-install" type="button">Install</button>
                <button class="outline-button" id="motion-rm-verify" type="button">Verify</button>
                <button class="outline-button" id="motion-rm-repair" type="button">Repair</button>
                <button class="outline-button" id="motion-rm-refresh" type="button">Refresh ↻</button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="motion-runtime-progress" id="motion-rm-progress" hidden style="margin-bottom:16px">
              <div class="motion-progress-track"><span id="motion-rm-fill"></span></div>
              <div class="motion-progress-meta">
                <span id="motion-rm-message">Ready</span>
                <strong id="motion-rm-percent">0%</strong>
              </div>
            </div>

            <!-- Large, Crisp Runtime Components Table -->
            <div class="motion-rm-table-large" id="motion-rm-table">
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Motion Python Runtime</div>
                  <div class="motion-rm-desc">Dedicated, isolated Python environment for word alignment in userData. Independent from Filmora.</div>
                  <div id="motion-rmr-python-loc" class="motion-rm-meta" style="margin-top:4px"></div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-python">CHECKING</span>
                <div><span id="motion-rmr-python-ver" class="motion-rm-meta"></span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">WhisperX &amp; PyTorch</div>
                  <div class="motion-rm-desc">Speech recognition, VAD and forced alignment libraries installed in Motion Python.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-whisperx">CHECKING</span>
                <div><span class="motion-rm-meta">PyTorch 2.8+</span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Offline Speech Models</div>
                  <div class="motion-rm-desc">Verified local Whisper medium ASR, Pyannote VAD, and wav2vec2 alignment weights.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-models">CHECKING</span>
                <div><span class="motion-rm-meta">Local / SHA-256</span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Private Node.js Runtime</div>
                  <div class="motion-rm-desc">Isolated Node.js binary used exclusively by the Remotion renderer.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-node">CHECKING</span>
                <div><span id="motion-rmr-node-ver" class="motion-rm-meta"></span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Remotion Renderer</div>
                  <div class="motion-rm-desc">Remotion SSR and bundling libraries pinned at 4.0.540.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-remotion">CHECKING</span>
                <div><span id="motion-rmr-remotion-ver" class="motion-rm-meta"></span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Chromium Headless Shell</div>
                  <div class="motion-rm-desc">Chrome headless binary for frame-by-frame visual rendering.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-browser">CHECKING</span>
                <div><span class="motion-rm-meta">Chrome for Testing</span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Remotion Native Compositor &amp; Binaries</div>
                  <div class="motion-rm-desc">Platform native acceleration binaries and Remotion FFmpeg.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-binaries">CHECKING</span>
                <div><span class="motion-rm-meta">v4.0.540 msvc</span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Project ZIP Validator</div>
                  <div class="motion-rm-desc">Static analyzer verifying archive security, manifests, and local assets before import.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-validator">CHECKING</span>
                <div><span class="motion-rm-meta">Active</span></div>
              </div>
              <div class="motion-rm-row-large">
                <div>
                  <div class="motion-rm-name">Secure Rendering Protection (Worker Isolation)</div>
                  <div class="motion-rm-desc">Windows Job Object process containment and filesystem isolation gate.</div>
                </div>
                <span class="motion-rm-status-badge pending" id="motion-rmr-isolation">CHECKING</span>
                <div><span class="motion-rm-meta">Fail-closed Gate</span></div>
              </div>
            </div>
          </section>
        </div>

        <!-- Tab 2: Security & Sandbox Diagnostics -->
        <div class="motion-diag-tab-pane" id="pane-tab-security">
          <section class="surface-panel" style="padding:24px 28px">
            <div class="panel-heading">
              <div>
                <h3>Secure Rendering Protection</h3>
                <p class="motion-panel-sub">Why rendering is locked and how Windows isolation protects your workstation.</p>
              </div>
              <button class="outline-button" id="motion-sec-refresh" type="button">Check Isolation Live ↻</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:18px;margin-top:20px;font-size:14px;color:#c9c0b0;line-height:1.65">
              <div class="motion-security-banner-card" style="margin-bottom:0">
                <div class="motion-security-shield-icon">${icon('shield')}</div>
                <div class="motion-security-banner-copy">
                  <h4>Security Gate Status: LOCKED (NOT READY)</h4>
                  <p>Rendering imported JavaScript/TypeScript remains locked to protect your PC from untrusted code execution. Execution will not proceed until Windows OS-level isolation is fully validated.</p>
                </div>
              </div>

              <div style="background:#161514;padding:20px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:8px">1. Windows Job Object Containment (Active)</strong>
                <p>FramePilot creates a dedicated Windows Job Object for the Remotion worker process tree with:</p>
                <ul style="padding-left:20px;margin:8px 0;display:grid;gap:6px">
                  <li><strong>KILL_ON_JOB_CLOSE (0x2000):</strong> When the job terminates or is cancelled, Windows immediately terminates every child process (Node, Chromium, Compositor).</li>
                  <li><strong>Memory Limit:</strong> Virtual memory is strictly capped at 4,096 MB to prevent memory exhaustion DoS.</li>
                  <li><strong>Process Limit:</strong> A maximum of 32 concurrent processes is enforced.</li>
                  <li><strong>UI Restrictions:</strong> The worker cannot access the clipboard, system parameters, desktop windows, or display settings.</li>
                </ul>
              </div>

              <div style="background:#161514;padding:20px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:8px">2. Filesystem Scope (Project-Only Requirement)</strong>
                <p>Remotion projects must have read access strictly to their own folder and the runtime packages, and write access only to their <code>outputs/</code> folder. Untrusted code cannot be granted broad access to user drives.</p>
              </div>

              <div style="background:#161514;padding:20px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:8px">3. Outbound Network Denial vs. Chromium DevTools Protocol</strong>
                <p>Remotion requires a local loopback WebSocket connection (<code>127.0.0.1</code>) to control Chrome Headless Shell. Outbound internet connections must be denied while preserving loopback IPC, without passing <code>--no-sandbox</code> in production.</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Tab 3: Technical Logs -->
        <div class="motion-diag-tab-pane" id="pane-tab-logs">
          <section class="surface-panel" style="padding:24px 28px">
            <div class="panel-heading">
              <div>
                <h3>Motion Studio Activity Logs</h3>
                <p class="motion-panel-sub">Live events and diagnostic logs from runtime operations.</p>
              </div>
              <div style="display:flex;gap:10px">
                <button class="outline-button" id="motion-diag-copy-logs" type="button">Copy All Logs</button>
                <button class="outline-button" id="motion-diag-clear-logs" type="button">Clear Logs</button>
              </div>
            </div>
            <div id="motion-diag-logs-container" style="max-height:480px;overflow:auto;background:#0d0d0e;border:1px solid #2d2822;border-radius:10px;padding:16px;margin-top:16px;font-family:monospace;font-size:13px;line-height:1.6;color:#ccc2b0">
              <div class="motion-empty-line">No diagnostic logs recorded yet.</div>
            </div>
          </section>
        </div>

        <!-- Tab 4: Installation Help -->
        <div class="motion-diag-tab-pane" id="pane-tab-install">
          <section class="surface-panel" style="padding:24px 28px">
            <div class="panel-heading">
              <div>
                <h3>Installation &amp; Setup Help</h3>
                <p class="motion-panel-sub">Step-by-step instructions for setting up the offline motion runtime.</p>
              </div>
            </div>
            <div style="display:grid;gap:16px;margin-top:16px;font-size:14px;color:#c9c0b0;line-height:1.65">
              <div style="background:#161514;padding:18px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:6px">1. One-Click Runtime Installation</strong>
                <p>Navigate to the <strong>Runtime Manager</strong> tab and click <strong>Install</strong>. FramePilot will automatically initialize your dedicated Motion Python runtime at <code>%APPDATA%\\FramePilot Studio\\runtime\\motion-python</code> and seed pre-compiled dependencies offline.</p>
              </div>
              <div style="background:#161514;padding:18px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:6px">2. Verifying Components</strong>
                <p>Click <strong>Verify</strong> to run automatic integrity checks on your Python runtime, PyTorch, WhisperX speech models, Node.js, and Chrome Headless Shell.</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Tab 5: Troubleshooting Guide -->
        <div class="motion-diag-tab-pane" id="pane-tab-troubleshoot">
          <section class="surface-panel" style="padding:24px 28px">
            <div class="panel-heading">
              <div>
                <h3>Troubleshooting Guide</h3>
                <p class="motion-panel-sub">Solutions to common operational questions.</p>
              </div>
            </div>
            <div style="display:grid;gap:16px;margin-top:16px;font-size:14px;color:#c9c0b0;line-height:1.65">
              <div style="background:#161514;padding:18px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:6px">Why does Render Video say "Secure rendering is not yet enabled"?</strong>
                <p>Imported Remotion projects contain arbitrary executable code. FramePilot enforces Windows OS-level worker isolation to ensure your computer is protected before execution begins.</p>
              </div>
              <div style="background:#161514;padding:18px;border-radius:10px;border:1px solid #332d26">
                <strong style="color:#f2deaf;font-size:15px;display:block;margin-bottom:6px">Word Timing returns "No speech recognized"</strong>
                <p>Ensure the audio file has clear spoken dialogue. Voice activity detection flags silent or quiet audio segments. If audio begins after a pause, the aligner will sync from the first spoken word.</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Tab 6: About -->
        <div class="motion-diag-tab-pane" id="pane-tab-about">
          <section class="surface-panel" style="padding:24px 28px">
            <div class="panel-heading">
              <div>
                <h3>About FramePilot Motion Studio</h3>
                <p class="motion-panel-sub">Independent documentary motion-production system.</p>
              </div>
            </div>
            <div style="display:grid;gap:14px;margin-top:16px;font-size:14px;color:#c9c0b0;line-height:1.65">
              <p><strong>FramePilot Studio:</strong> v0.1.4 (Motion Studio Pro v4.0)</p>
              <p><strong>Architecture:</strong> Dual-workspace desktop suite. Filmora Studio and Motion Studio operate on strictly isolated runtimes and data schemas.</p>
              <p><strong>Filmora Isolation:</strong> The 21-column Final Master CSV, EMS schema, and <code>Master_promt.txt</code> are 100% untouched.</p>
              <p><strong>Remotion Runtime:</strong> Pinned to v4.0.540 with Chrome for Testing and native MSVC compositor.</p>
            </div>
          </section>
        </div>
      </section>`;

    anchor.insertAdjacentHTML('beforebegin', pages);
  }

  function navigateMotion(page) {
    if (!pageLabels[page]) return;
    // Map alias
    if (page === 'motion-runtime-manager') page = 'motion-diagnostics';
    state.currentPage = page;

    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
    document.querySelectorAll('.nav-item').forEach(el => {
      const match = el.dataset.page === page || el.dataset.motionPage === page ||
                    (page === 'motion-diagnostics' && el.dataset.motionPage === 'motion-runtime-manager');
      el.classList.toggle('active', Boolean(match));
    });

    const crumb = $('page-crumb');
    if (crumb) crumb.textContent = pageLabels[page];
    window.scrollTo({ top: 0, behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });

    if (page === 'motion-overview') refreshDashboard();
    if (page === 'motion-import') refreshProjects();
    if (page === 'motion-render') refreshRenderPage();
    if (page === 'motion-project-manager') refreshProjectManager();
    if (page === 'motion-render-history') refreshFullRenderHistory();
    if (page === 'motion-diagnostics') refreshDiagnostics();
  }

  function switchDiagTab(targetTab) {
    state.currentDiagTab = targetTab;
    document.querySelectorAll('.motion-diag-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diagTabTarget === targetTab);
    });
    document.querySelectorAll('.motion-diag-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${targetTab}`);
    });
  }

  function updateOverviewNextAction() {
    const titleEl = $('motion-overview-next-title');
    const descEl = $('motion-overview-next-desc');
    const btnEl = $('motion-overview-next-btn');
    if (!titleEl || !descEl || !btnEl) return;

    if (!state.wordCsv && !state.scriptPath) {
      titleEl.textContent = 'Step 1: Create your first Word Timing';
      descEl.textContent = 'Upload your approved script and voiceover audio to generate verified, word-level timestamps.';
      btnEl.textContent = 'Start Word Timing';
      btnEl.dataset.motionGo = 'motion-word-timing';
    } else if (state.wordCsv && !state.projects.length) {
      titleEl.textContent = 'Step 2: Generate project with Claude';
      descEl.textContent = 'Use your timing CSV and Master Instructions in Claude to author your Remotion project ZIP.';
      btnEl.textContent = 'Open Claude Project';
      btnEl.dataset.motionGo = 'motion-claude-kit';
    } else if (state.projects.length) {
      titleEl.textContent = 'Step 4: Render Video';
      descEl.textContent = `You have ${state.projects.length} project(s) ready. Select a project and produce your final MP4.`;
      btnEl.textContent = 'Go to Render Video';
      btnEl.dataset.motionGo = 'motion-render';
    }
  }

  function updateFileRow(prefix, path) {
    const name = $(`${prefix}-name`);
    const row = $(`${prefix}-row`);
    if (name) name.textContent = path ? basename(path) : `No ${prefix === 'motion-script' ? 'script' : 'voiceover'} selected`;
    if (row) row.classList.toggle('selected', Boolean(path));
    const inputState = $('motion-input-state');
    if (inputState) {
      const count = Number(Boolean(state.scriptPath)) + Number(Boolean(state.audioPath));
      inputState.textContent = `${count} / 2 READY`;
      inputState.classList.toggle('all-ready', count === 2);
    }
    updateWordReady();
  }

  function updateWordReady() {
    const ready = Boolean(state.scriptPath && state.audioPath && !state.busy);
    const button = $('motion-generate-word-csv');
    if (button) button.disabled = !ready;
    const status = $('motion-word-readiness');
    if (status) status.textContent = state.busy
      ? 'A Motion Studio job is currently running.'
      : ready
      ? 'Both inputs are selected. Ready to generate verified word timings.'
      : 'Select both the approved script and matching voiceover audio.';
  }

  function setBusy(value) {
    state.busy = Boolean(value);
    updateWordReady();
    const generate = $('motion-generate-word-csv');
    if (generate) generate.disabled = !Boolean(state.scriptPath && state.audioPath) || state.busy;
    const importButton = $('motion-confirm-import');
    if (importButton && state.busy) importButton.disabled = true;
  }

  function setMotionProgress(prefix, percent, message, stage) {
    const panel = $(`${prefix}-progress`);
    if (!panel) return;
    panel.hidden = false;
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const fill = $(`${prefix}-fill`);
    if (fill) fill.style.width = `${safePercent}%`;
    const percentNode = $(`${prefix}-percent`);
    if (percentNode) percentNode.textContent = `${Math.round(safePercent)}%`;
    const messageNode = $(`${prefix}-message`);
    if (messageNode) messageNode.textContent = message || 'Processing…';
    const stageNode = $(`${prefix}-stage`);
    if (stageNode && stage) stageNode.textContent = stage;
  }

  function setRmProgress(percent, message, error = false) {
    const panel = $('motion-rm-progress');
    if (!panel) return;
    panel.hidden = false;
    const fill = $('motion-rm-fill');
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
    const pct = $('motion-rm-percent');
    if (pct) pct.textContent = `${Math.round(Number(percent) || 0)}%`;
    const msg = $('motion-rm-message');
    if (msg) {
      msg.textContent = message || 'Processing…';
      msg.classList.toggle('error', error);
    }
  }

  async function manageRuntime(operation) {
    setRmProgress(5, `Starting runtime ${operation}…`);
    try {
      await window.framepilot.motionManageRuntime(operation);
      await refreshRuntime();
      await refreshDiagnostics();
      toast(`Motion runtime ${operation} completed successfully.`);
    } catch (error) {
      setRmProgress(0, error.message, true);
      toast(error.message, true);
    }
  }

  function renderRuntimeManagerTable(runtime) {
    const map = {
      'motion-rmr-python': [runtime.pythonBackendAvailable, 'Motion Python runtime'],
      'motion-rmr-whisperx': [runtime.whisperxAvailable, 'WhisperX & PyTorch'],
      'motion-rmr-models': [runtime.modelsAvailable, 'Offline speech models'],
      'motion-rmr-node': [runtime.nodeRuntimeAvailable, 'Node.js runtime'],
      'motion-rmr-remotion': [runtime.remotionRendererAvailable, 'Remotion renderer'],
      'motion-rmr-browser': [runtime.browserAvailable, 'Chromium Headless Shell'],
      'motion-rmr-binaries': [runtime.remotionBinariesAvailable, 'Native binaries'],
      'motion-rmr-validator': [runtime.projectImporterAvailable, 'ZIP validator'],
      'motion-rmr-isolation': [runtime.projectExecutionAllowed, 'Security isolation'],
    };
    for (const [id, [ready]] of Object.entries(map)) {
      const el = $(id);
      if (!el) continue;
      el.className = `motion-rm-status-badge ${ready ? 'ready' : 'pending'}`;
      el.textContent = ready ? 'READY' : 'NOT READY';
    }
    if (runtime.pythonVersion) {
      const v = $('motion-rmr-python-ver');
      if (v) v.textContent = `v${runtime.pythonVersion}`;
    }
    if (runtime.motionPythonLocation) {
      const loc = $('motion-rmr-python-loc');
      if (loc) loc.textContent = runtime.motionPythonLocation;
    }
    if (runtime.nodeVersion) {
      const v = $('motion-rmr-node-ver');
      if (v) v.textContent = `v${runtime.nodeVersion}`;
    }
    if (runtime.remotionVersion) {
      const v = $('motion-rmr-remotion-ver');
      if (v) v.textContent = `v${runtime.remotionVersion}`;
    }
  }

  async function refreshRuntime() {
    const local = await window.framepilot.motionGetRuntimeInfo();
    state.runtime = local;
    renderRuntimeManagerTable(local);
    const canAlign = Boolean(local.pythonBackendAvailable && local.wordTimingSourceAvailable);
    const readyText = $('motion-word-readiness');
    if (readyText && !state.scriptPath && !state.audioPath) {
      readyText.textContent = canAlign
        ? 'Select both files to generate verified word timestamps.'
        : 'Motion Word Timing source or Python runtime is missing.';
    }
    if ($('motion-render-final')) {
      $('motion-render-final').disabled = !local.motionRenderReady || !state.selectedProject;
    }
    return local;
  }

  async function refreshSecurityStatus() {
    if (window.framepilot.motionGetSecurityStatus) {
      try {
        const sec = await window.framepilot.motionGetSecurityStatus();
        state.securityStatus = sec;
      } catch {}
    }
  }

  async function refreshDiagnostics() {
    await refreshRuntime().catch(e => toast(`Runtime: ${e.message}`, true));
    await refreshSecurityStatus().catch(() => {});
  }

  function projectCard(project) {
    const card = document.createElement('div');
    card.className = 'motion-project-item';
    const iconNode = document.createElement('div');
    iconNode.className = 'motion-project-icon';
    iconNode.textContent = 'MP';
    const info = document.createElement('div');
    info.className = 'motion-project-info';
    const title = document.createElement('strong');
    title.textContent = project.name;
    const meta = document.createElement('span');
    meta.textContent = `${project.width}×${project.height} · ${project.fps} FPS · ${project.compositionId}`;
    info.append(title, meta);
    const actions = document.createElement('div');
    actions.className = 'motion-project-actions';
    const select = document.createElement('button');
    select.className = 'text-button';
    select.textContent = 'Render Video';
    select.addEventListener('click', () => {
      state.selectedProject = project;
      navigateMotion('motion-render');
      populateSelectedProject();
    });
    const reveal = document.createElement('button');
    reveal.className = 'text-button';
    reveal.textContent = 'Folder';
    reveal.addEventListener('click', () => window.framepilot.motionOpenProjectFolder(project.path).catch(e => toast(e.message, true)));
    actions.append(select, reveal);
    card.append(iconNode, info, actions);
    return card;
  }

  async function refreshProjects() {
    const projects = await window.framepilot.motionListProjects();
    state.projects = Array.isArray(projects) ? projects : [];
    const hosts = [$('motion-recent-projects'), $('motion-imported-project-list')].filter(Boolean);
    for (const host of hosts) {
      host.replaceChildren();
      if (!state.projects.length) {
        const empty = document.createElement('div');
        empty.className = 'motion-empty-line';
        empty.textContent = 'No Motion Projects imported yet.';
        host.append(empty);
      } else {
        state.projects.slice(0, 8).forEach(project => host.append(projectCard(project)));
      }
    }
    const select = $('motion-project-select');
    if (select) {
      const selectedValue = state.selectedProject?.path || select.value;
      select.replaceChildren(new Option('Select an imported project…', ''));
      for (const project of state.projects) select.add(new Option(project.name, project.path));
      if (selectedValue && state.projects.some(p => p.path === selectedValue)) select.value = selectedValue;
    }
    if (state.selectedProject) {
      const match = state.projects.find(p => p.path === state.selectedProject.path);
      if (match) state.selectedProject = match;
    }
    updateOverviewNextAction();
    return state.projects;
  }

  function populateSelectedProject() {
    const project = state.selectedProject;
    if (!project) return;
    const select = $('motion-project-select');
    if (select) select.value = project.path;
    const specs = $('motion-render-specs');
    if (specs) {
      specs.replaceChildren();
      const items = [
        ['Resolution', `${project.width} × ${project.height}`],
        ['Frame Rate', `${project.fps} FPS`],
        ['Duration', `${(project.durationInFrames / project.fps / 60).toFixed(2)} min`],
        ['Composition', project.compositionId],
      ];
      for (const [label, value] of items) {
        const box = document.createElement('div');
        box.className = 'motion-render-spec-cell';
        const span = document.createElement('span');
        span.textContent = label;
        const strong = document.createElement('strong');
        strong.textContent = value;
        box.append(span, strong);
        specs.append(box);
      }
    }
    const ready = Boolean(state.runtime?.motionRenderReady);
    if ($('motion-render-final')) $('motion-render-final').disabled = !ready;
  }

  async function refreshDashboard() {
    await refreshRuntime().catch(e => toast(`Runtime: ${e.message}`, true));
    await refreshProjects().catch(e => toast(`Projects: ${e.message}`, true));
    updateOverviewNextAction();
  }

  async function refreshRenderPage() {
    await refreshProjects().catch(() => {});
    await refreshRuntime().catch(() => {});
    if (state.selectedProject) populateSelectedProject();
  }

  async function refreshFullRenderHistory() {
    const history = await window.framepilot.motionListRenderHistory().catch(e => { toast(`Render history: ${e.message}`, true); return null; });
    if (history !== null) state.renderHistory = Array.isArray(history) ? history : [];
    const host = $('motion-rh-list');
    if (!host) return;
    host.replaceChildren();
    if (!state.renderHistory.length) {
      const empty = document.createElement('div');
      empty.className = 'motion-empty-line';
      empty.textContent = 'No completed renders recorded.';
      host.append(empty);
      return;
    }
    for (const item of state.renderHistory) {
      const row = document.createElement('div');
      row.className = 'motion-history-item';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.style.cssText = 'font-size:15px;color:#f0e6d6;display:block';
      title.textContent = item.projectName || 'Unknown project';
      const timestamp = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time';
      const duration = item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '—';
      const meta = document.createElement('span');
      meta.style.cssText = 'font-size:13px;color:#948b7d;margin-top:4px;display:block';
      meta.textContent = `${timestamp} · Duration: ${duration} · Output: ${item.outputPath ? item.outputPath : '—'}`;
      const badge = document.createElement('span');
      badge.className = `motion-history-badge${item.outputExists === false ? ' missing' : item.failed ? ' failed' : ''}`;
      badge.textContent = item.outputExists === false ? 'MISSING OUTPUT' : item.failed ? 'FAILED' : 'FINAL MP4';
      info.append(title, meta);
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;align-items:center';
      actions.append(badge);
      if (item.outputExists && item.outputPath) {
        const openBtn = document.createElement('button');
        openBtn.className = 'outline-button';
        openBtn.style.minHeight = '36px';
        openBtn.style.fontSize = '12.5px';
        openBtn.textContent = 'Show in Folder';
        openBtn.addEventListener('click', () => window.framepilot.motionShowInFolder(item.outputPath).catch(e => toast(e.message, true)));
        actions.append(openBtn);
      }
      row.append(info, actions);
      host.append(row);
    }
  }

  // ── Project Manager page ──────────────────────────────────────────────────
  const pmState = { query: '', page: 0, pageSize: 20 };

  function renderProjectManagerList() {
    const host = $('motion-pm-project-list');
    const countEl = $('motion-pm-count');
    const paginationEl = $('motion-pm-pagination');
    if (!host) return;
    const q = pmState.query.toLowerCase().trim();
    const filtered = q ? state.projects.filter(p => p.name.toLowerCase().includes(q)) : state.projects;
    const total = filtered.length;
    const start = pmState.page * pmState.pageSize;
    const slice = filtered.slice(start, start + pmState.pageSize);
    if (countEl) countEl.textContent = `${total} project${total !== 1 ? 's' : ''}${q ? ` matching "${pmState.query}"` : ''}`;
    host.replaceChildren();
    if (!slice.length) {
      const empty = document.createElement('div');
      empty.className = 'motion-empty-line';
      empty.textContent = q ? 'No projects match your search.' : 'No Motion Projects imported yet.';
      host.append(empty);
      if (paginationEl) paginationEl.replaceChildren();
      return;
    }
    for (const project of slice) {
      const item = document.createElement('div');
      item.className = 'motion-project-item-full';
      const iconNode = document.createElement('div');
      iconNode.className = 'motion-project-icon';
      iconNode.textContent = 'MP';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = project.name;
      title.style.cssText = 'font-size:15px;color:#f0e6d6';
      const meta = document.createElement('div');
      meta.className = 'motion-project-meta-grid';
      const fields = [
        ['Resolution', `${project.width}×${project.height}`],
        ['FPS', project.fps],
        ['Duration', `${(project.durationInFrames / project.fps / 60).toFixed(2)} min`],
        ['Composition', project.compositionId],
      ];
      for (const [lbl, val] of fields) {
        const s = document.createElement('span'); s.textContent = lbl; s.style.fontSize = '12px'; s.style.color = '#8c8477';
        const v = document.createElement('strong'); v.textContent = val; v.style.fontSize = '12.5px'; v.style.color = '#d5aa5b';
        meta.append(s, v);
      }
      info.append(title, meta);
      const actions = document.createElement('div');
      actions.className = 'motion-project-actions';
      const renderBtn = document.createElement('button');
      renderBtn.className = 'primary-button small-primary';
      renderBtn.style.minHeight = '38px';
      renderBtn.textContent = 'Render Video';
      renderBtn.addEventListener('click', () => {
        state.selectedProject = project;
        navigateMotion('motion-render');
        populateSelectedProject();
      });
      const folderBtn = document.createElement('button');
      folderBtn.className = 'outline-button';
      folderBtn.style.minHeight = '38px';
      folderBtn.textContent = 'Folder';
      folderBtn.addEventListener('click', () => window.framepilot.motionOpenProjectFolder(project.path).catch(e => toast(e.message, true)));
      const delBtn = document.createElement('button');
      delBtn.className = 'text-button danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete "${project.name}" and its project files?`)) return;
        try {
          await window.framepilot.motionDeleteProject(project.path);
          if (state.selectedProject?.path === project.path) state.selectedProject = null;
          await refreshProjectManager();
          toast('Motion project deleted.');
        } catch (e) { toast(e.message, true); }
      });
      actions.append(renderBtn, folderBtn, delBtn);
      item.append(iconNode, info, actions);
      host.append(item);
    }
  }

  async function refreshProjectManager() {
    const projects = await window.framepilot.motionListProjects().catch(e => { toast(e.message, true); return null; });
    if (projects !== null) state.projects = Array.isArray(projects) ? projects : [];
    pmState.page = 0;
    renderProjectManagerList();
  }

  async function chooseScript() {
    try {
      const file = await window.framepilot.motionSelectScript();
      if (!file) return;
      state.scriptPath = file;
      updateFileRow('motion-script', file);
      const preview = await window.framepilot.motionReadScriptPreview(file).catch(() => null);
      const box = $('motion-script-preview');
      if (box && preview) {
        box.hidden = false;
        const label = document.createElement('span');
        label.textContent = `${preview.name} · ${formatBytes(preview.size)}`;
        const sample = document.createElement('p');
        sample.textContent = preview.text.slice(0, 500);
        box.replaceChildren(label, sample);
      }
    } catch (error) { toast(error.message, true); }
  }

  async function chooseAudio() {
    try {
      const file = await window.framepilot.motionSelectAudio();
      if (!file) return;
      state.audioPath = file;
      updateFileRow('motion-audio', file);
    } catch (error) { toast(error.message, true); }
  }

  async function generateWordTiming() {
    if (!state.scriptPath || !state.audioPath || state.busy) return;
    setBusy(true);
    $('motion-word-progress').hidden = false;
    $('motion-word-progress').classList.remove('complete', 'failed');
    $('motion-wt-step-2').classList.add('active');
    setMotionProgress('motion-word', 1, 'Starting local Motion alignment…', 'Preparing inputs');
    try {
      const result = await window.framepilot.motionGenerateWordTiming({
        scriptPath: state.scriptPath,
        audioPath: state.audioPath,
        projectName: $('motion-project-name').value.trim(),
        outputFolder: $('motion-output-folder').value.trim() || undefined,
        model: $('motion-asr-model').value || undefined,
      });
      if (result?.outputPath) state.wordCsv = result.outputPath;
      $('motion-word-progress').classList.add('complete');
      $('motion-word-job-state').textContent = 'COMPLETED';
      $('motion-word-job-state').className = 'motion-job-state success';
      $('motion-wt-step-2').classList.add('completed');
      $('motion-wt-step-3').classList.add('active');
      $('motion-wt-step-4').classList.add('completed');
      setMotionProgress('motion-word', 100, 'Word Timing CSV created. Review the QA report before production use.', 'Alignment completed');
      if (state.wordCsv) await showWordResult(state.wordCsv, result.qaPath);
      toast('Motion Word Timing CSV created.');
      updateOverviewNextAction();
    } catch (error) {
      $('motion-word-progress').classList.add('failed');
      $('motion-word-job-state').textContent = 'FAILED';
      $('motion-word-job-state').className = 'motion-job-state failed';
      $('motion-word-message').textContent = error.message;
      toast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = []; let cell = ''; let quoted = false;
    const input = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (quoted) {
        if (ch === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    return rows;
  }

  async function showWordResult(csvPath, qaPath) {
    state.wordCsv = csvPath;
    state.wordQa = qaPath || csvPath.replace(/\.csv$/i, '.QA.json');
    $('motion-word-result').hidden = false;
    $('motion-word-output-name').textContent = basename(csvPath);
    $('motion-word-output-path').textContent = csvPath;
    $('motion-word-output-state').textContent = 'CSV CREATED';
    const preview = await window.framepilot.motionReadOutputPreview(csvPath);
    const rows = parseCsv(preview.text);
    const header = rows.shift() || [];
    const indexes = Object.fromEntries(header.map((value, index) => [value, index]));
    const body = $('motion-word-table-body');
    body.replaceChildren();
    for (const item of rows.slice(0, 18)) {
      const tr = document.createElement('tr');
      const values = ['Word_Index', 'Script_Word', 'Recognized_Word', 'Start_ms', 'End_ms'].map(key => item[indexes[key]] || '');
      values.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
      body.append(tr);
    }
    $('motion-word-row-count').textContent = `${rows.length.toLocaleString()} WORDS`;
    $('motion-word-table-card').hidden = false;
    const qa = $('motion-word-qa');
    qa.textContent = `CSV: ${rows.length.toLocaleString()} rows · Companion report: ${basename(state.wordQa)}`;
  }

  async function promptAction(key, action) {
    try {
      const prompt = await window.framepilot.motionReadPrompt(key);
      if (action === 'copy') {
        await window.framepilot.motionCopyText(prompt.content);
        toast(`${prompt.name} copied to clipboard.`);
      } else {
        const result = await window.framepilot.motionSavePrompt(key);
        if (result?.saved) toast(`Saved ${basename(result.path)}.`);
      }
    } catch (error) { toast(error.message, true); }
  }

  async function refreshClaudeKit() {
    try {
      const info = await window.framepilot.motionClaudeKitInfo();
      state.claudeProjectUrl = info.claudeProjectUrl || '';
      const url = $('motion-claude-project-url');
      if (url) url.value = state.claudeProjectUrl;

      if (window.framepilot.motionListWordTimingSessions) {
        const sessions = await window.framepilot.motionListWordTimingSessions().catch(() => []);
        const select = $('motion-handoff-project-select');
        if (select) {
          const currentVal = select.value;
          select.replaceChildren(new Option('Select Word Timing session…', ''));
          for (const s of sessions) {
            select.add(new Option(`${s.name} (${s.sessionId ? s.sessionId.slice(0, 14) : 'Session'})`, s.csvPath));
          }
          if (currentVal) select.value = currentVal;
        }
      }
    } catch (e) {
      toast(`Claude Project: ${e.message}`, true);
    }
  }

  async function chooseProjectZip() {
    try {
      const file = await window.framepilot.motionSelectProjectZip();
      if (!file) return;
      state.projectZip = file;
      $('motion-selected-zip').textContent = basename(file);
      $('motion-import-report').hidden = false;
      $('motion-import-status').textContent = 'VALIDATING…';
      $('motion-import-status').className = 'motion-status-pill pending';
      $('motion-import-metrics').replaceChildren();
      $('motion-import-checks').textContent = 'Inspecting archive structure, manifest, package.json and declared assets…';
      $('motion-confirm-import').disabled = true;
      await inspectProjectZip();
    } catch (error) { toast(error.message, true); }
  }

  async function inspectProjectZip() {
    if (!state.projectZip) return;
    try {
      const result = await window.framepilot.motionInspectProject(state.projectZip);
      if (result?.project) showImportReport(result.project);
    } catch (error) {
      $('motion-import-status').textContent = 'IMPORT FAILED';
      $('motion-import-status').className = 'motion-status-pill failed';
      $('motion-import-checks').textContent = error.message;
      $('motion-confirm-import').disabled = true;
      toast(error.message, true);
    }
  }

  function showImportReport(project) {
    state.lastProjectInfo = project;
    const status = $('motion-import-status');
    status.textContent = 'VALIDATION PASSED';
    status.className = 'motion-status-pill success';
    const metrics = $('motion-import-metrics');
    metrics.replaceChildren();
    const values = [
      ['Project', project.projectName],
      ['Composition', project.compositionId],
      ['Resolution', `${project.width} × ${project.height}`],
      ['FPS', project.fps],
      ['Duration', `${(project.durationInFrames / project.fps / 60).toFixed(2)} min`],
      ['Assets / Files', `${project.assets?.length || 0} / ${project.fileCount}`],
    ];
    for (const [label, value] of values) {
      const item = document.createElement('div');
      item.className = 'motion-import-metric';
      const name = document.createElement('span');
      name.textContent = label;
      const val = document.createElement('strong');
      val.textContent = String(value);
      item.append(name, val);
      metrics.append(item);
    }
    $('motion-import-checks').textContent = `Manifest, entry point, Remotion version ${project.remotionVersion} and declared assets passed static validation. Code has not been executed.`;
    $('motion-confirm-import').disabled = false;
  }

  async function importProjectZip() {
    if (!state.projectZip || !state.lastProjectInfo || state.busy) return;
    setBusy(true);
    $('motion-confirm-import').textContent = 'Importing…';
    try {
      const result = await window.framepilot.motionImportProject(state.projectZip);
      $('motion-import-status').textContent = 'IMPORTED';
      $('motion-import-status').className = 'motion-status-pill success';
      $('motion-confirm-import').textContent = 'Imported';
      toast('Motion project safely imported.');
      await refreshProjects();
      const importedPath = result?.project?.projectPath || state.lastProjectInfo?.projectPath;
      const importedName = state.lastProjectInfo?.projectName;
      state.selectedProject = state.projects.find(item =>
        (importedPath && item.path === importedPath) ||
        (importedName && item.name === importedName)
      ) || null;
      if (state.selectedProject) {
        populateSelectedProject();
        navigateMotion('motion-render');
      }
    } catch (error) {
      $('motion-import-status').textContent = 'IMPORT FAILED';
      $('motion-import-status').className = 'motion-status-pill failed';
      $('motion-import-checks').textContent = error.message;
      toast(error.message, true);
    } finally {
      setBusy(false);
      $('motion-confirm-import').textContent = 'Import to Motion Studio';
    }
  }

  async function runMotionRender() {
    if (!state.selectedProject) {
      toast('Select an imported project first.', true);
      return;
    }
    // Strict fail-closed check
    if (!state.runtime?.motionRenderReady) {
      toast('Secure rendering is not yet enabled because Windows project isolation has not passed verification. Your project has not been executed.', true);
      const gateText = $('motion-render-gate-text');
      if (gateText) gateText.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    $('motion-render-progress').hidden = false;
    $('motion-render-progress').classList.remove('complete', 'failed');
    $('motion-render-state').textContent = 'RUNNING';
    setMotionProgress('motion-render', 1, 'Starting render…', 'Starting Remotion worker');
    try {
      const result = await window.framepilot.motionStartRender({ projectPath: state.selectedProject.path });
      $('motion-render-progress').classList.add('complete');
      $('motion-render-state').textContent = 'COMPLETED';
      $('motion-render-state').className = 'motion-job-state success';
      setMotionProgress('motion-render', 100, 'Video completed and verified.', 'Render completed');
      state.lastRenderOutput = result.outputPath;
      $('motion-render-result').hidden = false;
      $('motion-render-output-name').textContent = basename(result.outputPath);
      $('motion-render-output-path').textContent = result.outputPath;
      toast('Final MP4 rendered and verified successfully.');
      await refreshRenderHistory();
    } catch (error) {
      $('motion-render-progress').classList.add('failed');
      $('motion-render-state').textContent = 'FAILED';
      $('motion-render-state').className = 'motion-job-state failed';
      $('motion-render-message').textContent = error.message;
      toast(error.message, true);
    }
  }

  async function cancelMotionJob(prefix) {
    try {
      const result = await window.framepilot.motionCancelJob();
      if (result?.cancelled) {
        const message = $(`${prefix}-message`);
        if (message) message.textContent = 'Cancellation requested…';
      }
    } catch (error) { toast(error.message, true); }
  }

  function bindEvents() {
    // Global delegation for data-motion-page and data-motion-go
    document.addEventListener('click', event => {
      const nav = event.target.closest('[data-motion-page]');
      if (nav) { event.preventDefault(); navigateMotion(nav.dataset.motionPage); return; }
      const go = event.target.closest('[data-motion-go]');
      if (go) {
        event.preventDefault();
        navigateMotion(go.dataset.motionGo);
        if (go.dataset.diagTab) switchDiagTab(go.dataset.diagTab);
        return;
      }
      const diagTab = event.target.closest('[data-diag-tab-target]');
      if (diagTab) {
        event.preventDefault();
        switchDiagTab(diagTab.dataset.diagTabTarget);
        return;
      }
    });

    // Word Timing bindings
    $('motion-pick-script').addEventListener('click', chooseScript);
    $('motion-pick-audio').addEventListener('click', chooseAudio);
    $('motion-generate-word-csv').addEventListener('click', generateWordTiming);
    $('motion-cancel-job').addEventListener('click', () => cancelMotionJob('motion-word'));
    $('motion-pick-output-folder').addEventListener('click', async () => {
      const folder = await window.framepilot.motionSelectOutputFolder().catch(e => { toast(e.message, true); return null; });
      if (folder) $('motion-output-folder').value = folder;
    });
    $('motion-copy-csv-path').addEventListener('click', () => window.framepilot.motionCopyPath(state.wordCsv).then(() => toast('CSV path copied.')).catch(e => toast(e.message, true)));
    $('motion-show-csv').addEventListener('click', () => window.framepilot.motionShowInFolder(state.wordCsv).catch(e => toast(e.message, true)));
    $('motion-open-word-table').addEventListener('click', () => $('motion-word-table-card').scrollIntoView({ behavior: 'smooth', block: 'start' }));

    // Advanced options toggle in Word Timing
    const wtAdvToggle = $('motion-wt-advanced-toggle');
    const wtAdvDrawer = $('motion-wt-advanced-drawer');
    if (wtAdvToggle && wtAdvDrawer) {
      wtAdvToggle.addEventListener('click', () => {
        const isOpen = !wtAdvDrawer.hidden;
        wtAdvDrawer.hidden = isOpen;
        wtAdvToggle.classList.toggle('open', !isOpen);
      });
    }

    // Claude Project Kit bindings
    $('motion-copy-master-instructions').addEventListener('click', () => promptAction('instructions', 'copy'));
    $('motion-save-master-instructions').addEventListener('click', () => promptAction('instructions', 'save'));
    $('motion-save-producer-skill').addEventListener('click', async () => {
      try {
        const result = await window.framepilot.motionSaveProducerSkill();
        if (result?.saved) toast(`Saved ${basename(result.path)}.`);
      } catch (e) { toast(e.message, true); }
    });
    $('motion-save-project-link').addEventListener('click', async () => {
      try {
        const url = $('motion-claude-project-url').value.trim();
        const result = await window.framepilot.motionSaveClaudeProjectUrl(url);
        state.claudeProjectUrl = result.claudeProjectUrl;
        toast('Claude Project link saved.');
      } catch (e) { toast(e.message, true); }
    });
    $('motion-open-claude').addEventListener('click', async () => {
      try {
        const result = await window.framepilot.motionOpenClaude();
        toast(result?.configured ? 'Private Claude Project opened.' : 'Claude opened.');
      } catch (e) { toast(e.message, true); }
    });
    $('motion-copy-per-video-handoff').addEventListener('click', () => promptAction('handoff', 'copy'));

    const handoffBtn = $('motion-generate-handoff-zip');
    if (handoffBtn) {
      handoffBtn.addEventListener('click', async () => {
        const select = $('motion-handoff-project-select');
        const csvPath = select ? select.value : '';
        if (!csvPath) {
          toast('Select a Word Timing session first.', true);
          return;
        }
        try {
          handoffBtn.disabled = true;
          handoffBtn.textContent = 'Generating…';
          const res = await window.framepilot.motionGenerateHandoffZip({ csvPath });
          if (res?.saved) toast(`Handoff ZIP saved: ${basename(res.path)}.`);
        } catch (e) {
          toast(e.message, true);
        } finally {
          handoffBtn.disabled = false;
          handoffBtn.textContent = 'Generate Handoff ZIP';
        }
      });
    }

    // Skill advanced maintenance toggle
    const skillAdvToggle = $('motion-skill-adv-toggle');
    const skillAdvDrawer = $('motion-skill-adv-drawer');
    if (skillAdvToggle && skillAdvDrawer) {
      skillAdvToggle.addEventListener('click', () => {
        const isOpen = !skillAdvDrawer.hidden;
        skillAdvDrawer.hidden = isOpen;
        skillAdvToggle.classList.toggle('open', !isOpen);
      });
    }

    const rebuildSkillBtn = $('motion-rebuild-skill-zip');
    if (rebuildSkillBtn) {
      rebuildSkillBtn.addEventListener('click', async () => {
        try {
          rebuildSkillBtn.disabled = true;
          rebuildSkillBtn.textContent = 'Rebuilding…';
          await window.framepilot.motionRebuildSkillZip();
          toast('Claude Skill ZIP rebuilt from canonical source.');
          await refreshClaudeKit();
        } catch (e) { toast(e.message, true); }
        finally {
          rebuildSkillBtn.disabled = false;
          rebuildSkillBtn.textContent = 'Rebuild Skill ZIP';
        }
      });
    }

    const verifySkillBtn = $('motion-verify-skill-package');
    if (verifySkillBtn) {
      verifySkillBtn.addEventListener('click', async () => {
        try {
          verifySkillBtn.disabled = true;
          verifySkillBtn.textContent = 'Verifying…';
          const res = await window.framepilot.motionVerifySkillPackage();
          const pkgStatus = $('motion-skill-pkg-status');
          if (pkgStatus) pkgStatus.textContent = res.output || 'Skill package verification passed.';
          toast('Skill package verified successfully.');
        } catch (e) { toast(e.message, true); }
        finally {
          verifySkillBtn.disabled = false;
          verifySkillBtn.textContent = 'Verify Package';
        }
      });
    }

    // Import Project bindings & Drag-and-Drop
    const dropzone = $('motion-import-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) {
          const file = e.dataTransfer.files[0];
          if (file.path && file.path.endsWith('.zip')) {
            state.projectZip = file.path;
            $('motion-selected-zip').textContent = basename(file.path);
            $('motion-import-report').hidden = false;
            $('motion-import-status').textContent = 'VALIDATING…';
            $('motion-import-status').className = 'motion-status-pill pending';
            $('motion-import-metrics').replaceChildren();
            $('motion-import-checks').textContent = 'Inspecting archive structure…';
            $('motion-confirm-import').disabled = true;
            inspectProjectZip();
          } else {
            toast('Please select a valid Remotion project .zip file.', true);
          }
        }
      });
    }
    $('motion-pick-project-zip').addEventListener('click', chooseProjectZip);
    $('motion-reinspect-project').addEventListener('click', inspectProjectZip);
    $('motion-confirm-import').addEventListener('click', importProjectZip);
    $('motion-refresh-projects').addEventListener('click', () => refreshProjects().catch(e => toast(e.message, true)));

    // Render Video bindings
    $('motion-project-select').addEventListener('change', () => {
      const project = state.projects.find(item => item.path === $('motion-project-select').value);
      state.selectedProject = project || null;
      if (project) populateSelectedProject();
      else {
        $('motion-render-specs').replaceChildren();
        $('motion-render-final').disabled = true;
      }
    });
    $('motion-render-final').addEventListener('click', () => runMotionRender());
    $('motion-cancel-render').addEventListener('click', () => cancelMotionJob('motion-render'));
    $('motion-copy-render-path').addEventListener('click', () => window.framepilot.motionCopyPath(state.lastRenderOutput).then(() => toast('Render path copied.')).catch(e => toast(e.message, true)));
    $('motion-show-render-folder').addEventListener('click', () => window.framepilot.motionShowInFolder(state.lastRenderOutput).catch(e => toast(e.message, true)));

    // Project Manager handlers
    const pmRefresh = $('motion-pm-refresh');
    if (pmRefresh) pmRefresh.addEventListener('click', () => refreshProjectManager().then(() => toast('Project Manager refreshed.')).catch(e => toast(e.message, true)));
    const pmSearch = $('motion-pm-search-input');
    if (pmSearch) {
      pmSearch.addEventListener('input', () => {
        pmState.query = pmSearch.value;
        pmState.page = 0;
        renderProjectManagerList();
      });
    }

    // Render History handlers
    const rhRefresh = $('motion-rh-refresh');
    if (rhRefresh) rhRefresh.addEventListener('click', () => refreshFullRenderHistory().then(() => toast('Render History refreshed.')).catch(e => toast(e.message, true)));

    // Diagnostics center handlers
    const rmInstall = $('motion-rm-install');
    if (rmInstall) rmInstall.addEventListener('click', () => manageRuntime('install'));
    const rmVerify = $('motion-rm-verify');
    if (rmVerify) rmVerify.addEventListener('click', () => manageRuntime('verify'));
    const rmRepair = $('motion-rm-repair');
    if (rmRepair) rmRepair.addEventListener('click', () => manageRuntime('repair'));
    const rmRefresh = $('motion-rm-refresh');
    if (rmRefresh) rmRefresh.addEventListener('click', () => refreshDiagnostics().then(() => toast('Runtime status refreshed.')).catch(e => toast(e.message, true)));
    const secRefresh = $('motion-sec-refresh');
    if (secRefresh) secRefresh.addEventListener('click', () => refreshSecurityStatus().then(() => toast('Security boundary re-checked.')).catch(e => toast(e.message, true)));

    const clearLogsBtn = $('motion-diag-clear-logs');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        const container = $('motion-diag-logs-container');
        if (container) container.replaceChildren();
        toast('Diagnostic logs cleared.');
      });
    }
    const copyLogsBtn = $('motion-diag-copy-logs');
    if (copyLogsBtn) {
      copyLogsBtn.addEventListener('click', () => {
        const container = $('motion-diag-logs-container');
        if (container) {
          window.framepilot.motionCopyText(container.innerText).then(() => toast('Diagnostic logs copied.')).catch(e => toast(e.message, true));
        }
      });
    }
  }

  function bindMotionEvents() {
    window.framepilot.onMotionRuntimeEvent(event => {
      const isErr = event.event === 'error' || event.level === 'error';
      if (event.event === 'complete') {
        setRmProgress(100, event.message);
        refreshRuntime().catch(() => {});
        refreshDiagnostics().catch(() => {});
      } else {
        setRmProgress(event.percent, event.message, isErr);
      }
    });

    window.framepilot.onMotionJobEvent(event => {
      if (event.event === 'progress') {
        if (event.kind === 'render-preview' || event.kind === 'render-render' || event.stage === 'render' || event.stage === 'preview' || event.stage === 'bundle') {
          setMotionProgress('motion-render', event.percent, event.message, event.stage === 'bundle' ? 'Compiling Remotion project' : undefined);
        } else {
          setMotionProgress('motion-word', event.percent, event.message, event.message);
        }
      }
      if (event.event === 'result' && event.project) showImportReport(event.project);
      if (event.event === 'result' && event.csv_output) {
        state.wordCsv = event.csv_output;
        state.wordQa = event.qa_output;
        updateOverviewNextAction();
      }
      if (event.event === 'result' && event.output) {
        state.lastRenderOutput = event.output;
      }
      if (event.event === 'error') toast(event.message || 'Motion Studio job failed.', true);
      if (event.event === 'warning') toast(event.message || 'Motion QA warning.');
      if (event.event === 'cancelled') toast(event.message || 'Motion Studio job cancelled.');
    });

    window.framepilot.onMotionJobLog(event => {
      // Shared Activity log
      const host = $('activity-log');
      if (host) {
        const row = document.createElement('div');
        row.className = 'log-row';
        const time = document.createElement('span');
        time.className = 'log-time';
        time.textContent = new Date().toLocaleTimeString();
        const message = document.createElement('span');
        message.className = `log-message ${event.level === 'error' ? 'error' : ''}`;
        message.textContent = `[Motion Studio] ${event.message}`;
        row.append(time, message);
        host.prepend(row);
      }
      // Dedicated Diagnostics log
      const diagLogs = $('motion-diag-logs-container');
      if (diagLogs) {
        const empty = diagLogs.querySelector('.motion-empty-line');
        if (empty) empty.remove();
        const logLine = document.createElement('div');
        logLine.style.cssText = `padding:4px 0;${event.level === 'error' ? 'color:#e59397' : 'color:#c9c0b0'}`;
        logLine.textContent = `[${new Date().toLocaleTimeString()}] ${event.message}`;
        diagLogs.append(logLine);
        diagLogs.scrollTop = diagLogs.scrollHeight;
      }
    });
  }

  function init() {
    injectNavigation();
    injectPages();
    bindEvents();
    bindMotionEvents();
    refreshDashboard().catch(e => toast(e.message, true));
    refreshClaudeKit().catch(e => toast(`Claude Project: ${e.message}`, true));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
