@echo off
chcp 65001 >nul
cd /d "%~dp0.."
start "Exam Backend" cmd /k "cd backend && node server.js"
start "Exam Frontend" cmd /k "cd frontend && npm run dev"
