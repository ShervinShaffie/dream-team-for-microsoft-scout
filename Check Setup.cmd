@echo off
title The Dream Team - Setup Check
echo.
echo   Checking that your machine is ready to run the Dream Team.
echo.

rem If preflight.ps1 is not next to this file, you almost certainly started this
rem from inside the downloaded zip without extracting it first.
if not exist "%~dp0preflight.ps1" goto notextracted

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preflight.ps1"
echo.
pause
exit /b 0

:notextracted
echo.
echo   It looks like you started this from inside the zip.
echo.
echo   Please extract the zip first:
echo     1. Close this window.
echo     2. Find the downloaded zip file, right-click it, and choose "Extract All".
echo     3. Open the extracted folder and double-click Check Setup.cmd again.
echo.
pause
exit /b 1

