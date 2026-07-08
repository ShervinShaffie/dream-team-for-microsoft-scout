# Changelog

This page lists what changed in each release of The Dream Team for Microsoft Scout, newest first.

## What the Dream Team does today

The Dream Team is a local command center with eight digital employees that run on Microsoft Scout. Here is what it does as of the latest release.

- It watches your email, Teams, and calendar for things that need you, and lines them up in one approval inbox.
- You approve an item and it carries out what you asked, whether that is a reply, a thumbs up, a forward, or a send. It only drafts when you ask it to.
- It preps your meetings, pulls notes into action items, and flags scheduling risk before it bites.
- It does research with real sources, and it writes documents, decks, and sheets for you.
- It keeps a running record of what you got done, framed for a performance review if you give it your goals.
- You set how far each employee can go on its own, from draft-only up to fully autonomous, and confidential content always waits for you.
- You can add your own employees, or remove any of them except Major.

Everything runs on your machine, and the team never sends anything to other people without your go-ahead.

## Releases

### 4.2.1

- Made install and setup one smooth flow in a single chat. Scout now installs the app and then finishes setup right there, so you no longer have to quit Scout, reopen it, and paste a command. When Scout says it is done, your team is on and your dashboard is already showing your real day.
- Fixed the empty-dashboard-after-setup problem at its root. Setup now runs your first sweep itself instead of handing it to a background timer that could not run yet, so the board actually fills before Scout finishes. It also switches the four automations on and double-checks they are on, since a paused automation does nothing.
- Made the restart optional and clearly labeled as such. The team is live without it. Restarting Scout later only registers the `/daily-flow-setup` and `/daily-flow-team` shortcuts for future use.
- Pointed Microsoft employees to the right place to get Scout. The prerequisites now note that Microsoft employees install Microsoft Scout from https://aka.ms/clawpilot, while everyone else uses the public link.

### 4.2.0

- Made the install steer itself onto the strongest model. The paste-in prompt and the Scout install guide now ask Scout to run setup on Claude Opus 4.8 when it is available, which is the model the team is tuned for and the one that follows the steps most reliably.
- Fixed setup declaring itself done over an empty dashboard. The wizard now kicks off the first sweep, waits for the board to actually fill, and only then hands off. It also tells you the truth about timing: a first sweep takes about 5 to 10 minutes, not seconds.
- Added a first-run banner on the dashboard so a new user is never staring at a blank board wondering what to do. It says the first sweep is running and the board fills as it goes, switches to a friendly all-caught-up note when there is genuinely nothing to show, and disappears once real items arrive.
- Made the Microsoft-only extras a clear choice instead of a buried afterthought. Signing in as a Microsoft employee now surfaces the depth skills for Dash and Drew, and the internal MSX seller-data plugin, as recommended next steps during setup, each with a guided, verified walkthrough rather than a one-line mention at the end.
- Added a "The Dream Team" shortcut to your desktop during install, so you can reopen the dashboard anytime with one click. It starts the app first if it is not already running, so it always lands on a live board.

### 4.1.0

- Made the background automations install the same for everyone. When Scout sets up the team, it now places each automation's instructions exactly as written and then reads them back to confirm they match, instead of retyping them from memory. Before this, two people could end up with slightly different wording. If one does not match, Scout redoes just that one, once, then tells you rather than looping.
- Slimmed the automation set to the four that run the team: the 7am Morning Brief, the 5pm Evening Wrap-up, the every-30-minute Work Pulse, and the every-minute Attention Major worker. Three extras that used to ship turned off have been removed to keep things simple and predictable. All four now install turned on.
- Fixed the empty dashboard on a fresh install. Right after setup the team does one pass across your email, Teams, calendar, and meeting prep, so the board shows your real day within about a minute instead of opening blank.
- Tightened the every-minute worker so it is plainly a worker only: most minutes it checks once and stops, it never starts its own sweeps, and it cleans up after itself so it does not clutter Scout.

### 4.0.4

- Tidied how release notes are kept. This changelog is now the single place that lists what changed in each version. Previously there was also a separate notes file per version cluttering the project, and those have been removed. The notes shown on each GitHub release are now taken straight from this file.

### 4.0.3

- Changed how you install. The easy way is now to open Microsoft Scout and ask it to install the Dream Team from GitHub. Scout downloads it, sets it up, checks that it worked, and fixes common problems like missing Python or a busy port on its own. If it cannot solve something, it stops and tells you plainly instead of looping.
- Added INSTALL-WITH-SCOUT.md, a short guide Scout follows to do the install, with clear stop conditions so it never gets stuck in a loop.
- Retired the double-click START HERE.cmd and Check Setup.cmd. Those were the most common source of setup trouble, because Windows would sometimes run them from inside the zip or block them. The install now runs through Scout, with a short manual fallback in the README for the rare case Scout cannot do it.
- Rewrote the README around the new flow.

### 4.0.2

- Fixed the most common setup problem. If you started setup from inside the downloaded zip without extracting it first, you used to get a confusing error about a missing install file. START HERE.cmd now notices this and tells you, in plain words, to extract the zip first and try again. Check Setup.cmd does the same.
- Wrote this full changelog so you can see how the project has grown over time, with a short summary of what it does today at the top.
- Cleaned up the README so it reads more plainly.

### 4.0.1

- Added an MIT license and a short disclaimer. The disclaimer makes clear this is a personal project, not an official Microsoft product, and provided as is. No change to how the app works.

### 4.0.0

- First public release on GitHub. This is the full eight-person team, packaged so anyone on Microsoft Scout can run it.
- It runs on two bundled skills plus the skills already built into Scout, so it works without a corporate sign-in.
- Setup figures out on its own whether you are signed in with Microsoft and adjusts. If you are a Microsoft employee, it offers some optional extra depth, fetched into your own Scout. That depth is never part of the package.
- Every employee has a plain-Scout way to do its job, so nothing breaks if an optional add-on is missing.
- The document folder now finds your OneDrive on any machine, and falls back to a local folder if OneDrive is not set up.

The releases below were shared as zip files before the project moved to GitHub. They are listed here for history.

### 3.3.9

- Setup now checks that Microsoft Scout is actually installed before it acts ready, instead of leaving you with a dashboard that loads but does nothing.
- Employees you add yourself now get picked up and put to work, and what they produce shows up in your results.
- The roster shows real status for each person, working, blocked, paused, or ready, instead of always saying ready.

### 3.3.8

- The capability map on the architecture page now shows real usage numbers for each skill, instead of dashes.

### 3.3.7

- Fixed the real cause behind "I approved it but nothing went out." The background workers that carry out approved actions were still holding an old draft-only rule. An approved reply now actually sends.

### 3.3.6

- Documents the team prepares for you now open correctly from the results list, including a clean reading view for notes and briefs. They used to fail with a not-found error.

### 3.3.5

- Un-muting an item brings it straight back to the approval inbox, and the muted list stays open when you expand it.

### 3.3.4

- When you tell the team what to do on an item, like reply, react with a thumbs up, or forward, it does that exact thing instead of turning everything into a generic draft. It only drafts when you ask.

### 3.3.3

- Approving an email or Teams message in the inbox now sends it. Approval is your go-ahead. The trust levels only govern work the team starts on its own.

### 3.3.2

- Added links on inbox cards to open the original message. Teams replies now actually reach Teams.

### 3.3.1

- Restored the approval buttons after a bug had quietly broken them, made the trust levels actually change behavior, and made the installer handle upgrades cleanly while keeping your data and any employees you added.

### 3.3.0

- You can build the team you want. Add your own employees through a guided onboarding, or remove anyone except Major and bring them back later.
- Setup got tougher about the one thing it really needs, Python, and can install it for you if it is missing or too old.

### 3.2.1

- A polish pass. The adoption view can be scoped by time, the cockpit sections collapse and stay that way, chat statuses tell the truth instead of getting stuck, and the wording reads in the first person.

### 3.2.0

- Added a private career profile. Paste your job description and how your performance is measured, and the team captures and frames your work against what your review actually rewards. It stays on your machine.

### 3.1.0

- Made the per-employee trust levels real. Draft, Assist, and Autonomous now actually control how far each person goes, with a firm rule that confidential content always waits for you.

### 3.0.1

- Theme polish for the then-new look.

### 3.0.0

- A big step up in trust and transparency. Each employee got a trust level and a clear set of what it will and will not do on its own. Added memory that stops re-surfacing things you already dismissed, a guardrails panel that shows the safety model in plain view, an adoption view, and the ability to spin up short-lived helpers for one-off batch work. Everything the team makes still goes to you only.

### 2.1.0

- Fixed skills installing to the wrong folder on some machines, which had stopped the setup command from being recognized. Started naming releases by version so you can tell builds apart.

### 2.0.0

- One download for everyone, with the setup wizard asking who you are and adapting. Added a model choice at setup, and optional extra depth for signed-in Microsoft employees.

### 1.0.0

- The first shareable build. It included the local dashboard, the team of digital employees, the background automations, the guided setup, a one-click installer, and a check that keeps personal data out of the package.
