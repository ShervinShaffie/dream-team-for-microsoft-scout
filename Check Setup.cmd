@echo off
title Daily Flow Team - Setup Check
echo.
echo   Checking that your machine is ready to run the Daily Flow Team...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preflight.ps1"
echo.
pause
