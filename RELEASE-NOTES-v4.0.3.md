# What's new in 4.0.3

This release changes how you install the Dream Team, so more people get a clean setup.

- The easy way to install is now through Scout. Open Microsoft Scout and paste one line asking it to install the Dream Team from this repo. Scout downloads the latest release, sets it up, checks that it actually worked, and fixes the common problems on its own, like missing Python or a busy port. If it hits something it cannot solve, it stops and tells you plainly instead of looping.
- Added INSTALL-WITH-SCOUT.md, the guide Scout follows. It has clear stop conditions so the install can never get stuck in a loop.
- Retired the double-click START HERE.cmd and Check Setup.cmd. Those were behind most of the setup trouble people ran into, because Windows would sometimes run them from inside the zip or block them. The install runs through Scout now, and there is a short manual fallback in the README for the rare case Scout cannot do it for you.
- Rewrote the README around the new flow.

The app and the team are unchanged. This is about a smoother, more reliable install.

Windows only. Built by Shervin Shaffie.
