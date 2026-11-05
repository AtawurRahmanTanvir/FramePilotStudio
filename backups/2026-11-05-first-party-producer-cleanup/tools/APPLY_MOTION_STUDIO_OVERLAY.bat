@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to apply this FramePilot source overlay.
  echo Install the same Node.js LTS toolchain already used for FramePilot development, then run this file again.
  pause
  exit /b 2
)
node "%~dp0apply-motion-studio-overlay.cjs"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo Overlay was not applied successfully. Review the error above.
) else (
  echo Motion Studio overlay applied. Existing source backups are in backups\motion-studio-overlay.
)
pause
exit /b %RESULT%
