# 빌드 가이드

Domain Tracker 애플리케이션을 각 플랫폼별로 빌드하는 방법을 안내합니다.

## 📋 사전 요구사항

- **Node.js** 18.x 이상
- **npm** 9.x 이상
- 충분한 디스크 공간 (최소 500MB)

### 플랫폼별 추가 요구사항

#### Windows
- Windows 7 이상
- Visual Studio Build Tools (자동 설치됨)

#### macOS
- macOS 10.13 이상
- Xcode Command Line Tools
```bash
xcode-select --install
```

#### Linux
- Ubuntu/Debian 기반: `build-essential`, `rpm`
```bash
sudo apt-get install -y build-essential rpm
```
- Fedora/RHEL 기반: `gcc-c++`, `make`, `rpm-build`
```bash
sudo dnf install gcc-c++ make rpm-build
```

## 🚀 빌드 방법

### 1️⃣ Windows용 빌드

#### 방법 A: 빌드 스크립트 사용 (권장)
```cmd
build-win.bat
```

#### 방법 B: npm 명령어 사용
```cmd
npm run build:win
```

**출력 파일:**
- `dist/Domain Tracker Setup x.x.x.exe` - 설치 프로그램
- `dist/Domain Tracker x.x.x.exe` - 포터블 버전

---

### 2️⃣ macOS용 빌드

**⚠️ 참고:** macOS 앱은 반드시 macOS 환경에서 빌드해야 합니다.

#### 방법 A: 빌드 스크립트 사용 (권장)
```bash
chmod +x build-mac.sh
./build-mac.sh
```

#### 방법 B: npm 명령어 사용
```bash
npm run build:mac
```

**출력 파일:**
- `dist/Domain Tracker-x.x.x.dmg` - DMG 이미지 (Intel)
- `dist/Domain Tracker-x.x.x-arm64.dmg` - DMG 이미지 (Apple Silicon)
- `dist/Domain Tracker-x.x.x-mac.zip` - ZIP 아카이브 (Intel)
- `dist/Domain Tracker-x.x.x-arm64-mac.zip` - ZIP 아카이브 (Apple Silicon)

---

### 3️⃣ Linux용 빌드

#### 방법 A: 빌드 스크립트 사용 (권장)
```bash
chmod +x build-linux.sh
./build-linux.sh
```

#### 방법 B: npm 명령어 사용
```bash
npm run build:linux
```

**출력 파일:**
- `dist/Domain Tracker-x.x.x.AppImage` - AppImage (모든 배포판)
- `dist/domain-tracker_x.x.x_amd64.deb` - Debian/Ubuntu 패키지

**AppImage 실행 방법:**
```bash
chmod +x "dist/Domain Tracker-x.x.x.AppImage"
./dist/Domain\ Tracker-x.x.x.AppImage
```

---

### 4️⃣ 모든 플랫폼 동시 빌드

**⚠️ 주의:** Mac 앱 빌드는 macOS 환경에서만 가능합니다.

#### Windows에서 실행:
```cmd
build-all.bat
```

#### macOS/Linux에서 실행:
```bash
chmod +x build-all.sh
./build-all.sh
```

#### npm 명령어:
```bash
npm run build:all
```

---

## 📦 빌드 산출물

모든 빌드 파일은 `dist/` 디렉토리에 생성됩니다.

### 파일 크기 예상치
- Windows 설치 프로그램: ~150-200 MB
- macOS DMG: ~150-200 MB
- Linux AppImage: ~150-200 MB

### 빌드 시간 예상치
- 단일 플랫폼: 3-5분
- 모든 플랫폼: 10-15분

---

## 🔧 고급 설정

### 빌드 설정 커스터마이징

`package.json`의 `build` 섹션에서 설정을 변경할 수 있습니다:

```json
{
  "build": {
    "appId": "com.domaintracker.app",
    "productName": "Domain Tracker",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    }
  }
}
```

### 아이콘 설정

각 플랫폼별 아이콘 파일을 `build/` 디렉토리에 배치:

- **Windows:** `build/icon.ico` (256x256 이상)
- **macOS:** `build/icon.icns` (512x512 이상)
- **Linux:** `build/icon.png` (512x512 이상)

---

## 🐛 문제 해결

### Windows

**문제:** "Visual C++ Redistributable이 필요합니다"
```cmd
npm install --global windows-build-tools
```

**문제:** "ENOENT: no such file or directory"
```cmd
rmdir /s /q node_modules
rmdir /s /q dist
npm install
```

### macOS

**문제:** "Code signing failed"
- 임시 해결: `package.json`에 추가
```json
{
  "build": {
    "mac": {
      "identity": null
    }
  }
}
```

**문제:** "xcrun: error: invalid active developer path"
```bash
xcode-select --install
```

### Linux

**문제:** "Cannot find module 'electron'"
```bash
rm -rf node_modules
npm install
```

**문제:** AppImage 실행 시 권한 오류
```bash
chmod +x dist/*.AppImage
```

---

## 📝 빌드 전 체크리스트

- [ ] Node.js와 npm이 최신 버전인지 확인
- [ ] `package.json`의 버전 번호 업데이트
- [ ] 이전 빌드 결과 삭제 (`dist/` 폴더)
- [ ] 의존성 최신화 (`npm update`)
- [ ] 애플리케이션이 정상 작동하는지 테스트 (`npm start`)
- [ ] 충분한 디스크 공간 확보

---

## 🎯 빌드 후 테스트

각 플랫폼별로 빌드된 애플리케이션을 테스트하세요:

1. 설치/실행이 정상적으로 되는지 확인
2. 트래킹 시작/중지 기능 테스트
3. 도메인 수집이 정상적으로 되는지 확인
4. 내보내기 기능 테스트
5. UI가 정상적으로 렌더링되는지 확인

---

## 📚 추가 자료

- [Electron Builder 공식 문서](https://www.electron.build/)
- [Electron 공식 문서](https://www.electronjs.org/docs)
- [Playwright 공식 문서](https://playwright.dev/)

---

## ⚖️ 라이센스

MIT License - 자세한 내용은 LICENSE 파일 참조