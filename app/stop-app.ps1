# Daily Flow Team - app stopper
# Author: Shervin Shaffie
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $Root 'daily-flow-app.pid'
$existingPid = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue
if ($existingPid -and (Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue)) {
  Stop-Process -Id ([int]$existingPid) -Force
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped Daily Flow app (PID $existingPid)."
} else { Write-Host "Daily Flow app is not running (no live PID)." }