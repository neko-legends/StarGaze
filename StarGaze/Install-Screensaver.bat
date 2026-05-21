@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Screensaver.ps1" %*
if errorlevel 1 (
  echo.
  echo StarGaze screensaver setup failed.
  pause
  exit /b %errorlevel%
)

echo.
echo StarGaze screensaver setup complete.
pause
