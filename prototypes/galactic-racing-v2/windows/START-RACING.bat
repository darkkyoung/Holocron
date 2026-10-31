@echo off
setlocal
cd /d "%~dp0"
echo HOLOCRON Galactic Racing - Phase 2-A - 30FPS
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-demo.ps1" %*
if errorlevel 1 (
  echo.
  echo Demo could not start. No existing server was opened or stopped.
  echo To use another port: START-RACING.bat -Port 43875
  pause
)
