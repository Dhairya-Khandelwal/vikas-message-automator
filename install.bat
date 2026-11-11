@echo off
TITLE Vikas Message Automator - Local Installer
COLOR 0B
setlocal EnableDelayedExpansion

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR v1.2.1 - WINDOWS INSTALLER
echo   Automotive & Industrial WhatsApp Automation Suite for Vikas Automobiles
echo                 HP Lube Distributor & C&F Agent, Satna (M.P.)
echo ===============================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js 20 LTS or higher from https://nodejs.org/
    echo Once installed, reopen this script.
    pause
    exit /b 1
)

echo [1/5] Verifying Node.js environment...
for /f "tokens=1 delims=v" %%i in ('node -v') do set NODEVER=%%i
echo        Node.js version: 
node -v
call npm -v
echo.

:: Warn if Node is below 20
node -e "const v=process.versions.node.split('.')[0]; if(+v<20){console.log('[WARN] Node.js 20+ is strongly recommended. Current: '+process.versions.node); process.exit(0);}"

echo [2/5] Installing dependencies locally (zero cost, zero subscriptions)...
echo        Using --legacy-peer-deps for maximum compatibility...
call npm install --legacy-peer-deps --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] First attempt failed. Retrying with force...
    call npm install --legacy-peer-deps --force --no-audit --no-fund
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install packages. Please check internet connection and Node version.
        pause
        exit /b 1
    )
)
echo.

echo [3/5] Initializing local data directories...
if not exist "data" mkdir data
if not exist "data\sessions" mkdir data\sessions
if not exist "data\baileys_auth_info" mkdir data\baileys_auth_info
if not exist "backups" mkdir backups
echo.

echo [4/5] Creating default .env from template if missing...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo        Created .env from .env.example
    )
)
echo.

echo [5/5] Security reminder...
echo.
echo ===============================================================================
echo [SUCCESS] Vikas Message Automator installation completed successfully!
echo.
echo IMPORTANT SECURITY NOTES:
echo   - There are NO default passwords. On first open you must create the Owner account.
echo   - Application binds to 127.0.0.1 (localhost) by default for safety.
echo   - DEMO mode is the default and NEVER sends real WhatsApp messages.
echo   - Switch to LIVE only after Owner authorisation and a connected WhatsApp session.
echo   - Always obtain explicit consent before promotional messaging.
echo.
echo To launch the application:
echo   1. Double click 'start.bat'
echo   2. Open your web browser at http://127.0.0.1:3000
echo   3. Complete first-run Owner setup, then connect WhatsApp via QR
echo ===============================================================================
echo.
pause
