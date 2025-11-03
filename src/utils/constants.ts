/**
 * Domain Tracker - 상수 정의
 *
 * 이 파일은 프로젝트 전체에서 사용되는 상수를 정의합니다.
 * 하드코딩된 값들을 중앙화하여 유지보수성을 높입니다.
 */

// ==================== CDN 서비스 패턴 ====================

/**
 * CDN 서비스 감지 패턴
 * 도메인명이나 HTTP 헤더에서 CDN 서비스를 식별하는 패턴
 */
export const CDN_PATTERNS: Record<string, string[]> = {
  'Cloudflare': ['cloudflare', 'cf-ray'],
  'AWS CloudFront': ['cloudfront.net', 'x-amz-cf-id'],
  'Akamai': ['akamai', 'akamaihd.net'],
  'Fastly': ['fastly', 'fastly.net'],
  'Azure CDN': ['azureedge.net', 'azure'],
  'Google Cloud CDN': ['googleusercontent.com', 'gstatic.com'],
  'CDN77': ['cdn77'],
  'KeyCDN': ['keycdn.com'],
  'StackPath': ['stackpath', 'netdna-cdn.com'],
  'Incapsula': ['incapdns.net', 'incapsula'],
  'BunnyCDN': ['bunnycdn.com', 'b-cdn.net'],
  'Cloudinary': ['cloudinary.com'],
  'jsDelivr': ['jsdelivr.net'],
  'unpkg': ['unpkg.com']
};

// ==================== 서드파티 서비스 패턴 ====================

/**
 * 서드파티 서비스 감지 패턴
 * 도메인명에서 알려진 서드파티 서비스를 식별하는 패턴
 */
export const THIRD_PARTY_PATTERNS: Record<string, string[]> = {
  // 분석 도구
  'Google Analytics': ['google-analytics.com', 'googletagmanager.com'],
  'Google Ads': ['googleadservices.com', 'googlesyndication.com', 'doubleclick.net'],
  'Hotjar': ['hotjar.com'],
  'Mixpanel': ['mixpanel.com'],
  'Segment': ['segment.com', 'segment.io'],
  'Amplitude': ['amplitude.com'],
  'Heap Analytics': ['heapanalytics.com'],

  // 소셜 미디어
  'Facebook': ['facebook.com', 'facebook.net', 'fbcdn.net'],
  'Twitter': ['twitter.com', 't.co', 'twimg.com'],
  'YouTube': ['youtube.com', 'ytimg.com'],
  'Instagram': ['instagram.com', 'cdninstagram.com'],
  'LinkedIn': ['linkedin.com', 'licdn.com'],

  // 라이브러리/프레임워크
  'jQuery CDN': ['jquery.com', 'code.jquery.com'],
  'cdnjs': ['cdnjs.cloudflare.com'],
  'Bootstrap CDN': ['bootstrapcdn.com'],
  'Font Awesome': ['fontawesome.com'],

  // 결제 시스템
  'Stripe': ['stripe.com', 'stripe.network'],
  'PayPal': ['paypal.com', 'paypalobjects.com'],
  'Square': ['squareup.com', 'squa recdn.com'],

  // 고객 지원/채팅
  'Intercom': ['intercom.io', 'intercom.com'],
  'Zendesk': ['zendesk.com', 'zdassets.com'],
  'Drift': ['drift.com'],
  'LiveChat': ['livechatinc.com'],

  // 기타
  'Sentry': ['sentry.io'],
  'New Relic': ['newrelic.com', 'nr-data.net'],
  'Datadog': ['datadoghq.com']
};

// ==================== 제외 패턴 ====================

/**
 * 로그아웃/위험 버튼 패턴
 * 자동 클릭 시 피해야 할 요소를 식별하는 정규표현식
 */
export const DANGEROUS_BUTTON_PATTERNS: RegExp[] = [
  // 로그아웃
  /logout/i,
  /log out/i,
  /log-out/i,
  /signout/i,
  /sign out/i,
  /sign-out/i,
  /로그아웃/,
  /로그 아웃/,
  /로그오프/,
  /로그 오프/,

  // 종료
  /exit/i,
  /quit/i,
  /close/i,
  /종료/,
  /나가기/,
  /닫기/,

  // 삭제
  /delete/i,
  /remove/i,
  /삭제/,
  /제거/,

  // 취소
  /cancel/i,
  /취소/
];

// ==================== 기본값 ====================

/**
 * 기본 대기 시간 (밀리초)
 */
export const DEFAULT_WAIT_TIME = 5000;  // 5초

/**
 * 기본 최대 대기 시간 (밀리초)
 */
export const DEFAULT_MAX_WAIT_TIME = 30000;  // 30초

/**
 * 최대 대기 시간 (alias)
 */
export const MAX_WAIT_TIME = DEFAULT_MAX_WAIT_TIME;

/**
 * 기본 크롤링 깊이
 */
export const DEFAULT_CRAWL_DEPTH = 0;  // 현재 페이지만

/**
 * 기본 로그인 대기 시간 (밀리초)
 */
export const DEFAULT_LOGIN_WAIT = 120000;  // 2분

// ==================== 제한값 ====================

/**
 * 각 깊이별 최대 방문 링크 수
 */
export const MAX_LINKS_PER_DEPTH = 10;

/**
 * 최대 크롤링 깊이
 */
export const MAX_CRAWL_DEPTH = 3;

/**
 * 최대 클릭 가능 요소 탐지 수
 */
export const MAX_CLICKABLE_ELEMENTS = 20;

/**
 * 실제 클릭할 최대 요소 수
 */
export const MAX_CLICK_ATTEMPTS = 10;

/**
 * 최대 리소스 상세 정보 수집 수
 */
export const MAX_RESOURCE_DETAILS = 100;

/**
 * 최대 도메인 수 (메모리 보호)
 */
export const MAX_DOMAINS = 10000;

/**
 * 최대 IP 주소 수 (메모리 보호)
 */
export const MAX_IPS = 5000;

/**
 * DNS 조회 배치 크기
 */
export const DNS_BATCH_SIZE = 10;

// ==================== 타임아웃 ====================

/**
 * 클릭 타임아웃 (밀리초)
 */
export const CLICK_TIMEOUT = 3000;  // 3초

/**
 * 페이지 로드 타임아웃 (밀리초)
 */
export const LOAD_TIMEOUT = 5000;  // 5초

/**
 * 네트워크 idle 타임아웃 (밀리초)
 */
export const NETWORK_IDLE_TIMEOUT = 2000;  // 2초

/**
 * 네트워크 idle 최대 대기 시간 (밀리초)
 */
export const NETWORK_IDLE_MAX_WAIT = 10000;  // 10초

/**
 * DNS 조회 타임아웃 (밀리초)
 */
export const DNS_TIMEOUT = 5000;  // 5초

/**
 * 로그인 타임아웃 (밀리초)
 */
export const LOGIN_TIMEOUT = 300000;  // 5분

// ==================== 지연 시간 ====================

/**
 * 스크롤 간 대기 시간 (밀리초)
 */
export const SCROLL_DELAY = 300;

/**
 * 클릭 후 대기 시간 (밀리초)
 */
export const CLICK_DELAY = 1500;

/**
 * 호버 지속 시간 (밀리초)
 */
export const HOVER_DURATION = 800;

/**
 * 자동 업데이트 주기 (밀리초)
 */
export const AUTO_UPDATE_INTERVAL = 2000;  // 2초

// ==================== 파일 경로 ====================

/**
 * 세션 파일명
 */
export const SESSION_FILENAME = '.domain-tracker-session.json';

// ==================== User-Agent ====================

/**
 * 기본 User-Agent 문자열
 */
export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * User-Agent (alias)
 */
export const USER_AGENT = DEFAULT_USER_AGENT;

// ==================== 브라우저 인자 ====================

/**
 * Chromium 브라우저 실행 인자 (보안 및 호환성)
 */
export const BROWSER_ARGS = [
  '--no-sandbox',                                    // 샌드박스 비활성화 (일부 환경에서 필요)
  '--disable-setuid-sandbox',                        // setuid 샌드박스 비활성화
  '--disable-web-security',                          // CORS 이슈 방지
  '--disable-features=IsolateOrigins,site-per-process',  // 모든 리소스 추적
  '--disable-blink-features=AutomationControlled'    // 자동화 감지 방지
];

/**
 * Headless 브라우저 실행 인자
 */
export const HEADLESS_BROWSER_ARGS = [
  ...BROWSER_ARGS
];

/**
 * Headed 브라우저 실행 인자
 */
export const HEADED_BROWSER_ARGS = [
  ...BROWSER_ARGS,
  '--start-maximized'  // 최대화된 창으로 시작
];

// ==================== 선택자 ====================

/**
 * 클릭 가능한 요소 선택자
 */
export const CLICKABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  '[role="button"]',
  '[onclick]',
  '.btn',
  '.button',
  'input[type="submit"]',
  'input[type="button"]'
];

/**
 * 호버 대상 선택자
 */
export const HOVERABLE_SELECTORS = [
  'nav',
  '.menu',
  '.dropdown',
  '[role="menu"]',
  'header'
];

// ==================== 기타 ====================

/**
 * 스크롤 단계별 화면 비율
 */
export const SCROLL_STEP_RATIO = 0.8;  // 화면 높이의 80%씩 스크롤

/**
 * 리소스 타입 아이콘 매핑
 */
export const RESOURCE_TYPE_ICONS: Record<string, string> = {
  'document': '📄',
  'stylesheet': '🎨',
  'image': '🖼️',
  'script': '📜',
  'font': '🔤',
  'xhr': '🔄',
  'fetch': '📡',
  'media': '🎬',
  'other': '📦'
};

/**
 * 워크플로우 단계 타입 아이콘 매핑
 */
export const WORKFLOW_STEP_ICONS: Record<string, string> = {
  'navigate': '🌐',
  'login': '🔐',
  'crawl': '🕷️',
  'wait': '⏰',
  'click': '👆',
  'fill': '✏️',
  'auto-click': '🖱️',
  'auto-hover': '👋',
  'auto-scroll': '📜',
  'auto-fill': '📝',
  'intelligent': '🤖'
};

/**
 * 워크플로우 단계 타입 이름 매핑 (한글)
 */
export const WORKFLOW_STEP_NAMES: Record<string, string> = {
  'navigate': '페이지 이동',
  'login': '로그인 대기',
  'crawl': '크롤링',
  'wait': '대기',
  'click': '클릭',
  'fill': '입력',
  'auto-click': '자동 클릭',
  'auto-hover': '자동 호버',
  'auto-scroll': '자동 스크롤',
  'auto-fill': '자동 입력',
  'intelligent': '지능형 탐색'
};
