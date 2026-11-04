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
    currentPage: 'motion-overview',
    runtime: null,
    busy: false,
  };

  const pageLabels = {
    'motion-overview': 'Motion Overview',
    'motion-word-timing': 'Word Timing',
    'motion-claude-kit': 'Claude Project Kit',
    'motion-import': 'Project Import',
    'motion-preview': 'Preview & Render',
  };

  const navIcon = {
    overview: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    timing: '<path d="M4 9v6m4-11v16m4-20v24m4-15v6m4-10v14"/>',
    kit: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    import: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    render: '<path d="M5 4h14v16H5z"/><path d="m10 8 6 4-6 4z"/>',
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
        <button class="nav-item motion-nav-item" data-motion-page="motion-preview"><span class="nav-icon"><svg viewBox="0 0 24 24">${navIcon.render}</svg></span><span>Preview & Render</span></button>
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
        <div class="motion-section-head"><div><h2>Motion workflow</h2><p>Five focused workspaces, one independent pipeline.</p></div><span class="motion-section-tag">LOCAL-FIRST</span></div>
        <div class="motion-workflow-grid">
          <button class="motion-workflow-card" data-motion-go="motion-word-timing"><span class="motion-card-icon gold">${icon('audio')}</span><strong>Word Timing</strong><span>Script verification and word-level start/end timestamps.</span><i>Open workspace ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-claude-kit"><span class="motion-card-icon violet">${icon('file')}</span><strong>Claude Project Kit</strong><span>Production instructions, Master Prompt and project contract.</span><i>Open prompt kit ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-import"><span class="motion-card-icon red">${icon('import')}</span><strong>Project Import</strong><span>Validate and safely import a Remotion project ZIP.</span><i>Import project ↗</i></button>
          <button class="motion-workflow-card" data-motion-go="motion-preview"><span class="motion-card-icon green">${icon('render')}</span><strong>Preview & Render</strong><span>Preview renders, final MP4 output and QA checkpoints.</span><i>Open render center ↗</i></button>
        </div>
        <div class="motion-dashboard-grid">
          <section class="surface-panel motion-engine-panel">
            <div class="panel-heading"><div><h3>Motion runtime readiness</h3><p class="motion-panel-sub">Detected from local files and runtime configuration.</p></div><button class="text-button" id="motion-refresh-runtime">Refresh status ↻</button></div>
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
        ${pageHeading('Claude Project Kit', 'Reusable instructions and production prompts for creating a FramePilot-compatible Remotion project.')}
        <div class="motion-kit-hero"><div><span class="motion-hero-kicker">PROMPT + INSTRUCTIONS LIBRARY</span><h2>Prepare Claude once.<br/><em>Build each video consistently.</em></h2><p>Copy the project instructions into Claude Project Knowledge. Use the Master Prompt for each new video and upload the Motion Word Timing CSV with your script and voiceover.</p></div><div class="motion-kit-symbol">ƒx</div></div>
        <div class="motion-kit-actions"><button class="primary-button" id="motion-open-claude">Open Claude ${icon('arrow')}</button><span>FramePilot copies or saves these files locally. It does not upload your script or assets to Claude.</span></div>
        <div class="motion-kit-grid" id="motion-prompt-grid">
          <article class="surface-panel motion-prompt-card"><div class="motion-prompt-number">01 / PROJECT SETUP</div><div class="motion-prompt-heading"><span class="motion-prompt-icon">IN</span><div><h3>Claude Project Instructions</h3><p>Persistent rules for the Claude Project.</p></div></div><ul><li>Role and working process</li><li>Offline project contract</li><li>Word timing and QA rules</li></ul><div class="motion-prompt-actions"><button class="outline-button" data-prompt-copy="instructions">Copy instructions</button><button class="primary-button small-primary" data-prompt-save="instructions">Save .MD</button></div></article>
          <article class="surface-panel motion-prompt-card featured"><div class="motion-prompt-number">02 / EVERY NEW VIDEO</div><div class="motion-prompt-heading"><span class="motion-prompt-icon gold">MP</span><div><h3>Motion Master Prompt</h3><p>Main production brief for each project.</p></div></div><ul><li>Script and timing analysis</li><li>Scene planning and visual design</li><li>Remotion code and final project ZIP</li></ul><div class="motion-prompt-actions"><button class="outline-button" data-prompt-copy="master">Copy Master Prompt</button><button class="primary-button small-primary" data-prompt-save="master">Save .MD</button></div></article>
          <article class="surface-panel motion-prompt-card"><div class="motion-prompt-number">03 / IMPORT STANDARD</div><div class="motion-prompt-heading"><span class="motion-prompt-icon violet">ZIP</span><div><h3>Project Import Contract</h3><p>Manifest, file structure and compatibility rules.</p></div></div><ul><li>motion-project.json</li><li>Entry point and Composition ID</li><li>Local assets and version rules</li></ul><div class="motion-prompt-actions"><button class="outline-button" data-prompt-copy="contract">Copy contract</button><button class="primary-button small-primary" data-prompt-save="contract">Save .MD</button></div></article>
          <article class="surface-panel motion-prompt-card"><div class="motion-prompt-number">04 / DATA STANDARD</div><div class="motion-prompt-heading"><span class="motion-prompt-icon green">CSV</span><div><h3>Word Timing CSV Specification</h3><p>Independent five-column Motion CSV format.</p></div></div><ul><li>Word-level start/end milliseconds</li><li>Script/audio mismatch behavior</li><li>Companion QA report</li></ul><div class="motion-prompt-actions"><button class="outline-button" data-prompt-copy="timing">Copy spec</button><button class="primary-button small-primary" data-prompt-save="timing">Save .MD</button></div></article>
          <article class="surface-panel motion-prompt-card"><div class="motion-prompt-number">05 / UPSTREAM SKILL</div><div class="motion-prompt-heading"><span class="motion-prompt-icon red">SK</span><div><h3>Upstream Skill Setup</h3><p>How to add the public Claude Remotion Skill.</p></div></div><ul><li>Keep original source isolated</li><li>Preserve MIT attribution</li><li>Claude Project setup</li></ul><div class="motion-prompt-actions"><button class="outline-button" data-prompt-copy="setup">Copy setup guide</button><button class="primary-button small-primary" data-prompt-save="setup">Save .MD</button></div></article>
          <article class="surface-panel motion-prompt-card"><div class="motion-prompt-number">06 / FINAL ENGINEERING HANDOFF</div><div class="motion-prompt-heading"><span class="motion-prompt-icon red">CP</span><div><h3>Copilot Integration Brief</h3><p>Final runtime, security, testing and packaging work.</p></div></div><ul><li>Preserve Filmora Studio</li><li>Complete Motion engine connections</li><li>Run the full regression plan</li></ul><div class="motion-prompt-actions"><button class="outline-button" data-prompt-copy="copilot">Copy Copilot brief</button><button class="primary-button small-primary" data-prompt-save="copilot">Save .MD</button></div></article>
        </div>
        <div class="motion-boundary-note"><span>${icon('check')}</span><div><strong>Separate Master Forms.</strong><p>The existing Filmora Master_promt.txt is not modified. This Motion Master Prompt is a new resource exclusively for Remotion projects.</p></div></div>
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
            <section class="surface-panel motion-info-card"><span class="motion-side-icon red">03</span><h3>Upstream source location</h3><p>Keep the downloaded Claude Skill repository isolated at <code>third_party/claude-remotion-skill/upstream/</code>. Do not merge it into the Filmora source tree.</p></section>
          </aside>
        </div>
        <section class="surface-panel motion-imported-projects"><div class="panel-heading"><div><h3>Motion Project Library</h3><p class="motion-panel-sub">Projects imported into Documents / FramePilot Studio / Motion Projects.</p></div><button class="text-button" id="motion-refresh-projects">Refresh list ↻</button></div><div id="motion-imported-project-list" class="motion-project-list"><div class="motion-empty-line">No imported projects yet.</div></div></section>
      </section>

      <section class="page motion-page" id="page-motion-preview">
        ${pageHeading('Preview & Render', 'Validate a project, create a lightweight preview, then render the final MP4 from the bundled local Motion runtime.')}
        <div class="motion-render-layout">
          <div class="motion-render-main">
            <section class="surface-panel motion-render-player-panel">
              <div class="motion-player-header"><div><span class="motion-small-kicker">COMPOSITION PREVIEW</span><h3 id="motion-player-project-name">No project selected</h3></div><span class="motion-player-badge" id="motion-player-state">IDLE</span></div>
              <div class="motion-video-stage" id="motion-video-stage"><div class="motion-video-placeholder"><div class="motion-play-mark">▶</div><strong>Preview workspace</strong><span>Choose an imported project and render a low-resolution preview.</span></div><video id="motion-preview-video" controls playsinline hidden></video></div>
              <div class="motion-player-foot"><span id="motion-preview-file">No preview generated</span><button class="text-button" id="motion-open-preview-file" disabled>Open preview file ↗</button></div>
            </section>
            <section class="surface-panel motion-render-progress" id="motion-render-progress" hidden><div class="motion-progress-top"><div><span class="motion-small-kicker">REMOTION WORKER</span><h3 id="motion-render-stage">Preparing render</h3></div><strong id="motion-render-percent">0%</strong></div><div class="motion-progress-track"><span id="motion-render-fill"></span></div><div class="motion-progress-foot"><span id="motion-render-message">Waiting for rendering…</span><span id="motion-render-state">RUNNING</span></div><button class="text-button motion-cancel-link" id="motion-cancel-render">Cancel render</button></section>
            <section class="surface-panel motion-render-result" id="motion-render-result" hidden><div class="motion-output-top"><div><span class="motion-small-kicker">OUTPUT CREATED</span><h3 id="motion-render-output-name">Video.mp4</h3></div><span class="motion-status-pill">READY</span></div><code id="motion-render-output-path"></code><div class="motion-output-actions"><button class="outline-button" id="motion-copy-render-path">Copy path</button><button class="primary-button small-primary" id="motion-show-render-folder">Show in folder</button></div></section>
          </div>
          <aside class="motion-render-sidebar">
            <section class="surface-panel motion-render-settings"><div class="panel-heading"><div><h3>Render settings</h3><p class="motion-panel-sub">Values are read from the project's manifest.</p></div></div><label for="motion-project-select">Motion project</label><select id="motion-project-select"><option value="">Select imported project…</option></select><div class="motion-render-specs" id="motion-render-specs"><div><span>Resolution</span><strong>—</strong></div><div><span>Frame rate</span><strong>—</strong></div><div><span>Duration</span><strong>—</strong></div><div><span>Composition</span><strong>—</strong></div></div><div class="motion-render-buttons"><button class="outline-button" id="motion-render-preview" disabled>Render preview</button><button class="primary-button" id="motion-render-final" disabled>Render final MP4 ${icon('arrow')}</button></div></section>
            <section class="surface-panel motion-render-history"><div class="panel-heading"><div><h3>Render History</h3><p class="motion-panel-sub">Completed local renders recorded by the Motion worker.</p></div><button class="text-button" id="motion-refresh-history">Refresh history ↻</button></div><div id="motion-render-history-list" class="motion-project-list"><div class="motion-empty-line">No completed renders recorded.</div></div></section>
            <section class="surface-panel motion-render-readiness"><div class="panel-heading"><div><h3>Local runtime</h3><p class="motion-panel-sub">No cloud rendering or external editor.</p></div></div><div class="motion-render-runtime-list" id="motion-render-runtime-list"><div class="motion-empty-line">Checking runtime…</div></div></section>
            <section class="surface-panel motion-info-card warning"><span class="motion-side-icon red">!</span><h3>Render protection</h3><p>Imported Remotion code is executable. Final rendering is disabled until the dedicated worker is sandboxed and verified to deny network access and restrict file access to the selected project and output folder.</p></section>
          </aside>
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
    if (page === 'motion-preview') refreshRenderPage();
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
      ['Remotion Player package', runtime.remotionPlayerAvailable],
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
    if ($('motion-render-preview')) $('motion-render-preview').disabled = !local.motionRenderReady || !state.selectedProject;
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
    const select = document.createElement('button'); select.className = 'text-button'; select.textContent = 'Preview / Render';
    select.addEventListener('click', () => {
      state.selectedProject = project;
      navigateMotion('motion-preview');
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
    if ($('motion-render-preview')) $('motion-render-preview').disabled = !ready;
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
        navigateMotion('motion-preview');
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

  async function runMotionRender(mode) {
    if (!state.selectedProject || !state.runtime?.motionRenderReady) {
      toast('Select a project and complete the local runtime/security setup first.', true);
      return;
    }
    $('motion-render-progress').hidden = false;
    $('motion-render-progress').classList.remove('complete', 'failed');
    $('motion-render-state').textContent = 'RUNNING';
    $('motion-player-state').textContent = mode === 'preview' ? 'PREVIEWING' : 'RENDERING';
    setMotionProgress('motion-render', 1, `Starting ${mode} render…`, 'Starting Remotion worker');
    try {
      const result = await window.framepilot.motionStartRender({ projectPath: state.selectedProject.path, mode });
      $('motion-render-progress').classList.add('complete');
      $('motion-render-state').textContent = 'COMPLETED';
      $('motion-render-state').className = 'motion-job-state success';
      setMotionProgress('motion-render', 100, `${mode === 'preview' ? 'Preview' : 'Final render'} completed.`, 'Render completed');
      state.lastRenderOutput = result.outputPath;
      $('motion-render-result').hidden = false;
      $('motion-render-output-name').textContent = basename(result.outputPath);
      $('motion-render-output-path').textContent = result.outputPath;
      if (mode === 'preview') {
        const url = await window.framepilot.motionResolveOutputUrl(result.outputPath);
        const video = $('motion-preview-video');
        video.src = url; video.hidden = false; video.load();
        $('motion-video-stage').classList.add('has-video');
        $('motion-preview-file').textContent = basename(result.outputPath);
        $('motion-open-preview-file').disabled = false;
        $('motion-player-state').textContent = 'PREVIEW READY';
      } else {
        $('motion-player-state').textContent = 'FINAL READY';
      }
      toast(`${mode === 'preview' ? 'Preview' : 'Final MP4'} rendered successfully.`);
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
    $('motion-open-claude').addEventListener('click', async () => {
      try {
        const prompt = await window.framepilot.motionReadPrompt('master');
        await window.framepilot.motionCopyText(prompt.content);
        await window.framepilot.motionOpenClaude();
        toast('Master Prompt copied. Claude opened; attach your script, audio and Motion CSV manually.');
      } catch (error) { toast(error.message, true); }
    });
    $('motion-pick-project-zip').addEventListener('click', chooseProjectZip);
    $('motion-reinspect-project').addEventListener('click', inspectProjectZip);
    $('motion-confirm-import').addEventListener('click', importProjectZip);
    $('motion-refresh-projects').addEventListener('click', () => refreshProjects().catch(error => toast(error.message, true)));
    $('motion-refresh-runtime').addEventListener('click', () => refreshRuntime().then(() => toast('Motion runtime status refreshed.')).catch(error => toast(error.message, true)));
    $('motion-refresh-history').addEventListener('click', () => refreshRenderHistory().then(() => toast('Render history refreshed.')).catch(error => toast(error.message, true)));
    $('motion-project-select').addEventListener('change', () => {
      const project = state.projects.find(item => item.path === $('motion-project-select').value);
      state.selectedProject = project || null;
      if (project) populateSelectedProject();
      else {
        $('motion-player-project-name').textContent = 'No project selected';
        $('motion-render-preview').disabled = true;
        $('motion-render-final').disabled = true;
      }
    });
    $('motion-render-preview').addEventListener('click', () => runMotionRender('preview'));
    $('motion-render-final').addEventListener('click', () => runMotionRender('render'));
    $('motion-cancel-render').addEventListener('click', () => cancelMotionJob('motion-render'));
    $('motion-copy-render-path').addEventListener('click', () => window.framepilot.motionCopyPath(state.lastRenderOutput).then(() => toast('Render path copied.')).catch(error => toast(error.message, true)));
    $('motion-show-render-folder').addEventListener('click', () => window.framepilot.motionShowInFolder(state.lastRenderOutput).catch(error => toast(error.message, true)));
    $('motion-open-preview-file').addEventListener('click', () => window.framepilot.motionShowInFolder(state.lastRenderOutput).catch(error => toast(error.message, true)));
  }

  function bindMotionEvents() {
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
