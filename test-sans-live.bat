@echo off
cd /d "%~dp0"
call setup-edge-tts.bat
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist node_modules call npm install
start "Faux TikFinity" cmd /k node fake-tikfinity.js
timeout /t 2 >nul
start http://localhost:3000
node server.js
pause
