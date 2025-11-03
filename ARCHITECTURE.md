# Domain Tracker - Architecture Documentation

## 🏗️ Architecture Overview

Domain Tracker는 **NestJS 스타일 데코레이터 패턴**과 **SOLID 원칙**을 적용한 Electron 기반 네트워크 분석 도구입니다.

### 주요 특징

- ✅ **NestJS 스타일 데코레이터**: `@Injectable()`, `@Module()`, `@Inject()`
- ✅ **의존성 주입 (DI)**: ModuleContainer를 통한 자동 의존성 해결
- ✅ **SOLID 원칙**: 단일 책임, 의존성 역전, 개방-폐쇄 원칙 준수
- ✅ **Adapter 패턴**: Playwright 의존성 추상화
- ✅ **Module 시스템**: AppModule로 서비스 관계 정의
- ✅ **TypeScript**: 완전한 타입 안정성

---

## 📁 Project Structure

```
src/
├── decorators/                 # NestJS-style Decorators
│   ├── injectable.decorator.ts  # @Injectable() - 서비스 DI 등록
│   ├── module.decorator.ts      # @Module() - 모듈 정의
│   ├── inject.decorator.ts      # @Inject() - 명시적 의존성 주입
│   └── index.ts
│
├── modules/                    # Application Modules
│   └── app.module.ts            # @Module() - Root module
│
├── di/                         # Dependency Injection
│   └── ModuleContainer.ts       # NestJS-style DI container
│
├── interfaces/                 # Dependency Inversion
│   ├── IBrowserAutomation.ts    # Browser automation interface
│   ├── IDNSResolver.ts          # DNS resolution interface
│   ├── IDetector.ts             # CDN/Third-party detection interface
│   ├── IWorkflowStepExecutor.ts # Workflow step interface
│   └── IProgressObserver.ts     # Progress notification interface
│
├── adapters/                   # Adapter Pattern
│   └── PlaywrightAdapter.ts     # @Injectable() - Playwright wrapper
│
├── services/                   # Business Logic Services
│   ├── BrowserManager.ts        # @Injectable() - Browser lifecycle
│   ├── NetworkMonitor.ts        # @Injectable() - Network monitoring
│   ├── WebCrawler.ts            # @Injectable() - Web crawling
│   ├── PageInteractor.ts        # @Injectable() - Page interaction
│   ├── DNSResolver.ts           # @Injectable() - DNS resolution
│   ├── Detector.ts              # @Injectable() - CDN detection
│   ├── TrackingService.ts       # @Injectable() - Main tracking service
│   └── WorkflowService.ts       # @Injectable() - Workflow execution
│
├── config/
│   └── config.ts                # Application configuration
│
├── utils/
│   ├── constants.ts             # Constants
│   └── domainUtils.ts           # Utility functions
│
├── types.ts                    # TypeScript type definitions
├── main.ts                     # Electron main process (uses ModuleContainer)
├── preload.ts                  # IPC bridge
└── renderer.js                 # UI logic
```

---

## 🎯 Design Patterns

### 1. Dependency Injection (DI)

**NestJS 스타일 데코레이터 사용:**

```typescript
// Service 정의
@Injectable()
export class DNSResolver implements IDNSResolver {
  constructor(config: DNSConfig) {
    // ...
  }
}

// 명시적 의존성 주입
@Injectable()
export class TrackingService {
  constructor(
    @Inject('IBrowserAutomation') automation: IBrowserAutomation,
    @Inject('IDetector') detector: IDetector,
    @Inject('IDNSResolver') dnsResolver: IDNSResolver,
    config: AppConfig
  ) {
    // ...
  }
}
```

### 2. Module System

**AppModule로 서비스 관계 정의:**

```typescript
@Module({
  providers: [
    PlaywrightAdapter,
    DNSResolver,
    Detector,
    BrowserManager,
    NetworkMonitor,
    WebCrawler,
    PageInteractor,
    TrackingService,
    WorkflowService
  ],
  exports: [
    TrackingService,
    WorkflowService
  ]
})
export class AppModule {}
```

### 3. Adapter Pattern

**Playwright 의존성 추상화:**

```typescript
// Interface
export interface IBrowserAutomation {
  launch(options: BrowserLaunchOptions): Promise<Browser>;
  newContext(browser: Browser, options?: BrowserContextOptions): Promise<BrowserContext>;
  newPage(context: BrowserContext): Promise<Page>;
  close(browser: Browser): Promise<void>;
}

// Adapter
@Injectable()
export class PlaywrightAdapter implements IBrowserAutomation {
  async launch(options: BrowserLaunchOptions): Promise<Browser> {
    return await chromium.launch(options);
  }
  // ...
}
```

### 4. Single Responsibility Principle (SRP)

**각 서비스는 하나의 책임만:**

- `BrowserManager` → 브라우저 라이프사이클 관리
- `NetworkMonitor` → 네트워크 요청 모니터링
- `WebCrawler` → 웹 페이지 크롤링
- `PageInteractor` → 페이지 상호작용 (클릭, 스크롤, 호버)
- `DNSResolver` → DNS 해석
- `Detector` → CDN/서드파티 감지
- `TrackingService` → 상위 레벨 서비스 통합

---

## 🔄 Dependency Flow

```
main.ts
  ↓
ModuleContainer
  ↓ (loads)
AppModule (@Module)
  ↓ (provides)
TrackingService (@Injectable)
  ↓ (injects)
├─ IBrowserAutomation (@Inject) → PlaywrightAdapter
├─ IDetector (@Inject) → Detector
├─ IDNSResolver (@Inject) → DNSResolver
└─ AppConfig

TrackingService creates:
├─ BrowserManager (with IBrowserAutomation)
├─ NetworkMonitor (with IDetector, IDNSResolver)
├─ WebCrawler
└─ PageInteractor
```

---

## 🚀 How It Works

### 1. Application Bootstrap

```typescript
// main.ts
import 'reflect-metadata';  // Required for decorators

class DomainTracker {
  constructor() {
    // 1. Create Module Container
    this.container = new ModuleContainer();

    // 2. Load AppModule
    this.container.loadModule(AppModule);

    // 3. Resolve services (automatic DI)
    this.trackingService = this.container.resolve<TrackingService>('TrackingService');
    this.workflowService = this.container.resolve<WorkflowService>('WorkflowService');
  }
}
```

### 2. Automatic Dependency Resolution

ModuleContainer가 자동으로:
1. `@Injectable()` 데코레이터를 스캔
2. 생성자 파라미터 타입 정보 읽기 (reflect-metadata)
3. `@Inject()` 데코레이터에서 토큰 추출
4. 의존성 재귀적으로 해결
5. 싱글톤 인스턴스 생성 및 캐싱

### 3. Service Usage

```typescript
// Tracking 시작
await trackingService.startTracking();

// URL 분석
const result = await trackingService.analyzeUrl('https://example.com', {
  crawlDepth: 2,
  sameDomainOnly: true
});

// Tracking 중지
const { domains, ips } = await trackingService.stopTracking();
```

---

## 🧪 Testing

### Unit Testing

데코레이터 패턴으로 Mock 주입이 쉬움:

```typescript
// Mock 서비스 생성
const mockBrowser: IBrowserAutomation = {
  launch: jest.fn(),
  newContext: jest.fn(),
  newPage: jest.fn(),
  close: jest.fn()
};

// Mock을 주입한 서비스 테스트
const service = new TrackingService(
  mockBrowser,
  mockDetector,
  mockDNSResolver,
  testConfig
);
```

---

## 📊 Benefits

### 1. **가독성 (Readability)**
- 데코레이터로 서비스 역할이 명확
- 의존성이 명시적으로 표시됨
- 모듈 구조가 한눈에 파악 가능

### 2. **유지보수성 (Maintainability)**
- 서비스 추가/제거가 AppModule에서 간단
- 작은 파일들로 나뉘어져 코드 찾기 쉬움
- 명확한 책임 분리

### 3. **테스트 용이성 (Testability)**
- Mock 주입이 쉬움
- 각 서비스를 독립적으로 테스트 가능
- DI를 통한 의존성 교체 용이

### 4. **확장성 (Scalability)**
- 새 서비스 추가가 간단
- 인터페이스 기반으로 구현 교체 가능
- 모듈 시스템으로 대규모 애플리케이션 지원

### 5. **범용성 (Portability)**
- NestJS 개발자들에게 익숙한 패턴
- 다른 TypeScript 프로젝트로 이식 용이
- 표준 데코레이터 패턴 사용

---

## 🔮 Future Improvements

### Workflow Service Enhancement
현재 WorkflowService는 스텁 구현입니다. 향후 개선 계획:

```typescript
// Strategy Pattern for workflow steps
interface IWorkflowStepExecutor {
  execute(step: WorkflowStep): Promise<void>;
}

@Injectable()
class NavigateExecutor implements IWorkflowStepExecutor {
  async execute(step: WorkflowStep): Promise<void> {
    // Navigate implementation
  }
}

@Injectable()
class LoginExecutor implements IWorkflowStepExecutor {
  async execute(step: WorkflowStep): Promise<void> {
    // Login implementation
  }
}

// Factory Pattern for step creation
@Injectable()
class WorkflowStepFactory {
  create(type: WorkflowStepType): IWorkflowStepExecutor {
    // Factory logic
  }
}
```

---

## 📚 References

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [Reflect Metadata](https://github.com/rbuckton/reflect-metadata)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)

---

## 👥 Contributors

Built with ❤️ using NestJS-style architecture patterns.
