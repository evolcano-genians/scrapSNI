#!/bin/bash

echo "========================================"
echo "Domain Tracker - Multi-Platform Build"
echo "========================================"
echo ""
echo "Building for Windows, macOS, and Linux"
echo "WARNING: This requires macOS to build Mac packages"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 의존성 확인
echo "[1/4] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Dependencies already installed${NC}"
fi
echo ""

# 이전 빌드 결과 정리
echo "[2/4] Cleaning previous build..."
if [ -d "dist" ]; then
    echo "Removing old dist folder..."
    rm -rf dist
fi
echo ""

# 모든 플랫폼 빌드 실행
echo "[3/4] Building for all platforms..."
echo "This may take 10-15 minutes..."
echo ""
npm run build:all
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}ERROR: Build failed${NC}"
    exit 1
fi
echo ""

# 빌드 결과 확인
echo "[4/4] Build completed!"
echo ""
echo "Build artifacts summary:"
if [ -d "dist" ]; then
    echo ""
    echo -e "${GREEN}Windows builds:${NC}"
    ls -lh dist/*.exe 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

    echo ""
    echo -e "${GREEN}macOS builds:${NC}"
    ls -lh dist/*.dmg 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    ls -lh dist/mac/*.zip 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

    echo ""
    echo -e "${GREEN}Linux builds:${NC}"
    ls -lh dist/*.AppImage 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    ls -lh dist/*.deb 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

    echo ""
    echo "Total files created:"
    ls -1 dist/ | wc -l | awk '{print "  " $1 " files"}'
else
    echo -e "${YELLOW}WARNING: dist folder not found${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}Multi-platform build completed!${NC}"
echo "========================================"
echo ""