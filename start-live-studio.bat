@echo off
cd /d "%~dp0"
call setup-edge-tts.bat
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist node_modules call npm install
rem Opens the game window once the server has started and the gift image is available.
start "" /min "%~dp0ouvrir-jeu.bat"
node server.js
pause
