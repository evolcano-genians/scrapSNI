/**
 * Domain Tracker - TypeScript 타입 정의
 *
 * 이 파일은 프로젝트 전체에서 사용되는 모든 타입과 인터페이스를 정의합니다.
 */

import { Page, Browser, BrowserContext } from 'playwright';

// ==================== 기본 타입 ====================

/**
 * 리소스 타입
 * Playwright가 제공하는 네트워크 리소스 타입
 */
export type ResourceType =
  | 'document'    // HTML 문서
  | 'stylesheet'  // CSS 파일
  | 'image'       // 이미지 파일
  | 'script'      // JavaScript 파일
  | 'font'        // 폰트 파일
  | 'xhr'         // XMLHttpRequest
  | 'fetch'       // Fetch API
  | 'media'       // 비디오/오디오
  | 'other';      // 기타

/**
 * 프로토콜 타입
 */
export type Protocol = 'http' | 'https';

/**
 * 워크플로우 단계 타입
 */
export type WorkflowStepType =
  | 'navigate'      // 페이지 이동
  | 'login'         // 로그인 대기
  | 'crawl'         // 페이지 크롤링
  | 'wait'          // 지정 시간 대기
  | 'click'         // 요소 클릭
  | 'fill'          // 폼 입력
  | 'auto-click'    // 자동 클릭
  | 'auto-hover'    // 자동 호버
  | 'auto-scroll'   // 자동 스크롤
  | 'auto-fill'     // 자동 폼 입력
  | 'intelligent';  // 지능형 탐색

// ==================== 도메인 관련 타입 ====================

/**
 * IP 주소 정보
 */
export interface IPAddresses {
  ipv4: string[];  // IPv4 주소 목록
  ipv6: string[];  // IPv6 주소 목록
}

/**
 * 도메인 상세 정보
 */
export interface DomainInfo {
  domain: string;                // 도메인명 (예: example.com)
  count: number;                 // 해당 도메인으로의 총 요청 수
  types: ResourceType[];         // 요청된 리소스 타입 목록
  firstSeen: string;            // 처음 발견된 시각 (ISO 8601 형식)
  urlCount: number;             // 고유 URL 경로 수
  urls?: string[];              // URL 경로 목록 (선택사항)
  ipv4?: string[];              // IPv4 주소 목록 (선택사항)
  ipv6?: string[];              // IPv6 주소 목록 (선택사항)
  protocol?: Protocol;          // 프로토콜 (선택사항)
  isCDN?: boolean;              // CDN 서비스 여부
  cdnName?: string;             // CDN 서비스명
  isThirdParty?: boolean;       // 서드파티 서비스 여부
  thirdPartyName?: string;      // 서드파티 서비스명
  isWebSocket?: boolean;        // WebSocket 연결 여부
}

/**
 * 도메인 내부 상세 정보 (수집 중에 사용)
 */
export interface DomainDetails {
  domain: string;
  count: number;
  types: Set<ResourceType>;     // Set으로 중복 제거
  firstSeen: string;
  urls: Set<string>;            // Set으로 중복 제거
  protocol?: Protocol;
  isCDN?: boolean;              // CDN 서비스 여부
  cdnName?: string;             // CDN 서비스명
  isThirdParty?: boolean;       // 서드파티 서비스 여부
  thirdPartyName?: string;      // 서드파티 서비스명
  isWebSocket?: boolean;        // WebSocket 연결 여부
  ipv4: Set<string>;            // IPv4 주소 Set
  ipv6: Set<string>;            // IPv6 주소 Set
}

// ==================== CDN 및 서비스 감지 ====================

/**
 * CDN 서비스 정보
 */
export interface CDNService {
  name: string;         // CDN 서비스명 (예: Cloudflare, AWS CloudFront)
  domains: string[];    // 해당 CDN을 사용하는 도메인 목록
  count: number;        // 총 요청 수
}

/**
 * 서드파티 서비스 정보
 */
export interface ThirdPartyService {
  name: string;         // 서비스명 (예: Google Analytics, Facebook)
  domains: string[];    // 해당 서비스 도메인 목록
  count: number;        // 총 호출 수
}

/**
 * 리소스 상세 정보
 */
export interface ResourceDetail {
  url: string;              // 전체 URL
  domain: string;           // 도메인명
  type: ResourceType;       // 리소스 타입
  method?: string;          // HTTP 메소드 (GET, POST 등)
  protocol?: Protocol;      // 프로토콜
  timestamp?: string;       // 타임스탬프
  size?: number | null;     // 파일 크기 (바이트)
  cdn?: string | null;      // CDN 서비스명 (있을 경우)
  service?: string | null;  // 서드파티 서비스명 (있을 경우)
}

// ==================== 통계 타입 ====================

/**
 * 리소스 타입별 통계
 */
export interface ResourceStats {
  [key: string]: number;  // 리소스 타입을 키로, 개수를 값으로
}

/**
 * 프로토콜 통계
 */
export interface ProtocolStats {
  http: number;   // HTTP 요청 수
  https: number;  // HTTPS 요청 수
}

// ==================== 분석 결과 타입 ====================

/**
 * URL 분석 결과
 */
export interface AnalysisResult {
  success: boolean;                          // 분석 성공 여부
  url?: string;                              // 분석한 URL
  timestamp?: string;                        // 분석 완료 시각
  totalDomains?: number;                     // 총 도메인 수
  totalIPs?: number;                         // 총 IP 주소 수
  totalCDNs?: number;                        // 총 CDN 서비스 수
  totalServices?: number;                    // 총 서드파티 서비스 수
  totalResources?: number;                   // 총 리소스 수
  domains: DomainInfo[];                     // 도메인 정보 목록
  allIPs?: string[];                         // 모든 IP 주소 목록
  cdnServices?: CDNService[];                // CDN 서비스 목록
  thirdPartyServices?: ThirdPartyService[];  // 서드파티 서비스 목록
  resourceDetails?: ResourceDetail[];        // 리소스 상세 정보 목록
  resourceStats?: ResourceStats;             // 리소스 타입별 통계
  protocolStats?: ProtocolStats;             // 프로토콜 통계
  error?: string;                            // 에러 메시지 (실패 시)
}

// ==================== 분석 옵션 ====================

/**
 * URL 분석 옵션
 */
export interface AnalysisOptions {
  waitTime?: number;              // 페이지 로딩 대기 시간 (밀리초)
  maxWaitTime?: number;           // 최대 대기 시간 (밀리초)
  includeSubresources?: boolean;  // 하위 리소스 포함 여부
  requiresLogin?: boolean;        // 로그인 필요 여부
  analysisId?: string | null;     // 분석 세션 ID
  savedSession?: string | null;   // 저장된 세션 파일 경로
  crawlDepth?: number;            // 크롤링 깊이 (0-3)
  sameDomainOnly?: boolean;       // 같은 도메인만 탐색
  onProgress?: (progress: CrawlProgress) => void;  // 진행 상황 콜백
}

/**
 * 크롤링 진행 상황
 */
export interface CrawlProgress {
  currentDepth: number;    // 현재 크롤링 깊이
  maxDepth: number;        // 최대 크롤링 깊이
  pagesVisited: number;    // 방문한 페이지 수
  totalPages: number;      // 예상 총 페이지 수
  currentUrl: string;      // 현재 방문 중인 URL
}

// ==================== 워크플로우 관련 타입 ====================

/**
 * 워크플로우 단계 설정
 */
export interface WorkflowStepConfig {
  // Navigate 단계
  url?: string;
  wait?: number;

  // Login 단계
  maxWait?: number;
  saveSession?: boolean;

  // Crawl 단계
  depth?: number;
  sameDomain?: boolean;

  // Wait 단계
  duration?: number;

  // Click/Fill 단계
  selector?: string;
  value?: string;

  // Auto-click 단계
  maxClicks?: number;
  clickDelay?: number;
  excludeSelectors?: string;

  // Auto-hover 단계
  hoverSelector?: string;
  hoverDuration?: number;
  maxHovers?: number;

  // Auto-scroll 단계
  scrollMethod?: 'smooth' | 'step' | 'full';
  scrollDelay?: number;
  maxScrolls?: number;

  // Auto-fill 단계
  formData?: string;
  fillVisible?: boolean;

  // Intelligent 단계
  exploreDepth?: number;
  maxTimePerElement?: number;
  avoidLogout?: boolean;
  clickButtons?: boolean;
  hoverMenus?: boolean;

  // 기타
  [key: string]: any;  // 추가 설정을 위한 인덱스 시그니처
}

/**
 * 워크플로우 단계
 */
export interface WorkflowStep {
  type: WorkflowStepType;      // 단계 타입
  name: string;                // 단계 이름
  config: WorkflowStepConfig;  // 단계 설정
}

/**
 * 워크플로우 실행 결과
 */
export interface WorkflowResult {
  success: boolean;                          // 실행 성공 여부
  totalDomains?: number;                     // 총 도메인 수
  totalIPs?: number;                         // 총 IP 주소 수
  totalCDNs?: number;                        // 총 CDN 서비스 수
  totalServices?: number;                    // 총 서드파티 서비스 수
  totalResources?: number;                   // 총 리소스 수
  domains: DomainInfo[];                     // 도메인 정보 목록
  allIPs: string[];                          // 모든 IP 주소 목록
  cdnServices?: CDNService[];                // CDN 서비스 목록
  thirdPartyServices?: ThirdPartyService[];  // 서드파티 서비스 목록
  resourceDetails?: ResourceDetail[];        // 리소스 상세 정보 목록
  resourceStats?: ResourceStats;             // 리소스 타입별 통계
  protocolStats?: ProtocolStats;             // 프로토콜 통계
  error?: string;                            // 에러 메시지 (실패 시)
}

// ==================== IPC 통신 타입 ====================

/**
 * IPC 응답 기본 형식
 */
export interface IPCResponse<T = any> {
  success: boolean;  // 성공 여부
  error?: string;    // 에러 메시지 (실패 시)
  data?: T;          // 응답 데이터 (성공 시)
}

/**
 * 세션 정보
 */
export interface SessionInfo {
  exists: boolean;  // 세션 파일 존재 여부
  path: string;     // 세션 파일 경로
}

// ==================== 내부 사용 타입 ====================

/**
 * 클릭 가능한 요소 정보
 */
export interface ClickableElement {
  index: number;       // 인덱스
  text: string;        // 텍스트 내용
  className: string;   // 클래스명
  tagName: string;     // 태그명
  selector: string;    // CSS 선택자
}

/**
 * Playwright 브라우저 인스턴스 정보
 */
export interface BrowserInstance {
  browser: Browser | null;          // 브라우저 인스턴스
  context: BrowserContext | null;   // 브라우저 컨텍스트
  page: Page | null;                // 페이지 인스턴스
}

/**
 * 로그인 대기 정보
 */
export interface LoginWaitInfo {
  resolver: (() => void) | null;  // Promise resolver
  analysisId: string | null;      // 분석 세션 ID
}

// ==================== 설정 타입 ====================

/**
 * 애플리케이션 설정
 */
export interface AppConfig {
  crawler: CrawlerConfig;      // 크롤러 설정
  dns: DNSConfig;              // DNS 설정
  limits: LimitsConfig;        // 제한 설정
  browser: BrowserConfig;      // 브라우저 설정
}

/**
 * 크롤러 설정
 */
export interface CrawlerConfig {
  maxLinksPerDepth: number;     // 각 깊이별 최대 링크 수
  clickTimeout: number;         // 클릭 타임아웃 (밀리초)
  loadTimeout: number;          // 로드 타임아웃 (밀리초)
  networkIdleTimeout: number;   // 네트워크 idle 타임아웃 (밀리초)
  scrollDelay: number;          // 스크롤 간 대기 시간 (밀리초)
}

/**
 * DNS 설정
 */
export interface DNSConfig {
  batchSize: number;     // 배치 처리 크기
  timeout: number;       // DNS 조회 타임아웃 (밀리초)
}

/**
 * 제한 설정
 */
export interface LimitsConfig {
  maxDomains: number;          // 최대 도메인 수
  maxIPs: number;              // 최대 IP 수
  maxResourceDetails: number;  // 최대 리소스 상세 정보 수
}

/**
 * 브라우저 설정
 */
export interface BrowserConfig {
  headless: boolean;           // Headless 모드 여부
  userAgent: string;           // User-Agent 문자열
  defaultWaitTime: number;     // 기본 대기 시간 (밀리초)
  defaultMaxWaitTime: number;  // 기본 최대 대기 시간 (밀리초)
}

// ==================== 유틸리티 타입 ====================

/**
 * 부분적으로 필수인 타입
 * (특정 키를 필수로 만듦)
 */
export type PartiallyRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 읽기 전용 깊은 타입
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
