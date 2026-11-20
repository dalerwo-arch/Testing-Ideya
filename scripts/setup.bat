@echo off
chcp 65001 >nul
cd /d "%~dp0..\frontend"
where node >nul 2>nul
if errorlevel 1 (
  echo [XATO] Node.js ёфт нашуд. Аз https://nodejs.org насб кунед.
  pause
  exit /b 1
)
echo Насби бастаҳои Frontend ^(чанд дақиқа, интернет лозим^)...
call npm install
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 goto :fail
echo.
echo ==========================================
echo   Тайёр!  Оғоз: scripts\start.bat
echo   Брандмауэр ^(як маротиба^): scripts\firewall.bat ^(Run as administrator^)
echo ==========================================
pause
exit /b 0
:fail
echo.
echo [XATO] Насб қатъ шуд. Паёмҳои болоро хонед.
pause
exit /b 1
