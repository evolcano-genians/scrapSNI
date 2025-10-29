@echo off
echo ========================================
echo Domain Tracker - Multi-Platform Build
echo ========================================
echo.
echo Building for Windows, macOS, and Linux
echo WARNING: This requires macOS to build Mac packages
echo.

REM 의존성 확인
echo [1/4] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)
echo.

REM 이전 빌드 결과 정리
echo [2/4] Cleaning previous build...
if exist "dist\" (
    echo Removing old dist folder...
    rmdir /s /q "dist"
)
echo.

REM 모든 플랫폼 빌드 실행
echo [3/4] Building for all platforms...
echo This may take 10-15 minutes...
echo.
call npm run build:all
if errorlevel 1 (
    echo.
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo.

REM 빌드 결과 확인
echo [4/4] Build completed!
echo.
echo Build artifacts:
dir /b "dist\" 2>nul
if errorlevel 1 (
    echo WARNING: No files found in dist folder
) else (
    echo.
    echo Successfully built packages for multiple platforms
    echo Check the dist folder for all build artifacts
)
echo.

echo ========================================
echo Build process completed!
echo ========================================
echo.
pause