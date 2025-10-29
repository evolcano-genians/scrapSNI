# Domain Tracker - Build Guide

멀티 OS 배포용 빌드 가이드입니다.

## 빠른 시작

### Windows
```cmd
build-windows.bat
```

### macOS/Linux  
```bash
chmod +x build-unix.sh
./build-unix.sh
```

## 빌드 명령어

### Windows
```cmd
npm run build:win              # NSIS + Portable + ZIP
npm run build:win:portable     # Portable 실행파일만
```

### macOS
```bash
npm run build:mac             # Universal (Intel + ARM64)
npm run build:mac:intel       # Intel only
npm run build:mac:arm         # Apple Silicon only
```

### Linux
```bash
npm run build:linux           # AppImage + DEB
```

### 모든 플랫폼
```bash
npm run build:all
```

## 출력 파일

모든 빌드 파일은 `dist/` 디렉토리에 생성됩니다:

- **Windows**: NSIS 인스톨러, Portable EXE, ZIP
- **macOS**: DMG, ZIP
- **Linux**: AppImage, DEB

## 요구사항

- Node.js 18.x 이상
- npm 9.x 이상
- Electron Builder (자동 설치됨)

자세한 내용은 위의 스크립트를 참조하세요.
