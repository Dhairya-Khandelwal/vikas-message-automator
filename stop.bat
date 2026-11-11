@echo off
TITLE Vikas Message Automator - Shutdown
COLOR 0C

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - SHUTDOWN
echo ===============================================================================
echo.
echo Stopping Node processes listening on port 3000...

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>nul
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo No process found listening on port 3000.
) else (
    echo Server stopped successfully.
)
echo.
pause
