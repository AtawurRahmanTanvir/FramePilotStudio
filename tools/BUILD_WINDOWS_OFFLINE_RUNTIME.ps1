param(
  [string]$PythonLauncher = "py",
  [string]$AsrModel = "medium",
  [string]$FfmpegBin = ""
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$BuildVenv = Join-Path $Root ".build-runtime-venv"
$Runtime = Join-Path $Root "runtime"
$ModelRoot = Join-Path $Runtime "models"
$AsrDir = Join-Path $ModelRoot "asr\$AsrModel"
$AlignDir = Join-Path $ModelRoot "alignment\en"
$VadDir = Join-Path $ModelRoot "vad"
$RuntimeBackend = Join-Path $Runtime "backend"
$FfmpegRuntime = Join-Path $Runtime "ffmpeg"
$ManifestPath = Join-Path $Runtime "manifests\runtime-manifest.json"
$LockFile = Join-Path $Runtime "manifests\python-requirements-lock.txt"
$AsrRevision = "08e178d48790749d25932bbc082711ddcfdfbc4f"
$AsrModelSha = "9b45e1009dcc4ab601eff815b61d80e60ce3fd8c74c1a14f4a282258286b51ae"
$AlignSha = "488fd4f16de84438ffc945334278c1b9fb9b7159a806c1080b16111a958c945d"
$VadSha = "0b5b3216d60a2d32fc086b47ea8c67589aaeb26b7e07fcbe620d6d0b83e209ea"

Write-Host "[1/8] Checking a Windows x64 CPython 3.12 build host..." -ForegroundColor Cyan
& $PythonLauncher -3.12 --version
if ($LASTEXITCODE -ne 0) { throw "CPython 3.12 is required on the build machine; it will be packaged inside the app." }
if (-not (Test-Path $BuildVenv)) { & $PythonLauncher -3.12 -m venv $BuildVenv }
$Py = Join-Path $BuildVenv "Scripts\python.exe"
if (-not (Test-Path $LockFile)) { throw "Pinned dependency lock is missing: $LockFile" }

Write-Host "[2/8] Installing the exact project-owned Python dependency lock..." -ForegroundColor Cyan
& $Py -m pip install --disable-pip-version-check --no-input -r $LockFile
if ($LASTEXITCODE -ne 0) { throw "Could not install the pinned Python dependency lock." }
& $Py -m pip install --disable-pip-version-check --no-input "pyinstaller==6.15.0"
if ($LASTEXITCODE -ne 0) { throw "Could not install pinned PyInstaller 6.15.0." }
& $Py -m pip check
if ($LASTEXITCODE -ne 0) { throw "The project-owned Python runtime has dependency conflicts." }

Write-Host "[3/8] Verifying the locally staged CTranslate2 ASR model..." -ForegroundColor Cyan
if ($AsrModel -ne "medium") { throw "Only the inspected, pinned medium model is currently staged; do not build another model name without adding its own revision and SHA-256 inventory." }
New-Item -ItemType Directory -Force -Path $AsrDir,$AlignDir,$VadDir,$RuntimeBackend,$FfmpegRuntime | Out-Null
$requiredAsr = @("config.json", "model.bin", "tokenizer.json", "vocabulary.txt")
$missingAsr = @($requiredAsr | Where-Object { -not (Test-Path (Join-Path $AsrDir $_)) })
if ($missingAsr.Count -gt 0) {
  $env:FRAMEPILOT_BUILD_MODEL_DIR = $AsrDir
  $env:FRAMEPILOT_BUILD_ASR_REVISION = $AsrRevision
  $env:FRAMEPILOT_BUILD_ASR_MODEL = $AsrModel
  @'
import os
from pathlib import Path
from huggingface_hub import snapshot_download
repo = f"Systran/faster-whisper-{os.environ['FRAMEPILOT_BUILD_ASR_MODEL']}"
snapshot_download(repo_id=repo, revision=os.environ['FRAMEPILOT_BUILD_ASR_REVISION'], local_dir=os.environ['FRAMEPILOT_BUILD_MODEL_DIR'])
'@ | & $Py -
  if ($LASTEXITCODE -ne 0) { throw "Could not stage ASR files from the pinned revision $AsrRevision." }
}
foreach ($name in $requiredAsr) {
  if (-not (Test-Path (Join-Path $AsrDir $name))) { throw "Required local ASR model file is missing: $(Join-Path $AsrDir $name)" }
}
$actualAsrHash = (Get-FileHash -Algorithm SHA256 (Join-Path $AsrDir "model.bin")).Hash.ToLowerInvariant()
if ($AsrModel -eq "medium" -and $actualAsrHash -ne $AsrModelSha) { throw "ASR medium model hash mismatch: $actualAsrHash" }

Write-Host "[4/8] Verifying the VAD and English alignment checkpoints..." -ForegroundColor Cyan
$SourceVad = Join-Path $Root "vendor\whisperx-source\whisperx\assets\pytorch_model.bin"
$TargetVad = Join-Path $VadDir "pytorch_model.bin"
if (-not (Test-Path $TargetVad)) { Copy-Item -LiteralPath $SourceVad -Destination $TargetVad }
if ((Get-FileHash -Algorithm SHA256 $TargetVad).Hash.ToLowerInvariant() -ne $VadSha) { throw "Local pyannote VAD checkpoint hash mismatch: $TargetVad" }
$Checkpoint = Join-Path $AlignDir "wav2vec2_fairseq_base_ls960_asr_ls960.pth"
if (-not (Test-Path $Checkpoint)) {
  Invoke-WebRequest -Uri "https://download.pytorch.org/torchaudio/models/wav2vec2_fairseq_base_ls960_asr_ls960.pth" -OutFile $Checkpoint
}
if ((Get-FileHash -Algorithm SHA256 $Checkpoint).Hash.ToLowerInvariant() -ne $AlignSha) { throw "English alignment checkpoint SHA-256 failed: $Checkpoint" }

Write-Host "[5/8] Staging only the app-owned FFmpeg and FFprobe executables..." -ForegroundColor Cyan
if (-not $FfmpegBin) { $FfmpegBin = Join-Path $Root "vendor\ffmpeg" }
foreach ($name in @("ffmpeg.exe", "ffprobe.exe", "LICENSE", "README.txt")) {
  $source = Join-Path $FfmpegBin $name
  if (-not (Test-Path $source)) { throw "Required project-owned FFmpeg file is missing: $source" }
  Copy-Item -LiteralPath $source -Destination (Join-Path $FfmpegRuntime $name) -Force
}
$FfmpegVersionOutput = @(& (Join-Path $FfmpegRuntime "ffmpeg.exe") -version)
$FfmpegVersionExitCode = $LASTEXITCODE
$FfmpegVersion = if ($FfmpegVersionOutput.Count -gt 0) { $FfmpegVersionOutput[0].ToString() } else { "" }
$FfprobeVersionOutput = @(& (Join-Path $FfmpegRuntime "ffprobe.exe") -version)
$FfprobeVersionExitCode = $LASTEXITCODE
$FfprobeVersion = if ($FfprobeVersionOutput.Count -gt 0) { $FfprobeVersionOutput[0].ToString() } else { "" }
$BuildConfStderr = Join-Path $env:TEMP "framepilot-ffmpeg-buildconf-$PID.txt"
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$FfmpegBuildConfStdout = & (Join-Path $FfmpegRuntime "ffmpeg.exe") -buildconf 2> $BuildConfStderr | Out-String
$ErrorActionPreference = $previousErrorActionPreference
$FfmpegBuildConfExitCode = $LASTEXITCODE
$FfmpegBuildConfStderrText = if (Test-Path $BuildConfStderr) { Get-Content -LiteralPath $BuildConfStderr -Raw } else { "" }
$FfmpegBuildConf = ($FfmpegBuildConfStdout + "`r`n" + $FfmpegBuildConfStderrText).Trim()
Remove-Item -LiteralPath $BuildConfStderr -Force -ErrorAction SilentlyContinue
if ($FfmpegVersionExitCode -ne 0 -or $FfprobeVersionExitCode -ne 0 -or -not $FfmpegVersion -or -not $FfprobeVersion) { throw "Could not inspect both staged FFmpeg programs." }
if ($FfmpegBuildConfExitCode -ne 0 -or -not $FfmpegBuildConf) { throw "Could not inspect the staged FFmpeg build configuration." }

Write-Host "[6/8] Keeping the strict local-only runtime manifest and refreshing the exact lock..." -ForegroundColor Cyan
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$manifest.status = "incomplete"
$manifest.runtime_version = "0.1.4-dev"
$manifest.python_backend.kind = "pyinstaller-one-folder"
$manifest.python_backend.status = "build-in-progress"
$manifest.python_backend.package_lock = "manifests/python-requirements-lock.txt"
$manifest.python.provenance = "Project-owned CPython 3.12.10 environment used to freeze the validated one-folder backend."
$manifest.whisperx.version = "3.8.6"
$manifest.ffmpeg.version = $FfmpegVersion
$manifest.ffmpeg.configuration = "Static x86_64 BtbN LGPL build; exact -buildconf output: $FfmpegBuildConf"
$manifest.ffmpeg.license = "LGPL-3.0-or-later build; corresponding-source and redistribution review remains required"
$manifest.ffmpeg.ffmpeg_sha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $FfmpegRuntime "ffmpeg.exe")).Hash.ToLowerInvariant()
$manifest.ffmpeg.ffprobe_sha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $FfmpegRuntime "ffprobe.exe")).Hash.ToLowerInvariant()
$manifest.python_backend.python_version = (& $Py --version 2>&1).ToString()
Set-Content -LiteralPath $LockFile -Encoding utf8 -Value @(
  "# Frozen from the project-owned CPython 3.12.10 build environment after installing the pinned reference lock.",
  "--index-url https://pypi.org/simple",
  "--extra-index-url https://download.pytorch.org/whl/cpu"
)
& $Py -m pip freeze --all | Add-Content -LiteralPath $LockFile -Encoding utf8
$manifest | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $ManifestPath -Encoding utf8

Write-Host "[7/8] Building and staging the frozen Python backend..." -ForegroundColor Cyan
$env:PYTHONDONTWRITEBYTECODE = "1"
& $Py -m PyInstaller --noconfirm --clean tools\FramePilotBackend.spec
if ($LASTEXITCODE -ne 0) { throw "PyInstaller backend build failed." }
$BuiltBackend = Join-Path $Root "dist\FramePilotBackend"
if (-not (Test-Path $BuiltBackend)) { throw "PyInstaller output directory not found: $BuiltBackend" }
$StageBackend = Join-Path $RuntimeBackend "FramePilotBackend"
New-Item -ItemType Directory -Force -Path $StageBackend | Out-Null
Copy-Item -Path (Join-Path $BuiltBackend "*") -Destination $StageBackend -Recurse -Force

# Record hashes of all shipped runtime files except the manifest itself.
$manifest.files = @(Get-ChildItem -Force -Path $Runtime -File -Recurse | Where-Object { $_.FullName -ne $ManifestPath -and $_.Name -ne ".gitkeep" } | ForEach-Object {
  $relative = $_.FullName.Substring($Runtime.TrimEnd('\').Length + 1).Replace('\','/')
  @{ path = $relative; size_bytes = $_.Length; sha256 = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash.ToLowerInvariant() }
})
$manifest.python_backend.status = "frozen-build-created"
$manifest | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $ManifestPath -Encoding utf8

Write-Host "[8/8] Running the frozen backend health check..." -ForegroundColor Cyan
$env:FRAMEPILOT_RUNTIME_ROOT = $Runtime
$BackendExe = Join-Path $StageBackend "FramePilotBackend.exe"
if (-not (Test-Path $BackendExe)) { throw "Frozen FramePilot backend executable not found: $BackendExe" }
$RuntimeInfo = & $BackendExe runtime-info
if ($LASTEXITCODE -ne 0) { throw "Frozen backend runtime-info self-check failed." }
$RuntimeLine = $RuntimeInfo | Where-Object { $_ -match '"event"\s*:\s*"result"' } | Select-Object -Last 1
if (-not $RuntimeLine) { throw "Frozen backend did not emit structured runtime status. Output: $($RuntimeInfo -join [Environment]::NewLine)" }
$RuntimeEvent = $RuntimeLine | ConvertFrom-Json
if (-not $RuntimeEvent.runtime.audio_engine_ready) { throw "Staged engine is not ready: $($RuntimeEvent.runtime.missing_components -join ', ')" }
Write-Host "Bundled engine, local models, FFmpeg and FFprobe passed runtime health checks." -ForegroundColor Green
Write-Warning "Release remains blocked pending FFmpeg GPL source/notices compliance, all third-party license attribution, app icon verification in installed Windows shortcuts/taskbar, and a clean offline Windows test."
