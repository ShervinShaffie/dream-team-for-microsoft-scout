@echo off
title Daily Flow Team - Setup
echo.
echo   Setting up your Daily Flow Team...
echo   A couple of windows will open - that is normal.
echo   When you see the "almost done" popup, follow its 3 steps in Scout.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Auto
echo.
echo   After you finish the one step in Scout, you can close this window.
pause