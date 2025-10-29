#!/bin/bash

echo "========================================"
echo "Domain Tracker - macOS Build Script"
echo "========================================"
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

# macOS용 빌드 실행
echo "[3/4] Building for macOS..."
echo "This may take several minutes..."
echo ""
npm run build:mac
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}ERROR: Build failed${NC}"
    exit 1
fi
echo ""

# 빌드 결과 확인
echo "[4/4] Build completed!"
echo ""
echo "Build artifacts location:"
if [ -d "dist" ]; then
    ls -lh dist/*.dmg 2>/dev/null && echo -e "${GREEN}DMG files created successfully${NC}"
    ls -lh dist/*.zip 2>/dev/null && echo -e "${GREEN}ZIP files created successfully${NC}"
    echo ""
    echo "Built files:"
    ls -1 dist/ | grep -E '\.(dmg|zip)$' | sed 's/^/  - /'
else
    echo -e "${YELLOW}WARNING: dist folder not found${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}Build process completed successfully!${NC}"
echo "========================================"
echo ""