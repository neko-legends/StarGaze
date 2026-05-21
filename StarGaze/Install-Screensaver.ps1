param(
  [ValidateRange(0, 86400)]
  [int]$TimeoutSeconds = 0,

  [switch]$NoRegister
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$solution = Join-Path $root "StarGaze.sln"
$output = Join-Path $root "src\StarGaze\bin\Release\net9.0-windows"
$exe = Join-Path $output "StarGaze.exe"
$scr = Join-Path $output "StarGaze.scr"

Set-Location $root

if (Get-Command "dotnet" -ErrorAction SilentlyContinue) {
  dotnet build $solution -c Release
  if ($LASTEXITCODE -ne 0) {
    throw "Release build failed."
  }
} elseif (-not (Test-Path -LiteralPath $exe)) {
  throw "Could not find dotnet SDK or a prebuilt StarGaze.exe. Install .NET SDK to build from source, or use a release zip that includes the built executable."
} else {
  Write-Host "dotnet SDK not found; using existing StarGaze.exe."
}

Copy-Item -LiteralPath $exe -Destination $scr -Force

Write-Host "Screensaver executable:"
Write-Host "  $scr"

if (-not $NoRegister) {
  $desktopKey = "HKCU:\Control Panel\Desktop"
  Set-ItemProperty -Path $desktopKey -Name "SCRNSAVE.EXE" -Value $scr
  Set-ItemProperty -Path $desktopKey -Name "ScreenSaveActive" -Value "1"
  if ($TimeoutSeconds -gt 0) {
    Set-ItemProperty -Path $desktopKey -Name "ScreenSaveTimeOut" -Value ([string]$TimeoutSeconds)
  }

  & rundll32.exe user32.dll,UpdatePerUserSystemParameters

  Write-Host ""
  Write-Host "Registered StarGaze as the current Windows screensaver."
  if ($TimeoutSeconds -gt 0) {
    Write-Host "Timeout: $TimeoutSeconds seconds"
  } else {
    Write-Host "Timeout: unchanged"
  }
}
