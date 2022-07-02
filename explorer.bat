@echo off
cls
color 13
cd /D "%~dp0"
node explorer.js --json "%~1"
pause