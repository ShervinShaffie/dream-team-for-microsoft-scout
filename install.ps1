# Daily Flow Team (Dream Team) - Installer / Bootstrap
# Author: Shervin Shaffie
#
# Normally Scout runs this for you (see INSTALL-WITH-SCOUT.md). To run it yourself:
#     powershell -ExecutionPolicy Bypass -File .\install.ps1          (mechanical install only)
#     powershell -ExecutionPolicy Bypass -File .\install.ps1 -Auto    (full hands-off setup)
#
# It copies the team skills into Microsoft Scout and places the app. With -Auto it also writes
# sensible defaults, starts the dashboard, opens Scout, and copies the finishing command for you.
# It NEVER changes your Scout model or automations - the in-Scout wizard does that, with your ok.

param(
  [string]$InstallDir = (Join-Path $env:USERPROFILE 'Daily Flow Team'),
  [int]$BasePort = 8787,
  [switch]$Auto
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$PkgRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillsSrc = Join-Path $PkgRoot 'skills'
$NewVersion = '0.0.0'
try { $mf = Get-Content -Raw (Join-Path $PkgRoot 'manifest.json') | ConvertFrom-Json; if ($mf.version) { $NewVersion = [string]$mf.version } } catch {}
function Get-ScoutSkillRoots {
  # Scout's per-user data directory name varies by build: .scout (newer), .copilot,
  # .copilot-cloud, or .copilot-dev. We never hardcode one - we detect every root that
  # actually holds Scout data and install to all of them, so the skills land wherever
  # THIS machine's Scout reads from. (This is the fix for skills landing in the wrong folder.)
  $homeDir = $env:USERPROFILE
  $candidates = @('.scout','.copilot','.copilot-cloud','.copilot-dev')
  $markers = @('m-skills','m-sessions','m-automations','m-settings.json','config.json','session-store.db')
  $roots = @()
  foreach ($name in $candidates) {
    $root = Join-Path $homeDir $name
    if (-not (Test-Path $root)) { continue }
    $isScout = $false
    foreach ($m in $markers) { if (Test-Path (Join-Path $root $m)) { $isScout = $true; break } }
    if ($isScout) { $roots += (Join-Path $root 'm-skills') }
  }
  if ($roots.Count -eq 0) {
    # Nothing detected (rare). Install to both common names so Scout cannot miss it.
    $roots = @((Join-Path $homeDir '.scout\m-skills'), (Join-Path $homeDir '.copilot\m-skills'))
  }
  return $roots
}
$SkillRoots = @(Get-ScoutSkillRoots)

function Test-OurApp([int]$Port) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:{0}/api/state" -f $Port) -TimeoutSec 2
    return ($r.StatusCode -eq 200 -and $r.Content -match 'workLedgerToday')
  } catch { return $false }
}
function Test-PortFree([int]$Port) {
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',$Port); $c.Close(); return $false } catch { return $true }
}

Write-Host ''
Write-Host '=== Daily Flow Team - Setup ===' -ForegroundColor Cyan
Write-Host ''

# 1. Python check (hardened): reject the Microsoft Store stub, require 3.9+, and self-heal via winget.
. (Join-Path $PkgRoot 'preflight.ps1')   # dot-source for Get-PythonInfo / Install-PythonViaWinget (no report when dot-sourced)
$py = Get-PythonInfo
if (-not $py.Ok) {
  if ($py.IsStub) { Write-Host '[warn] Found the Microsoft Store Python stub (it opens the Store instead of running Python).' -ForegroundColor Yellow }
  elseif ($py.Found) { Write-Host "[warn] $($py.Reason)" -ForegroundColor Yellow }
  else { Write-Host '[warn] Python 3.9+ was not found on PATH.' -ForegroundColor Yellow }
  $doInstall = $true
  $ans = Read-Host 'Install Python 3 now with winget? (recommended, user-scope, no admin) [Y/n]'
  if ($ans -and $ans.Trim().ToLower().StartsWith('n')) { $doInstall = $false }
  if ($doInstall) {
    $res = Install-PythonViaWinget
    if ($res.Ok) { Write-Host "[ok] $($res.Reason)" -ForegroundColor Green; $py = Get-PythonInfo }
    else { Write-Host "[info] $($res.Reason)" -ForegroundColor Yellow }
  }
  if (-not $py.Ok) {
    Write-Host '[STOP] Python 3.9+ is required to run the app.' -ForegroundColor Red
    Write-Host '       Install it from https://www.python.org/downloads/ (tick "Add Python to PATH"),' -ForegroundColor Yellow
    Write-Host '       then run the install again. (Tip: run preflight.ps1 to re-check your setup.)' -ForegroundColor Yellow
    if ($Auto) { Write-Host ''; Read-Host 'Press Enter to close' }
    return
  }
}
$pyLabel = if ($py.Version) { "Python $($py.Version)" } else { 'Python' }
Write-Host "[ok] $pyLabel ready."

# 1b. Microsoft Scout check. The app is only the cockpit — Major, the automations, and the AI all run
#     inside Scout. We do NOT block the install (the dashboard still works and skills are pre-placed for
#     when Scout arrives), but we warn loudly and switch off the "open Scout / run /daily-flow-setup"
#     finish so the user isn't told to use an app they don't have.
$scout = Get-ScoutInfo
$ScoutMissing = -not $scout.Found
if ($ScoutMissing) {
  Write-Host ''
  Write-Host '  ============================================================' -ForegroundColor Yellow
  Write-Host '   HEADS UP: Microsoft Scout was not found on this machine.' -ForegroundColor Yellow
  Write-Host '   The dashboard will install and run, but your TEAM STAYS' -ForegroundColor Yellow
  Write-Host '   INACTIVE until Scout is installed — Major, the background' -ForegroundColor Yellow
  Write-Host '   automations, and all the AI live inside Microsoft Scout.' -ForegroundColor Yellow
  Write-Host '   Install Microsoft Scout, then run the install again.' -ForegroundColor Yellow
  Write-Host '  ============================================================' -ForegroundColor Yellow
  if (-not $Auto) {
    $go = Read-Host 'Continue placing the local app anyway? [Y/n]'
    if ($go -and $go.Trim().ToLower().StartsWith('n')) { Write-Host '[stop] Setup cancelled. Install Microsoft Scout first.' -ForegroundColor Yellow; return }
  }
} else {
  Write-Host "[ok] Microsoft Scout detected."
}

# 2. Detect an existing install so this can UPGRADE in place (preserving the local DB + settings).
$existingDir = $null
foreach ($root in $SkillRoots) {
  $ptr = Join-Path ([string]$root) 'daily-flow-setup\.install-location'
  if (Test-Path $ptr) {
    $cand = (Get-Content -LiteralPath $ptr -Raw).Trim()
    if ($cand -and (Test-Path (Join-Path $cand 'app'))) { $existingDir = $cand; break }
  }
}
if (-not $existingDir -and (Test-Path (Join-Path $InstallDir 'app'))) { $existingDir = $InstallDir }
$IsUpgrade = [bool]$existingDir
$OldVersion = $null
if ($IsUpgrade) {
  if (-not $PSBoundParameters.ContainsKey('InstallDir')) { $InstallDir = $existingDir }  # upgrade in place
  $verFile = Join-Path $existingDir 'app\.installed-version'
  if (Test-Path $verFile) { $OldVersion = (Get-Content -LiteralPath $verFile -Raw).Trim() }
  $verLabel = if ($OldVersion) { "v$OldVersion" } else { 'an earlier version' }
  Write-Host ("[info] Found an existing install ({0}) at {1}" -f $verLabel, $existingDir) -ForegroundColor Cyan
  Write-Host ("       Upgrading {0} -> v{1}. Your local database, settings, and any employees you added are kept; the database migrates automatically on first launch." -f $verLabel, $NewVersion) -ForegroundColor Cyan
}

# 3. Install/refresh skills into EVERY detected Scout skills root.
#    Fresh install: keep any same-named skill the user already has (don't clobber). daily-flow-setup
#    is always refreshed. UPGRADE: refresh ALL of this package's bundled skills to the new version.
$installed = @(); $kept = @(); $updated = @()
foreach ($root in $SkillRoots) {
  $MSkills = [string]$root
  New-Item -ItemType Directory -Force -Path $MSkills | Out-Null
  Get-ChildItem -Directory $SkillsSrc | ForEach-Object {
    $name = $_.Name; $dest = Join-Path $MSkills $name
    $exists = Test-Path $dest
    if ($name -eq 'daily-flow-setup' -or $IsUpgrade -or -not $exists) {
      # Remove first so Copy-Item -Recurse overwrites cleanly instead of nesting (dest\name\name).
      if ($exists) { Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue }
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
      if ($exists -and $name -ne 'daily-flow-setup') { if ($updated -notcontains $name) { $updated += $name } }
      elseif (-not $exists) { if ($installed -notcontains $name) { $installed += $name } }
    }
    elseif ($exists) { if ($kept -notcontains $name) { $kept += $name } }
  }
}
$rootLabels = $SkillRoots | ForEach-Object { $_.Replace($env:USERPROFILE, '~') }
if ($IsUpgrade) {
  Write-Host "[ok] Refreshed team skills to v$NewVersion ($($SkillRoots.Count) skills folder(s))."
  if ($updated.Count -gt 0) { Write-Host "[info] Updated: $($updated -join ', ')" -ForegroundColor DarkGray }
} else {
  Write-Host "[ok] Installed team skills into Scout ($($SkillRoots.Count) skills folder(s)):"
  foreach ($rl in $rootLabels) { Write-Host "      $rl" -ForegroundColor DarkGray }
  if ($kept.Count -gt 0) { Write-Host "[info] Kept your existing version of: $($kept -join ', ')" -ForegroundColor DarkGray }
}

# 4. Place the app + automation templates (config.json and data/ are NOT in the package, so an
#    existing install's settings and local database are preserved by this copy).
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -LiteralPath (Join-Path $PkgRoot 'app') -Destination $InstallDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $PkgRoot 'automations') -Destination $InstallDir -Recurse -Force
# Place the setup doctor beside the app so start-app.ps1 can reuse the same Python checks later.
Copy-Item -LiteralPath (Join-Path $PkgRoot 'preflight.ps1') -Destination (Join-Path $InstallDir 'app\preflight.ps1') -Force -ErrorAction SilentlyContinue
# Stamp the installed version so a future run can tell new-install from upgrade and show X -> Y.
Set-Content -LiteralPath (Join-Path $InstallDir 'app\.installed-version') -Value $NewVersion -Encoding UTF8 -ErrorAction SilentlyContinue
if ($IsUpgrade) { Write-Host "[ok] Updated the app in: $InstallDir (database & settings preserved)" }
else { Write-Host "[ok] Placed the app in: $InstallDir" }

# 5. Record install location for the wizard in EVERY root, so the wizard finds it
#    no matter which folder Scout loaded the skill from.
foreach ($root in $SkillRoots) {
  $MSkills = [string]$root
  $ptrDir = Join-Path $MSkills 'daily-flow-setup'
  New-Item -ItemType Directory -Force -Path $ptrDir | Out-Null
  Set-Content -LiteralPath (Join-Path $ptrDir '.install-location') -Value $InstallDir -Encoding UTF8
}

if (-not $Auto) {
  Write-Host ''
  if ($ScoutMissing) {
    Write-Host '=== Local app placed — but Microsoft Scout is required ===' -ForegroundColor Yellow
    Write-Host '  1) Install Microsoft Scout on this machine.'
    Write-Host '  2) Run the install again so the team skills load into Scout.'
    Write-Host '  3) Then, in a new Scout chat, type:  /daily-flow-setup'
  } else {
    Write-Host '=== Almost done! Two steps left ===' -ForegroundColor Green
    Write-Host '  1) Open Microsoft Scout.'
    Write-Host '  2) In a new chat, type:  /daily-flow-setup'
    Write-Host ''
    Write-Host 'If Scout does not recognize /daily-flow-setup, fully restart Scout so it loads the new skills.'
  }
  return
}

# ---------- -Auto: finish hands-off ----------
# 5. Choose a port (reuse 8787 if it is already our app; else first free port from 8787)
$port = $BasePort
if (Test-OurApp $BasePort) { $port = $BasePort }
elseif (-not (Test-PortFree $BasePort)) { foreach ($p in ($BasePort+1)..($BasePort+12)) { if (Test-PortFree $p) { $port = $p; break } } }

# 6. Choose a document folder (prefer OneDrive - Microsoft, then OneDrive, else Documents)
$docRoot = $null
foreach ($cand in @(
  (Join-Path $env:USERPROFILE 'OneDrive - Microsoft\Scout'),
  (Join-Path $env:USERPROFILE 'OneDrive\Scout'),
  (Join-Path $env:USERPROFILE 'Documents\Daily Flow')
)) {
  $parent = Split-Path $cand -Parent
  if (Test-Path $parent) { $docRoot = $cand; break }
}
if (-not $docRoot) { $docRoot = (Join-Path $env:USERPROFILE 'Documents\Daily Flow') }
New-Item -ItemType Directory -Force -Path $docRoot | Out-Null

# 7. Write config.json beside the app
$config = [ordered]@{ port = $port; documentRoot = $docRoot; author = 'Shervin Shaffie' }
$cfgPath = Join-Path $InstallDir 'app\config.json'
($config | ConvertTo-Json) | Set-Content -LiteralPath $cfgPath -Encoding UTF8
Write-Host "[ok] Configured: port $port, documents -> $docRoot"

# 8. Start the app, wait for it to be live, then open the dashboard ourselves
$prevNoBrowser = $env:DAILY_FLOW_NO_BROWSER
$env:DAILY_FLOW_NO_BROWSER = '1'   # we open the browser ourselves once the app confirms live
& (Join-Path $InstallDir 'app\start-app.ps1') *> $null
$env:DAILY_FLOW_NO_BROWSER = $prevNoBrowser
$live = $false
for ($i = 0; $i -lt 40; $i++) { if (Test-OurApp $port) { $live = $true; break }; Start-Sleep -Milliseconds 500 }
if ($live) {
  if (-not $env:DAILY_FLOW_NO_BROWSER) { Start-Process "http://127.0.0.1:$port/" }
  Write-Host "[ok] Dashboard is live at http://127.0.0.1:$port/" -ForegroundColor Green
} else {
  Write-Host "[info] The app is still starting; it will appear at http://127.0.0.1:$port/ in a moment." -ForegroundColor Yellow
}

# 9. Copy the finishing command; decide what to tell the user based on whether Scout is already running
$cmd = '/daily-flow-setup'
if ($ScoutMissing) {
  # No Scout on this machine: do not pretend to open it or push /daily-flow-setup yet.
  $step1 = 'Install Microsoft Scout on this machine (the dashboard is open, but the team needs Scout).'
  $step2 = 'After Scout is installed and open, run the install again so the team skills load into Scout.'
  $step3 = 'Then open Scout, click the chat box, type /daily-flow-setup and press Enter.'
  $copied = $false
} else {
  try { Set-Clipboard -Value $cmd; $copied = $true } catch { $copied = $false }
  $scoutRunning = [bool](Get-Process -Name 'Microsoft Scout' -ErrorAction SilentlyContinue)
  $scoutExe = @(
    (Join-Path $env:ProgramFiles 'Microsoft Scout\Clawpilot\Microsoft Scout.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft Scout\Clawpilot\Microsoft Scout.exe')
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  $scoutLnk = @(
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\Microsoft Scout.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Microsoft Scout.lnk')
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  $pasteOrType = if ($copied) { 'press Ctrl+V, then Enter  (the command is already copied for you)' } else { 'type the command shown below, then press Enter' }
  if ($scoutRunning) {
    # Scout was already open, so it has not loaded the new skills yet - it must be restarted.
    $step1 = 'Close Microsoft Scout completely (quit it), then open it again.'
    $step2 = 'Restarting is required so Scout loads your new team skills.'
    $step3 = "In Scout, click the chat box and $pasteOrType."
  } else {
    # Scout is closed: launch it fresh so it loads the new skills on startup (no restart needed).
    if ($scoutExe) { Start-Process -FilePath $scoutExe } elseif ($scoutLnk) { Start-Process -FilePath $scoutLnk }
    $step1 = 'Microsoft Scout is opening now (it loads your new team skills as it starts).'
    $step2 = 'Wait a moment for it to finish opening.'
    $step3 = "Click the chat box and $pasteOrType."
  }
}
$headline = if ($ScoutMissing) { '  DASHBOARD READY - install Microsoft Scout to switch on the team' } else { '  SETUP IS COMPLETE - one quick step left in Microsoft Scout' }
$headColor = if ($ScoutMissing) { 'Yellow' } else { 'Green' }
Write-Host ''
Write-Host '===========================================================' -ForegroundColor $headColor
Write-Host $headline -ForegroundColor $headColor
Write-Host '===========================================================' -ForegroundColor $headColor
Write-Host ''
Write-Host "   1) $step1"
Write-Host "   2) $step2"
Write-Host "   3) $step3"
Write-Host ''
Write-Host '   The command to run is:'
Write-Host '       /daily-flow-setup' -ForegroundColor Cyan
Write-Host '===========================================================' -ForegroundColor $headColor
if (-not $env:DAILY_FLOW_NO_POPUP) {
  $popupHead = if ($ScoutMissing) { 'Your Daily Flow dashboard is open — but Microsoft Scout is required to switch on the team.' } else { 'Your Daily Flow dashboard is open in your browser.' }
  $popupBody = @"
$popupHead

ONE LAST STEP to switch on your team:

  1) $step1
  2) $step2
  3) $step3

The command to run is:   /daily-flow-setup
"@
  try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    $owner = New-Object System.Windows.Forms.Form
    $owner.TopMost = $true; $owner.ShowInTaskbar = $false; $owner.Width = 1; $owner.Height = 1; $owner.Opacity = 0; $owner.FormBorderStyle = 'None'; $owner.StartPosition = 'CenterScreen'
    [void]$owner.Show(); [void]$owner.Activate()
    $popupTitle = if ($ScoutMissing) { 'Daily Flow Team - install Microsoft Scout to finish' } else { 'Daily Flow Team - almost done!' }
    [void][System.Windows.Forms.MessageBox]::Show($owner, $popupBody, $popupTitle, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    $owner.Close(); $owner.Dispose()
  } catch { }
}