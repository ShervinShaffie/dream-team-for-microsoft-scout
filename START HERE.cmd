@echo off
title The Dream Team - Setup
echo.
echo   Setting up your Dream Team.
echo   A couple of windows will open. That is normal.
echo   When you see the "almost done" popup, follow its steps in Scout.
echo.

rem If install.ps1 is not next to this file, you almost certainly started this
rem from inside the downloaded zip without extracting it first.
if not exist "%~dp0install.ps1" goto notextracted

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Auto
echo.
echo   After you finish the one step in Scout, you can close this window.
pause
exit /b 0

:notextracted
echo.
echo   It looks like you started this from inside the zip.
echo.
echo   Please extract the zip first:
echo     1. Close this window.
echo     2. Find the downloaded zip file, right-click it, and choose "Extract All".
echo     3. Open the extracted folder and double-click START HERE.cmd again.
echo.
pause
exit /b 1
