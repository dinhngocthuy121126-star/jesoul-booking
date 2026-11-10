@echo off

start "JESOUL Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

start "JESOUL Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"