@echo off
:: Change directory to the location of the Node.js script
cd /d "E:\APIs\REST\JavaScript\Groups And Users"

:: Ensure Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Run the Node.js script
node app.js

:: Check if the script ran successfully
if %errorlevel% neq 0 (
    echo The script encountered an error. Please check the log file.
    pause
    exit /b
)

:: Notify the user of successful execution
echo Script executed successfully. Check the CSV and log files for details.
pause
