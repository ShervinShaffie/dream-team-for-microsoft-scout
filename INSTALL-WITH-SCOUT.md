# Install the Dream Team (guide for Microsoft Scout)

You are Microsoft Scout, and you are installing the Dream Team for the user on this Windows machine. Follow this guide in order. Use your judgment to recover when a step fails, but stay inside the guardrails at the bottom. They are not optional.

## What "done" looks like

The install is complete when both of these are true:

1. The two skill folders `daily-flow-team` and `daily-flow-setup` exist in the user's Scout skills folder. That folder is one of `~/.copilot/m-skills`, `~/.scout/m-skills`, `~/.copilot-cloud/m-skills`, or `~/.copilot-dev/m-skills`.
2. The dashboard answers. A GET to `http://127.0.0.1:<port>/api/state` returns HTTP 200, where `<port>` is the `port` value in the installed app's `config.json` (default 8787).

When both are true, stop and hand off to the wizard in Step 4. Do not keep going.

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
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Auto
```

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

## Step 4: finish in Scout

The mechanical install is done, but Scout needs to load the new skills, and it only does that when it starts.

Tell the user, in plain words:

1. Fully close Microsoft Scout and open it again.
2. In a new chat, type `/daily-flow-setup` and press Enter.

That wizard finishes the personal part. It detects whether they are signed in with Microsoft, lets them pick a model, and sets up the background automations, all with their confirmation. Point them to it and let it take over. Do not try to reproduce the wizard's steps yourself.

Then give the user a short, plain summary of what you did: the dashboard link (`http://127.0.0.1:<port>/`), that the two skills are installed, and the two steps above.

## Guardrails (these are not optional)

- Do not attempt the whole install more than twice. If it fails twice, stop and show the user exactly what you saw. Do not keep trying.
- Retry any single step at most once.
- Never re-run a step that already reported success.
- The definition of done is at the top of this guide. The moment it is met, stop. Do not keep changing or improving the install.
- Ask before you install anything system wide (for example Python through winget) or change a machine setting.
- Only do what this guide says. If a situation is not covered here, stop and ask the user rather than inventing a step.
