param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [switch]$Force,
  [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $Root 'runtime\motion\runtime-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Motion runtime manifest is missing: $manifestPath"
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$downloadRoot = Join-Path $env:TEMP 'FramePilotStudio-MotionRuntime'
$nodeArchive = Join-Path $downloadRoot $manifest.node.archive_name
$chromeArchive = Join-Path $downloadRoot $manifest.chrome_headless_shell.archive_name
$nodeRoot = Join-Path $Root 'runtime\motion\node'
$browserRoot = Join-Path $Root 'runtime\motion\browser'

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
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path
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

New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null
if ($VerifyOnly) {
  Verify-File (Join-Path $Root ('runtime\motion\' + $manifest.node.executable)) $manifest.node.executable_sha256
  Verify-File (Join-Path $Root ('runtime\motion\' + $manifest.chrome_headless_shell.executable)) $manifest.chrome_headless_shell.executable_sha256
  if (-not (Test-Path -LiteralPath (Join-Path $browserRoot $manifest.chrome_headless_shell.license_file) -PathType Leaf)) {
    throw "Chrome Headless Shell license file is missing."
  }
  & (Join-Path $Root 'runtime\motion\node\node.exe') --version
  & (Join-Path $Root 'runtime\motion\browser\chrome-headless-shell.exe') --version
  Write-Host 'Motion runtime verification passed.' -ForegroundColor Green
  exit 0
}
$checksumsPath = Join-Path $downloadRoot 'SHASUMS256.txt'
Invoke-WebRequest -UseBasicParsing -Uri $manifest.node.checksums_url -OutFile $checksumsPath
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

Verify-File (Join-Path $Root ('runtime\motion\' + $manifest.node.executable)) $manifest.node.executable_sha256
Verify-File (Join-Path $Root ('runtime\motion\' + $manifest.chrome_headless_shell.executable)) $manifest.chrome_headless_shell.executable_sha256
if (-not (Test-Path -LiteralPath (Join-Path $browserRoot $manifest.chrome_headless_shell.license_file) -PathType Leaf)) {
  throw "Chrome Headless Shell license file is missing."
}

& (Join-Path $nodeRoot 'node.exe') --version
& (Join-Path $browserRoot 'chrome-headless-shell.exe') --version
Write-Host 'Motion runtime installed and integrity verified.' -ForegroundColor Green
