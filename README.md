# The Dream Team for Microsoft Scout

Your own team of eight AI digital employees, running locally on Microsoft Scout.

Version 4.2.0. See [CHANGELOG.md](CHANGELOG.md) for the full history.

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
- [Microsoft Scout](https://learn.microsoft.com/en-us/microsoft-scout/), the desktop assistant this team runs inside.
- Python 3.9 or newer. This is the only thing the app itself needs, and it is plain Python with no extra packages. If you do not have it, Scout can install it for you during setup, or you can get it from <https://www.python.org/downloads/> and tick "Add Python to PATH".
- Scout allowed to run shell and file commands. The install lets Scout set everything up for you, so it needs permission to run commands and to read and write files. Scout asks for this, and you approve it when prompted.
- A Microsoft 365 sign-in inside Scout. This is recommended so the team can see your own email, calendar, and Teams. A personal or a work account both work for the core experience.

## Install it

The easy way is to let Scout do it. Open Microsoft Scout, start a new chat, and if you can, set that chat's model to Claude Opus 4.8, which runs the setup most reliably. Then paste this:

> Install The Dream Team from https://github.com/ShervinShaffie/dream-team-for-microsoft-scout. First, if this chat is not already on Claude Opus 4.8, tell me so I can switch to it before you continue, since it runs the setup most reliably. Then read INSTALL-WITH-SCOUT.md in that repo and follow it exactly, including the stop conditions.

Scout downloads the latest release, sets it up, checks that it actually worked, and fixes the common problems on its own, like missing Python or a busy port. If it hits something it cannot solve, it stops and tells you plainly instead of looping.

When Scout finishes, the team is copied into Scout, your dashboard is running, and a **The Dream Team** shortcut is placed on your desktop so you can reopen the dashboard anytime (it starts the app first if it is not already running). Two things are left for you:

1. Fully close Microsoft Scout and open it again, so it loads the new skills.
2. In a new chat, type `/daily-flow-setup` and press Enter.

That last step is a short wizard. It checks whether you are signed in with Microsoft, lets you pick which AI model to use, and turns on the background automations. Then your team is live.

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
- Reconfigure, pick a different model, or recreate the automations: run `/daily-flow-setup` again in Scout. It is safe to run more than once.

## If Scout can't install it

Almost everyone can stop at the Install it section above. This is the manual path for the rare case where Scout cannot run the install for you, for example on a machine where it is not allowed to run commands.

1. Open the [Releases](../../releases) page and download the latest `dream-team-for-microsoft-scout-v*.zip`.
2. Right-click the downloaded file, choose Extract All, and pick a folder. Extract it first. Do not run anything from inside the zip preview window.
3. Open a PowerShell window in the extracted folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Auto
```

4. Fully close and reopen Microsoft Scout, then type `/daily-flow-setup` in a new chat.

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
