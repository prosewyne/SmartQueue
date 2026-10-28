@echo off
title Publish SmartQueue to GitHub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Publish-SmartQueue.ps1"
echo.
pause