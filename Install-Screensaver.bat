@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-screensaver.ps1" %*
if errorlevel 1 (
  echo.
  echo StarGaze screensaver install failed.
  pause
  exit /b %errorlevel%
)

echo.
echo StarGaze screensaver installed.
pause
