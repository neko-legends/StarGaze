@echo off
setlocal
cd /d "%~dp0"

dotnet build StarGaze.sln -c Release
if errorlevel 1 exit /b %errorlevel%

copy /Y "src\StarGaze\bin\Release\net9.0-windows\StarGaze.exe" "src\StarGaze\bin\Release\net9.0-windows\StarGaze.scr" >nul

echo.
echo Screensaver built:
echo   %~dp0src\StarGaze\bin\Release\net9.0-windows\StarGaze.scr
