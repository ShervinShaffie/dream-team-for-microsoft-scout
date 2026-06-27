# The Dream Team for Microsoft Scout - Packager
# Author: Shervin Shaffie
#
# Builds a clean, shareable ZIP in .\dist, EXCLUDING all runtime/local data, and refuses
# to produce the ZIP unless verify-clean.ps1 passes.
#     powershell -ExecutionPolicy Bypass -File .\package-share.ps1
#
# Maintainer auto-publish (off by default so end users never push to the author's repo):
#     powershell -ExecutionPolicy Bypass -File .\package-share.ps1 -Publish
# -Publish commits & pushes source to the repo's default branch and creates/refreshes the
# GitHub Release for this version with the new ZIP attached. Requires the GitHub CLI (gh)
# authenticated as a user with push access to -Repo.

param(
  [switch]$Publish,
  [string]$Repo = 'ShervinShaffie/dream-team-for-microsoft-scout',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir = Join-Path $Root 'dist'
$Version = '0.0.0'
try {
  $mf = Get-Content -Raw (Join-Path $Root 'manifest.json') | ConvertFrom-Json
  if ($mf.version) { $Version = [string]$mf.version }
} catch {}
$Zip = Join-Path $OutDir ("dream-team-for-microsoft-scout-v{0}.zip" -f $Version)
$NotesFile = Join-Path $Root ("RELEASE-NOTES-v{0}.md" -f $Version)

# Allowlist of top-level items to ship. Anything not listed is ignored.
$include = @('START HERE.cmd','Check Setup.cmd','install.ps1','preflight.ps1','verify-clean.ps1','package-share.ps1','README.md','CHANGELOG.md','LICENSE',("RELEASE-NOTES-v{0}.md" -f $Version),'manifest.json','.gitignore','app','skills','automations')
# Runtime/local data that must never ship, pruned from the staged copy.
$prunePatterns = @('data','dist','__pycache__','*.pyc','*.db','*.db-wal','*.db-shm','*.db.bak*','*.pid','state.json','impact.json','config.json','profile','.writetest','.install-location')

$Stage = Join-Path $env:TEMP ('dft-pkg-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
try {
  foreach ($item in $include) {
    $src = Join-Path $Root $item
    if (Test-Path $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $Stage $item) -Recurse -Force }
  }
  foreach ($pat in $prunePatterns) {
    Get-ChildItem -Path $Stage -Recurse -Force -Filter $pat -ErrorAction SilentlyContinue |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
  }

  # Clean-room gate: the verifier must pass against the staged copy.
  Write-Host 'Running clean-room verification on the staged package...'
  & powershell -ExecutionPolicy Bypass -File (Join-Path $Stage 'verify-clean.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'verify-clean.ps1 FAILED - package not built. Scrub the flagged files and retry.' }

  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
  Get-ChildItem -Path $OutDir -Filter 'dream-team-for-microsoft-scout*.zip' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($Stage, $Zip)

  $count = ([System.IO.Compression.ZipFile]::OpenRead($Zip)).Entries.Count
  $size = [math]::Round((Get-Item $Zip).Length / 1KB, 1)
  Write-Host ''
  Write-Host ("Built shareable package: {0} ({1} KB, {2} files)" -f $Zip, $size, $count) -ForegroundColor Green
} finally {
  Remove-Item $Stage -Recurse -Force -ErrorAction SilentlyContinue
}

# -------------------------------------------------------------------------------------------------
# Maintainer auto-publish (opt-in). Commits & pushes source, then creates/refreshes the Release.
# -------------------------------------------------------------------------------------------------
if ($Publish) {
  Write-Host ''
  Write-Host '=== Auto-publish to GitHub ===' -ForegroundColor Cyan

  # Native CLI tools (gh/git) legitimately write to stderr for non-error signals (e.g.
  # "release not found"). Under ErrorActionPreference=Stop that stderr is promoted to a
  # terminating error, so relax it to Continue here; explicit $LASTEXITCODE checks + throw
  # statements below still catch real failures.
  $savedEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) { throw 'Auto-publish requested but the GitHub CLI (gh) is not installed. Install it or omit -Publish.' }
    & gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Auto-publish requested but gh is not authenticated. Run: gh auth login' }

    Push-Location $Root
    try {
      # 1) Commit & push source changes (if this folder is a git repo with changes).
      if (Test-Path (Join-Path $Root '.git')) {
        & git add -A 2>&1 | Out-Null
        $pending = (& git status --porcelain)
        if ($pending) {
          & git commit -m ("Release v{0}" -f $Version) | Out-Host
          Write-Host ("[ok] Committed source changes for v{0}." -f $Version) -ForegroundColor Green
        } else {
          Write-Host '[ok] No source changes to commit.' -ForegroundColor DarkGray
        }
        $pushOut = (& git push origin $Branch 2>&1 | ForEach-Object { [string]$_ })
        $pushOut | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        if ($LASTEXITCODE -ne 0) { Write-Host '[warn] git push failed - continuing to release step; push manually if needed.' -ForegroundColor Yellow }
      } else {
        Write-Host '[warn] Not a git repo - skipping source push, will still create the release.' -ForegroundColor Yellow
      }

      # 2) Create or refresh the GitHub Release for this version, with the ZIP asset.
      $tag = "v$Version"
      $title = "The Dream Team for Microsoft Scout $tag"
      $notesArg = @()
      if (Test-Path $NotesFile) { $notesArg = @('--notes-file', $NotesFile) } else { $notesArg = @('--notes', ("Release {0}" -f $tag)) }

      & gh release view $tag --repo $Repo 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-Host ("[info] Release {0} exists - refreshing its asset." -f $tag)
        & gh release upload $tag $Zip --repo $Repo --clobber 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "Failed to upload asset to existing release $tag." }
      } else {
        & gh release create $tag $Zip --repo $Repo --title $title @notesArg 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "Failed to create release $tag." }
      }
      Write-Host ("[ok] Published {0} to https://github.com/{1}/releases/tag/{2}" -f $tag, $Repo, $tag) -ForegroundColor Green
    } finally {
      Pop-Location
    }
  } finally {
    $ErrorActionPreference = $savedEAP
  }
}