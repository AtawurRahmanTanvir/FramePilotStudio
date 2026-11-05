/* FramePilot Studio — Motion Studio UI layer. Additive; Filmora UI is not rewritten. */
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
    runtime: null,
    busy: false,
  };

  const pageLabels = {
    'motion-overview': 'Motion Overview',
    'motion-word-timing': 'Word Timing',
    'motion-claude-kit': 'Claude Project Kit',
    'motion-import': 'Project Import',
    'motion-render': 'Render Video',
    'motion-project-manager': 'Project Manager',
    'motion-render-history': 'Render History',
    'motion-runtime-manager': 'Runtime Manager',
  };

  const navIcon = {
    overview: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    timing: '<path d="M4 9v6m4-11v16m4-20v24m4-15v6m4-10v14"/>',
    kit: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    import: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    render: '<path d="M5 4h14v16H5z"/><path d="m10 8 6 4-6 4z"/>',
    projectManager: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="2" cy="6" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="2" cy="18" r="1"/>',
    renderHistory: '<path d="M12 8v4l3 3M3 12a9 9 0 1 0 2-5.6M3 3v4h4"/>',
    runtimeManager: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
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
      <div class="workspace-label motion-workspace-label">MOTION STUDIO <span>NEW</span></div>
      <nav class="nav-list motion-nav-list" aria-label="Motion Studio navigation">
        <button class="nav-item motion-nav-item" data-motion-page="motion-overview"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.overview}</svg></span><span>Motion Overview</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-word-timing"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.timing}</svg></span><span>Word Timing</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-claude-kit"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.kit}</svg></span><span>Claude Project Kit</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-import"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.import}</svg></span><span>Project Import</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-render"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.render}</svg></span><span>Render Video</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-project-manager"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.projectManager}</svg></span><span>Project Manager</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-render-history"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.renderHistory}</svg></span><span>Render History</span></button>
        <button class="nav-item motion-nav-item" data-motion-page="motion-runtime-manager"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.runtimeManager}</svg></span><span>Runtime Manager</span></button>
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
      <section class="page motion-page" id="page-motion-overview">
        ${pageHeading('Motion Studio', 'A dedicated workspace for word-level timing, AI-authored Remotion projects and local motion-graphics rendering.')}
        <div class="motion-hero-panel">
          <div class="motion-hero-glow"></div>
          <div class="motion-hero-content">
            <span class="motion-hero-kicker">INDEPENDENT PRODUCTION WORKSPACE</span>
            <h2>From every word<br/>to <em>every frame.</em></h2>
            <p>Build a separate motion-graphics workflow without changing Filmora Studio or its existing CSV system.</p>
            <div class="motion-hero-actions">
              <button class="primary-button" data-motion-go="motion-word-timing">Create Word Timing ${icon('arrow')}</button>
              <button class="outline-button" data-motion-go="motion-import">Import Remotion Project</button>
            </div>
          </div>
          <div class="motion-hero-orbit" aria-hidden="true"><div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-core">M</div><span class="orbit-node node-a">WORD</span><span class="orbit-node node-b">MOTION</span><span class="orbit-node node-c">RENDER</span></div>
        </div>
        <div class="motion-section-head"><div><h2>Motion workflow</h2><p>Eight focused workspaces, one independent pipeline.</p></div><span class="motion-section-tag">LOCAL-FIRST</span></div>
        <div class="motion-workflow-grid">
          <button class="motion-workflow-card" data-motion-go="motion-word-timing"><span class="motion-card-icon gold">${icon('audio')}</span><strong>Word Timing</strong><span>Script verification and word-level start/end timestamps.</span><i>Open workspace ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-claude-kit"><span class="motion-card-icon violet">${icon('file')}</span><strong>Claude Project Kit</strong><span>Production instructions, Master Prompt and project contract.</span><i>Open prompt kit ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-import"><span class="motion-card-icon red">${icon('import')}</span><strong>Project Import</strong><span>Validate and safely import a Remotion project ZIP.</span><i>Import project ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-render"><span class="motion-card-icon green">${icon('render')}</span><strong>Render Video</strong><span>Validate an imported project and create its final MP4.</span><i>Open render center ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-project-manager"><span class="motion-card-icon gold">${icon('folder')}</span><strong>Project Manager</strong><span>Full paginated library of imported Motion projects with search and project actions.</span><i>Manage projects ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-render-history"><span class="motion-card-icon violet">${icon('file')}</span><strong>Render History</strong><span>Dedicated full-page log of every completed local render with output status.</span><i>View history ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-runtime-manager"><span class="motion-card-icon red">${icon('check')}</span><strong>Runtime Manager</strong><span>Detailed runtime component status, install, verify and repair operations.</span><i>Manage runtime ↗</i></button>
        </div>
        <div class="motion-dashboard-grid">
          <section class="surface-panel motion-engine-panel">
            <div class="panel-heading"><div><h3>Motion runtime readiness</h3><p class="motion-panel-sub">Install and verify the private runtime without opening PowerShell.</p></div><div class="motion-runtime-actions"><button class="text-button" id="motion-install-runtime">Install</button><button class="text-button" id="motion-verify-runtime">Verify</button><button class="text-button" id="motion-repair-runtime">Repair</button><button class="text-button" id="motion-refresh-runtime">Refresh ↻</button></div></div>
            <div class="motion-runtime-progress" id="motion-runtime-progress" hidden><div class="motion-progress-track"><span id="motion-runtime-fill"></span></div><div class="motion-progress-meta"><span id="motion-runtime-message">Ready</span><strong id="motion-runtime-percent">0%</strong></div></div>
            <div class="motion-readiness-list" id="motion-readiness-list"><div class="motion-empty-line">Checking Motion Studio components…</div></div>
          </section>
          <section class="surface-panel motion-recent-panel">
            <div class="panel-heading"><div><h3>Imported Motion Projects</h3><p class="motion-panel-sub">Projects stored independently from Filmora files.</p></div><button class="text-button" data-motion-go="motion-import">Import +</button></div>
            <div class="motion-project-list" id="motion-recent-projects"><div class="motion-empty-line">No Motion Projects imported yet.</div></div>
          </section>
        </div>
        <div class="motion-boundary-note"><span>${icon('check')}</span><div><strong>Filmora Studio is preserved.</strong><p>Motion Studio uses its own Word Timing CSV, project library, import contract and render pipeline. It does not alter the Filmora/EMS Final Master CSV or WFP workflow.</p></div></div>
      </section>

      <section class="page motion-page" id="page-motion-word-timing">
        ${pageHeading('Word Timing', 'Upload the approved script and matching voiceover. Motion Studio will align each recognized word to its real audio interval.')}
        <div class="motion-process-steps"><span class="done"><i>01</i> INPUT</span><b></b><span><i>02</i> ALIGNMENT</span><b></b><span><i>03</i> CSV + QA</span></div>
        <div class="motion-two-column-layout">
          <div class="motion-column-main">
            <section class="surface-panel motion-input-card">
              <div class="panel-heading"><div><h3>Source files</h3><p class="motion-panel-sub">The script is the reference; the voiceover is the timing source.</p></div><span class="required-label" id="motion-input-state">0 / 2 READY</span></div>
              <div class="motion-file-row" id="motion-script-row"><div class="motion-file-icon doc">${icon('file')}</div><div class="motion-file-copy"><strong>Approved video script</strong><span id="motion-script-name">No script selected</span><small>TXT · MD · DOCX · PDF</small></div><button class="outline-button" id="motion-pick-script">Choose script</button></div>
              <div class="motion-file-row" id="motion-audio-row"><div class="motion-file-icon audio">${icon('audio')}</div><div class="motion-file-copy"><strong>Voiceover audio</strong><span id="motion-audio-name">No voiceover selected</span><small>MP3 · WAV · M4A · FLAC · AAC · OGG · OPUS</small></div><button class="outline-button" id="motion-pick-audio">Choose audio</button></div>
              <div class="motion-script-preview" id="motion-script-preview" hidden></div>
            </section>
            <section class="surface-panel motion-settings-card">
              <div class="panel-heading"><div><h3>Alignment configuration</h3><p class="motion-panel-sub">All processing is intended to use local models. No timestamps are estimated.</p></div></div>
              <div class="motion-setting-grid">
                <div><label for="motion-language">Language detection</label><select id="motion-language" disabled><option value="auto">Auto-detect from voiceover</option></select></div>
                <div><label for="motion-asr-model">Recognition model</label><select id="motion-asr-model"><option value="">Default installed offline model</option><option value="medium">Medium</option><option value="large-v3">Large v3 (only if installed)</option></select></div>
                <div><label for="motion-project-name">Project label</label><input id="motion-project-name" type="text" placeholder="e.g. Company History Documentary" maxlength="90"/></div>
                <div><label for="motion-output-folder">CSV output folder</label><div class="motion-path-picker"><input id="motion-output-folder" type="text" placeholder="Default Motion Projects / Word Timing" readonly/><button class="outline-button" id="motion-pick-output-folder">Browse</button></div></div>
              </div>
              <div class="motion-schema-strip"><div><strong>5-column Motion CSV</strong><span>Word_Index · Script_Word · Recognized_Word · Start_ms · End_ms</span></div><span class="motion-schema-badge">SEPARATE FROM FILMORA</span></div>
            </section>
            <section class="surface-panel motion-action-card"><div><h3>Generate word timing</h3><p id="motion-word-readiness">Choose both files to enable alignment.</p></div><button class="primary-button" id="motion-generate-word-csv" disabled>Generate Motion CSV ${icon('arrow')}</button></section>
            <section class="surface-panel motion-job-card" id="motion-word-progress" hidden><div class="motion-progress-top"><div><span class="motion-small-kicker">WORD-LEVEL ALIGNMENT</span><h3 id="motion-word-stage">Preparing local alignment</h3></div><strong id="motion-word-percent">0%</strong></div><div class="motion-progress-track"><span id="motion-word-fill"></span></div><div class="motion-progress-foot"><span id="motion-word-message">Waiting for engine…</span><span id="motion-word-job-state">RUNNING</span></div><button class="text-button motion-cancel-link" id="motion-cancel-job">Cancel job</button></section>
            <section class="surface-panel motion-output-card" id="motion-word-result" hidden><div class="motion-output-top"><div><span class="motion-small-kicker">WORD TIMING OUTPUT</span><h3 id="motion-word-output-name">Motion_Word_Timing.csv</h3></div><span class="motion-status-pill" id="motion-word-output-state">READY</span></div><code id="motion-word-output-path"></code><div class="motion-output-actions"><button class="outline-button" id="motion-copy-csv-path">Copy path</button><button class="outline-button" id="motion-show-csv">Show in folder</button><button class="primary-button small-primary" id="motion-open-word-table">Review words</button></div><div class="motion-qa-summary" id="motion-word-qa"></div></section>
            <section class="surface-panel motion-word-table-card" id="motion-word-table-card" hidden><div class="panel-heading"><div><h3>Word timing preview</h3><p class="motion-panel-sub">First rows from the generated CSV. Full report is saved beside the CSV.</p></div><span class="required-label" id="motion-word-row-count">0 WORDS</span></div><div class="motion-table-scroll"><table class="motion-table"><thead><tr><th>Index</th><th>Script word</th><th>Recognized word</th><th>Start (ms)</th><th>End (ms)</th></tr></thead><tbody id="motion-word-table-body"><tr><td colspan="5">No timing rows yet.</td></tr></tbody></table></div></section>
          </div>
          <aside class="motion-side-stack">
            <section class="surface-panel motion-info-card"><span class="motion-side-icon">01</span><h3>Why upload the script?</h3><p>The approved script lets Motion Studio compare intended wording with the actual voiceover. It can identify missing, extra or mismatched words instead of trusting speech recognition blindly.</p></section>
            <section class="surface-panel motion-info-card"><span class="motion-side-icon violet">02</span><h3>Real word timing</h3><p>Each CSV row records one script/audio word relationship. Start and End are derived from a language-compatible forced aligner. Unsupported or uncertain words remain blank and are flagged in QA.</p></section>
            <section class="surface-panel motion-info-card warning"><span class="motion-side-icon red">!</span><h3>Language model readiness</h3><p>WhisperX alignment coverage is language-specific. Bengali is not marked supported unless a verified local Bengali alignment model is installed and tested.</p></section>
          </aside>
        </div>
      </section>

      <section class="page motion-page" id="page-motion-claude-kit">
        ${pageHeading('Claude Project Kit', 'Prepare the first-party Motion Producer Skill once, then hand off each video without uploading files automatically.')}
        <div class="motion-kit-hero"><div><span class="motion-hero-kicker">FIRST-PARTY FRAMEPILOT KIT</span><h2>Prepare Claude once.<br/><em>Build each video consistently.</em></h2><p>FramePilot creates the timing CSV locally. Claude produces a static, import-ready project ZIP. FramePilot remains the local render destination.</p></div><div class="motion-kit-symbol">ƒx</div></div>
        <section class="surface-panel motion-kit-actions"><div><h3>One-time project setup</h3><p class="motion-panel-sub" id="motion-kit-status">Checking packaged Motion Producer resources…</p></div><div class="motion-prompt-actions"><button class="primary-button" id="motion-copy-master-instructions">COPY MASTER INSTRUCTIONS</button><button class="outline-button" id="motion-save-master-instructions">SAVE MASTER INSTRUCTIONS</button><button class="outline-button" id="motion-save-producer-skill">SAVE PRODUCER SKILL</button></div></section>
        <section class="surface-panel motion-kit-actions"><div><h3>Skill Package</h3><p class="motion-panel-sub">Rebuild, verify or save the FramePilot Motion Producer Skill ZIP for uploading to Claude.</p><div class="motion-skill-version" id="motion-skill-version-wrap"><strong id="motion-skill-version-label">—</strong><span id="motion-skill-version-badge">VERSION</span></div><div class="motion-skill-actions"><button class="outline-button" id="motion-rebuild-skill-zip">Rebuild Skill ZIP</button><button class="outline-button" id="motion-verify-skill-package">Verify Skill Package</button><button class="outline-button" id="motion-save-skill-zip">Save Skill ZIP</button></div><p class="motion-panel-sub" id="motion-skill-pkg-status"></p></div></section>
        <section class="surface-panel motion-kit-actions"><div><h3>Private Claude Project</h3><p class="motion-panel-sub">The app only saves and opens your URL. It never uploads scripts, audio, CSVs or media.</p><input id="motion-claude-project-url" type="url" placeholder="https://claude.ai/project/…" autocomplete="off"/></div><div class="motion-prompt-actions"><button class="outline-button" id="motion-save-project-link">SAVE PROJECT LINK</button><button class="primary-button" id="motion-open-claude">OPEN CLAUDE PROJECT ${icon('arrow')}</button></div></section>
        <section class="surface-panel motion-kit-actions"><div><h3>Per-video handoff</h3><p class="motion-panel-sub">Attach the approved script, voiceover, Motion CSV, QA JSON and visual assets manually in Claude.</p></div><button class="primary-button" id="motion-copy-per-video-handoff">COPY PER-VIDEO HANDOFF</button></section>
        <section class="surface-panel motion-kit-actions">
          <div>
            <h3>Per-Video Production Handoff</h3>
            <p class="motion-panel-sub">Select a Word Timing session to automatically package a handoff ZIP for Claude.</p>
            <select id="motion-handoff-project-select" class="motion-handoff-select">
              <option value="">Select Word Timing session…</option>
            </select>
          </div>
          <button class="primary-button" id="motion-generate-handoff-zip">Generate Handoff ZIP</button>
        </section>
        <div class="motion-boundary-note"><span>${icon('check')}</span><div><strong>Local-first and Filmora-safe.</strong><p>Word Timing remains inside FramePilot, the first-party Skill is editable in the application resources, and Filmora's 21-column workflow is not modified.</p></div></div>
      </section>

      <section class="page motion-page" id="page-motion-import">
        ${pageHeading('Project Import', 'Bring a Claude-generated Remotion project ZIP into the Motion Studio library. Inspect first; import only after validation.')}
        <div class="motion-import-layout">
          <div class="motion-column-main">
            <section class="surface-panel motion-import-dropzone" id="motion-import-dropzone"><div class="motion-import-mark">ZIP</div><h2>Import a Remotion project</h2><p>Select the complete ZIP returned by Claude. The ZIP must contain motion-project.json and a valid Remotion entry point at its root.</p><button class="primary-button" id="motion-pick-project-zip">Choose project ZIP ${icon('arrow')}</button><div class="motion-selected-zip" id="motion-selected-zip">No project ZIP selected</div></section>
            <section class="surface-panel motion-import-report" id="motion-import-report" hidden><div class="panel-heading"><div><h3>Project validation</h3><p class="motion-panel-sub">Static inspection only. Imported JavaScript is not executed.</p></div><span class="motion-status-pill" id="motion-import-status">CHECKING</span></div><div class="motion-import-metrics" id="motion-import-metrics"></div><div class="motion-import-checks" id="motion-import-checks"></div><div class="motion-import-actions"><button class="outline-button" id="motion-reinspect-project">Re-check ZIP</button><button class="primary-button" id="motion-confirm-import" disabled>Import to Motion Studio ${icon('arrow')}</button></div></section>
          </div>
          <aside class="motion-side-stack">
            <section class="surface-panel motion-info-card"><span class="motion-side-icon">01</span><h3>What the ZIP must include</h3><p>Root manifest, package.json, Remotion entry file, source scenes/components, and every required local asset, font, voiceover and SFX.</p></section>
            <section class="surface-panel motion-info-card"><span class="motion-side-icon violet">02</span><h3>Project safety</h3><p>FramePilot rejects unsafe archive paths and does not install arbitrary dependencies. The render worker stays locked until sandbox isolation is validated.</p></section>
            <section class="surface-panel motion-info-card"><span class="motion-side-icon red">03</span><h3>First-party producer resources</h3><p>The editable Skill, schemas, validators and templates are packaged from <code>product-assets/motion-producer/</code>. They are independent from the Filmora source tree.</p></section>
          </aside>
        </div>
        <section class="surface-panel motion-imported-projects"><div class="panel-heading"><div><h3>Motion Project Library</h3><p class="motion-panel-sub">Projects imported into Documents / FramePilot Studio / Motion Projects.</p></div><button class="text-button" id="motion-refresh-projects">Refresh list ↻</button></div><div id="motion-imported-project-list" class="motion-project-list"><div class="motion-empty-line">No imported projects yet.</div></div></section>
      </section>

      <section class="page motion-page" id="page-motion-render">
        ${pageHeading('Render Video', 'Select an imported project and create its final MP4 with the bundled local Motion runtime.')}
        <div class="motion-render-layout">
          <div class="motion-render-main">
            <section class="surface-panel motion-render-player-panel">
              <div class="motion-player-header"><div><span class="motion-small-kicker">PROJECT STATUS</span><h3 id="motion-player-project-name">No project selected</h3></div><span class="motion-player-badge" id="motion-player-state">READY</span></div>
              <p class="motion-panel-sub">The project is validated before rendering. Imported project code remains blocked until the Windows isolation boundary is validated.</p>
            </section>
            <section class="surface-panel motion-render-progress" id="motion-render-progress" hidden><div class="motion-progress-top"><div><span class="motion-small-kicker">REMOTION WORKER</span><h3 id="motion-render-stage">Preparing render</h3></div><strong id="motion-render-percent">0%</strong></div><div class="motion-progress-track"><span id="motion-render-fill"></span></div><div class="motion-progress-foot"><span id="motion-render-message">Waiting for rendering…</span><span id="motion-render-state">RUNNING</span></div><button class="text-button motion-cancel-link" id="motion-cancel-render">Cancel render</button></section>
            <section class="surface-panel motion-render-result" id="motion-render-result" hidden><div class="motion-output-top"><div><span class="motion-small-kicker">OUTPUT CREATED</span><h3 id="motion-render-output-name">Video.mp4</h3></div><span class="motion-status-pill">READY</span></div><code id="motion-render-output-path"></code><div class="motion-output-actions"><button class="outline-button" id="motion-copy-render-path">Copy path</button><button class="primary-button small-primary" id="motion-show-render-folder">Show in folder</button></div></section>
          </div>
          <aside class="motion-render-sidebar">
            <section class="surface-panel motion-render-settings"><div class="panel-heading"><div><h3>Project to video</h3><p class="motion-panel-sub">Values are read from the imported project's manifest.</p></div></div><label for="motion-project-select">Motion project</label><select id="motion-project-select"><option value="">Select imported project…</option></select><div class="motion-render-specs" id="motion-render-specs"><div><span>Resolution</span><strong>—</strong></div><div><span>Frame rate</span><strong>—</strong></div><div><span>Duration</span><strong>—</strong></div><div><span>Composition</span><strong>—</strong></div></div><div class="motion-render-buttons"><button class="primary-button" id="motion-render-final" disabled>RENDER VIDEO ${icon('arrow')}</button></div></section>
            <section class="surface-panel motion-render-history"><div class="panel-heading"><div><h3>Render History</h3><p class="motion-panel-sub">Completed local renders recorded by the Motion worker.</p></div><button class="text-button" id="motion-refresh-history">Refresh history ↻</button></div><div id="motion-render-history-list" class="motion-project-list"><div class="motion-empty-line">No completed renders recorded.</div></div></section>
            <section class="surface-panel motion-render-readiness"><div class="panel-heading"><div><h3>Local runtime</h3><p class="motion-panel-sub">No cloud rendering or external editor.</p></div></div><div class="motion-render-runtime-list" id="motion-render-runtime-list"><div class="motion-empty-line">Checking runtime…</div></div></section>
            <section class="surface-panel motion-info-card warning"><span class="motion-side-icon red">!</span><h3>Render protection</h3><p>Imported Remotion code is executable. Final rendering is disabled until the dedicated worker is sandboxed and verified to deny network access and restrict file access to the selected project and output folder.</p></section>
          </aside>
        </div>
      </section>

      <section class="page motion-page" id="page-motion-project-manager">
        ${pageHeading('Project Manager', 'Browse, search and manage every imported Motion project. Full paginated library with all project actions.')}
        <div class="motion-pm-search">
          <input type="text" id="motion-pm-search-input" placeholder="Search projects…" autocomplete="off"/>
          <button class="outline-button" id="motion-pm-refresh">Refresh ↻</button>
        </div>
        <div class="motion-pm-count" id="motion-pm-count">Loading…</div>
        <section class="surface-panel" style="padding:0 20px">
          <div class="motion-project-list" id="motion-pm-project-list"><div class="motion-empty-line">No Motion Projects imported yet.</div></div>
        </section>
        <div style="display:flex;gap:8px;margin-top:13px;justify-content:flex-end" id="motion-pm-pagination"></div>
      </section>

      <section class="page motion-page" id="page-motion-render-history">
        ${pageHeading('Render History', 'Full dedicated log of every completed local Motion render. Each entry shows project, mode, timestamp, duration and output status.')}
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
          <button class="outline-button" id="motion-rh-refresh">Refresh history ↻</button>
        </div>
        <section class="surface-panel" style="padding:0 20px">
          <div id="motion-rh-list" class="motion-project-list"><div class="motion-empty-line">No completed renders recorded.</div></div>
        </section>
      </section>

      <section class="page motion-page" id="page-motion-runtime-manager">
        ${pageHeading('Runtime Manager', 'Detailed status of every Motion Studio runtime component. Install, verify or repair components without opening a terminal.')}
        <div class="motion-dashboard-grid">
          <section class="surface-panel motion-engine-panel">
            <div class="panel-heading"><div><h3>Runtime components</h3><p class="motion-panel-sub">All components required for local word alignment and Remotion rendering.</p></div><div class="motion-runtime-actions"><button class="text-button" id="motion-rm-install">Install</button><button class="text-button" id="motion-rm-verify">Verify</button><button class="text-button" id="motion-rm-repair">Repair</button><button class="text-button" id="motion-rm-refresh">Refresh ↻</button></div></div>
            <div class="motion-runtime-progress" id="motion-rm-progress" hidden><div class="motion-progress-track"><span id="motion-rm-fill"></span></div><div class="motion-progress-meta"><span id="motion-rm-message">Ready</span><strong id="motion-rm-percent">0%</strong></div></div>
            <div class="motion-runtime-table" id="motion-rm-table">
              <div class="motion-runtime-row"><div><strong>Word Timing source</strong><div class="motion-runtime-desc">Python WhisperX alignment pipeline and language models for word-level timestamps.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-wordtiming">CHECKING</span><div></div></div>
              <div class="motion-runtime-row"><div><strong>Python backend</strong><div class="motion-runtime-desc">Python runtime used by the word alignment engine. Version is read from the manifest.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-python">CHECKING</span><div><span id="motion-rmr-python-ver" style="font-size:8px;color:#7d766a"></span></div></div>
              <div class="motion-runtime-row"><div><strong>Private Node.js runtime</strong><div class="motion-runtime-desc">Isolated Node.js used exclusively by the Remotion renderer. Not the system Node.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-node">CHECKING</span><div><span id="motion-rmr-node-ver" style="font-size:8px;color:#7d766a"></span></div></div>
              <div class="motion-runtime-row"><div><strong>Remotion renderer</strong><div class="motion-runtime-desc">Remotion CLI and SSR library bundled in the private runtime.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-remotion">CHECKING</span><div><span id="motion-rmr-remotion-ver" style="font-size:8px;color:#7d766a"></span></div></div>
              <div class="motion-runtime-row"><div><strong>Chromium Headless Shell</strong><div class="motion-runtime-desc">Chrome headless binary required by Remotion for frame capture. Must be verified before rendering.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-browser">CHECKING</span><div></div></div>
              <div class="motion-runtime-row"><div><strong>Remotion native compositor &amp; binaries</strong><div class="motion-runtime-desc">Native compositor and platform binaries that accelerate frame compositing.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-binaries">CHECKING</span><div></div></div>
              <div class="motion-runtime-row"><div><strong>Project ZIP validator</strong><div class="motion-runtime-desc">Static analyser that validates incoming Remotion ZIPs before import.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-validator">CHECKING</span><div></div></div>
              <div class="motion-runtime-row"><div><strong>Security isolation</strong><div class="motion-runtime-desc">Windows isolation boundary that restricts imported project code from network and file access.</div></div><span class="motion-runtime-status-pending" id="motion-rmr-isolation">CHECKING</span><div></div></div>
            </div>
          </section>
          <section class="surface-panel" style="padding:18px">
            <div class="panel-heading"><div><h3>About the runtime</h3><p class="motion-panel-sub">Why each component matters.</p></div></div>
            <div style="margin-top:14px;display:grid;gap:12px;font-size:9px;color:#a09890;line-height:1.65">
              <div><strong style="color:#d9c8a5;display:block;margin-bottom:3px">Why a private Node runtime?</strong>FramePilot bundles its own Node.js to avoid conflicts with any system Node installation. This runtime is locked down and only accessible to the Remotion worker.</div>
              <div><strong style="color:#d9c8a5;display:block;margin-bottom:3px">Why is Chromium required?</strong>Remotion captures each frame using a headless Chrome instance. Without a verified Chromium Headless Shell the render cannot proceed.</div>
              <div><strong style="color:#d9c8a5;display:block;margin-bottom:3px">What is security isolation?</strong>Imported project code is untrusted. FramePilot validates the Windows sandbox that restricts network access and file access to only the selected project folder and output target.</div>
              <div><strong style="color:#d9c8a5;display:block;margin-bottom:3px">Word timing vs. rendering</strong>Word alignment uses Python (WhisperX). Rendering uses Node.js + Remotion. Both must be ready for end-to-end production.</div>
            </div>
          </section>
        </div>
      </section>`;
    anchor.insertAdjacentHTML('beforebegin', pages);
  }

  function navigateMotion(page) {
    if (!pageLabels[page]) return;
    state.currentPage = page;
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page || el.dataset.motionPage === page));
    const crumb = $('page-crumb');
    if (crumb) crumb.textContent = pageLabels[page];
    window.scrollTo({ top: 0, behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
    if (page === 'motion-overview') refreshDashboard();
    if (page === 'motion-import') refreshProjects();
    if (page === 'motion-render') refreshRenderPage();
    if (page === 'motion-project-manager') refreshProjectManager();
    if (page === 'motion-render-history') refreshFullRenderHistory();
    if (page === 'motion-runtime-manager') refreshRuntimeManager();
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
    if (status) status.textContent = state.busy ? 'A Motion Studio job is running.' : ready ? 'Both inputs are selected. Generate verified word-level timings.' : 'Select both the approved script and matching voiceover audio.';
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

  function renderRuntimeList(host, runtime) {
    if (!host) return;
    const rows = [
      ['Word Timing source', runtime.wordTimingSourceAvailable],
      ['Project ZIP validator', runtime.projectImporterAvailable],
      ['Python backend', runtime.pythonBackendAvailable],
      ['Private Node runtime', runtime.nodeRuntimeAvailable],
      ['Remotion renderer', runtime.remotionRendererAvailable],
      ['Chromium Headless Shell', runtime.browserAvailable],
      ['Remotion native compositor & binaries', runtime.remotionBinariesAvailable],
      ['Project worker isolation', runtime.projectExecutionAllowed],
    ];
    host.replaceChildren();
    for (const [label, ready] of rows) {
      const row = document.createElement('div');
      row.className = 'motion-readiness-row';
      const name = document.createElement('span'); name.textContent = label;
      const status = document.createElement('strong'); status.className = ready ? 'ready' : 'pending'; status.textContent = ready ? 'READY' : 'NOT READY';
      row.append(name, status); host.append(row);
    }

    function setRuntimeProgress(percent, message, error = false) {
      const panel = $('motion-runtime-progress');
      if (!panel) return;
      panel.hidden = false;
      const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
      const fill = $('motion-runtime-fill');
      if (fill) fill.style.width = `${safePercent}%`;
      const percentNode = $('motion-runtime-percent');
      if (percentNode) percentNode.textContent = `${Math.round(safePercent)}%`;
      const messageNode = $('motion-runtime-message');
      if (messageNode) {
        messageNode.textContent = message || 'Processing…';
        messageNode.classList.toggle('error', error);
      }
    }

    async function manageRuntime(operation) {
      setRuntimeProgress(5, `Starting runtime ${operation}…`);
      try {
        await window.framepilot.motionManageRuntime(operation);
        await refreshRuntime();
      } catch (error) {
        setRuntimeProgress(0, error.message, true);
        toast(error.message, true);
      }
    }
  }

  async function refreshRuntime() {
    const local = await window.framepilot.motionGetRuntimeInfo();
    state.runtime = local;
    renderRuntimeList($('motion-readiness-list'), local);
    renderRuntimeList($('motion-render-runtime-list'), local);
    const canAlign = Boolean(local.pythonBackendAvailable && local.wordTimingSourceAvailable);
    const readyText = $('motion-word-readiness');
    if (readyText && !state.scriptPath && !state.audioPath) readyText.textContent = canAlign
      ? 'Select both files. Actual alignment also requires a verified local ASR and language aligner model.'
      : 'Motion Word Timing source or Python runtime is missing.';
    if ($('motion-render-final')) $('motion-render-final').disabled = !local.motionRenderReady || !state.selectedProject;
    return local;
  }

  function projectCard(project) {
    const card = document.createElement('div');
    card.className = 'motion-project-item';
    const iconNode = document.createElement('div'); iconNode.className = 'motion-project-icon'; iconNode.textContent = 'MP';
    const info = document.createElement('div'); info.className = 'motion-project-info';
    const title = document.createElement('strong'); title.textContent = project.name;
    const meta = document.createElement('span'); meta.textContent = `${project.width}×${project.height} · ${project.fps} FPS · ${project.compositionId}`;
    info.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'motion-project-actions';
    const select = document.createElement('button'); select.className = 'text-button'; select.textContent = 'Render Video';
    select.addEventListener('click', () => {
      state.selectedProject = project;
      navigateMotion('motion-render');
      populateSelectedProject();
    });
    const reveal = document.createElement('button'); reveal.className = 'text-button'; reveal.textContent = 'Folder';
    reveal.addEventListener('click', () => window.framepilot.motionOpenProjectFolder(project.path).catch(error => toast(error.message, true)));
    const rename = document.createElement('button'); rename.className = 'text-button'; rename.textContent = 'Rename';
    rename.addEventListener('click', async () => {
      const name = window.prompt('New Motion project name', project.name);
      if (!name || name.trim() === project.name) return;
      try {
        await window.framepilot.motionRenameProject({ projectPath: project.path, name: name.trim() });
        await refreshProjects();
        toast('Motion project renamed.');
      } catch (error) { toast(error.message, true); }
    });
    const duplicate = document.createElement('button'); duplicate.className = 'text-button'; duplicate.textContent = 'Duplicate';
    duplicate.addEventListener('click', async () => {
      try {
        await window.framepilot.motionDuplicateProject(project.path);
        await refreshProjects();
        toast('Motion project duplicated.');
      } catch (error) { toast(error.message, true); }
    });
    const remove = document.createElement('button'); remove.className = 'text-button danger'; remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Delete "${project.name}" and its imported project files?`)) return;
      try {
        await window.framepilot.motionDeleteProject(project.path);
        if (state.selectedProject?.path === project.path) state.selectedProject = null;
        await refreshProjects();
        toast('Motion project deleted.');
      } catch (error) { toast(error.message, true); }
    });
    actions.append(select, reveal, rename, duplicate, remove);
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
        const empty = document.createElement('div'); empty.className = 'motion-empty-line'; empty.textContent = 'No Motion Projects imported yet.'; host.append(empty);
      } else {
        state.projects.slice(0, 8).forEach(project => host.append(projectCard(project)));
      }
    }
    const select = $('motion-project-select');
    if (select) {
      const selectedValue = state.selectedProject?.path || select.value;
      select.replaceChildren(new Option('Select imported project…', ''));
      for (const project of state.projects) select.add(new Option(project.name, project.path));
      if (selectedValue && state.projects.some(project => project.path === selectedValue)) select.value = selectedValue;
    }
    if (state.selectedProject) {
      const match = state.projects.find(project => project.path === state.selectedProject.path);
      if (match) state.selectedProject = match;
    }
    return state.projects;
  }

  function populateSelectedProject() {
    const project = state.selectedProject;
    if (!project) return;
    const name = $('motion-player-project-name'); if (name) name.textContent = project.name;
    const specs = $('motion-render-specs');
    if (specs) {
      specs.replaceChildren();
      const items = [
        ['Resolution', `${project.width} × ${project.height}`],
        ['Frame rate', `${project.fps} FPS`],
        ['Duration', `${(project.durationInFrames / project.fps / 60).toFixed(2)} min`],
        ['Composition', project.compositionId],
      ];
      for (const [label, value] of items) {
        const box = document.createElement('div'); const span = document.createElement('span'); span.textContent = label; const strong = document.createElement('strong'); strong.textContent = value; box.append(span, strong); specs.append(box);
      }
    }
    const select = $('motion-project-select'); if (select) select.value = project.path;
    const ready = Boolean(state.runtime?.motionRenderReady);
    if ($('motion-render-final')) $('motion-render-final').disabled = !ready;
  }

  async function refreshDashboard() {
    await refreshRuntime().catch(error => toast(`Runtime status: ${error.message}`, true));
    await refreshProjects().catch(error => toast(`Project list: ${error.message}`, true));
  }

  async function refreshRenderPage() {
    await refreshProjects().catch(() => {});
    await refreshRuntime().catch(() => {});
    await refreshRenderHistory().catch(error => toast(`Render history: ${error.message}`, true));
    if (state.selectedProject) populateSelectedProject();
  }

  async function refreshRenderHistory() {
    const history = await window.framepilot.motionListRenderHistory();
    state.renderHistory = Array.isArray(history) ? history : [];
    const host = $('motion-render-history-list');
    if (!host) return;
    host.replaceChildren();
    if (!state.renderHistory.length) {
      const empty = document.createElement('div');
      empty.className = 'motion-empty-line';
      empty.textContent = 'No completed renders recorded.';
      host.append(empty);
      return;
    }
    for (const item of state.renderHistory.slice(0, 20)) {
      const row = document.createElement('div');
      row.className = 'motion-project-item';
      const info = document.createElement('div');
      info.className = 'motion-project-info';
      const title = document.createElement('strong');
      title.textContent = `${item.projectName} · ${item.mode === 'preview' ? 'Preview' : 'Final MP4'}`;
      const meta = document.createElement('span');
      const timestamp = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time';
      meta.textContent = `${timestamp} · ${item.outputExists ? 'Available' : 'Missing output'}`;
      info.append(title, meta);
      const actions = document.createElement('div');
      actions.className = 'motion-project-actions';
      const open = document.createElement('button');
      open.className = 'text-button';
      open.textContent = 'Show in folder';
      open.disabled = !item.outputExists;
      open.addEventListener('click', () => window.framepilot.motionShowInFolder(item.outputPath).catch(error => toast(error.message, true)));
      actions.append(open);
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
      const empty = document.createElement('div'); empty.className = 'motion-empty-line';
      empty.textContent = q ? 'No projects match the search.' : 'No Motion Projects imported yet.';
      host.append(empty); if (paginationEl) paginationEl.replaceChildren(); return;
    }
    for (const project of slice) {
      const item = document.createElement('div'); item.className = 'motion-project-item-full';
      const iconNode = document.createElement('div'); iconNode.className = 'motion-project-icon'; iconNode.textContent = 'MP';
      const info = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = project.name; title.style.cssText = 'font-size:10px;color:#e4d9c5';
      const meta = document.createElement('div'); meta.className = 'motion-project-meta-grid';
      const fields = [
        ['Resolution', `${project.width}×${project.height}`],
        ['FPS', project.fps],
        ['Duration', `${(project.durationInFrames / project.fps / 60).toFixed(2)} min`],
        ['Composition', project.compositionId],
        ['Imported', project.importedAt ? new Date(project.importedAt).toLocaleDateString() : '—'],
      ];
      for (const [lbl, val] of fields) {
        const s = document.createElement('span'); s.textContent = lbl;
        const v = document.createElement('strong'); v.textContent = val;
        meta.append(s, v);
      }
      info.append(title, meta);
      const actions = document.createElement('div'); actions.className = 'motion-project-actions';
      const renderBtn = document.createElement('button'); renderBtn.className = 'text-button'; renderBtn.textContent = 'Render Video';
      renderBtn.addEventListener('click', () => { state.selectedProject = project; navigateMotion('motion-render'); populateSelectedProject(); });
      const folderBtn = document.createElement('button'); folderBtn.className = 'text-button'; folderBtn.textContent = 'Show Folder';
      folderBtn.addEventListener('click', () => window.framepilot.motionOpenProjectFolder(project.path).catch(e => toast(e.message, true)));
      const renameBtn = document.createElement('button'); renameBtn.className = 'text-button'; renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', async () => {
        const name = window.prompt('New Motion project name', project.name);
        if (!name || name.trim() === project.name) return;
        try { await window.framepilot.motionRenameProject({ projectPath: project.path, name: name.trim() }); await refreshProjectManager(); toast('Motion project renamed.'); } catch (e) { toast(e.message, true); }
      });
      const dupBtn = document.createElement('button'); dupBtn.className = 'text-button'; dupBtn.textContent = 'Duplicate';
      dupBtn.addEventListener('click', async () => {
        try { await window.framepilot.motionDuplicateProject(project.path); await refreshProjectManager(); toast('Motion project duplicated.'); } catch (e) { toast(e.message, true); }
      });
      const delBtn = document.createElement('button'); delBtn.className = 'text-button danger'; delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        if (!window.confirm(`Delete "${project.name}" and its imported project files?`)) return;
        try {
          await window.framepilot.motionDeleteProject(project.path);
          if (state.selectedProject?.path === project.path) state.selectedProject = null;
          await refreshProjectManager(); toast('Motion project deleted.');
        } catch (e) { toast(e.message, true); }
      });
      actions.append(renderBtn, folderBtn, renameBtn, dupBtn, delBtn);
      item.append(iconNode, info, actions); host.append(item);
    }
    // Pagination
    if (paginationEl) {
      paginationEl.replaceChildren();
      const pages = Math.ceil(total / pmState.pageSize);
      if (pages > 1) {
        for (let i = 0; i < pages; i++) {
          const btn = document.createElement('button'); btn.className = i === pmState.page ? 'outline-button' : 'text-button';
          btn.textContent = String(i + 1); btn.style.minWidth = '30px';
          btn.addEventListener('click', () => { pmState.page = i; renderProjectManagerList(); });
          paginationEl.append(btn);
        }
      }
    }
  }

  async function refreshProjectManager() {
    const projects = await window.framepilot.motionListProjects().catch(e => { toast(e.message, true); return null; });
    if (projects !== null) state.projects = Array.isArray(projects) ? projects : [];
    pmState.page = 0;
    renderProjectManagerList();
  }

  // ── Render History (full page) ────────────────────────────────────────────
  async function refreshFullRenderHistory() {
    const history = await window.framepilot.motionListRenderHistory().catch(e => { toast(`Render history: ${e.message}`, true); return null; });
    if (history !== null) state.renderHistory = Array.isArray(history) ? history : [];
    const host = $('motion-rh-list');
    if (!host) return;
    host.replaceChildren();
    if (!state.renderHistory.length) {
      const empty = document.createElement('div'); empty.className = 'motion-empty-line'; empty.textContent = 'No completed renders recorded.'; host.append(empty); return;
    }
    for (const item of state.renderHistory) {
      const row = document.createElement('div'); row.className = 'motion-history-item';
      const info = document.createElement('div');
      const title = document.createElement('strong'); title.style.cssText = 'font-size:10px;color:#e4d9c5;display:block'; title.textContent = item.projectName || 'Unknown project';
      const timestamp = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time';
      const duration = item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '—';
      const meta = document.createElement('span'); meta.style.cssText = 'font-size:8px;color:#80796d;margin-top:4px;display:block';
      meta.textContent = `${timestamp} · Duration: ${duration} · Output: ${item.outputPath ? item.outputPath : '—'}`;
      const badge = document.createElement('span');
      badge.className = `motion-history-badge${item.outputExists === false ? ' missing' : item.failed ? ' failed' : ''}`;
      badge.textContent = item.outputExists === false ? 'MISSING OUTPUT' : item.failed ? 'FAILED' : item.mode === 'preview' ? 'PREVIEW' : 'FINAL MP4';
      info.append(title, meta);
      const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:7px;align-items:center';
      actions.append(badge);
      if (item.outputExists && item.outputPath) {
        const openBtn = document.createElement('button'); openBtn.className = 'text-button'; openBtn.style.fontSize = '8px'; openBtn.textContent = 'Show in Folder';
        openBtn.addEventListener('click', () => window.framepilot.motionShowInFolder(item.outputPath).catch(e => toast(e.message, true)));
        actions.append(openBtn);
      }
      row.append(info, actions); host.append(row);
    }
  }

  // ── Runtime Manager page ──────────────────────────────────────────────────
  function setRmProgress(percent, message, error = false) {
    const panel = $('motion-rm-progress');
    if (!panel) return;
    panel.hidden = false;
    const fill = $('motion-rm-fill'); if (fill) fill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
    const pct = $('motion-rm-percent'); if (pct) pct.textContent = `${Math.round(Number(percent) || 0)}%`;
    const msg = $('motion-rm-message'); if (msg) { msg.textContent = message || 'Processing…'; msg.classList.toggle('error', error); }
  }

  function renderRuntimeManagerTable(runtime) {
    const map = {
      'motion-rmr-wordtiming': [runtime.wordTimingSourceAvailable, 'Word Timing source'],
      'motion-rmr-python': [runtime.pythonBackendAvailable, 'Python backend'],
      'motion-rmr-node': [runtime.nodeRuntimeAvailable, 'Node.js runtime'],
      'motion-rmr-remotion': [runtime.remotionRendererAvailable, 'Remotion renderer'],
      'motion-rmr-browser': [runtime.browserAvailable, 'Chromium Headless Shell'],
      'motion-rmr-binaries': [runtime.remotionBinariesAvailable, 'Native binaries'],
      'motion-rmr-validator': [runtime.projectImporterAvailable, 'ZIP validator'],
      'motion-rmr-isolation': [runtime.projectExecutionAllowed, 'Security isolation'],
    };
    for (const [id, [ready]] of Object.entries(map)) {
      const el = $(id); if (!el) continue;
      el.className = ready ? 'motion-runtime-status-ready' : 'motion-runtime-status-pending';
      el.textContent = ready ? 'READY' : 'NOT READY';
    }
    // Version badges from manifests
    if (runtime.pythonVersion) { const v = $('motion-rmr-python-ver'); if (v) v.textContent = `v${runtime.pythonVersion}`; }
    if (runtime.nodeVersion) { const v = $('motion-rmr-node-ver'); if (v) v.textContent = `v${runtime.nodeVersion}`; }
    if (runtime.remotionVersion) { const v = $('motion-rmr-remotion-ver'); if (v) v.textContent = `v${runtime.remotionVersion}`; }
  }

  async function refreshRuntimeManager() {
    try {
      const local = await window.framepilot.motionGetRuntimeInfo();
      state.runtime = local;
      renderRuntimeManagerTable(local);
    } catch (e) { toast(`Runtime: ${e.message}`, true); }
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
        const label = document.createElement('span'); label.textContent = `${preview.name} · ${formatBytes(preview.size)}`;
        const sample = document.createElement('p'); sample.textContent = preview.text.slice(0, 500);
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
    setMotionProgress('motion-word', 1, 'Starting local Motion alignment…', 'Preparing inputs');
    try {
      const result = await window.framepilot.motionGenerateWordTiming({
        scriptPath: state.scriptPath,
        audioPath: state.audioPath,
        projectName: $('motion-project-name').value.trim(),
        outputFolder: $('motion-output-folder').value.trim() || undefined,
        model: $('motion-asr-model').value || undefined,
      });
      // IPC returns only after the child exits; the final structured event is also used below.
      if (result?.outputPath) state.wordCsv = result.outputPath;
      $('motion-word-progress').classList.add('complete');
      $('motion-word-job-state').textContent = 'COMPLETED';
      $('motion-word-job-state').className = 'motion-job-state success';
      setMotionProgress('motion-word', 100, 'Word Timing CSV created. Review the QA report before production use.', 'Alignment completed');
      if (state.wordCsv) await showWordResult(state.wordCsv, result.qaPath);
      toast('Motion Word Timing CSV created.');
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
    const body = $('motion-word-table-body'); body.replaceChildren();
    for (const item of rows.slice(0, 18)) {
      const tr = document.createElement('tr');
      const values = ['Word_Index', 'Script_Word', 'Recognized_Word', 'Start_ms', 'End_ms'].map(key => item[indexes[key]] || '');
      values.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
      body.append(tr);
    }
    $('motion-word-row-count').textContent = `${rows.length.toLocaleString()} ROWS`;
    $('motion-word-table-card').hidden = false;
    const qa = $('motion-word-qa');
    qa.textContent = `CSV: ${rows.length.toLocaleString()} rows · QA report: ${basename(state.wordQa)} · Script/audio differences must be reviewed before using word timings.`;
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
      const status = $('motion-kit-status');
      if (status) status.textContent = info.skillAvailable && info.instructionsAvailable
        ? `Skill setup ready · FramePilot Motion Producer ${info.version}`
        : 'Motion Producer resources are incomplete.';
      const verLabel = $('motion-skill-version-label');
      if (verLabel) verLabel.textContent = `FramePilot Motion Producer v${info.version || '2.0'}`;
      const verBadge = $('motion-skill-version-badge');
      if (verBadge) verBadge.textContent = info.skillAvailable ? 'CANONICAL PACKAGED' : 'UNPACKAGED';

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
      toast(`Claude Project Kit: ${e.message}`, true);
    }
  }

  async function chooseProjectZip() {
    try {
      const file = await window.framepilot.motionSelectProjectZip();
      if (!file) return;
      state.projectZip = file;
      $('motion-selected-zip').textContent = basename(file);
      $('motion-import-report').hidden = false;
      $('motion-import-status').textContent = 'INSPECTING';
      $('motion-import-status').className = 'motion-status-pill pending';
      $('motion-import-metrics').replaceChildren();
      $('motion-import-checks').textContent = 'Validating archive paths, manifest, package.json and local assets…';
      $('motion-confirm-import').disabled = true;
      await inspectProjectZip();
    } catch (error) { toast(error.message, true); }
  }

  async function inspectProjectZip() {
    if (!state.projectZip) return;
    try {
      const result = await window.framepilot.motionInspectProject(state.projectZip);
      // The detailed result is emitted over the Motion job event stream.
      if (result?.project) state.lastProjectInfo = result.project;
    } catch (error) {
      $('motion-import-status').textContent = 'VALIDATION FAILED';
      $('motion-import-status').className = 'motion-status-pill failed';
      $('motion-import-checks').textContent = error.message;
      $('motion-confirm-import').disabled = true;
      toast(error.message, true);
    }
  }

  function showImportReport(project) {
    state.lastProjectInfo = project;
    const status = $('motion-import-status');
    status.textContent = 'VALIDATION PASSED'; status.className = 'motion-status-pill success';
    const metrics = $('motion-import-metrics'); metrics.replaceChildren();
    const values = [
      ['Project', project.projectName], ['Composition', project.compositionId], ['Resolution', `${project.width} × ${project.height}`],
      ['FPS', project.fps], ['Duration', `${(project.durationInFrames / project.fps / 60).toFixed(2)} min`],
      ['Assets / Files', `${project.assets?.length || 0} / ${project.fileCount}`],
    ];
    for (const [label, value] of values) {
      const item = document.createElement('div'); item.className = 'motion-import-metric';
      const name = document.createElement('span'); name.textContent = label;
      const val = document.createElement('strong'); val.textContent = String(value);
      item.append(name, val); metrics.append(item);
    }
    $('motion-import-checks').textContent = `Manifest, entry point, Remotion version ${project.remotionVersion} and declared assets passed static validation. Project code has not been executed.`;
    // Narration binding display
    const checksEl = $('motion-import-checks');
    if (project.narrationBinding) {
      const narrationNote = document.createElement('div');
      narrationNote.style.cssText = 'margin-top:8px;padding:7px 10px;background:#0d130b;border:1px solid #3a5230;border-radius:5px;font-size:8px;color:#a9cc8e;line-height:1.6';
      narrationNote.textContent = `Narration binding: ${project.narrationBinding} (will be resolved from local session)`;
      checksEl.after(narrationNote);
    } else {
      const narrationWarn = document.createElement('div');
      narrationWarn.style.cssText = 'margin-top:8px;padding:7px 10px;background:#140d0b;border:1px solid #5a3328;border-radius:5px;font-size:8px;color:#d98888;line-height:1.6';
      narrationWarn.textContent = 'No narration binding — project may be missing audio';
      checksEl.after(narrationWarn);
    }
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
    if (!state.selectedProject || !state.runtime?.motionRenderReady) {
      toast('Select a project and complete the local runtime/security setup first.', true);
      return;
    }
    $('motion-render-progress').hidden = false;
    $('motion-render-progress').classList.remove('complete', 'failed');
    $('motion-render-state').textContent = 'RUNNING';
    $('motion-player-state').textContent = 'RENDERING';
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
      $('motion-player-state').textContent = 'VIDEO READY';
      toast('Final MP4 rendered and verified successfully.');
      await refreshRenderHistory();
    } catch (error) {
      $('motion-render-progress').classList.add('failed');
      $('motion-render-state').textContent = 'FAILED';
      $('motion-render-state').className = 'motion-job-state failed';
      $('motion-render-message').textContent = error.message;
      $('motion-player-state').textContent = 'RENDER BLOCKED';
      toast(error.message, true);
    }
  }

  async function cancelMotionJob(prefix) {
    try {
      const result = await window.framepilot.motionCancelJob();
      if (result?.cancelled) {
        const message = $(`${prefix}-message`); if (message) message.textContent = 'Cancellation requested…';
      }
    } catch (error) { toast(error.message, true); }
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const nav = event.target.closest('[data-motion-page]');
      if (nav) { event.preventDefault(); navigateMotion(nav.dataset.motionPage); return; }
      const go = event.target.closest('[data-motion-go]');
      if (go) { event.preventDefault(); navigateMotion(go.dataset.motionGo); return; }
      const promptCopy = event.target.closest('[data-prompt-copy]');
      if (promptCopy) { promptAction(promptCopy.dataset.promptCopy, 'copy'); return; }
      const promptSave = event.target.closest('[data-prompt-save]');
      if (promptSave) { promptAction(promptSave.dataset.promptSave, 'save'); return; }
    });

    $('motion-pick-script').addEventListener('click', chooseScript);
    $('motion-pick-audio').addEventListener('click', chooseAudio);
    $('motion-generate-word-csv').addEventListener('click', generateWordTiming);
    $('motion-cancel-job').addEventListener('click', () => cancelMotionJob('motion-word'));
    $('motion-pick-output-folder').addEventListener('click', async () => {
      const folder = await window.framepilot.motionSelectOutputFolder().catch(error => { toast(error.message, true); return null; });
      if (folder) $('motion-output-folder').value = folder;
    });
    $('motion-copy-csv-path').addEventListener('click', () => window.framepilot.motionCopyPath(state.wordCsv).then(() => toast('CSV path copied.')).catch(error => toast(error.message, true)));
    $('motion-show-csv').addEventListener('click', () => window.framepilot.motionShowInFolder(state.wordCsv).catch(error => toast(error.message, true)));
    $('motion-open-word-table').addEventListener('click', () => $('motion-word-table-card').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $('motion-copy-master-instructions').addEventListener('click', () => promptAction('instructions', 'copy'));
    $('motion-save-master-instructions').addEventListener('click', () => promptAction('instructions', 'save'));
    $('motion-save-producer-skill').addEventListener('click', async () => {
      try {
        const result = await window.framepilot.motionSaveProducerSkill();
        if (result?.saved) toast(`Saved ${basename(result.path)}.`);
      } catch (error) { toast(error.message, true); }
    });
    $('motion-save-project-link').addEventListener('click', async () => {
      try {
        const url = $('motion-claude-project-url').value.trim();
        const result = await window.framepilot.motionSaveClaudeProjectUrl(url);
        state.claudeProjectUrl = result.claudeProjectUrl;
        toast('Claude Project link saved locally.');
      } catch (error) { toast(error.message, true); }
    });
    $('motion-copy-per-video-handoff').addEventListener('click', () => promptAction('handoff', 'copy'));
    $('motion-open-claude').addEventListener('click', async () => {
      try {
        const result = await window.framepilot.motionOpenClaude();
        toast(result?.configured ? 'Private Claude Project opened.' : 'Claude opened. Save your private Project URL once for direct access.');
      } catch (error) { toast(error.message, true); }
    });
    $('motion-pick-project-zip').addEventListener('click', chooseProjectZip);
    $('motion-reinspect-project').addEventListener('click', inspectProjectZip);
    $('motion-confirm-import').addEventListener('click', importProjectZip);
    $('motion-refresh-projects').addEventListener('click', () => refreshProjects().catch(error => toast(error.message, true)));
    $('motion-refresh-runtime').addEventListener('click', () => refreshRuntime().then(() => toast('Motion runtime status refreshed.')).catch(error => toast(error.message, true)));
    $('motion-install-runtime').addEventListener('click', () => manageRuntime('install'));
    $('motion-verify-runtime').addEventListener('click', () => manageRuntime('verify'));
    $('motion-repair-runtime').addEventListener('click', () => manageRuntime('repair'));
    $('motion-refresh-history').addEventListener('click', () => refreshRenderHistory().then(() => toast('Render history refreshed.')).catch(error => toast(error.message, true)));
    $('motion-project-select').addEventListener('change', () => {
      const project = state.projects.find(item => item.path === $('motion-project-select').value);
      state.selectedProject = project || null;
      if (project) populateSelectedProject();
      else {
        $('motion-player-project-name').textContent = 'No project selected';
        $('motion-render-final').disabled = true;
      }
    });
    $('motion-render-final').addEventListener('click', () => runMotionRender());
    $('motion-cancel-render').addEventListener('click', () => cancelMotionJob('motion-render'));
    $('motion-copy-render-path').addEventListener('click', () => window.framepilot.motionCopyPath(state.lastRenderOutput).then(() => toast('Render path copied.')).catch(error => toast(error.message, true)));
    $('motion-show-render-folder').addEventListener('click', () => window.framepilot.motionShowInFolder(state.lastRenderOutput).catch(error => toast(error.message, true)));

    // Claude Kit actions
    const rebuildSkillBtn = $('motion-rebuild-skill-zip');
    if (rebuildSkillBtn) {
      rebuildSkillBtn.addEventListener('click', async () => {
        try {
          rebuildSkillBtn.disabled = true;
          rebuildSkillBtn.textContent = 'Rebuilding…';
          await window.framepilot.motionRebuildSkillZip();
          toast('Claude Skill ZIP rebuilt from canonical source.');
          await refreshClaudeKit();
        } catch (e) {
          toast(e.message, true);
        } finally {
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
        } catch (e) {
          toast(e.message, true);
        } finally {
          verifySkillBtn.disabled = false;
          verifySkillBtn.textContent = 'Verify Skill Package';
        }
      });
    }

    const saveSkillBtn = $('motion-save-skill-zip');
    if (saveSkillBtn) {
      saveSkillBtn.addEventListener('click', async () => {
        try {
          const res = await window.framepilot.motionSaveProducerSkill();
          if (res?.saved) toast(`Saved ${basename(res.path)}.`);
        } catch (e) { toast(e.message, true); }
      });
    }

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

    // Project Manager handlers
    const pmRefresh = $('motion-pm-refresh');
    if (pmRefresh) pmRefresh.addEventListener('click', () => refreshProjectManager().then(() => toast('Project Manager refreshed.')).catch(e => toast(e.message, true)));
    const pmSearch = $('motion-pm-search-input');
    if (pmSearch) {
      pmSearch.addEventListener('input', () => {
        pmState.filter = pmSearch.value.trim().toLowerCase();
        pmState.page = 0;
        renderProjectManagerList();
      });
    }

    // Render History handlers
    const rhRefresh = $('motion-rh-refresh');
    if (rhRefresh) rhRefresh.addEventListener('click', () => refreshFullRenderHistory().then(() => toast('Render History refreshed.')).catch(e => toast(e.message, true)));

    // Runtime Manager handlers
    const rmInstall = $('motion-rm-install');
    if (rmInstall) rmInstall.addEventListener('click', () => manageRuntime('install'));
    const rmVerify = $('motion-rm-verify');
    if (rmVerify) rmVerify.addEventListener('click', () => manageRuntime('verify'));
    const rmRepair = $('motion-rm-repair');
    if (rmRepair) rmRepair.addEventListener('click', () => manageRuntime('repair'));
    const rmRefresh = $('motion-rm-refresh');
    if (rmRefresh) rmRefresh.addEventListener('click', () => refreshRuntimeManager().then(() => toast('Runtime status refreshed.')).catch(e => toast(e.message, true)));
  }

  function bindMotionEvents() {
    window.framepilot.onMotionRuntimeEvent(event => {
      if (event.event === 'error') setRuntimeProgress(event.percent, event.message, true);
      else if (event.event === 'complete') {
        setRuntimeProgress(100, event.message);
        refreshRuntime().catch(() => {});
      } else setRuntimeProgress(event.percent, event.message);
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
      }
      if (event.event === 'result' && event.output) {
        state.lastRenderOutput = event.output;
      }
      if (event.event === 'error') toast(event.message || 'Motion Studio job failed.', true);
      if (event.event === 'warning') toast(event.message || 'Motion QA warning.');
      if (event.event === 'cancelled') toast(event.message || 'Motion Studio job cancelled.');
    });
    window.framepilot.onMotionJobLog(event => {
      // Motion diagnostics are kept in the shared Activity view without altering Filmora job state.
      const host = $('activity-log');
      if (!host) return;
      const row = document.createElement('div'); row.className = 'log-row';
      const time = document.createElement('span'); time.className = 'log-time'; time.textContent = new Date().toLocaleTimeString();
      const message = document.createElement('span'); message.className = `log-message ${event.level === 'error' ? 'error' : ''}`;
      message.textContent = `[Motion Studio] ${event.message}`;
      row.append(time, message); host.prepend(row);
    });
  }

  function init() {
    injectNavigation();
    injectPages();
    bindEvents();
    bindMotionEvents();
    refreshDashboard().catch(error => toast(error.message, true));
    refreshClaudeKit().catch(error => toast(`Claude Project Kit: ${error.message}`, true));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
