@echo off
setlocal
cd /d "%~dp0\.."
where node >nul 2>nul || (echo Node.js is required for development.& pause & exit /b 1)
if not exist node_modules (
  echo Installing Electron development dependencies...
  call npm install || (pause & exit /b 1)
)
echo Starting FramePilot Studio development build...
call npm start
