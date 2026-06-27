# Changelog — The Dream Team for Microsoft Scout

All notable changes to the public edition are documented here. Versions follow the internal build line; this is the first **public** release.

## 4.0.1 — 2026-06-26

Licensing + disclaimer. **No app code or behavior changes** from v4.0.0.

### Added
- **MIT License** — the project is now formally licensed, with the standard "as is," no-warranty, no-liability terms.
- **Disclaimer** (README + repo): a personal, community project — **not an official Microsoft product**, not endorsed or supported by Microsoft — provided as-is for personal/demo use, **not production**, and used at your own risk since it acts on your own Microsoft 365 data with your approval.

## 4.0.0 — 2026-06-26 (first public release)

The first public, GitHub-distributed edition of the Dream Team — a clean-room repackage of the v4.0.0 app for **any** Microsoft Scout user on Windows.

### Added
- **Public, self-contained team.** Bundles two skills — `daily-flow-team` (the eight-employee brain, operating model, approval/trust rules, and Scout-native behaviors) and `daily-flow-setup` (the guided wizard). The full team experience runs on these plus Scout's built-in skills (`docx`, `pptx`, `xlsx`, `excalidraw`, `web-artifacts`) and WorkIQ — no corporate sign-in required.
- **Automatic audience detection.** The setup wizard now detects a Microsoft sign-in automatically instead of asking you to classify yourself, then tailors the install. Microsoft employees are offered optional internal depth skills; everyone else gets the complete baseline team with no internal references shown.
- **Scout-native fallbacks for every employee.** When an optional depth skill is absent, the responsible employee completes the same job with built-in Scout tools (e.g. Teams-ask harvesting, meeting notes-to-actions, propose-time scheduling, stuck-automation detection) — so the baseline is genuinely complete, not a stub.
- **Portable document folder.** The app now resolves your OneDrive `Scout` folder regardless of how OneDrive is named on your machine (business or personal), and falls back to a local `Scout` folder when OneDrive isn't synced. Works for any Microsoft 365 user.
- **Hardened clean-room verifier.** `verify-clean.ps1` now fails the build on **any** personal email address (the author's or anyone else's), in addition to the existing personal-identifier and private-file checks.
- **Windows-only support documented** clearly in the README, manifest, and release notes.

### Changed
- Genericized internal data-system references in the app and automations.
- Trimmed the bundled skill set to the author's own two skills; community-skill *behaviors* are folded into the team brain as native Scout-tool instructions rather than redistributing other authors' files.

### Notes
- **Platform:** Windows 10/11 only. The installer and launchers are Windows scripts; there is no macOS/Linux build in this package.
- **Privacy:** local-only; binds to `127.0.0.1`; contains no personal data; the team drafts and never sends on your behalf without dashboard approval.
