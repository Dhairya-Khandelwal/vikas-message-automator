@echo off
TITLE Vikas Message Automator - Local Server
COLOR 0A
setlocal

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - LOCAL ENGINE START
echo                 Vikas Automobiles, Satna, M.P.
echo                 Contact: 9827003016
echo ===============================================================================
echo.

if not exist "node_modules" (
    echo [ERROR] Dependencies not installed. Please run install.bat first.
    pause
    exit /b 1
)

if not exist "data" mkdir data
if not exist "data\sessions" mkdir data\sessions
if not exist "backups" mkdir backups

echo Starting local Express server and WhatsApp pacing engine...
echo Default URL: http://127.0.0.1:3000
echo.
echo NOTE: Keep this terminal window open while using the application so that
echo local background message queues and auto-replies continue running.
echo Press Ctrl+C to stop the server (or use stop.bat from another window).
echo.

:: Open browser after a short delay so server can start
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:3000"

call npm run start
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with an error. Check the messages above.
    pause
)
