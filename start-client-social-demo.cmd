@echo off
setlocal

cd /d "%~dp0"

echo.
echo Lancement du serveur de demo FlashRV sur http://127.0.0.1:5173/demo/client-social
echo.

start "FlashRV Demo Server" cmd /k "cd /d %~dp0 && npm.cmd run dev -- --host 127.0.0.1 --port 5173"
timeout /t 5 /nobreak >nul
start "" http://127.0.0.1:5173/demo/client-social
