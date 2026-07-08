# Install the Dream Team (guide for Microsoft Scout)

You are Microsoft Scout, and you are installing the Dream Team for the user on this Windows machine. Follow this guide in order. Use your judgment to recover when a step fails, but stay inside the guardrails at the bottom. They are not optional.

## What "done" looks like

The whole job is complete when all of these are true:

1. The two skill folders `daily-flow-team` and `daily-flow-setup` exist in the user's Scout skills folder. That folder is one of `~/.copilot/m-skills`, `~/.scout/m-skills`, `~/.copilot-cloud/m-skills`, or `~/.copilot-dev/m-skills`.
2. The dashboard answers. A GET to `http://127.0.0.1:<port>/api/state` returns HTTP 200, where `<port>` is the `port` value in the installed app's `config.json` (default 8787).
3. Setup has been finished in this same chat (Step 4): the four background automations are installed and switched on, and the dashboard has been populated with the user's real data (or is showing the honest "all caught up" state after a first sweep).

Steps 1 and 2 are the mechanical install. Step 3 is setup, and you do it yourself in this same session, without a restart. When all three are true, stop.

## Before you start

- Confirm this is Windows 10 or 11. If it is macOS or Linux, stop and tell the user the Dream Team is Windows only today.
- If you can, run this install on Claude Opus 4.8. It follows these steps most reliably. If this chat is on a different model, ask the user to switch to Claude Opus 4.8 before you continue. If Opus 4.8 is not available on their machine, use the best model they have and carry on.
- Confirm this is the user's own machine and they want you to install software on it.
- You will need permission to run shell commands and to read and write files. If you do not have it, ask for it. If it is refused, stop and say you cannot install without it.

## Step 1: get the package

Work out which of these applies, in order:

1. If the user already has an extracted copy of the package (a folder that contains `install.ps1`, an `app` folder, a `skills` folder, and an `automations` folder), use that folder. Call it the package folder.
2. Otherwise, download the latest release. Releases are at `https://github.com/ShervinShaffie/dream-team-for-microsoft-scout/releases`. Get the latest release's zip asset (its name looks like `dream-team-for-microsoft-scout-v<version>.zip`), save it to a temporary folder, and extract it fully. The extracted folder is the package folder. Do not run anything from inside a zip preview window. Extract first.
3. If you cannot download the release and `git` is available, clone `https://github.com/ShervinShaffie/dream-team-for-microsoft-scout` and use the clone as the package folder.

Before continuing, verify the package folder contains `install.ps1`, `app\app.py`, `skills\daily-flow-team`, and `skills\daily-flow-setup`. If it does not, you have the wrong folder. Fix that first.

## Step 2: run the install and verify

From the package folder, run:

```
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Auto -AgentInline
```

Pass `-AgentInline` because you are going to finish setup yourself in this same chat (Step 4). It tells the installer not to show the user a "restart Scout and paste a command" message, since you are handling setup inline and talking to them here.

This copies the two skills into every Scout skills folder on the machine, places the app, writes a `config.json` with a free port and a document folder, starts the dashboard, and records where it installed.

Then run the two checks from "What done looks like":

1. Read the `port` from the installed app's `config.json`. If you cannot find it, use 8787.
2. GET `http://127.0.0.1:<port>/api/state`. A 200 means the app is up.
3. Confirm `daily-flow-team` and `daily-flow-setup` are present in a Scout skills folder.

If both checks pass, go to Step 4. If either fails, go to Step 3.

## Step 3: recover, then retry once

Read the actual error or output before you act. Match it to one of these, apply the fix, then retry the failed step one time.

- **Python is missing, too old, or is the Microsoft Store stub.** The installer tries winget first. If it could not, ask the user for permission, then run `winget install Python.Python.3.12`. After it installs, retry Step 2 once. If Python still is not available, stop and tell the user to install Python 3.9 or newer from https://www.python.org/downloads/ with "Add Python to PATH" ticked, then start again.
- **The port is busy.** Read the `port` from `config.json`, check what is on it, and if it is not the Dream Team, pick another free port, write it into `config.json`, and start the app again with `app\start-app.ps1`.
- **PowerShell execution policy blocks the script.** You already pass `-ExecutionPolicy Bypass`, which normally handles this. If a machine policy still blocks it, use the manual fallback below.
- **The app started but `/api/state` does not answer.** Read the app's output or console. It is almost always Python or the port. Fix the cause and start the app once more.
- **Scout does not list `/daily-flow-setup` yet.** This is expected, not a failure. Scout only loads skills when it launches. Step 4 handles it with a restart.

Manual fallback, only if `install.ps1` will not run at all:

1. Find the Scout skills folder (the first of `~/.copilot/m-skills`, `~/.scout/m-skills`, `~/.copilot-cloud/m-skills`, `~/.copilot-dev/m-skills` that exists and holds the user's other skills). Copy `skills\daily-flow-team` and `skills\daily-flow-setup` into it.
2. Copy the `app` and `automations` folders from the package to a stable install folder, for example `%USERPROFILE%\Dream Team`.
3. Make sure Python 3.9 or newer is available. Ask before installing it.
4. Start the app: `python "<install folder>\app\app.py"`.
5. Run the verify checks from Step 2.

## Step 4: finish setup in this same chat (no restart, no pasted command)

The mechanical install is done, but the team is not set up yet. Do NOT tell the user to quit Scout, reopen it, start a new chat, or type `/daily-flow-setup`. Scout only registers slash commands when it launches, so `/daily-flow-setup` is not available in this running session yet, but you do not need it. You are already Scout, with every tool the setup needs, and the setup wizard is just a set of instructions sitting in the package you just extracted. So finish setup yourself, right here, now:

1. Read the setup wizard from the package: `<package folder>\skills\daily-flow-setup\SKILL.md`.
2. Carry out its steps in this same chat. In order, that means: confirm the user's sign-in and audience, pick the model, install the four background automations and confirm all four are switched ON, then run the first sweep yourself so the dashboard fills with the user's real data, and wait until the board is populated before you finish. The wizard file gives you the exact steps and the API calls to make.
3. You are finished when the board shows real data (or the honest "all caught up" state after a first sweep) and the four automations are on. Then give the user a short, plain summary: the dashboard link, that their team is live, and where the desktop shortcut is.

Note: `install.ps1` prints a message telling the user to restart Scout and type `/daily-flow-setup`. That message is only for people who run the installer by hand with no agent driving it. You are continuing setup inline instead, so do NOT relay it or act on it. The only restart worth mentioning is optional and comes at the very end: restarting Scout later will register the `/daily-flow-setup` and `/daily-flow-team` slash commands for future use, but nothing about the install or the running team depends on it.

## Guardrails (these are not optional)

- Do not attempt the whole install more than twice. If it fails twice, stop and show the user exactly what you saw. Do not keep trying.
- Retry any single step at most once.
- Never re-run a step that already reported success.
- The definition of done is at the top of this guide. The moment it is met, stop. Do not keep changing or improving the install.
- Ask before you install anything system wide (for example Python through winget) or change a machine setting.
- Only do what this guide says. If a situation is not covered here, stop and ask the user rather than inventing a step.
