# 🟦 The Dream Team for Microsoft Scout

> **Your own team of eight AI digital employees — running locally on Microsoft Scout.**

**Version 4.0.0** · see [CHANGELOG.md](CHANGELOG.md) for what's new.

The **Dream Team** is a local-first command center plus a **composable team of digital employees** that run on [Microsoft Scout](https://learn.microsoft.com/en-us/microsoft-scout/). They watch your work signals, prep your meetings, draft your replies, capture your body-of-work, and queue anything sensitive for your approval — all on your own machine. Start with the built-in eight, **add your own**, or **remove any but Major**.

> 🪟 **Windows only.** The installer and the local app run on **Windows 10/11**. The setup scripts (`START HERE.cmd`, `Check Setup.cmd`, the `.ps1` files) are Windows-specific and **will not run on macOS or Linux**. See [Platform support](#platform-support).

> 🔒 **Private by design.** Everything runs on `127.0.0.1` and stores to a local database on your machine. This package contains **none** of the author's — or anyone else's — personal data; a clean-room verifier enforces that on every build.

---

## What you get out of the box (no corporate sign-in needed)

The Dream Team is **fully functional for anyone** on Microsoft Scout signed into their own Microsoft 365. The whole eight-employee experience — triage, meeting prep, research, scheduling, content creation, dashboards, the approval inbox, trust levels, and the always-on automations — runs on the two skills in this package plus Scout's own built-in skills. Nothing is gated behind a corporate login for the core experience.

If you **are** a Microsoft employee, signing in during setup unlocks some optional extra depth (richer reporting and branded content). The table below shows the difference.

| | **Baseline — everyone** | **+ Microsoft sign-in** |
|---|---|---|
| The full eight-employee team | ✅ | ✅ |
| Inbox triage + draft replies (Riley) | ✅ | ✅ |
| Meeting prep + notes-to-actions (Mina) | ✅ | ✅ |
| Cited research (Reese) | ✅ | ✅ |
| Scheduling + conflict/RSVP risk (Tilly) | ✅ | ✅ |
| Docs, decks, sheets, diagrams (Drew) | ✅ built-in `docx`/`pptx`/`xlsx`/`excalidraw` | ✅ + branded templates & image generation |
| Dashboards, approvals, metrics (Dash) | ✅ | ✅ + deeper reporting |
| Activity log + impact ledger (Logan) | ✅ | ✅ |
| Approval inbox, trust levels, automations | ✅ | ✅ |
| Add / remove your own employees | ✅ | ✅ |
| Optional internal depth skills | — | ✅ added into *your* Scout at setup |

**Bottom line:** the public baseline is the real product, not a teaser. The Microsoft upgrade mostly deepens two employees (Dash and Drew); it never ships inside this package — it's fetched into the signed-in user's own machine.

---

## What you need

- **Windows 10 or 11** (see [Platform support](#platform-support))
- **[Microsoft Scout](https://learn.microsoft.com/en-us/microsoft-scout/)** — the desktop assistant this team runs inside
- **Python 3.9+** — the only thing the app itself needs (it's pure Python, no extra packages). If `python --version` fails or is older than 3.9, the installer can set it up for you with winget, or get it from <https://www.python.org/downloads/> (tick **"Add Python to PATH"**). Stuck? Double-click **`Check Setup.cmd`** for a one-shot diagnosis.
- **Microsoft 365 sign-in** in Scout — recommended, so the team can see your own email, calendar, and Teams context. (Sign in with whatever Microsoft 365 account you use; a personal/business account both work for the baseline.)

## Get the package

1. Go to the **[Releases](../../releases)** page of this repo and download the latest `dream-team-for-microsoft-scout-v*.zip`.
2. **Unzip** it anywhere (for example, your Downloads folder).

## Set up in 3 steps

1. **Unzip** the package (above).

2. **Double-click `START HERE.cmd`.**
   It installs the team, starts your dashboard (it opens in your browser), opens Microsoft Scout (only if it was closed), and copies the finishing command to your clipboard.
   *(If Windows shows a one-time "Do you want to run this?" prompt, choose Run / More info → Run anyway.)*

3. **Finish in Microsoft Scout.** When setup completes, a popup tells you exactly what to do:
   - If Scout was **closed**, the installer opens it for you with the new skills already loaded — click the chat box and press `Ctrl+V` then `Enter`.
   - If Scout was **already open**, **fully close it and reopen it first** (Scout loads skills only when it starts), then click the chat box and press `Ctrl+V` then `Enter`.

   The command is `/daily-flow-setup` (also shown on-screen so you can type it). The wizard asks a few friendly questions — including **which AI model** to use — then turns on your team.

> **Do I need to restart Scout?** Only if it was already running when you installed. Scout reads its skills at launch and doesn't watch for new ones while running, so a freshly added skill appears after a restart. If Scout was closed, the installer launches it fresh and no restart is needed.

## The wizard adapts to you — automatically

The wizard **detects** whether you're signed in with a Microsoft account and tailors itself; you don't have to classify yourself:

- **Signed in with Microsoft** → installs the core team, lets you pick a model, and offers to add **optional internal depth skills** into your own Scout using your sign-in. Anything it can't reach is simply skipped with a note — you always end with a working team.
- **Not signed in with Microsoft** → installs the complete core team and runs entirely on the skills in this package plus the ones built into Scout. No corporate sign-in required, no internal anything — just your full team.

You can always override the detection with one click.

## Pick your model

The wizard lets you choose the AI model your team runs on. The default is **Claude Opus 4.8** (what the Dream Team is tuned for); you can pick any model your Scout offers, or "Auto." If Opus 4.8 isn't available on your machine, the wizard recommends the best alternative automatically.

## Your team

| Employee | Role |
|---|---|
| **Major** | Chief of Staff — you talk to Major; Major routes the rest |
| **Riley** | Inbox — triage and draft replies |
| **Mina** | Meetings — prep, notes, follow-ups |
| **Reese** | Research — cited answers and account context |
| **Tilly** | Scheduling — availability and RSVP risk |
| **Dash** | Dashboard — status, approvals, metrics |
| **Drew** | Content — docs, decks, briefs |
| **Logan** | Web/Publish — sites and artifacts |

Every employee works on the two skills in this package plus Scout's built-ins. **Add your own employees** from the cockpit ("+ Add Employee" walks you through onboarding one of your existing Scout workflows), or **remove any employee except Major** — their history is preserved and you can restore them later. Employees you add stay on your machine and are never included if you re-share the package.

## Managing the app

- **Start / open dashboard:** `app\start-app.ps1` (in your install folder)
- **Stop the app:** `app\stop-app.ps1`
- **Reconfigure, re-pick a model, or re-create automations:** run `/daily-flow-setup` again in Scout (safe to re-run).

## Prefer to do it by hand?

Skip `START HERE.cmd` and run, from a PowerShell window in this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

then type `/daily-flow-setup` in Scout.

## Platform support

| | Supported? |
|---|---|
| **Windows 10 / 11** | ✅ Yes — the only supported platform |
| **macOS** | ❌ No — the installer and app scripts are Windows-only |
| **Linux** | ❌ No |

The app itself is pure Python and the skills are plain Markdown, so the *concept* is portable — but the bundled installer, launchers, and setup doctor are written for Windows (`.cmd` / PowerShell) and there is no macOS/Linux equivalent in this package today.

## Privacy

The app binds to `127.0.0.1` and stores everything in a local SQLite database on your machine. Nothing is sent externally. The team **drafts** — it never sends email, Teams messages, or calendar responses to other people without your explicit approval in the dashboard.

Any **career profile** you add (current/target job description and how your performance is measured, on the Impact Ledger) is especially private: it lives only in your local database, is never included when you re-share the package, and the build's clean-room verifier (`verify-clean.ps1`) fails if any private file or personal email address is ever staged. A copy you give to someone else starts blank.

---

Built by **Shervin Shaffie**. Shared for fellow Microsoft Scout users.
