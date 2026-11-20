@echo off
chcp 65001 >nul
:: Бояд ҳамчун Administrator иҷро шавад (Right click -> Run as administrator)
net session >nul 2>&1
if errorlevel 1 (
  echo [XATO] Ин файлро бо "Run as administrator" иҷро кунед.
  pause
  exit /b 1
)

set PORT=4000
netsh advfirewall firewall delete rule name="Offline Exam System" >nul 2>&1
netsh advfirewall firewall add rule name="Offline Exam System" dir=in action=allow protocol=TCP localport=%PORT% profile=any
echo.
echo Қоидаи Firewall барои порти %PORT% илова шуд.
echo Агар дар backend\.env портро тағйир дода бошед, PORT-ро дар ин файл ҳам иваз кунед.
pause
