@echo off
cd /d "%~dp0"
call setup-edge-tts.bat
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
node server.js
pause
