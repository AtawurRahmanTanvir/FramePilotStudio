param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$MotionRuntimeRoot = "",
  [string]$MotionPythonRoot = "",
  [switch]$Force,
  [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$motionRoot = if ($MotionRuntimeRoot) { [System.IO.Path]::GetFullPath($MotionRuntimeRoot) } else { Join-Path $Root 'runtime\motion' }
$pythonRoot = if ($MotionPythonRoot) { [System.IO.Path]::GetFullPath($MotionPythonRoot) } else { Join-Path $env:APPDATA 'FramePilot Studio\runtime\motion-python' }

$manifestPath = Join-Path $motionRoot 'runtime-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Motion runtime manifest is missing: $manifestPath"
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$downloadRoot = Join-Path $env:TEMP 'FramePilotStudio-MotionRuntime'
$nodeArchive = Join-Path $downloadRoot $manifest.node.archive_name
$chromeArchive = Join-Path $downloadRoot $manifest.chrome_headless_shell.archive_name
$downloadTimeoutSeconds = 120
$nodeRoot = Join-Path $motionRoot 'node'
$browserRoot = Join-Path $motionRoot 'browser'

function Get-Sha256([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Download-Verified([string]$Url, [string]$Path, [string]$ExpectedHash) {
  if ((Test-Path -LiteralPath $Path) -and -not $Force) {
    if ((Get-Sha256 $Path) -eq $ExpectedHash.ToLowerInvariant()) { return }
    Remove-Item -LiteralPath $Path -Force
  }
  Write-Host "Downloading $Url" -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path -TimeoutSec $downloadTimeoutSeconds
  }
  catch {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    throw "Download failed or timed out after $downloadTimeoutSeconds seconds: $Url. $($_.Exception.Message)"
  }
  $actual = Get-Sha256 $Path
  if ($actual -ne $ExpectedHash.ToLowerInvariant()) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    throw "SHA-256 mismatch for $Url. Expected $ExpectedHash, got $actual."
  }
}

function Verify-File([string]$Path, [string]$ExpectedHash) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Required Motion runtime file is missing: $Path" }
  $actual = Get-Sha256 $Path
  if ($actual -ne $ExpectedHash.ToLowerInvariant()) { throw "SHA-256 mismatch for $Path. Expected $ExpectedHash, got $actual." }
}

function Verify-RemotionWorker() {
  $rendererRoot = Join-Path $motionRoot 'renderer'
  $packagePath = Join-Path $rendererRoot 'package.json'
  $lockPath = Join-Path $rendererRoot 'package-lock.json'
  $runnerPath = Join-Path $rendererRoot $manifest.remotion.runner.Replace('/', '\')
  if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) { throw "Remotion worker package.json is missing: $packagePath" }
  if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf)) { throw "Remotion worker package-lock.json is missing: $lockPath" }
  if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) { throw "Remotion runner is missing: $runnerPath" }
  $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
  foreach ($name in $manifest.remotion.packages) {
    $declared = $package.dependencies.$name
    if (-not $declared) { throw "Pinned Remotion dependency is missing from package.json: $name" }
    if ($name.StartsWith('@remotion/') -or $name -eq 'remotion') {
      if ($declared -ne $manifest.remotion.version) { throw "Unsupported $name version: $declared" }
    }
  }
  if ($package.dependencies.react -ne '19.1.0' -or $package.dependencies.'react-dom' -ne '19.1.0') {
    throw 'React and React DOM must remain pinned to 19.1.0.'
  }
  $compositorRoot = Join-Path $rendererRoot 'node_modules\@remotion\compositor-win32-x64-msvc'
  $compositorPackage = Join-Path $compositorRoot 'package.json'
  if (-not (Test-Path -LiteralPath $compositorPackage -PathType Leaf)) { throw 'Installed Windows x64 Remotion compositor package is missing.' }
  $compositor = Get-Content -LiteralPath $compositorPackage -Raw | ConvertFrom-Json
  if ($compositor.version -ne $manifest.remotion.version) { throw "Installed compositor version is $($compositor.version), expected $($manifest.remotion.version)." }
  foreach ($name in $manifest.remotion.required_compositor_files) {
    $file = Join-Path $compositorRoot $name
    if (-not (Test-Path -LiteralPath $file -PathType Leaf) -or (Get-Item -LiteralPath $file).Length -eq 0) {
      throw "Required compositor file is missing or empty: $file"
    }
  }
}

function Verify-MotionPython() {
  $pyExe = Join-Path $pythonRoot 'Scripts\python.exe'
  if (-not (Test-Path -LiteralPath $pyExe -PathType Leaf)) {
    throw "Motion Python executable is missing: $pyExe"
  }
  $verLog = "$env:TEMP\fp_py_ver_$PID.log"
  $procVer = Start-Process -FilePath $pyExe -ArgumentList "--version" -NoNewWindow -Wait -PassThru -RedirectStandardOutput $verLog
  $ver = (Get-Content $verLog -Raw -ErrorAction SilentlyContinue)
  Remove-Item $verLog -Force -ErrorAction SilentlyContinue
  if ($ver -notmatch 'Python 3\.12') {
    throw "Motion Python version must be 3.12.x, found: $ver"
  }
  $ver = $ver.Trim()
  Write-Host "Verifying Motion Python dependencies in $pythonRoot..." -ForegroundColor Cyan
  $verifyScript = "import warnings; warnings.filterwarnings('ignore'); import torch, torchaudio, whisperx, ctranslate2, faster_whisper; from whisperx.vads.pyannote import Pyannote; print('MOTION_PYTHON_VERIFIED')"
  $outLog = "$env:TEMP\fp_py_stdout_$PID.log"
  $errLog = "$env:TEMP\fp_py_stderr_$PID.log"
  $proc = Start-Process -FilePath $pyExe -ArgumentList "-W", "ignore", "-c", "`"$verifyScript`"" -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $resText = (Get-Content $outLog -Raw -ErrorAction SilentlyContinue)
  $errText = (Get-Content $errLog -Raw -ErrorAction SilentlyContinue)
  Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue
  if ($proc.ExitCode -ne 0 -or $resText -notmatch 'MOTION_PYTHON_VERIFIED') {
    throw "Motion Python dependency verification failed (exit $($proc.ExitCode)):`n$errText`n$resText"
  }
  Write-Host "Motion Python runtime verified successfully ($ver)." -ForegroundColor Green
}

function Install-MotionPython() {
  $pyExe = Join-Path $pythonRoot 'Scripts\python.exe'
  $alreadyInstalled = (Test-Path -LiteralPath $pyExe -PathType Leaf)
  if ($alreadyInstalled -and -not $Force) {
    try {
      Verify-MotionPython
      return
    } catch {
      Write-Warning "Existing Motion Python failed verification: $_. Reinstalling..."
    }
  }

  Write-Host "Setting up dedicated Motion Python runtime at $pythonRoot..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path $pythonRoot | Out-Null

  # Find base Python 3.12 to create the venv
  $basePyCandidates = @(
    Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe',
    'C:\Python312\python.exe',
    (Join-Path $Root '.build-runtime-venv\Scripts\python.exe')
  )
  $basePy = $null
  foreach ($c in $basePyCandidates) {
    if (Test-Path -LiteralPath $c -PathType Leaf) {
      $basePy = $c
      break
    }
  }
  if (-not $basePy) {
    try {
      $pyLauncherVer = & py -3.12 --version 2>&1
      if ($LASTEXITCODE -eq 0) { $basePy = 'py' }
    } catch {}
  }
  if (-not $basePy) {
    try {
      $sysPyVer = & python --version 2>&1
      if ($sysPyVer -match 'Python 3\.12') { $basePy = 'python' }
    } catch {}
  }
  if (-not $basePy) {
    throw "CPython 3.12 is required to initialize the dedicated Motion Python environment. Please install Python 3.12 from python.org."
  }

  Write-Host "Creating dedicated virtual environment using $basePy..." -ForegroundColor Cyan
  if ($basePy -eq 'py') {
    & py -3.12 -m venv "$pythonRoot"
  } else {
    & $basePy -m venv "$pythonRoot"
  }
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $pythonRoot 'Scripts\python.exe'))) {
    throw "Failed to create Motion Python virtual environment at $pythonRoot."
  }

  # Install / Sync packages
  $seedSitePackages = Join-Path $Root '.build-runtime-venv\Lib\site-packages'
  $targetSitePackages = Join-Path $pythonRoot 'Lib\site-packages'
  $lockFile = Join-Path $Root 'runtime\manifests\python-requirements-lock.txt'

  if (Test-Path -LiteralPath $seedSitePackages -PathType Container) {
    Write-Host "Seeding pre-built Motion Python dependencies from repository..." -ForegroundColor Cyan
    robocopy $seedSitePackages $targetSitePackages /E /MT:8 /R:1 /W:1 /NP /NFL /NDL /NJH /NJS | Out-Null
  } elseif (Test-Path -LiteralPath $lockFile -PathType Leaf) {
    Write-Host "Installing pinned Motion Python dependencies from lock file..." -ForegroundColor Cyan
    & (Join-Path $pythonRoot 'Scripts\python.exe') -m pip install --disable-pip-version-check --no-input -r "$lockFile"
    if ($LASTEXITCODE -ne 0) { throw "Pip install of Motion Python dependencies failed." }
  } else {
    throw "Neither seed packages nor lock file was found to install Motion Python."
  }

  # Verify and write metadata
  Verify-MotionPython
  $meta = @{
    status = "ready"
    runtime_location = $pythonRoot
    installed_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    python_version = "3.12.10"
    whisperx_ready = $true
    torch_ready = $true
  } | ConvertTo-Json -Depth 4
  Set-Content -LiteralPath (Join-Path $pythonRoot 'motion-python-meta.json') -Value $meta -Encoding utf8
  Write-Host "Motion Python runtime ready at $pythonRoot." -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null

if ($VerifyOnly) {
  Write-Host "Verifying Motion Runtime components..." -ForegroundColor Cyan
  Verify-MotionPython

  if (Test-Path -LiteralPath (Join-Path $motionRoot $manifest.node.executable)) {
    Verify-File (Join-Path $motionRoot $manifest.node.executable) $manifest.node.executable_sha256
    & (Join-Path $motionRoot 'node\node.exe') --version
  }
  if (Test-Path -LiteralPath (Join-Path $motionRoot $manifest.chrome_headless_shell.executable)) {
    Verify-File (Join-Path $motionRoot $manifest.chrome_headless_shell.executable) $manifest.chrome_headless_shell.executable_sha256
    & (Join-Path $motionRoot 'browser\chrome-headless-shell.exe') --version
  }
  if (Test-Path -LiteralPath (Join-Path $motionRoot 'renderer\package-lock.json')) {
    Verify-RemotionWorker
  }

  Write-Host 'Motion runtime verification passed.' -ForegroundColor Green
  exit 0
}

# 1. Install Motion Python
Install-MotionPython

# 2. Install Node.js
$checksumsPath = Join-Path $downloadRoot 'SHASUMS256.txt'
try {
  Invoke-WebRequest -UseBasicParsing -Uri $manifest.node.checksums_url -OutFile $checksumsPath -TimeoutSec $downloadTimeoutSeconds
}
catch {
  Remove-Item -LiteralPath $checksumsPath -Force -ErrorAction SilentlyContinue
  throw "Node checksum download failed or timed out after $downloadTimeoutSeconds seconds. $($_.Exception.Message)"
}
$nodeLine = Select-String -LiteralPath $checksumsPath -Pattern ([regex]::Escape($manifest.node.archive_name)) | Select-Object -First 1
if (-not $nodeLine) { throw "Official Node checksum was not published for $($manifest.node.archive_name)." }
$nodeArchiveHash = (($nodeLine.Line -split '\s+')[0]).ToLowerInvariant()
if ($nodeArchiveHash -notmatch '^[a-f0-9]{64}$') { throw "Official Node checksum format is invalid." }
Download-Verified $manifest.node.archive_url $nodeArchive $nodeArchiveHash

# 3. Install Chrome Headless Shell
Download-Verified $manifest.chrome_headless_shell.archive_url $chromeArchive $manifest.chrome_headless_shell.archive_sha256

if ($Force -and (Test-Path -LiteralPath $nodeRoot)) { Remove-Item -LiteralPath $nodeRoot -Recurse -Force }
if ($Force -and (Test-Path -LiteralPath $browserRoot)) { Remove-Item -LiteralPath $browserRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $nodeRoot, $browserRoot | Out-Null

$nodeExtract = Join-Path $downloadRoot 'node-expanded'
if (Test-Path -LiteralPath $nodeExtract) { Remove-Item -LiteralPath $nodeExtract -Recurse -Force }
Expand-Archive -LiteralPath $nodeArchive -DestinationPath $nodeExtract -Force
Copy-Item -LiteralPath (Join-Path $nodeExtract 'node-v22.23.4-win-x64\*') -Destination $nodeRoot -Recurse -Force

$chromeExtract = Join-Path $downloadRoot 'chrome-expanded'
if (Test-Path -LiteralPath $chromeExtract) { Remove-Item -LiteralPath $chromeExtract -Recurse -Force }
Expand-Archive -LiteralPath $chromeArchive -DestinationPath $chromeExtract -Force
Copy-Item -LiteralPath (Join-Path $chromeExtract 'chrome-headless-shell-win64\*') -Destination $browserRoot -Recurse -Force

$rendererRoot = Join-Path $motionRoot 'renderer'
if (-not (Test-Path -LiteralPath (Join-Path $rendererRoot 'package-lock.json') -PathType Leaf)) {
  throw "Pinned Remotion package-lock.json is missing: $rendererRoot"
}
Write-Host 'Installing pinned Remotion worker dependencies from package-lock.json' -ForegroundColor Cyan
$npm = Join-Path $nodeRoot 'npm.cmd'
& $npm ci --ignore-scripts --no-audit --no-fund --prefix $rendererRoot
if ($LASTEXITCODE -ne 0) { throw 'Pinned Remotion dependency installation failed.' }

Verify-File (Join-Path $motionRoot $manifest.node.executable) $manifest.node.executable_sha256
Verify-File (Join-Path $motionRoot $manifest.chrome_headless_shell.executable) $manifest.chrome_headless_shell.executable_sha256
if (-not (Test-Path -LiteralPath (Join-Path $browserRoot $manifest.chrome_headless_shell.license_file) -PathType Leaf)) {
  throw "Chrome Headless Shell license file is missing."
}

& (Join-Path $nodeRoot 'node.exe') --version
& (Join-Path $browserRoot 'chrome-headless-shell.exe') --version
Verify-RemotionWorker
Verify-MotionPython
Write-Host 'Motion runtime installed and integrity verified.' -ForegroundColor Green
