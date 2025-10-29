# Domain Tracker

Electron과 Playwright를 사용한 웹 도메인 트래킹 애플리케이션

## 기능

- 🌐 실시간 웹 브라우징 도메인 트래킹
- 📊 방문한 모든 고유 도메인 수집
- 💾 도메인 목록 텍스트 파일로 내보내기
- 🔍 도메인 검색 기능
- ⏱️ 트래킹 시간 측정

## 설치 방법

```bash
# 의존성 설치
npm install
```

## 실행 방법

```bash
# 애플리케이션 실행
npm start

# 개발 모드로 실행 (DevTools 열림)
npm run dev

# 테스트 실행
npm test
```

## 사용법

1. **트래킹 시작**: "트래킹 시작" 버튼을 클릭하면 새로운 Chromium 브라우저가 열립니다
2. **브라우징**: 열린 브라우저에서 자유롭게 웹사이트를 방문합니다
3. **실시간 모니터링**: 방문한 도메인이 실시간으로 목록에 표시됩니다
4. **트래킹 중지**: "트래킹 중지" 버튼을 클릭하면 브라우저가 닫히고 수집이 완료됩니다
5. **내보내기**: "내보내기" 버튼으로 도메인 목록을 텍스트 파일로 저장할 수 있습니다

## 프로젝트 구조

```
scrapSNI/
├── package.json        # 프로젝트 설정 및 의존성
├── src/
│   ├── main.js        # Electron 메인 프로세스
│   ├── playwrightController.js  # Playwright 브라우저 제어
│   ├── preload.js     # IPC 통신 브릿지
│   ├── renderer.js    # 렌더러 프로세스 (UI 로직)
│   └── index.html     # 애플리케이션 UI
└── test.js            # 테스트 스크립트
```

## 기술 스택

- **Electron**: 크로스 플랫폼 데스크톱 애플리케이션 프레임워크
- **Playwright**: 브라우저 자동화 라이브러리
- **JavaScript**: 프로그래밍 언어
- **HTML/CSS**: 사용자 인터페이스

## 주요 기능 설명

### 도메인 수집
- 모든 HTTP/HTTPS 요청에서 도메인 추출
- 중복 제거 및 정렬
- localhost와 IP 주소 제외

### 실시간 업데이트
- 2초마다 자동으로 도메인 목록 갱신
- 트래킹 상태 및 경과 시간 표시

### 보안
- Context Isolation 활성화
- Preload 스크립트를 통한 안전한 IPC 통신
- Node.js Integration 비활성화

## 빌드

각 플랫폼별 실행 파일을 생성할 수 있습니다.

### 간편 빌드 (빌드 스크립트 사용)

#### Windows
```cmd
build-win.bat
```

#### macOS
```bash
chmod +x build-mac.sh
./build-mac.sh
```

#### Linux
```bash
chmod +x build-linux.sh
./build-linux.sh
```

#### 모든 플랫폼
```bash
# Windows에서
build-all.bat

# macOS/Linux에서
chmod +x build-all.sh
./build-all.sh
```

### npm 명령어로 빌드

```bash
# 현재 플랫폼용 빌드
npm run build

# Windows용 빌드
npm run build:win

# macOS용 빌드 (macOS에서만 가능)
npm run build:mac

# Linux용 빌드
npm run build:linux

# 모든 플랫폼 빌드
npm run build:all
```

### 빌드 결과

빌드된 파일은 `dist/` 폴더에 생성됩니다:

- **Windows**: `.exe` 설치 프로그램 및 포터블 버전
- **macOS**: `.dmg` 이미지 및 `.zip` 아카이브
- **Linux**: `.AppImage` 및 `.deb` 패키지

자세한 빌드 가이드는 [BUILD.md](BUILD.md)를 참조하세요.

## 프로젝트 파일 구조

```
scrapSNI/
├── package.json              # 프로젝트 설정 및 의존성
├── README.md                 # 프로젝트 소개
├── BUILD.md                  # 빌드 가이드
├── .gitignore               # Git 제외 파일 목록
├── build-win.bat            # Windows 빌드 스크립트
├── build-mac.sh             # macOS 빌드 스크립트
├── build-linux.sh           # Linux 빌드 스크립트
├── build-all.bat/sh         # 전체 플랫폼 빌드 스크립트
├── build/                   # 빌드 리소스 (아이콘 등)
│   └── README.md
├── src/
│   ├── main.js              # Electron 메인 프로세스
│   ├── playwrightController.js  # Playwright 브라우저 제어
│   ├── preload.js           # IPC 통신 브릿지
│   ├── renderer.js          # 렌더러 프로세스 (UI 로직)
│   └── index.html           # 애플리케이션 UI
├── test.js                  # 테스트 스크립트
└── dist/                    # 빌드 산출물 (생성됨)
```

## 라이센스

MIT