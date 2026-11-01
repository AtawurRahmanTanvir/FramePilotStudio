@echo off
setlocal
cd /d "%~dp0\.."
where pyinstaller >nul 2>nul || (echo PyInstaller is missing from the build environment.& pause & exit /b 1)
pyinstaller --noconfirm --clean tools\FramePilotBackend.spec
if errorlevel 1 (pause & exit /b 1)
if not exist runtime\backend mkdir runtime\backend
xcopy /E /I /Y dist\FramePilotBackend runtime\backend\FramePilotBackend
 echo Backend bundle staged. This does not include FFmpeg binaries or WhisperX models.
pause
