# Domain Tracker - TypeScript 리팩토링 가이드

## 개요

Domain Tracker 프로젝트를 TypeScript로 전환하고 모듈화하여 유지보수성을 대폭 향상시켰습니다.

## 변경 사항 요약

### 1. TypeScript 도입
- **타입 안정성**: 모든 함수와 변수에 명확한 타입 정의
- **자동 완성**: IDE에서 더 나은 개발 경험
- **컴파일 타임 에러 검출**: 런타임 전에 오류 발견

### 2. 모듈화
기존의 1900라인 단일 파일(`playwrightController.js`)을 다음과 같이 분리:

```
src/
├── types.ts                      # 모든 TypeScript 타입 정의
├── config/
│   └── config.ts                 # 설정 관리 (기존 하드코딩 제거)
├── utils/
│   ├── constants.ts              # 상수 정의 (CDN 패턴, 제한값 등)
│   └── domainUtils.ts            # 도메인/IP 유틸리티 함수
├── modules/
│   ├── DetectorModule.ts         # CDN/서드파티 서비스 감지
│   ├── DNSResolverModule.ts      # DNS 해석 (캐싱 포함)
│   ├── CrawlerModule.ts          # 웹 크롤링 로직
│   └── WorkflowExecutor.ts       # 워크플로우 실행
└── PlaywrightController.ts       # 통합 컨트롤러 (모듈 조합)
```

### 3. 개선 사항

#### 코드 품질
- ✅ 중복 코드 제거 (CDN 감지, 서드파티 감지 등)
- ✅ 단일 책임 원칙 적용
- ✅ Singleton 패턴으로 메모리 효율성 향상
- ✅ 한글 주석으로 가독성 향상

#### 성능 최적화
- ✅ DNS 캐싱 (5분 TTL)
- ✅ 배치 처리 최적화
- ✅ 설정 기반 제한값 (메모리 보호)

#### 유지보수성
- ✅ 설정 파일 중앙화 (`config.ts`)
- ✅ 상수 중앙화 (`constants.ts`)
- ✅ 명확한 인터페이스와 타입
- ✅ 에러 처리 표준화

## 설치 및 빌드

### TypeScript 의존성 설치

```bash
npm install
```

권한 오류 발생 시:
```bash
sudo npm install
# 또는
npm install --unsafe-perm
```

### 컴파일

```bash
# TypeScript를 JavaScript로 컴파일
npm run compile

# 컴파일 후 실행
npm start

# 개발 모드 (컴파일 후 DevTools 열림)
npm run dev

# 컴파일 Watch 모드 (파일 변경 시 자동 재컴파일)
npm run watch
```

### 빌드 (배포용)

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 주요 모듈 설명

### 1. types.ts - 타입 정의

모든 TypeScript 타입과 인터페이스를 정의합니다.

**주요 타입:**
- `DomainInfo`: 도메인 정보
- `AnalysisResult`: 분석 결과
- `WorkflowStep`: 워크플로우 단계
- `AppConfig`: 애플리케이션 설정

**사용 예:**
```typescript
import { DomainInfo, AnalysisResult } from './types';

function processDomain(domain: DomainInfo): void {
  console.log(domain.domain, domain.count);
}
```

### 2. config.ts - 설정 관리

애플리케이션의 모든 설정을 중앙에서 관리합니다.

**기능:**
- 설정 조회/업데이트
- 설정 검증
- JSON import/export

**사용 예:**
```typescript
import { getConfig, updateConfig } from './config/config';

// 현재 설정 조회
const config = getConfig();
console.log(config.crawler.maxLinksPerDepth); // 10

// 설정 업데이트
updateConfig({
  crawler: {
    maxLinksPerDepth: 20
  }
});
```

### 3. domainUtils.ts - 도메인 유틸리티

도메인과 IP 주소 처리 유틸리티 함수를 제공합니다.

**주요 함수:**
- `isIPAddress()`: IP 주소 확인
- `isValidDomain()`: 도메인 검증
- `extractDomain()`: URL에서 도메인 추출
- `isLocalAddress()`: 로컬 주소 확인
- `sortDomains()`: 도메인 정렬

**사용 예:**
```typescript
import { isIPAddress, extractDomain } from './utils/domainUtils';

isIPAddress('192.168.1.1'); // true
isIPAddress('example.com'); // false

extractDomain('https://www.example.com/path'); // 'www.example.com'
```

### 4. DetectorModule - CDN/서드파티 감지

CDN 서비스와 서드파티 서비스를 자동으로 감지합니다.

**기능:**
- CDN 감지 (Cloudflare, AWS CloudFront 등 14개 서비스)
- 서드파티 서비스 감지 (Google Analytics, Facebook 등 20개 이상)
- 배치 처리 지원

**사용 예:**
```typescript
import DetectorModule from './modules/DetectorModule';

// Singleton 인스턴스 자동 사용
const cdn = DetectorModule.detectCDN('cloudflare.com');
console.log(cdn); // 'Cloudflare'

const service = DetectorModule.detectThirdPartyService('google-analytics.com');
console.log(service); // 'Google Analytics'

// 배치 처리
const domains = ['cloudflare.com', 'facebook.com', 'example.com'];
const results = DetectorModule.detectCDNBatch(domains);
```

### 5. DNSResolverModule - DNS 해석

도메인을 IP 주소로 변환하며, 캐싱으로 성능을 최적화합니다.

**기능:**
- IPv4/IPv6 동시 해석
- 자동 캐싱 (기본 5분 TTL)
- 배치 처리 (기본 10개씩)
- 캐시 관리 (정리, 통계)

**사용 예:**
```typescript
import DNSResolverModule from './modules/DNSResolverModule';

// 단일 도메인 해석
const ips = await DNSResolverModule.resolve('example.com');
console.log(ips); // { ipv4: ['93.184.216.34'], ipv6: [...] }

// 배치 해석
const domains = ['example.com', 'google.com', 'github.com'];
const results = await DNSResolverModule.resolveBatch(domains);

// 캐시 관리
console.log(DNSResolverModule.getCacheSize()); // 캐시 항목 수
DNSResolverModule.clearCache(); // 캐시 비우기
```

### 6. CrawlerModule - 웹 크롤링

웹 페이지 탐색 및 링크 추출을 담당합니다.

**기능:**
- 링크 추출 (a 태그, data-href, onclick 등)
- 클릭 가능 요소 감지
- SPA (Single Page Application) 지원
- 로그아웃 버튼 회피
- 깊이 기반 크롤링

**(구현 예정 - 기존 코드 기반)**

### 7. WorkflowExecutor - 워크플로우 실행

다양한 자동화 단계를 실행합니다.

**지원 단계:**
- Navigate: 페이지 이동
- Login: 로그인 대기
- Crawl: 페이지 크롤링
- Wait: 지정 시간 대기
- Click/Fill: 요소 조작
- Auto-click/hover/scroll/fill: 자동 상호작용
- Intelligent: 지능형 탐색

**(구현 예정 - 기존 코드 기반)**

## 마이그레이션 가이드

### 기존 JavaScript 코드 사용

TypeScript로 변환되었지만, 컴파일된 JavaScript를 사용하므로 기존 방식대로 동작합니다.

```javascript
// 기존 방식 (여전히 작동)
const { app, BrowserWindow } = require('electron');

// TypeScript에서 컴파일된 모듈 사용
const PlaywrightController = require('./dist/PlaywrightController');
```

### 새로운 TypeScript 방식

TypeScript 파일에서는 import/export를 사용합니다.

```typescript
// 새로운 방식
import { app, BrowserWindow } from 'electron';
import PlaywrightController from './PlaywrightController';
```

## 설정 커스터마이징

### config.ts 수정

```typescript
// src/config/config.ts

const defaultConfig: AppConfig = {
  crawler: {
    maxLinksPerDepth: 20,        // 기본 10 → 20으로 변경
    clickTimeout: 5000,          // 기본 3000 → 5000으로 변경
    // ...
  },
  // ...
};
```

### 런타임 설정 변경

```typescript
import { updateConfig } from './config/config';

// 애플리케이션 실행 중 설정 변경
updateConfig({
  crawler: {
    maxLinksPerDepth: 15
  },
  dns: {
    batchSize: 20
  }
});
```

## 버그 수정

리팩토링 과정에서 다음 버그들을 수정했습니다:

### 1. 타이머 누수 (renderer.js)
**문제**: `startTimer()`가 여러 번 호출되면 이전 interval이 누수

**수정 전:**
```javascript
function startTimer() {
  timerInterval = setInterval(() => { ... }, 1000);
}
```

**수정 후:**
```typescript
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => { ... }, 1000);
}
```

### 2. 로그인 타임아웃 없음
**문제**: 로그인 대기 시 무한 대기 가능

**추가 사항:**
- `LOGIN_TIMEOUT` 상수 추가 (5분)
- Promise.race()로 타임아웃 처리

### 3. DNS 캐시 최적화
**개선**: 캐싱 시스템 추가로 반복 조회 성능 향상

## 디렉토리 구조

```
scrapSNI/
├── src/                           # TypeScript 소스 코드
│   ├── types.ts                   # 타입 정의
│   ├── config/
│   │   └── config.ts              # 설정 관리
│   ├── utils/
│   │   ├── constants.ts           # 상수
│   │   └── domainUtils.ts         # 유틸리티
│   ├── modules/
│   │   ├── DetectorModule.ts      # CDN/서비스 감지
│   │   ├── DNSResolverModule.ts   # DNS 해석
│   │   ├── CrawlerModule.ts       # 크롤링 (구현 예정)
│   │   └── WorkflowExecutor.ts    # 워크플로우 (구현 예정)
│   ├── PlaywrightController.ts    # 통합 컨트롤러 (구현 예정)
│   ├── main.ts                    # Electron 메인 프로세스 (구현 예정)
│   ├── preload.ts                 # IPC 브릿지 (구현 예정)
│   ├── renderer.ts                # UI 로직 (구현 예정)
│   └── index.html                 # UI (변경 없음)
├── dist/                          # 컴파일된 JavaScript (자동 생성)
├── tsconfig.json                  # TypeScript 설정
├── package.json                   # 업데이트됨 (TypeScript 스크립트 추가)
├── REFACTORING.md                 # 이 문서
└── CLAUDE.md                      # 프로젝트 문서 (기존)
```

## 다음 단계

리팩토링의 기초 작업이 완료되었습니다. 남은 작업:

### 1단계: 기본 모듈 (완료 ✅)
- [x] types.ts
- [x] constants.ts
- [x] config.ts
- [x] domainUtils.ts
- [x] DetectorModule.ts
- [x] DNSResolverModule.ts

### 2단계: 복잡한 모듈 (진행 중 🔄)
- [ ] CrawlerModule.ts (크롤링 로직)
- [ ] WorkflowExecutor.ts (워크플로우 실행)

### 3단계: 메인 파일 (대기 중 ⏳)
- [ ] PlaywrightController.ts (모듈 통합)
- [ ] main.ts (Electron 메인)
- [ ] preload.ts (IPC 브릿지)
- [ ] renderer.ts (UI 로직)

### 4단계: 테스트 및 문서화 (대기 중 ⏳)
- [ ] 단위 테스트 작성
- [ ] 통합 테스트
- [ ] API 문서 자동 생성 (TypeDoc)

## 사용 예제

### 기본 사용법

```typescript
// TypeScript 파일에서
import DetectorModule from './modules/DetectorModule';
import DNSResolverModule from './modules/DNSResolverModule';

async function analyzeDomain(domain: string) {
  // CDN 감지
  const cdn = DetectorModule.detectCDN(domain);
  console.log(`CDN: ${cdn || 'None'}`);

  // IP 해석
  const ips = await DNSResolverModule.resolve(domain);
  console.log(`IPv4: ${ips.ipv4.join(', ')}`);
  console.log(`IPv6: ${ips.ipv6.join(', ')}`);
}

analyzeDomain('example.com');
```

### 고급 사용법

```typescript
import { getConfig, updateConfig } from './config/config';
import DetectorModule from './modules/DetectorModule';

// 설정 커스터마이징
updateConfig({
  dns: { batchSize: 20 }
});

// 배치 처리
const domains = ['example.com', 'google.com', 'github.com'];
const cdnResults = DetectorModule.detectCDNBatch(domains);

cdnResults.forEach((cdn, domain) => {
  console.log(`${domain} uses ${cdn}`);
});
```

## 문제 해결

### TypeScript 컴파일 오류

```bash
# 캐시 정리
npm run compile -- --clean

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### 권한 오류 (macOS/Linux)

```bash
# npm 캐시 권한 수정
sudo chown -R $(whoami) ~/.npm
```

### 실행 오류

```bash
# dist 폴더 삭제 후 재컴파일
rm -rf dist
npm run compile
npm start
```

## 기여 가이드

### 새 모듈 추가

1. `src/modules/` 디렉토리에 파일 생성
2. 필요한 타입을 `types.ts`에 추가
3. `tsconfig.json`의 `include`에 경로 확인
4. 컴파일 및 테스트

### 코딩 스타일

- **주석**: 모든 함수에 한글 JSDoc 주석 작성
- **네이밍**: camelCase (변수/함수), PascalCase (클래스/인터페이스)
- **타입**: 명시적 타입 사용 (`any` 금지)
- **에러 처리**: try-catch로 모든 비동기 함수 보호

## 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [Electron TypeScript 가이드](https://www.electronjs.org/docs/latest/tutorial/typescript)
- [Playwright API](https://playwright.dev/docs/api/class-playwright)
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 상세 문서

## 라이선스

MIT License

---

**작성자**: Claude (Anthropic)
**날짜**: 2025-10-29
**버전**: 1.0.0
