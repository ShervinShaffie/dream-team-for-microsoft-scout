# Daily Flow Team - app launcher
# Author: Shervin Shaffie
# Starts the local Daily Flow app (Python standard library only) and opens the dashboard.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $Root 'daily-flow-app.pid'

$Port = 8787
$cfgPath = Join-Path $Root 'config.json'
if (Test-Path $cfgPath) {
  try { $cfg = Get-Content -Raw $cfgPath | ConvertFrom-Json; if ($cfg.port) { $Port = [int]$cfg.port } } catch {}
}
$Url = "http://127.0.0.1:$Port/"

function Test-App {
  try { (Invoke-WebRequest -UseBasicParsing -Uri "$Url`api/state" -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

if (-not (Test-App)) {
  $existingPid = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue
  if ($existingPid) {
    if (-not (Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue)) {
      Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    }
  }
  # Resolve a real Python via the shared doctor when it's available (rejects the Store stub, checks 3.9+).
  $preflight = Join-Path $Root 'preflight.ps1'
  $python = $null
  if (Test-Path $preflight) {
    . $preflight
    $info = Get-PythonInfo
    if ($info.Ok -and $info.Path) {
      $dir = Split-Path -Parent $info.Path
      $pw = Join-Path $dir 'pythonw.exe'
      $python = if (Test-Path $pw) { $pw } else { $info.Path }
    } else {
      Write-Warning "Daily Flow can't start: $($info.Reason)"
      Write-Host '   Fix it, then run this again. Double-click "Check Setup.cmd" for a full setup check.' -ForegroundColor Yellow
      return
    }
  } else {
    $pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    $python  = if ($pythonw) { $pythonw.Source } else { (Get-Command python.exe -ErrorAction SilentlyContinue).Source }
    if (-not $python) {
      Write-Warning 'Daily Flow can''t start: Python 3.9+ was not found. Install it from https://www.python.org/downloads/ (tick "Add Python to PATH").'
      return
    }
  }
  $proc = Start-Process -FilePath $python -ArgumentList '.\app.py' -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $PidFile -Value $proc.Id -Encoding ASCII
  $deadline = (Get-Date).AddSeconds(25)
  while ((Get-Date) -lt $deadline) { if (Test-App) { break }; Start-Sleep -Milliseconds 500 }
}

if (Test-App) {
  Write-Host "Daily Flow app is running at $Url"
  if (-not $env:DAILY_FLOW_NO_BROWSER) { Start-Process $Url }
}
else { Write-Warning "Daily Flow app did not respond on port $Port. Double-click ""Check Setup.cmd"" to diagnose (it checks Python 3.9+, the Store stub, and the port)." }