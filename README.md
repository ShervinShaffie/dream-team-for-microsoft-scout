# The Dream Team for Microsoft Scout

Your own team of eight AI digital employees, running locally on Microsoft Scout.

Version 4.2.1. See [CHANGELOG.md](CHANGELOG.md) for the full history.

The Dream Team is a local command center plus a team of digital employees that run on [Microsoft Scout](https://learn.microsoft.com/en-us/microsoft-scout/). They watch your work signals, prep your meetings, draft your replies, keep a record of what you got done, and hold anything sensitive for your approval. It all runs on your own machine. Start with the built-in eight, add your own, or remove any of them except Major.

Windows only. The app and the install run on Windows 10 and 11. They will not run on macOS or Linux. There is more in the Platform support section below.

Private by design. Everything runs on 127.0.0.1 and stores to a local database on your own machine.

Not an official Microsoft product. This is a personal project, shared as is for personal and demo use. It is not built, endorsed, or supported by Microsoft, and it is not meant for production. See the Disclaimer and license section below.

## What you get without signing in

The Dream Team works for anyone on Microsoft Scout who is signed into their own Microsoft 365. The whole eight-person team is there: inbox triage and replies, meeting prep and follow-ups, research, scheduling, document and deck creation, dashboards, the approval inbox, the trust levels, and the always-on automations. All of it runs on the two skills in this package plus the skills already built into Scout, so nothing important sits behind a corporate login.

If you happen to be a Microsoft employee, signing in during setup adds some extra depth, mostly for Dash (richer reporting) and Drew (branded templates and image generation). That depth is fetched into your own Scout during setup. It is never part of this package.

You can add your own employees or remove any of them except Major, so the roster is yours to shape.

## What you need

- Windows 10 or 11. See the Platform support section below.
- [Microsoft Scout](https://learn.microsoft.com/en-us/microsoft-scout/), the desktop assistant this team runs inside. **Microsoft employees:** get Scout from **https://aka.ms/clawpilot** (the internal source for Microsoft). Everyone else: use the public Microsoft Scout link above.
- Python 3.9 or newer. This is the only thing the app itself needs, and it is plain Python with no extra packages. If you do not have it, Scout can install it for you during setup, or you can get it from <https://www.python.org/downloads/> and tick "Add Python to PATH".
- Scout allowed to run shell and file commands. The install lets Scout set everything up for you, so it needs permission to run commands and to read and write files. Scout asks for this, and you approve it when prompted.
- A Microsoft 365 sign-in inside Scout. This is recommended so the team can see your own email, calendar, and Teams. A personal or a work account both work for the core experience.

## Install it

The easy way is to let Scout do the whole thing in one go. Open Microsoft Scout, start a chat, and if you can, set that chat's model to Claude Opus 4.8, which runs setup most reliably. Then paste this:

> Install The Dream Team from https://github.com/ShervinShaffie/dream-team-for-microsoft-scout. First, if this chat is not already on Claude Opus 4.8, tell me so I can switch to it before you continue, since it runs setup most reliably. Then read INSTALL-WITH-SCOUT.md in that repo and follow it exactly, including the stop conditions.

From there, Scout does everything in that same chat: it downloads the latest release, sets up the app, installs your team, switches on the background automations, and runs your first sweep so the dashboard fills with your real email, calendar, Teams, and meeting prep. It fixes common problems on its own, like missing Python or a busy port, and if it hits something it cannot solve, it stops and tells you plainly instead of looping.

You do not need to quit Scout, reopen it, or type any commands. When Scout says it is done, your team is live, your dashboard is open and showing your real day, and a **The Dream Team** shortcut is on your desktop so you can reopen the dashboard anytime. That first sweep takes about 5 to 10 minutes, and the board fills in as it goes, so a fresh dashboard is never left blank.

## The wizard adapts to you

The wizard checks whether you are signed in with a Microsoft account and adjusts on its own, so you do not have to sort yourself into a category.

- Signed in with Microsoft: it installs the core team, lets you pick a model, and offers to add the optional depth skills into your own Scout. Anything it cannot reach is skipped with a note, so you always finish with a working team.
- Not signed in with Microsoft: it installs the complete core team, running on the skills in this package plus the ones built into Scout. No corporate sign-in is needed, and you still get the full team.

You can override the choice with one click.

## Pick your model

The wizard lets you choose the model your team runs on. The default is Claude Opus 4.8, which is what the team is tuned for, but you can pick any model your Scout offers, or choose Auto. If Opus 4.8 is not available on your machine, the wizard recommends the best alternative for you.

## Your team

| Employee | Role |
|---|---|
| Major | Chief of Staff. You talk to Major, and Major routes the rest. |
| Riley | Inbox. Triage and draft replies. |
| Mina | Meetings. Prep, notes, and follow-ups. |
| Reese | Research. Cited answers and account context. |
| Tilly | Scheduling. Availability and RSVP risk. |
| Dash | Dashboard. Status, approvals, and metrics. |
| Drew | Content. Docs, decks, and briefs. |
| Logan | Web and publishing. Sites and artifacts. |

Every employee works on the two skills in this package plus Scout's built-ins. You can add your own employees from the cockpit, where the "Add Employee" button walks you through onboarding one of your existing Scout workflows. You can also remove any employee except Major, and their history is kept so you can bring them back later. Employees you add stay on your machine and are never included if you re-share the package.

## Managing the app

- Start the app or open the dashboard: `app\start-app.ps1`, in your install folder.
- Stop the app: `app\stop-app.ps1`.
- Reconfigure, pick a different model, or recreate the automations: just ask Scout to run the Dream Team setup again. It is safe to run more than once. (If you have restarted Scout since installing, you can also type `/daily-flow-setup`.)

## If Scout can't install it

Almost everyone can stop at the Install it section above. This is the manual path for the rare case where Scout cannot run the install for you, for example on a machine where it is not allowed to run commands. It ends the same way as the easy path: Scout finishes setup in a chat, with no restart needed.

1. Open the [Releases](../../releases) page and download the latest `dream-team-for-microsoft-scout-v*.zip`.
2. Right-click the downloaded file, choose Extract All, and pick a folder. Extract it first. Do not run anything from inside the zip preview window.
3. Open a PowerShell window in the extracted folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Auto
```

4. Open Microsoft Scout and paste this so it finishes setup in the chat, the same way the easy path does:

> Finish setting up The Dream Team. Read and follow the daily-flow-setup skill: confirm my sign-in, let me pick my model, switch on the four background automations, and run my first sweep so my dashboard fills with my real data.

Scout finishes right there in the chat, and your dashboard fills within about 5 to 10 minutes. You do not need to restart Scout or type a slash command. (If Scout says it cannot find the skill, fully close and reopen it once so it loads, then paste the same message again.)

## Platform support

This package runs on Windows 10 and 11 only. It does not run on macOS or Linux. The app itself is plain Python and the skills are plain Markdown, so the idea is portable, but the installer and the setup checks are written for Windows as PowerShell files, and there is no macOS or Linux version in this package today.

## Privacy

The app binds to 127.0.0.1 and stores everything in a local SQLite database on your machine. Nothing is sent anywhere outside your machine. The team prepares drafts. It does not send email, Teams messages, or calendar responses to other people without your approval in the dashboard.

If you add a career profile, meaning your job description and how your performance is measured, on the Impact Ledger, that is kept especially private. It lives only in your local database and is never included when you re-share the package. A copy you give to someone else starts blank.

## Disclaimer and license

This is a personal, community project, and it is not an official Microsoft product. It is not built, endorsed, supported, or maintained by Microsoft. Names like Microsoft Scout and Microsoft 365 are used only to describe the platform this tool runs on. Any views or work here are the author's own and do not represent Microsoft.

It is provided as is, for personal and demo use, and it is not meant for production. The Dream Team is shared free of charge with no warranty of any kind. It can read and act on your own Microsoft 365 data. It drafts, and with your approval it can send email and Teams messages and respond to calendar invites, so you use it at your own risk. Always review what it prepares before you rely on it. To the maximum extent allowed by law, the author is not liable for any outcome, data loss, missed or mistaken message, or other damage that comes from using it.

Licensed under the [MIT License](LICENSE).

Built by Shervin Shaffie. Shared for other Microsoft Scout users.
