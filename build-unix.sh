#!/bin/bash

# =========================================
# Domain Tracker - Unix Build Script
# (macOS & Linux)
# =========================================

set -e  # Exit on error

echo ""
echo "===================================="
echo "  Domain Tracker Build (Unix)"
echo "===================================="
echo ""

# Detect OS
OS_TYPE="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    echo "Detected: macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    echo "Detected: Linux"
else
    echo "Detected: $OSTYPE"
fi
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "[1/4] Checking Node.js version..."
node --version
npm --version
echo ""

echo "[2/4] Installing dependencies..."
npm install
echo ""

echo "[3/4] Building application..."
echo ""

if [ "$OS_TYPE" == "macos" ]; then
    echo "Choose build type:"
    echo "  1. DMG (Recommended)"
    echo "  2. Universal (Intel + ARM64)"
    echo "  3. Intel only (x64)"
    echo "  4. ARM64 only (Apple Silicon)"
    echo ""
    read -p "Enter your choice (1-4): " choice

    case $choice in
        1)
            echo "Building DMG..."
            npm run build:mac -- dmg
            ;;
        2)
            echo "Building Universal DMG..."
            npm run build:mac
            ;;
        3)
            echo "Building Intel DMG..."
            npm run build:mac:intel
            ;;
        4)
            echo "Building ARM64 DMG..."
            npm run build:mac:arm
            ;;
        *)
            echo "Invalid choice. Building Universal DMG by default..."
            npm run build:mac
            ;;
    esac

elif [ "$OS_TYPE" == "linux" ]; then
    echo "Choose build type:"
    echo "  1. AppImage (Single file, recommended)"
    echo "  2. DEB package"
    echo "  3. Both (AppImage + DEB)"
    echo ""
    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            echo "Building AppImage..."
            npm run build:linux -- AppImage
            ;;
        2)
            echo "Building DEB package..."
            npm run build:linux -- deb
            ;;
        3)
            echo "Building all Linux formats..."
            npm run build:linux
            ;;
        *)
            echo "Invalid choice. Building AppImage by default..."
            npm run build:linux -- AppImage
            ;;
    esac
else
    echo "[ERROR] Unsupported OS: $OSTYPE"
    exit 1
fi

echo ""
echo "[4/4] Build completed successfully!"
echo ""
echo "Output directory: dist/"
echo ""

# List built files
if [ -d "dist" ]; then
    echo "Built files:"
    ls -lh dist/ | grep -E '\.(dmg|AppImage|deb|pkg)$' || echo "No distribution files found"
    echo ""
fi

echo "===================================="
echo "  Build Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo "  1. Find your executable in the 'dist' folder"
echo "  2. Test the application"
echo "  3. Distribute to users"
echo ""

if [ "$OS_TYPE" == "linux" ]; then
    echo "Note: AppImage files need execute permission:"
    echo "  chmod +x dist/*.AppImage"
    echo ""
fi
