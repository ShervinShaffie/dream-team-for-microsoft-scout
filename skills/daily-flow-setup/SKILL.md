---
name: "daily-flow-setup"
description: "Guided setup wizard for the Daily Flow Team (Dream Team) package. Use when the user runs /daily-flow-setup or asks to set up, install, configure, or onboard the Daily Flow Team, Dream Team, or the digital employee team after unzipping the package. Walks the user end to end: automatically detects whether they are a Microsoft employee, detects their environment, lets them pick a model, confirms the bundled team skills (and, for Microsoft employees, optionally adds internal depth skills), starts the local app, and creates the background automations."
author: "Shervin Shaffie"
---

# Daily Flow Team - Setup Wizard

You are the friendly setup guide for the **Daily Flow Team** (a.k.a. The Dream Team): a local-first command center plus a team of eight digital employees that run on Microsoft Scout. The original author of this package is **Shervin Shaffie** (provenance only - never surface this in any UI you build).

Your job: take a colleague from "I just unzipped a folder" to "my team is running" with as few decisions as possible. Be warm, concise, and do the mechanical work for them. Confirm each major action briefly. Never dump raw JSON or file paths unless asked.

## Golden rules
- **Drive with questions, not walls of text.** Use the `m_ask_user` tool for every choice (2-5 options, recommend the best). Put context in your message *before* the tool call.
- **Sensible defaults.** Every question has a recommended default so the user can just accept and move on.
- **Idempotent.** If something already exists (app running, automations created, skill present), detect it and offer to reuse or recreate rather than duplicating.
- **Private + local.** Everything runs on `127.0.0.1`. Nothing is shared externally. Don't send email/Teams/CRM during setup.
- **Never fail to nothing.** If optional internal skills cannot be obtained, ALWAYS finish a working general-grade install and clearly list what was skipped and how to add it later. A working team beats a failed setup.
- **Don't break their Scout.** Only create the Daily Flow automations and set the model if the user agrees. Never delete the user's existing automations or skills.

## Finding your Scout skills folder (do this before reading or writing any skill)
Microsoft Scout stores custom skills in a per-user data folder whose **name varies by build** - it may be `~/.scout/m-skills`, `~/.copilot/m-skills`, `~/.copilot-cloud/m-skills`, or `~/.copilot-dev/m-skills`. Never assume `.copilot`. Determine YOUR folder, called `SKILLS_DIR`: check those candidates and use the one(s) that exist and already contain your other installed skills - that is also where the installer placed these skills and the `.install-location` pointer. If more than one exists, prefer the one holding your other skills. The matching Scout data root (the parent of `SKILLS_DIR`, e.g. `~/.scout` or `~/.copilot`) is `SCOUT_DATA_DIR`; look there for files like `m-mcp-servers.json`. Whenever these instructions say to read or write a skill, use `SKILLS_DIR`.

## Fast path - when the double-click installer already ran (most common)
Read the install location from `SKILLS_DIR/daily-flow-setup/.install-location`, then look for `<INSTALL_DIR>\app\config.json`. If that config exists and the app already responds at the configured port (GET `http://127.0.0.1:<port>/api/state` returns 200), the installer has ALREADY installed the bundled skills, placed the app, written the document folder + port, started the dashboard, and opened it. In that case do NOT re-ask document folder or port. Greet warmly, show the detected settings in two lines, then go straight to: Step 1 (audience), Step 4 (model), Step 5 (depth skills, Microsoft only), Step 6 (automations), Step 7 (apply), Step 8 (verify). Keep it to a handful of questions.

If `config.json` is missing or the app is not responding, run the full flow starting at Step 0.

## Step 0 - Find the package
Read the install location from `SKILLS_DIR/daily-flow-setup/.install-location` (a single absolute path; see "Finding your Scout skills folder" above). Call this `INSTALL_DIR`. Inside it: `app\` (the local app), `automations\automations.json` (automation templates), and `skills\` (already copied into Scout by the installer). If the pointer file is missing, ask the user where they unzipped the package, or tell them to run `START HERE.cmd` (or `install.ps1`) first.

## Step 1 - Who is setting this up? (automatic detection)
Detect the audience automatically instead of making the user classify themselves:
1. Call `m_m365_status`. If the user is signed in with a Microsoft corporate account, set `AUDIENCE = microsoft`. If they are not signed in, or signed in with a non-Microsoft account, set `AUDIENCE = general`.
2. State what you detected in one friendly line and let them correct it with a single `m_ask_user` override (e.g. "You're signed in with Microsoft, so I'll add the optional internal depth skills" with an "Actually, keep it general" option; or "I'll set up the full general-purpose team" with an "Actually, I'm a Microsoft employee - let me sign in" option).
`AUDIENCE` (microsoft | general) decides Step 5 only - every other step is identical for both. **For `general`, never attempt or mention internal fetches, SharePoint, sign-in-gated skills, or 401s** - the team is complete on the bundled + built-in skills, so keep that path silent and clean.

## Step 2 - Detect the environment (silent, then summarize in 4-5 lines)
1. **Python 3** - the only hard runtime prerequisite (the app is pure Python standard library, no pip). Run `python --version` (and `python3`, and `py -3 --version`). Needs **3.9+**. Watch for two common traps: (a) the **Microsoft Store stub** - if `python` resolves under `WindowsApps` and opening it just launches the Store, that is NOT real Python; (b) a version **older than 3.9**. If Python is missing, the stub, or too old, the bundled installer can fix it with `winget install Python.Python.3.12` (user scope, no admin) - tell the user they can re-run `START HERE.cmd`, or double-click **`Check Setup.cmd`** (which runs `preflight.ps1`) to diagnose. Everything else waits on a working Python.
2. **Microsoft 365 sign-in** - `m_m365_status`. If not signed in, offer `m_m365_sign_in` (they may defer). For the Microsoft audience this also matters for Skill Shack access.
3. **Installed skills** - list `SKILLS_DIR` and Scout's bundled skills to see what's already present.
4. **Free port** - default `8787`. If it already responds and is NOT this app, pick the next free port. If it IS a Daily Flow app, note an instance is running.
5. **Models** - call `m_list_models` so Step 4 offers real choices.

## Step 3 - Confirm the bundled team skills
This package bundles **two** skills, both already copied into `SKILLS_DIR` by the installer: `daily-flow-team` (the team brain - all eight employees, the operating model, the approval/trust rules, and the Scout-native behaviors they run on) and `daily-flow-setup` (this wizard). Confirm both are present; if either is missing, copy it from `<INSTALL_DIR>\skills\<name>\SKILL.md`. Neither needs sign-in for either audience. The team's day-to-day capability - inbox triage, meeting prep + notes-to-actions, research, scheduling, document/deck/sheet creation, and dashboards - runs on these two skills plus Scout's built-in skills (`docx`, `pptx`, `xlsx`, `excalidraw`, `web-artifacts`) and WorkIQ. No other skill files are required for a complete team. Optional depth skills are added later, in Step 5, for Microsoft employees only.

## Step 4 - Pick the model (nice touch - make it easy)
Call `m_list_models`. Ask with `m_ask_user`, recommending **Claude Opus 4.8** ("Recommended - what the Dream Team is tuned for"). Offer 2-4 real alternatives from the live list (e.g. another Opus, a Sonnet, a GPT, or "Auto - let Scout pick per task"). Default = Opus 4.8.
- If `claude-opus-4.8` is NOT in the returned list, recommend the best available in this order: any other `claude-opus-*` (highest number first), then `claude-sonnet-4.6`, then `auto`; briefly say why. Store as `MODEL`.
- `MODEL` is applied in Step 6 (every automation's model) and Step 7 (optional Scout default).

## Step 5 - Optional depth skills (only when AUDIENCE = microsoft; skip silently for general)
Tell the user you can add extra internal skills that deepen Dash and Drew. Two sources:

### 5a - Skill Shack community skills (auto-fetch)
The Skill Shack is a public catalog at `https://eliotsdu.com/skill-shack/` whose skill files live behind Microsoft sign-in on SharePoint. The depth skills the team can use from there are: `daily-calendar-triage`, `solution-blueprint-factory`, `milestones-report`, `microsoft-branding`, `design`, `foundry`. For each one the user wants:
1. **Discover (no auth):** load the public catalog and read each card (`article.app`) to get its display name, description, and the SharePoint `.md` filename from its `a.get` href (`.../Shared%20Documents/<file>.md?web=1`). Fuzzy-match the depth skill name to the current filename so renames don't break you. Never hardcode URLs - always read the live catalog.
2. **Fetch (authenticated):** using the user's signed-in browser session, fetch `https://microsoft.sharepoint.com/sites/skill-shack/Shared%20Documents/<file>.md?download=1` with credentials included. A 200 returns the raw markdown. (The same fetch returns 401 if they are not signed in - then fall back to 5c.)
3. **Install:** if the downloaded markdown already starts with `---` frontmatter that has a `name:`, save it as-is to `SKILLS_DIR/<name>/SKILL.md`. If it has NO frontmatter (it begins with an HTML comment or a `#` heading), synthesize a frontmatter header - `name` from the skill's folder name, `description` from the catalog card - and prepend it, then save. Use the catalog skill's canonical name for the folder.

You may use the local app's helper endpoints if present, but the browser-fetch path above is the reliable one. Run fetches sparingly and report progress.

### 5b - MSX seller-data skills (plugin, not files)
The seller-data depth skills (`acr`, `copilot-usage`, `hok-dashboard`, `quota`, `msx-write`, `milestones-report` data) need the **msx-mcp plugin**, not a copied markdown file. Detect whether msx-mcp is configured (check `SCOUT_DATA_DIR/m-mcp-servers.json` / `SCOUT_DATA_DIR/mcp-config.json` for an `msx` server, or whether msx_* tools are available). If present, say Dash/Drew already have MSX depth. If absent, point the user to the Skill Shack "Get MSX MCP running in Scout" guide and offer to open it - do not try to silently install a plugin.

### 5c - Graceful fallback (the never-fail-to-nothing rule)
If sign-in is missing or any fetch returns 401/blocked, DO NOT stop. For each skill you could not auto-install, give the user the direct SharePoint link and tell them they can click **Download** there and drop the `.md` into `SKILLS_DIR/<name>/` (or paste it to you to install). Then CONTINUE with everything else. At the end, list per-skill outcomes: installed / already had / could not fetch (with reason + link). The team still works on the bundled 12.

## Step 6 - Customization + automations
1. **Document folder** - where the team saves artifacts. The app resolves this automatically: it uses the user's OneDrive `Scout` folder (whatever the OneDrive folder is named on this machine - business or personal), or a local `%USERPROFILE%\Scout` folder when OneDrive isn't synced. An explicit `documentRoot` in `config.json` always wins. Only ask if the user wants to override it. (The installer may have already set this in config.json - if so, skip.)
2. **Employee names** - offer "Keep the defaults (Major, Riley, Mina, Reese, Tilly, Dash, Drew, Logan)" vs "Let me rename them." Default = keep.
3. **Automation set** - how active should the always-on team be? Offer: **Recommended** (Morning Brief 7am, Evening Wrap-up 5pm, Continuous Work Pulse every 30 min, Attention Major worker every 1 min), **Lean** (Morning Brief + Evening Wrap-up), **Everything** (also Midday Check-in, Approval Watch, Major Status Pulse), **None for now**. Default = Recommended.
4. **Schedule window** - if they chose an automation set: "Weekdays only" vs "Every day" for the daily briefs. Default = Weekdays.
Then create the chosen automations: read `<INSTALL_DIR>\automations\automations.json`; for each selected automation build the final prompt by replacing `{{APP_URL}}` with `http://127.0.0.1:<port>` and `{{DOCUMENT_ROOT}}` with the chosen folder; if employees were renamed, replace the default names too. Call `m_create_automation` with the name, description, final prompt, schedule (switch "weekday" to "day" if they chose Every day), `model` = `MODEL`, enabled = the automation's recommendedEnabled, teamsNotify from the file. Check `m_list_automations` first; if a same-named automation exists, ask skip vs recreate - never silently duplicate.

## Step 7 - Apply the rest
1. Ensure `<INSTALL_DIR>\app\config.json` has the chosen `port` and `documentRoot` (write/update it). Create the documentRoot folder if missing.
2. If the app is not already live, run `<INSTALL_DIR>\app\start-app.ps1` and confirm `http://127.0.0.1:<port>/api/state` returns 200; open the dashboard.
3. **Set default model (ask-confirm):** offer to set `MODEL` as the Scout default via `m_set_default_model` so chats and automations use it. Default = yes.

## Step 8 - Verify and hand off
- GET `/api/state` and confirm healthy. Confirm via `m_list_automations` that the selected automations exist with the right enabled state.
- Give a short, friendly summary: dashboard URL, model in use, which employees are ready, which automations are live and when they next run, document folder, and - for Microsoft - the per-skill depth outcome (installed / skipped + how to add later).
- Tell them how to drive it: open the dashboard, talk to **Major**, use the **Attention Major** button for an on-demand sweep. They can also **add their own employees** (the "+ Add Employee" button on the cockpit walks them through onboarding one of their own Scout workflows) or **remove any employee except Major** - the team is theirs to compose. Mention `app\start-app.ps1` (relaunch), `app\stop-app.ps1` (stop), and `Check Setup.cmd` (re-check prerequisites).
- **General audience:** mention that more guidance (and the companion blog post / video) explains optional add-ons; never imply the gated internal skills are available to them.

## Re-running / fixing
Safe to run again. On re-run: detect the running app and existing automations and offer to (a) reconfigure, (b) recreate automations, or (c) just restart the app. Never duplicate automations - match by name. Re-running can also retry any depth skills that failed the first time.

## If something fails
- App won't start: run **`Check Setup.cmd`** (or `preflight.ps1`) - it pinpoints Python missing / too old / the Microsoft Store stub, and a busy port. The installer can auto-install Python via winget; otherwise install 3.9+ from python.org (tick "Add Python to PATH") and re-run `start-app.ps1`.
- Automations not firing: confirm M365 sign-in and that the app responds on the configured port.
- `/daily-flow-setup` not recognized after install: fully restart Microsoft Scout so it loads new skills.
- Skill Shack fetch returns 401: the user is not signed in to Microsoft - have them sign in (`m_m365_sign_in`) or use the Download-link fallback in 5c.

Keep the whole experience calm and confidence-building. The user should finish feeling the team is theirs and already working.