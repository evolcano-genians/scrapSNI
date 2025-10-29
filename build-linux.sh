#!/bin/bash

echo "========================================"
echo "Domain Tracker - Linux Build Script"
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

# Linux용 빌드 실행
echo "[3/4] Building for Linux..."
echo "This may take several minutes..."
echo ""
npm run build:linux
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
    ls -lh dist/*.AppImage 2>/dev/null && echo -e "${GREEN}AppImage files created successfully${NC}"
    ls -lh dist/*.deb 2>/dev/null && echo -e "${GREEN}DEB packages created successfully${NC}"
    echo ""
    echo "Built files:"
    ls -1 dist/ | grep -E '\.(AppImage|deb)$' | sed 's/^/  - /'
    echo ""
    echo -e "${YELLOW}Note: You may need to make the AppImage executable:${NC}"
    echo "  chmod +x dist/*.AppImage"
else
    echo -e "${YELLOW}WARNING: dist folder not found${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}Build process completed successfully!${NC}"
echo "========================================"
echo ""