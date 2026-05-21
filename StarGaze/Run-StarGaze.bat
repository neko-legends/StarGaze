@echo off
setlocal
cd /d "%~dp0"
set "EXE=src\StarGaze\bin\Release\net9.0-windows\StarGaze.exe"

if exist "%EXE%" (
  "%EXE%" %*
) else (
  dotnet run --project src\StarGaze\StarGaze.csproj -c Release -- %*
)
