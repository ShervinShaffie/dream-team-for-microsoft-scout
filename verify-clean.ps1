# Daily Flow Team (Dream Team) - Clean-room verifier
# Author: Shervin Shaffie
#
# Scans the entire package for the original author's personal identifiers and FAILS (exit 1)
# if any are present. Run before sharing the ZIP:
#     powershell -ExecutionPolicy Bypass -File .\verify-clean.ps1
#
# The author's DISPLAY NAME ("Shervin Shaffie") is intentional provenance and is allowed.
# Only personal identifiers (alias, email, machine paths, tenant GUIDs, private chat ids) are forbidden.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Denylist tokens are assembled from fragments so this script holds no literal personal data.
$deny = @(
  @{ label = 'author alias';            pattern = ('ss' + 'haffie') },
  @{ label = 'personal SharePoint';     pattern = ('microsoft-my' + '.sharepoint') },
  @{ label = 'tenant/user GUID';        pattern = ('220d' + '2d00') },
  @{ label = 'private chat GUID';       pattern = ('99fa' + '64eb') },
  @{ label = 'author workspace folder'; pattern = ('Microsoft Scout ' + 'Local') },
  @{ label = 'corporate email';         pattern = ('@micro' + 'soft.com') }
)

$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object {
  $_.Extension -notin @('.png','.jpg','.jpeg','.gif','.ico','.zip','.pyc')
}

$hits = New-Object System.Collections.Generic.List[object]
foreach ($f in $files) {
  $text = $null
  try { $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop } catch { continue }
  if ([string]::IsNullOrEmpty($text)) { continue }
  foreach ($d in $deny) {
    $idx = $text.IndexOf($d.pattern, [System.StringComparison]::OrdinalIgnoreCase)
    if ($idx -ge 0) {
      $line = ($text.Substring(0, $idx) -split "`n").Count
      $hits.Add([pscustomobject]@{ File = $f.FullName.Substring($Root.Length).TrimStart('\'); Line = $line; Found = $d.label })
    }
  }
}

# Email backstop (public edition): no person's email address of any domain may ship - that is personal
# data of the author OR anyone else. A short allowlist covers non-personal placeholders, the git
# noreply identity, and Teams/Graph infrastructure identifiers (e.g. a Teams 1:1 chat id ends in
# @unq.gbl.spaces - a structural id, not an email). NOTE: gated catalog/host URLs (e.g. the Skill
# Shack) are intentionally allowed - they expose no content (auth-gated) and the setup wizard
# references them on purpose; only real personal emails are blocked.
$emailAllow = @(
  'users.noreply.github.com','noreply.github.com',
  'example.com','example.org','example.net',
  'unq.gbl.spaces','gbl.spaces','thread.skype'
)
$emailRegex = [regex]'(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
foreach ($f in $files) {
  $text = $null
  try { $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop } catch { continue }
  if ([string]::IsNullOrEmpty($text)) { continue }
  foreach ($m in $emailRegex.Matches($text)) {
    $addr = $m.Value.ToLower()
    $allowed = $false
    foreach ($a in $emailAllow) { if ($addr.EndsWith($a)) { $allowed = $true; break } }
    if ($allowed) { continue }
    $line = ($text.Substring(0, $m.Index) -split "`n").Count
    $hits.Add([pscustomobject]@{ File = $f.FullName.Substring($Root.Length).TrimStart('\'); Line = $line; Found = 'email address' })
  }
}

Write-Host ''
Write-Host '=== Daily Flow Team - clean-room scan ===' -ForegroundColor Cyan
Write-Host ("Scanned {0} files under {1}" -f $files.Count, $Root)

# Structural backstop: private/runtime artifacts must never appear in a package, regardless of content.
# This is what guarantees the user's private career profile, local database, and config never ship.
$forbiddenLeaf = @('config.json','impact.json','state.json','.install-location','.writetest')
$forbiddenExt  = @('.db','.db-wal','.db-shm','.pid')
$forbiddenDir  = @('data','profile')
$structural = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -Path $Root -Recurse -File -Force -ErrorAction SilentlyContinue)) {
  $rel = $f.FullName.Substring($Root.Length).TrimStart('\')
  if (($forbiddenLeaf -contains $f.Name) -or ($forbiddenExt -contains $f.Extension.ToLower())) {
    $structural.Add([pscustomobject]@{ File = $rel; Found = 'private/runtime artifact' })
  }
}
foreach ($dname in $forbiddenDir) {
  Get-ChildItem -Path $Root -Recurse -Directory -Force -Filter $dname -ErrorAction SilentlyContinue |
    ForEach-Object { $structural.Add([pscustomobject]@{ File = $_.FullName.Substring($Root.Length).TrimStart('\'); Found = "private/runtime directory ($dname)" }) }
}
if ($structural.Count -gt 0) {
  Write-Host ("STRUCTURAL: FAILED - {0} private/runtime artifact(s) must not ship:" -f $structural.Count) -ForegroundColor Red
  $structural | Sort-Object File | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
  Write-Host 'Remove these from the package (they belong only on the local machine), then re-run.' -ForegroundColor Red
  exit 1
}

if ($hits.Count -eq 0) {
  Write-Host 'RESULT: CLEAN - no personal identifiers found. Safe to share.' -ForegroundColor Green
  exit 0
} else {
  Write-Host ("RESULT: FAILED - {0} personal-data match(es) found:" -f $hits.Count) -ForegroundColor Red
  $hits | Sort-Object File, Line | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
  Write-Host 'Scrub these before sharing, then re-run this script.' -ForegroundColor Red
  exit 1
}