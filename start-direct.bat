@echo off
cd /d "%~dp0"
call setup-edge-tts.bat
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist node_modules call npm install
set /p TIKTOK_USER=Ton pseudo TikTok (sans le @) : 
echo.
echo Lance ton LIVE TikTok, puis ajoute http://localhost:3000 dans OBS / LIVE Studio.
echo.
node server.js %TIKTOK_USER%
pause
