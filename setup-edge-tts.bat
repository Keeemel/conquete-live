@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3 -m venv .venv
  ) else (
    python -m venv .venv
  )
  if errorlevel 1 (
    echo Python 3 is required to install Edge-TTS.
    exit /b 1
  )
)

".venv\Scripts\python.exe" -c "import edge_tts" >nul 2>nul
if errorlevel 1 (
  echo Installing Edge-TTS for the first time...
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Edge-TTS installation failed.
    exit /b 1
  )
)
exit /b 0
