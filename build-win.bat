@echo off
echo ========================================
echo Domain Tracker - Windows Build Script
echo ========================================
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

REM Windows용 빌드 실행
echo [3/4] Building for Windows...
echo This may take several minutes...
echo.
call npm run build:win
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
echo Build artifacts location:
dir /b "dist\*.exe" 2>nul
if errorlevel 1 (
    echo WARNING: No .exe files found in dist folder
) else (
    echo.
    echo Successfully built:
    for %%f in (dist\*.exe) do echo   - %%f
)
echo.

echo ========================================
echo Build process completed successfully!
echo ========================================
echo.
pause