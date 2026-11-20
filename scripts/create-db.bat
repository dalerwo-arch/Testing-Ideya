@echo off
chcp 65001 >nul
:: Базаи exam_system месозад (psql бояд дар PATH бошад, масалан C:\Program Files\PostgreSQL\16\bin).
:: Агар psql надошта бошед, базаро тавассути pgAdmin созед (Databases -> Create -> Database -> exam_system).
where psql >nul 2>nul
if errorlevel 1 (
  echo [XATO] psql ёфт нашуд. Базаро тавассути pgAdmin созед ё папкаи bin-и PostgreSQL-ро ба PATH илова кунед.
  pause
  exit /b 1
)
set /p PGUSER=Корбари PostgreSQL [postgres]: 
if "%PGUSER%"=="" set PGUSER=postgres
psql -U %PGUSER% -h localhost -c "CREATE DATABASE exam_system ENCODING 'UTF8';"
pause
