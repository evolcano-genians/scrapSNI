# Domain Tracker - macOS 빌드 가이드

## 빠른 시작

### 1단계: npm 권한 문제 해결

npm 캐시에 권한 문제가 있는 경우, 터미널에서 다음 명령어를 실행하세요:

```bash
sudo chown -R $(whoami) ~/.npm
```

### 2단계: 의존성 설치

```bash
npm install
```

설치 중 경고가 나올 수 있지만 무시해도 됩니다:
- `inflight`, `glob`, `boolean` deprecated 경고 → 정상
- `electron-packager` deprecated → electron-builder 사용하므로 문제없음

### 3단계: macOS용 빌드

```bash
npm run build:mac
```

이 명령어는 다음을 생성합니다:
- **Intel Mac용**: `dist/Domain Tracker-darwin-x64/`
- **Apple Silicon용**: `dist/Domain Tracker-darwin-arm64/`
- **DMG 설치 파일**: `dist/Domain Tracker-1.0.0.dmg`
- **ZIP 파일**: `dist/Domain Tracker-1.0.0-mac.zip`

### 4단계: 실행

빌드가 완료되면 다음 중 하나로 실행:

```bash
# 빌드된 앱 직접 실행
open "dist/Domain Tracker-darwin-arm64/Domain Tracker.app"

# 또는 DMG 파일 열기
open "dist/Domain Tracker-1.0.0.dmg"
```

---

## TypeScript 사용 방법

### 기존 JavaScript로 빌드 (현재 방식)

현재 `package.json`은 기존 JavaScript 파일(`src/main.js`)을 사용하도록 설정되어 있습니다.

```bash
# 바로 빌드 가능
npm run build:mac
```

### TypeScript로 빌드

TypeScript 파일을 사용하려면:

#### 1. package.json 수정

```json
{
  "main": "dist/main.js",  // src/main.js → dist/main.js
  "scripts": {
    "start": "npm run compile && electron .",
    "build": "npm run compile && electron-builder",
    "build:mac": "npm run compile && electron-builder --mac --x64 --arm64"
  }
}
```

#### 2. TypeScript 컴파일 후 빌드

```bash
# TypeScript → JavaScript 컴파일
npm run compile

# 컴파일 후 빌드
npm run build:mac
```

---

## 플랫폼별 빌드

### macOS (현재)

```bash
# Intel + Apple Silicon (Universal)
npm run build:mac

# Intel만
npm run build:mac:intel

# Apple Silicon만
npm run build:mac:arm
```

### Windows

```bash
npm run build:win
```

출력: `dist/Domain Tracker-win32-x64/`

### Linux

```bash
npm run build:linux
```

출력:
- `dist/Domain Tracker-1.0.0.AppImage`
- `dist/domain-tracker_1.0.0_amd64.deb`

### 모든 플랫폼

```bash
npm run build:all
```

⚠️ 주의: 크로스 플랫폼 빌드는 각 OS에서 실행해야 제대로 작동합니다.

---

## 개발 모드

### 빌드 없이 실행

```bash
npm start
```

또는 개발자 도구 자동 열기:

```bash
npm run dev
```

### TypeScript Watch 모드

파일 변경 시 자동 재컴파일:

```bash
# 터미널 1: TypeScript watch
npm run watch

# 터미널 2: Electron 실행
npm start
```

---

## 문제 해결

### 1. npm 권한 오류

**증상:**
```
EACCES: permission denied, mkdir '/Users/xxx/.npm/_cacache/...'
```

**해결:**
```bash
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install
```

### 2. electron-builder not found

**증상:**
```
sh: electron-builder: command not found
```

**해결:**
```bash
npm install
```

### 3. TypeScript 컴파일 오류

**증상:**
```
error TS2307: Cannot find module './types'
```

**해결:**
```bash
rm -rf dist node_modules
npm install
npm run compile
```

### 4. Playwright 브라우저 없음

**증상:**
```
Error: Executable doesn't exist at ...
```

**해결:**
```bash
npx playwright install chromium
```

### 5. 빌드 파일이 생성되지 않음

**확인 사항:**
- `dist` 폴더 삭제 후 재시도
- `node_modules` 재설치
- 빌드 로그 확인

```bash
rm -rf dist
npm run build:mac 2>&1 | tee build.log
```

### 6. macOS에서 "App이 손상되었습니다" 오류

**해결:**
```bash
# Gatekeeper 우회 (개발용)
xattr -cr "dist/Domain Tracker-darwin-arm64/Domain Tracker.app"
```

**또는 시스템 설정:**
1. 시스템 설정 → 개인 정보 보호 및 보안
2. "보안" 섹션에서 "확인 없이 열기" 클릭

---

## 빌드 최적화

### 빌드 속도 향상

**캐시 사용:**
```bash
# 이전 빌드 유지 (빠름)
npm run build:mac

# 완전히 새로 빌드 (느림)
rm -rf dist
npm run build:mac
```

### 빌드 크기 줄이기

**불필요한 파일 제외:**

`package.json`의 `build.files`에서 제외:

```json
{
  "build": {
    "files": [
      "src/**/*",
      "!src/**/*.ts",      // TypeScript 원본 제외
      "!src/**/*.map",     // 소스맵 제외
      "package.json"
    ]
  }
}
```

---

## 배포 준비

### 1. 버전 업데이트

```bash
# package.json의 version 수정
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

### 2. 아이콘 추가

아이콘 파일 준비:
- macOS: `build/icon.icns` (512x512 PNG에서 변환)
- Windows: `build/icon.ico` (256x256)
- Linux: `build/icon.png` (512x512)

**PNG에서 ICNS 생성 (macOS):**
```bash
# icon.png (512x512) 준비
mkdir icon.iconset
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
iconutil -c icns icon.iconset -o build/icon.icns
```

### 3. 코드 사인 (선택사항)

**Apple Developer 계정 필요:**

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### 4. 최종 빌드

```bash
# 클린 빌드
rm -rf dist node_modules
npm install
npm run build:mac
```

### 5. 테스트

```bash
# 빌드된 앱 실행
open "dist/Domain Tracker-darwin-arm64/Domain Tracker.app"

# 기능 테스트
# - 수동 트래킹
# - 자동 분석
# - 워크플로우
```

---

## 빌드 산출물

### macOS 빌드 결과

```
dist/
├── Domain Tracker-darwin-x64/         # Intel Mac용
│   └── Domain Tracker.app
├── Domain Tracker-darwin-arm64/       # Apple Silicon용
│   └── Domain Tracker.app
├── Domain Tracker-1.0.0.dmg           # DMG 설치 파일
├── Domain Tracker-1.0.0-mac.zip       # ZIP 압축 파일
└── mac/                               # 빌드 중간 파일
```

### 파일 크기

- **앱 폴더**: 약 250-300MB (Playwright Chromium 포함)
- **DMG 파일**: 약 150-200MB (압축됨)
- **ZIP 파일**: 약 150-200MB

---

## TypeScript 프로젝트 구조

### 컴파일 전 (소스)

```
src/
├── types.ts                      # 타입 정의
├── config/config.ts              # 설정
├── utils/
│   ├── constants.ts              # 상수
│   └── domainUtils.ts            # 유틸리티
├── modules/
│   ├── DetectorModule.ts         # CDN 감지
│   └── DNSResolverModule.ts      # DNS 해석
├── main.ts                       # Electron 메인
├── preload.ts                    # IPC 브릿지
├── playwrightController.js       # 기존 컨트롤러 (JS)
├── renderer.js                   # UI 로직 (JS)
└── index.html                    # UI
```

### 컴파일 후 (배포)

```
dist/
├── types.js                      # 컴파일된 JS
├── types.d.ts                    # 타입 선언 파일
├── config/config.js
├── utils/
│   ├── constants.js
│   └── domainUtils.js
├── modules/
│   ├── DetectorModule.js
│   └── DNSResolverModule.js
├── main.js
└── preload.js
```

---

## 추가 정보

### 문서

- **REFACTORING.md**: TypeScript 리팩토링 가이드
- **CLAUDE.md**: 프로젝트 상세 문서
- **BUILD.md**: 일반 빌드 가이드

### 지원

문제가 발생하면:
1. 이 문서의 "문제 해결" 섹션 확인
2. GitHub Issues 검색
3. 빌드 로그 확인 (`build.log`)

### 라이선스

MIT License

---

**작성일**: 2025-10-29
**작성자**: Claude (Anthropic)
**버전**: 1.0.0
