@echo off
REM =========================================
REM Domain Tracker - Windows Build Script
REM =========================================

echo.
echo ====================================
echo   Domain Tracker Build (Windows)
echo ====================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Checking Node.js version...
node --version
npm --version
echo.

echo [2/4] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [3/4] Building application...
echo Choose build type:
echo   1. NSIS Installer (Recommended)
echo   2. Portable Executable
echo   3. Both (NSIS + Portable + ZIP)
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Building NSIS Installer...
    call npm run build:win -- nsis
) else if "%choice%"=="2" (
    echo Building Portable Executable...
    call npm run build:win:portable
) else if "%choice%"=="3" (
    echo Building all Windows formats...
    call npm run build:win
) else (
    echo Invalid choice. Building NSIS Installer by default...
    call npm run build:win -- nsis
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo.

echo [4/4] Build completed successfully!
echo.
echo Output directory: dist\
echo.

REM List built files
if exist dist\ (
    echo Built files:
    dir /B dist\*.exe 2>nul
    dir /B dist\*.zip 2>nul
    echo.
)

echo ====================================
echo   Build Complete!
echo ====================================
echo.
echo Next steps:
echo   1. Find your executable in the 'dist' folder
echo   2. Test the application
echo   3. Distribute to users
echo.
pause
