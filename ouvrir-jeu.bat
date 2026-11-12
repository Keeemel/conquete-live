@echo off
rem Opens the game in its own clean window (no tabs, no address bar) so TikTok LIVE Studio can capture it.
powershell.exe -NoProfile -Command "$client = New-Object Net.WebClient; $ready = $false; for ($i = 0; $i -lt 60; $i++) { try { $data = $client.DownloadData('http://127.0.0.1:3000/gift-guide-cropped.png'); if ($data.Length -gt 1000) { $ready = $true; break } } catch { Start-Sleep -Milliseconds 500 } }; if (-not $ready) { exit 1 }"
if errorlevel 1 (
  echo Le serveur n'a pas rendu l'image des cadeaux. Verifiez que le jeu est lance sur le port 3000.
  pause
  exit /b 1
)
start "" msedge --app=http://localhost:3000 --window-size=560,1010 --autoplay-policy=no-user-gesture-required --user-data-dir="%LOCALAPPDATA%\conquete-live-edge"
