@echo off
chcp 65001 >nul
cd /d "%~dp0..\backend"
node server.js
pause
