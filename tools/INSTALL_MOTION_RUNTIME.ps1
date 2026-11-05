param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$MotionRuntimeRoot = "",
  [switch]$Force,
  [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$motionRoot = if ($MotionRuntimeRoot) { [System.IO.Path]::GetFullPath($MotionRuntimeRoot) } else { Join-Path $Root 'runtime\motion' }
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

New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
if ($VerifyOnly) {
  Verify-File (Join-Path $motionRoot $manifest.node.executable) $manifest.node.executable_sha256
  Verify-File (Join-Path $motionRoot $manifest.chrome_headless_shell.executable) $manifest.chrome_headless_shell.executable_sha256
  if (-not (Test-Path -LiteralPath (Join-Path $browserRoot $manifest.chrome_headless_shell.license_file) -PathType Leaf)) {
    throw "Chrome Headless Shell license file is missing."
  }
  & (Join-Path $motionRoot 'node\node.exe') --version
  & (Join-Path $motionRoot 'browser\chrome-headless-shell.exe') --version
  Verify-RemotionWorker
  Write-Host 'Motion runtime verification passed.' -ForegroundColor Green
  exit 0
}
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
Write-Host 'Motion runtime installed and integrity verified.' -ForegroundColor Green
