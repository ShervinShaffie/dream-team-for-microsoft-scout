# Daily Flow Team (Dream Team) - Setup doctor + shared Python helpers
# Author: Shervin Shaffie
#
# Run it directly to check your machine is ready:
#     powershell -ExecutionPolicy Bypass -File .\preflight.ps1
# Scout also runs this when it checks your setup.
#
# install.ps1 dot-sources this file to reuse the Python detection + winget self-heal,
# so the same checks run everywhere. The app is pure Python standard library (no pip),
# so the only hard runtime prerequisite is Python 3.9+ correctly on PATH (not the Store stub).

$ProgressPreference = 'SilentlyContinue'

function Get-PythonInfo {
  # Returns a hashtable: Found, Path, Version (string), IsStub (bool), Ok (bool), Reason (string)
  $info = @{ Found = $false; Path = $null; Version = $null; IsStub = $false; Ok = $false; Reason = '' }
  $candidates = New-Object System.Collections.Generic.List[string]
  foreach ($name in @('python', 'python3')) {
    foreach ($c in (Get-Command $name -All -ErrorAction SilentlyContinue)) {
      if ($c.CommandType -eq 'Application' -and $c.Source) { $candidates.Add($c.Source) }
    }
  }
  $pyLauncher = Get-Command 'py' -ErrorAction SilentlyContinue
  if ($pyLauncher) {
    try { $p = (& py -3 -c "import sys;print(sys.executable)" 2>$null); if ($p) { $candidates.Add($p.Trim()) } } catch {}
  }
  $seen = @{}
  foreach ($path in $candidates) {
    if (-not $path -or $seen.ContainsKey($path)) { continue }
    $seen[$path] = $true
    $isStubPath = ($path -match 'WindowsApps')
    $ver = $null
    try { $ver = (& $path -c "import sys;print('%d.%d.%d' % sys.version_info[:3])" 2>$null) } catch { $ver = $null }
    if (-not $ver) {
      # Could not execute - almost always the Microsoft Store stub alias.
      if (-not $info.Found) {
        $info.Found = $true; $info.Path = $path; $info.IsStub = $true
        $info.Reason = 'Found the Microsoft Store Python stub, which opens the Store instead of running Python.'
      }
      continue
    }
    $ver = ([string]$ver).Trim()
    $parts = $ver.Split('.')
    $maj = 0; $min = 0
    if ($parts.Length -ge 2) { [int]::TryParse($parts[0], [ref]$maj) | Out-Null; [int]::TryParse($parts[1], [ref]$min) | Out-Null }
    $info.Found = $true; $info.Path = $path; $info.Version = $ver; $info.IsStub = $false
    if ($maj -gt 3 -or ($maj -eq 3 -and $min -ge 9)) {
      $info.Ok = $true; $info.Reason = "Python $ver"
      return $info
    } else {
      $info.Reason = "Python $ver is installed but too old - the app needs 3.9 or newer."
    }
  }
  if (-not $info.Found) { $info.Reason = 'Python 3 was not found on PATH.' }
  return $info
}

function Install-PythonViaWinget {
  # Attempts a user-scope (no admin) Python install and returns @{ Ok; Path; Reason }
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { return @{ Ok = $false; Path = $null; Reason = 'winget is not available on this machine.' } }
  Write-Host 'Installing Python 3 via winget (user scope, no admin needed). This can take a minute...' -ForegroundColor Cyan
  try {
    & winget install --id Python.Python.3.12 --scope user --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
  } catch {}
  # Refresh PATH from the registry so a freshly installed python is visible in this session.
  try {
    $u = [System.Environment]::GetEnvironmentVariable('PATH', 'User')
    $m = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
    $env:PATH = (@($m, $u) | Where-Object { $_ }) -join ';'
  } catch {}
  $found = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python310\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python39\python.exe')
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($found) {
    # Make sure its folder is on PATH for child processes this session.
    $dir = Split-Path -Parent $found
    if ($env:PATH -notlike "*$dir*") { $env:PATH = "$dir;$($env:PATH)" }
    return @{ Ok = $true; Path = $found; Reason = "Installed Python at $found" }
  }
  return @{ Ok = $false; Path = $null; Reason = 'Python was installed but its path was not found; a terminal restart may be needed.' }
}

function Test-PortFree([int]$Port) {
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $Port); $c.Close(); return $false } catch { return $true }
}

function Get-ScoutInfo {
  # Detects whether Microsoft Scout is installed/present on this machine. The Daily Flow app is just
  # the cockpit; ALL of the team's intelligence (the orchestrator skill, the background automations,
  # and the LLM) runs inside Scout. Without Scout the dashboard loads but stays a dead shell, so the
  # installer/preflight must say so clearly. We look for any strong signal:
  #   (a) a running "Microsoft Scout" process, (b) the installed executable, (c) a Start-Menu shortcut,
  #   or (d) a Scout per-user data root (.scout / .copilot* with Scout markers).
  $info = @{ Found = $false; How = $null; Path = $null }
  try { if (Get-Process -Name 'Microsoft Scout' -ErrorAction SilentlyContinue) { $info.Found = $true; $info.How = 'running' } } catch {}
  if (-not $info.Found) {
    $exe = @(
      (Join-Path $env:ProgramFiles 'Microsoft Scout\Clawpilot\Microsoft Scout.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Microsoft Scout\Clawpilot\Microsoft Scout.exe'),
      (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft Scout\Microsoft Scout.exe'),
      (Join-Path $env:LOCALAPPDATA 'Microsoft Scout\Microsoft Scout.exe')
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if ($exe) { $info.Found = $true; $info.How = 'installed'; $info.Path = $exe }
  }
  if (-not $info.Found) {
    $lnk = @(
      (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\Microsoft Scout.lnk'),
      (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Microsoft Scout.lnk')
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($lnk) { $info.Found = $true; $info.How = 'shortcut'; $info.Path = $lnk }
  }
  if (-not $info.Found) {
    $markers = @('m-skills','m-sessions','m-automations','m-settings.json','config.json','session-store.db')
    foreach ($name in @('.scout','.copilot','.copilot-cloud','.copilot-dev')) {
      $root = Join-Path $env:USERPROFILE $name
      if (-not (Test-Path $root)) { continue }
      foreach ($m in $markers) {
        if (Test-Path (Join-Path $root $m)) { $info.Found = $true; $info.How = 'data'; $info.Path = $root; break }
      }
      if ($info.Found) { break }
    }
  }
  return $info
}

function Invoke-Preflight {
  # Prints a friendly pass/fail report. Returns $true if the machine can run the app.
  param([int]$Port = 8787)
  Write-Host ''
  Write-Host '=== Daily Flow Team - Setup check ===' -ForegroundColor Cyan
  $ok = $true

  $py = Get-PythonInfo
  if ($py.Ok) {
    Write-Host "[ok]   $($py.Reason)"
  } elseif ($py.IsStub) {
    $ok = $false
    Write-Host '[FAIL] Python: the Microsoft Store *stub* was found, not real Python.' -ForegroundColor Red
    Write-Host '       Fix: install real Python from https://www.python.org/downloads/ (tick "Add Python to PATH"),' -ForegroundColor Yellow
    Write-Host '       or turn off the Store alias: Settings > Apps > Advanced app settings > App execution aliases >' -ForegroundColor Yellow
    Write-Host '       turn OFF "python.exe" and "python3.exe". The installer can also do this for you with winget.' -ForegroundColor Yellow
  } elseif ($py.Found) {
    $ok = $false
    Write-Host "[FAIL] $($py.Reason)" -ForegroundColor Red
    Write-Host '       Fix: install Python 3.9+ from https://www.python.org/downloads/ (tick "Add Python to PATH").' -ForegroundColor Yellow
  } else {
    $ok = $false
    Write-Host '[FAIL] Python 3 was not found.' -ForegroundColor Red
    Write-Host '       Fix: install it from https://www.python.org/downloads/ (tick "Add Python to PATH"),' -ForegroundColor Yellow
    Write-Host '       or run the installer (install.ps1 -Auto), which can install it for you with winget.' -ForegroundColor Yellow
  }

  # Microsoft Scout presence — the team's brain runs inside Scout, so flag clearly if it is missing.
  $scout = Get-ScoutInfo
  if ($scout.Found) {
    $how = switch ($scout.How) { 'running' { 'running now' } 'installed' { 'installed' } 'shortcut' { 'installed (shortcut found)' } 'data' { 'set up (data folder found)' } default { 'present' } }
    Write-Host "[ok]   Microsoft Scout is $how."
  } else {
    $ok = $false
    Write-Host '[FAIL] Microsoft Scout was not found on this machine.' -ForegroundColor Red
    Write-Host '       The Daily Flow dashboard will run, but your team stays INACTIVE without Scout:' -ForegroundColor Yellow
    Write-Host '       Major, the background automations, and all the AI live inside Microsoft Scout.' -ForegroundColor Yellow
    Write-Host '       Fix: install Microsoft Scout first, then run the install again.' -ForegroundColor Yellow
  }

  # Port (informational - the installer auto-picks a free one if 8787 is taken)
  if (Test-PortFree $Port) { Write-Host "[ok]   Port $Port is free." }
  else {
    $isOurs = $false
    try { $r = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:{0}/api/state" -f $Port) -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'workLedgerToday') { $isOurs = $true } } catch {}
    if ($isOurs) { Write-Host "[ok]   A Daily Flow app is already running on port $Port." }
    else { Write-Host "[info] Port $Port is in use by something else - setup will pick the next free port." -ForegroundColor DarkGray }
  }

  # Write access to the user profile (where the app and skills are placed)
  try {
    $probe = Join-Path $env:USERPROFILE '.dft-writetest'
    Set-Content -LiteralPath $probe -Value 'ok' -ErrorAction Stop
    Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
    Write-Host '[ok]   Can write to your user folder.'
  } catch {
    $ok = $false
    Write-Host '[FAIL] Cannot write to your user folder - check permissions / disk space.' -ForegroundColor Red
  }

  Write-Host ''
  if ($ok) { Write-Host 'RESULT: Ready to run the Daily Flow Team.' -ForegroundColor Green }
  else { Write-Host 'RESULT: Fix the [FAIL] item(s) above, then run this again (or re-run the install).' -ForegroundColor Red }
  Write-Host ''
  return $ok
}

# Auto-run the report only when executed directly (not when dot-sourced for its functions).
if ($MyInvocation.InvocationName -ne '.') {
  $result = Invoke-Preflight
  if ($result) { exit 0 } else { exit 1 }
}
