@echo off
TITLE Vikas Message Automator - Local Database Backup
COLOR 0E
setlocal EnableDelayedExpansion

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - LOCAL BACKUP UTILITY
echo                 Vikas Automobiles, Satna, M.P.
echo ===============================================================================
echo.
set "BACKUP_DIR=backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Prefer PowerShell for reliable timestamp on modern Windows
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set TIMESTAMP=%%I
if not defined TIMESTAMP (
    set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set TIMESTAMP=!TIMESTAMP: =0!
)

set BACKUP_FILE=%BACKUP_DIR%\vikas_automator_db_%TIMESTAMP%.json
set SQLITE_BACKUP=%BACKUP_DIR%\vikas_counters_%TIMESTAMP%.sqlite

if exist "data\database.json" (
    copy "data\database.json" "%BACKUP_FILE%" >nul
    echo [SUCCESS] JSON database snapshot: %BACKUP_FILE%
) else (
    echo [NOTICE] data\database.json not found. Run start.bat first to initialize data.
)

if exist "data\counters.sqlite" (
    copy "data\counters.sqlite" "%SQLITE_BACKUP%" >nul
    echo [SUCCESS] SQLite counters snapshot: %SQLITE_BACKUP%
)

if exist "data\session.secret" (
    echo [INFO] Session secret exists (not backed up for security).
)

echo.
echo Tip: Keep backups on external media. Restore by copying the JSON file back
echo      to data\database.json while the server is stopped.
echo.
pause
