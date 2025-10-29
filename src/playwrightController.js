const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const dns = require('dns').promises;

class PlaywrightController {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.tracking = false;
    this.visitedDomains = new Set();
    this.domainDetails = new Map(); // 도메인별 상세 정보 저장
    this.requestListener = null;
    this.loginCompleteResolver = null; // 로그인 완료 Promise resolver
    this.currentAnalysisId = null; // 현재 분석 세션 ID
  }

  getChromiumPath() {
    // Playwright 브라우저 경로 찾기
    const homeDir = os.homedir();
    const playwrightPath = path.join(homeDir, 'AppData', 'Local', 'ms-playwright');

    // chromium 폴더 찾기
    try {
      const dirs = fs.readdirSync(playwrightPath);
      const chromiumDir = dirs.find(dir => dir.startsWith('chromium-'));

      if (chromiumDir) {
        const executablePath = path.join(playwrightPath, chromiumDir, 'chrome-win', 'chrome.exe');
        if (fs.existsSync(executablePath)) {
          console.log('Found Chromium at:', executablePath);
          return executablePath;
        }
      }
    } catch (error) {
      console.log('Could not find Chromium in AppData, will use default');
    }

    return null;
  }

  async startTracking() {
    if (this.tracking) {
      throw new Error('Tracking is already in progress');
    }

    try {
      const chromiumPath = this.getChromiumPath();

      const launchOptions = {
        headless: false,
        args: [
          '--start-maximized',
        ]
      };

      // executablePath가 있으면 추가
      if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
      }

      // 브라우저 시작 (headless: false로 설정하여 실제 브라우저 창을 표시)
      this.browser = await chromium.launch(launchOptions);

      // 브라우저 컨텍스트 생성
      this.context = await this.browser.newContext({
        viewport: null, // 전체 화면 사용
        ignoreHTTPSErrors: true
      });

      // 새 페이지 생성
      this.page = await this.context.newPage();

      // 네트워크 요청 모니터링
      this.setupRequestInterception();

      // 페이지 네비게이션 이벤트 모니터링
      this.setupNavigationListeners();

      this.tracking = true;
      this.visitedDomains.clear();
      this.domainDetails.clear();

      // 빈 페이지로 시작 (사용자가 직접 사이트 입력)
      await this.page.goto('about:blank');

      console.log('Tracking started successfully - Navigate to any website to start collecting domains');
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  setupRequestInterception() {
    // 모든 요청을 모니터링하여 도메인 추출
    this.requestListener = (request) => {
      try {
        const url = request.url();
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const resourceType = request.resourceType(); // document, stylesheet, image, script, font, xhr, fetch 등

        // localhost와 IP 주소는 제외
        if (domain && !domain.includes('localhost') && !this.isIPAddress(domain)) {
          this.visitedDomains.add(domain);

          // 도메인 상세 정보 저장
          if (!this.domainDetails.has(domain)) {
            this.domainDetails.set(domain, {
              domain: domain,
              count: 0,
              types: new Set(),
              firstSeen: new Date().toISOString(),
              urls: new Set()
            });
          }

          const details = this.domainDetails.get(domain);
          details.count++;
          details.types.add(resourceType);
          details.urls.add(urlObj.pathname + urlObj.search);

          console.log(`[${resourceType}] ${domain} (${details.count} requests)`);
        }
      } catch (error) {
        // URL 파싱 에러 무시
      }
    };

    this.page.on('request', this.requestListener);
  }

  setupNavigationListeners() {
    // 페이지 네비게이션 이벤트 리스너
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page.mainFrame()) {
        try {
          const url = frame.url();
          const urlObj = new URL(url);
          const domain = urlObj.hostname;

          if (domain && !domain.includes('localhost') && !this.isIPAddress(domain)) {
            this.visitedDomains.add(domain);
            console.log(`Navigated to: ${domain}`);
          }
        } catch (error) {
          // URL 파싱 에러 무시
        }
      }
    });

    // 새 탭/창이 열릴 때 처리
    this.context.on('page', async (newPage) => {
      console.log('New page opened');

      // 새 페이지에도 동일한 리스너 설정
      newPage.on('request', (request) => {
        try {
          const url = request.url();
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          const resourceType = request.resourceType();

          if (domain && !domain.includes('localhost') && !this.isIPAddress(domain)) {
            this.visitedDomains.add(domain);

            // 도메인 상세 정보 저장
            if (!this.domainDetails.has(domain)) {
              this.domainDetails.set(domain, {
                domain: domain,
                count: 0,
                types: new Set(),
                firstSeen: new Date().toISOString(),
                urls: new Set()
              });
            }

            const details = this.domainDetails.get(domain);
            details.count++;
            details.types.add(resourceType);
            details.urls.add(urlObj.pathname + urlObj.search);
          }
        } catch (error) {
          // URL 파싱 에러 무시
        }
      });

      newPage.on('framenavigated', (frame) => {
        if (frame === newPage.mainFrame()) {
          try {
            const url = frame.url();
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            if (domain && !domain.includes('localhost') && !this.isIPAddress(domain)) {
              this.visitedDomains.add(domain);
              console.log(`New tab navigated to: ${domain}`);
            }
          } catch (error) {
            // URL 파싱 에러 무시
          }
        }
      });
    });
  }

  isIPAddress(str) {
    // IP 주소 패턴 확인 (IPv4)
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 패턴 확인
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    return ipv4Pattern.test(str) || ipv6Pattern.test(str);
  }

  // DNS 조회 - 도메인을 IP 주소로 변환
  async resolveIPs(domain) {
    const ips = {
      ipv4: [],
      ipv6: []
    };

    try {
      // IPv4 조회
      const ipv4Addresses = await dns.resolve4(domain);
      ips.ipv4 = ipv4Addresses;
    } catch (error) {
      // IPv4 조회 실패 (정상적인 경우도 있음)
      console.log(`IPv4 lookup failed for ${domain}: ${error.message}`);
    }

    try {
      // IPv6 조회
      const ipv6Addresses = await dns.resolve6(domain);
      ips.ipv6 = ipv6Addresses;
    } catch (error) {
      // IPv6 조회 실패 (정상적인 경우도 있음)
      console.log(`IPv6 lookup failed for ${domain}: ${error.message}`);
    }

    return ips;
  }

  // 여러 도메인에 대한 병렬 DNS 조회
  async resolveBulkIPs(domains) {
    const results = new Map();

    console.log(`Resolving IPs for ${domains.length} domains...`);

    // 병렬 처리로 성능 최적화 (단, 한 번에 너무 많이 처리하지 않도록 제한)
    const batchSize = 10;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const promises = batch.map(async (domain) => {
        try {
          const ips = await this.resolveIPs(domain);
          return { domain, ips };
        } catch (error) {
          console.error(`Error resolving ${domain}:`, error);
          return { domain, ips: { ipv4: [], ipv6: [] } };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ domain, ips }) => {
        results.set(domain, ips);
      });

      console.log(`Resolved ${Math.min(i + batchSize, domains.length)}/${domains.length} domains`);
    }

    return results;
  }

  // 로그인 완료 신호 받기
  signalLoginComplete(analysisId) {
    console.log(`Login complete signal received for analysis: ${analysisId}`);
    if (this.currentAnalysisId === analysisId && this.loginCompleteResolver) {
      this.loginCompleteResolver();
      this.loginCompleteResolver = null;
    }
  }

  // 로그인 완료 대기
  waitForLoginComplete() {
    return new Promise((resolve) => {
      this.loginCompleteResolver = resolve;
    });
  }

  async stopTracking() {
    if (!this.tracking) {
      throw new Error('No tracking session is in progress');
    }

    this.tracking = false;

    // 도메인 상세 정보를 배열로 변환
    const domainList = Array.from(this.domainDetails.values()).map(details => ({
      domain: details.domain,
      count: details.count,
      types: Array.from(details.types),
      firstSeen: details.firstSeen,
      urlCount: details.urls.size
    }));

    // 요청 횟수순으로 정렬
    domainList.sort((a, b) => b.count - a.count);

    // 브라우저 정리
    await this.cleanup();

    console.log(`Tracking stopped. Collected ${domainList.length} unique domains`);

    return domainList;
  }

  async cleanup() {
    try {
      if (this.page) {
        if (this.requestListener) {
          this.page.removeListener('request', this.requestListener);
        }
        await this.page.close().catch(() => {});
      }

      if (this.context) {
        await this.context.close().catch(() => {});
      }

      if (this.browser) {
        await this.browser.close().catch(() => {});
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
      this.requestListener = null;
      this.tracking = false;
    }
  }

  isTracking() {
    return this.tracking;
  }

  getCurrentDomains() {
    // 도메인 상세 정보를 배열로 변환
    const domainList = Array.from(this.domainDetails.values()).map(details => ({
      domain: details.domain,
      count: details.count,
      types: Array.from(details.types),
      firstSeen: details.firstSeen,
      urlCount: details.urls.size
    }));

    // 요청 횟수순으로 정렬
    domainList.sort((a, b) => b.count - a.count);

    return domainList;
  }

  async analyzeUrl(targetUrl, options = {}) {
    const {
      waitTime = 5000, // 페이지 로딩 대기 시간 (기본 5초)
      maxWaitTime = 30000, // 최대 대기 시간 (기본 30초)
      includeSubresources = true, // 하위 리소스도 포함할지 여부
      requiresLogin = false, // 로그인 필요 여부
      analysisId = null, // 분석 세션 ID
      savedSession = null, // 저장된 세션 경로
      crawlDepth = 0, // 크롤링 깊이 (기본 0 = 현재 페이지만)
      sameDomainOnly = true, // 같은 도메인만 탐색 (기본 true)
      onProgress = null // 진행 상황 콜백 함수
    } = options;

    const collectedDomains = new Map();
    const visitedUrls = new Set(); // 방문한 URL 추적
    const urlQueue = []; // 방문할 URL 큐
    let totalPagesToVisit = 1; // 예상 방문 페이지 수
    let pagesVisited = 0; // 방문한 페이지 수
    const resourceDetails = []; // 리소스 상세 정보
    const cdnServices = new Map(); // CDN 서비스 감지
    const thirdPartyServices = new Map(); // 서드파티 서비스

    let browser = null;
    let context = null;
    let page = null;

    try {
      // 분석 ID 저장
      if (analysisId) {
        this.currentAnalysisId = analysisId;
      }

      console.log(`Starting analysis of: ${targetUrl} (requiresLogin: ${requiresLogin})`);

      const chromiumPath = this.getChromiumPath();
      const launchOptions = {
        headless: !requiresLogin, // 로그인 필요하면 일반 브라우저 모드
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security', // CORS 이슈 방지
          '--disable-features=IsolateOrigins,site-per-process', // 모든 리소스 추적
        ]
      };

      // 로그인 필요한 경우 창 크기 설정
      if (requiresLogin) {
        launchOptions.args.push('--start-maximized');
      }

      if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
      }

      browser = await chromium.launch(launchOptions);

      // 브라우저 컨텍스트 생성 옵션
      const contextOptions = {
        ignoreHTTPSErrors: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        bypassCSP: true, // Content Security Policy 우회
        javaScriptEnabled: true,
        serviceWorkers: 'block', // Service Worker 차단 (캐시 방지)
      };

      // 저장된 세션이 있으면 로드
      if (savedSession && fs.existsSync(savedSession)) {
        console.log('Loading saved session from:', savedSession);
        contextOptions.storageState = savedSession;
      }

      // 로그인 필요한 경우 viewport 설정
      if (requiresLogin) {
        contextOptions.viewport = null; // 전체 화면 사용
      }

      context = await browser.newContext(contextOptions);

      page = await context.newPage();

      // 캐시 비활성화 - 매우 중요!
      await page.route('**/*', (route) => {
        route.continue({
          headers: {
            ...route.request().headers(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });
      });

      // CDN 감지 함수
      const detectCDN = (domain, headers) => {
        const cdnPatterns = {
          'Cloudflare': ['cloudflare', 'cf-ray'],
          'AWS CloudFront': ['cloudfront.net', 'x-amz-cf-id'],
          'Akamai': ['akamai', 'akamaihd.net'],
          'Fastly': ['fastly', 'fastly.net'],
          'Azure CDN': ['azureedge.net', 'azure'],
          'Google Cloud CDN': ['googleusercontent.com', 'gstatic.com'],
          'CDN77': ['cdn77'],
          'KeyCDN': ['keycdn.com'],
          'StackPath': ['stackpath', 'netdna-cdn.com'],
          'Incapsula': ['incapdns.net', 'incapsula']
        };

        for (const [cdnName, patterns] of Object.entries(cdnPatterns)) {
          for (const pattern of patterns) {
            if (domain.includes(pattern) ||
                (headers && Object.keys(headers).some(h => h.toLowerCase().includes(pattern)))) {
              return cdnName;
            }
          }
        }
        return null;
      };

      // 서드파티 서비스 감지 함수
      const detectThirdPartyService = (domain) => {
        const services = {
          'Google Analytics': ['google-analytics.com', 'googletagmanager.com'],
          'Google Ads': ['googleadservices.com', 'googlesyndication.com'],
          'Facebook': ['facebook.com', 'facebook.net', 'fbcdn.net'],
          'Twitter': ['twitter.com', 't.co'],
          'YouTube': ['youtube.com', 'ytimg.com'],
          'jQuery CDN': ['jquery.com', 'jsdelivr.net'],
          'Font Awesome': ['fontawesome.com'],
          'Bootstrap CDN': ['bootstrapcdn.com'],
          'Stripe': ['stripe.com'],
          'PayPal': ['paypal.com', 'paypalobjects.com'],
          'Hotjar': ['hotjar.com'],
          'Intercom': ['intercom.io'],
          'Segment': ['segment.com', 'segment.io'],
          'Mixpanel': ['mixpanel.com']
        };

        for (const [serviceName, patterns] of Object.entries(services)) {
          if (patterns.some(pattern => domain.includes(pattern))) {
            return serviceName;
          }
        }
        return null;
      };

      // 모든 요청 모니터링 (개선됨)
      page.on('request', (request) => {
        try {
          const url = request.url();
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          const resourceType = request.resourceType();
          const method = request.method();

          if (domain && !domain.includes('localhost') && !this.isIPAddress(domain)) {
            // 도메인 정보 수집
            if (!collectedDomains.has(domain)) {
              collectedDomains.set(domain, {
                domain: domain,
                count: 0,
                types: new Set(),
                urls: new Set(),
                firstSeen: new Date().toISOString(),
                protocol: urlObj.protocol.replace(':', '')
              });
            }

            const details = collectedDomains.get(domain);
            details.count++;
            details.types.add(resourceType);
            details.urls.add(urlObj.pathname + urlObj.search);

            // CDN 감지
            const headers = request.headers();
            const cdn = detectCDN(domain, headers);
            if (cdn) {
              if (!cdnServices.has(cdn)) {
                cdnServices.set(cdn, {
                  name: cdn,
                  domains: new Set(),
                  count: 0
                });
              }
              const cdnInfo = cdnServices.get(cdn);
              cdnInfo.domains.add(domain);
              cdnInfo.count++;
            }

            // 서드파티 서비스 감지
            const service = detectThirdPartyService(domain);
            if (service) {
              if (!thirdPartyServices.has(service)) {
                thirdPartyServices.set(service, {
                  name: service,
                  domains: new Set(),
                  count: 0
                });
              }
              const serviceInfo = thirdPartyServices.get(service);
              serviceInfo.domains.add(domain);
              serviceInfo.count++;
            }

            // 리소스 상세 정보 수집 (처음 100개만)
            if (resourceDetails.length < 100) {
              resourceDetails.push({
                url: url,
                domain: domain,
                type: resourceType,
                method: method,
                protocol: urlObj.protocol.replace(':', ''),
                timestamp: new Date().toISOString(),
                cdn: cdn,
                service: service
              });
            }
          }
        } catch (error) {
          // URL 파싱 에러 무시
        }
      });

      // 페이지 로드 - 다단계 전략
      console.log('Loading page...');

      // 1단계: 초기 로드
      await page.goto(targetUrl, {
        waitUntil: 'load', // networkidle 대신 load 사용 (더 빠름)
        timeout: maxWaitTime
      });

      console.log('Initial page loaded');

      // 로그인 필요한 경우 사용자 대기
      if (requiresLogin) {
        console.log('Waiting for user to complete login...');
        // 앱 UI에 로그인 대기 상태 전달 (main.js에서 처리)
        // 사용자가 "로그인 완료" 버튼 누를 때까지 대기
        await this.waitForLoginComplete();
        console.log('Login completed, continuing analysis...');

        // 로그인 후 세션 저장
        const sessionPath = path.join(os.homedir(), '.domain-tracker-session.json');
        await context.storageState({ path: sessionPath });
        console.log('Session saved to:', sessionPath);
      }

      console.log('Waiting for network idle...');

      // 2단계: 네트워크 안정화 대기
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        console.log('Network idle timeout, continuing...');
      }

      // 3단계: 스크롤하여 lazy loading 리소스 트리거
      console.log('Scrolling to trigger lazy-loaded resources...');
      await page.evaluate(async () => {
        // 페이지 전체를 여러 번 스크롤
        const scrollHeight = document.body.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollSteps = Math.ceil(scrollHeight / viewportHeight);

        for (let i = 0; i < scrollSteps; i++) {
          window.scrollTo(0, i * viewportHeight);
          await new Promise(resolve => setTimeout(resolve, 300)); // 각 스크롤 후 대기
        }

        // 맨 위로 다시 스크롤
        window.scrollTo(0, 0);
      });

      // 4단계: 추가 대기 (동적 콘텐츠 로딩 대기)
      console.log(`Waiting ${waitTime}ms for dynamic content...`);
      await page.waitForTimeout(waitTime);

      // 5단계: 마지막 네트워크 요청 수집
      console.log('Final network idle wait...');
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {
        console.log('Final network idle timeout, proceeding to results...');
      }

      // 현재 페이지 방문 표시
      visitedUrls.add(targetUrl);
      pagesVisited = 1;

      // Depth 기반 크롤링
      if (crawlDepth > 0) {
        console.log(`Starting depth-based crawling (depth: ${crawlDepth}, sameDomainOnly: ${sameDomainOnly})...`);

        const targetDomain = new URL(targetUrl).hostname;

        // Depth별로 크롤링
        for (let currentDepth = 1; currentDepth <= crawlDepth; currentDepth++) {
          console.log(`\n=== Crawling Depth ${currentDepth}/${crawlDepth} ===`);

          // 현재 페이지에서 링크 추출 (개선된 버전)
          const links = await page.evaluate(() => {
            const foundLinks = new Set();

            // 1. 일반 <a> 태그
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            anchors.forEach(a => {
              try {
                const href = new URL(a.getAttribute('href'), window.location.href).href;
                if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.includes('#')) {
                  foundLinks.add(href);
                }
              } catch (e) {}
            });

            // 2. data-href, data-url 속성을 가진 요소들
            const dataHrefElements = Array.from(document.querySelectorAll('[data-href], [data-url], [data-link]'));
            dataHrefElements.forEach(el => {
              try {
                const href = el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('data-link');
                if (href) {
                  const fullUrl = new URL(href, window.location.href).href;
                  if (fullUrl && !fullUrl.startsWith('javascript:') && !fullUrl.startsWith('mailto:') && !fullUrl.includes('#')) {
                    foundLinks.add(fullUrl);
                  }
                }
              } catch (e) {}
            });

            // 3. onclick 이벤트에서 URL 추출 (window.location, location.href 패턴)
            const clickableElements = Array.from(document.querySelectorAll('[onclick]'));
            clickableElements.forEach(el => {
              try {
                const onclick = el.getAttribute('onclick') || '';
                // location.href='...' 또는 window.location='...' 패턴 찾기
                const urlMatch = onclick.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
                if (urlMatch && urlMatch[1]) {
                  const fullUrl = new URL(urlMatch[1], window.location.href).href;
                  if (fullUrl && !fullUrl.startsWith('javascript:') && !fullUrl.startsWith('mailto:') && !fullUrl.includes('#')) {
                    foundLinks.add(fullUrl);
                  }
                }
              } catch (e) {}
            });

            // 4. 클릭 가능해 보이는 요소들 (cursor: pointer)
            const clickableByStyle = Array.from(document.querySelectorAll('div, span, button, li'));
            clickableByStyle.forEach(el => {
              try {
                const style = window.getComputedStyle(el);
                if (style.cursor === 'pointer' || el.getAttribute('role') === 'button') {
                  // href나 data 속성 확인
                  const possibleHref = el.getAttribute('href') ||
                                      el.getAttribute('data-href') ||
                                      el.getAttribute('data-url') ||
                                      el.getAttribute('data-link');
                  if (possibleHref) {
                    const fullUrl = new URL(possibleHref, window.location.href).href;
                    if (fullUrl && !fullUrl.startsWith('javascript:') && !fullUrl.startsWith('mailto:') && !fullUrl.includes('#')) {
                      foundLinks.add(fullUrl);
                    }
                  }
                }
              } catch (e) {}
            });

            return Array.from(foundLinks);
          });

          console.log(`Found ${links.length} links on current page`);

          // 추가: 클릭 가능한 요소들을 실제로 클릭해서 URL 변경 감지
          const clickableLinks = await page.evaluate(() => {
            const clickables = [];
            // 클릭 가능한 모든 요소 찾기 (a, button, div, span 등)
            const elements = Array.from(document.querySelectorAll('a, button, div[role="button"], span[role="button"], li[role="button"], [onclick]'));

            // 클릭하면 안되는 텍스트 패턴 (로그아웃, 종료 등)
            const excludePatterns = [
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
              /로그오프/,
              /종료/,
              /나가기/,
              /exit/i,
              /quit/i,
              /close/i,
              /닫기/,
              /삭제/,
              /delete/i,
              /remove/i
            ];

            elements.forEach((el, index) => {
              try {
                // 보이는 요소만 (화면에 표시되는 것만)
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= 0;

                if (isVisible) {
                  const text = el.textContent?.trim().substring(0, 50) || '';
                  const className = el.className || '';
                  const tagName = el.tagName;
                  const href = el.getAttribute('href') || '';

                  // 제외할 패턴 체크
                  const shouldExclude = excludePatterns.some(pattern =>
                    pattern.test(text) || pattern.test(className) || pattern.test(href)
                  );

                  // 텍스트가 있고 의미있는 요소만, 제외 패턴에 해당하지 않는 것만
                  if (text && text.length > 0 && !shouldExclude) {
                    clickables.push({
                      index,
                      text,
                      className,
                      tagName,
                      selector: `${tagName}:nth-of-type(${index + 1})`
                    });
                  }
                }
              } catch (e) {}
            });

            return clickables.slice(0, 20); // 최대 20개로 제한
          });

          console.log(`Found ${clickableLinks.length} clickable elements`);

          // 클릭 가능한 요소들을 실제로 클릭해서 페이지 변경 감지
          for (let i = 0; i < Math.min(clickableLinks.length, 10); i++) {
            const clickable = clickableLinks[i];
            try {
              console.log(`Attempting to click: "${clickable.text.substring(0, 30)}..." (${clickable.tagName})`);

              const currentUrl = page.url();

              // 요소 찾기 및 클릭
              const element = await page.locator(`:text("${clickable.text.substring(0, 20)}")`).first();

              if (element) {
                // 클릭 전 URL 저장
                const beforeClickUrl = page.url();

                // 클릭 (네비게이션 대기 추가)
                await Promise.race([
                  Promise.all([
                    element.click({ timeout: 3000 }),
                    page.waitForLoadState('load', { timeout: 5000 }).catch(() => {})
                  ]),
                  page.waitForTimeout(5000)
                ]).catch(() => {});

                // 페이지가 안정화될 때까지 대기
                await page.waitForTimeout(1500);

                // 네트워크 안정화 대기
                try {
                  await page.waitForLoadState('networkidle', { timeout: 2000 });
                } catch (e) {
                  // 타임아웃 무시
                }

                // 클릭 후 URL 확인
                const afterClickUrl = page.url();

                if (afterClickUrl !== beforeClickUrl && !visitedUrls.has(afterClickUrl)) {
                  console.log(`✓ Click detected new URL: ${afterClickUrl}`);
                  links.push(afterClickUrl);

                  // 원래 페이지로 돌아가기
                  await page.goto(currentUrl, { waitUntil: 'load', timeout: maxWaitTime });

                  // 페이지가 완전히 로드될 때까지 대기
                  await page.waitForLoadState('load', { timeout: 10000 });
                  await page.waitForTimeout(1500);

                  // 네트워크 안정화 대기
                  try {
                    await page.waitForLoadState('networkidle', { timeout: 2000 });
                  } catch (e) {
                    // 타임아웃 무시
                  }
                }
              }
            } catch (error) {
              console.log(`✗ Failed to click element: ${error.message}`);
              // 에러 발생 시 원래 페이지로 돌아가기 시도
              try {
                const currentPageUrl = page.url();
                if (!currentPageUrl.includes(targetDomain)) {
                  // 다른 도메인으로 이동했으면 초기 URL로 복귀
                  console.log(`Navigating back to original page: ${targetUrl}`);
                  await page.goto(targetUrl, { waitUntil: 'load', timeout: maxWaitTime });
                  await page.waitForLoadState('load', { timeout: 10000 });
                  await page.waitForTimeout(1500);
                }
              } catch (e) {
                console.log(`Failed to navigate back: ${e.message}`);
                // 복구 실패 시 클릭 루프 중단
                break;
              }
            }
          }

          console.log(`Total links after click detection: ${links.length}`);

          // 링크 필터링 및 큐에 추가
          const linksToVisit = [];
          for (const link of links) {
            try {
              const linkUrl = new URL(link);
              const linkDomain = linkUrl.hostname;

              // 이미 방문한 URL은 스킵
              if (visitedUrls.has(link)) {
                continue;
              }

              // 도메인 제한 체크
              if (sameDomainOnly && linkDomain !== targetDomain) {
                continue;
              }

              linksToVisit.push(link);
              visitedUrls.add(link);
            } catch (e) {
              // URL 파싱 에러 무시
            }
          }

          console.log(`After filtering: ${linksToVisit.length} links to visit`);
          totalPagesToVisit += linksToVisit.length;

          // 진행 상황 업데이트
          if (onProgress) {
            onProgress({
              currentDepth,
              maxDepth: crawlDepth,
              pagesVisited,
              totalPages: totalPagesToVisit,
              currentUrl: targetUrl
            });
          }

          // 각 링크 방문 (최대 10개로 제한하여 과도한 크롤링 방지)
          const maxLinksPerDepth = 10;
          const linksToProcess = linksToVisit.slice(0, maxLinksPerDepth);

          for (let i = 0; i < linksToProcess.length; i++) {
            const linkUrl = linksToProcess[i];

            try {
              console.log(`[Depth ${currentDepth}] Visiting (${i + 1}/${linksToProcess.length}): ${linkUrl}`);

              // 진행 상황 업데이트
              if (onProgress) {
                onProgress({
                  currentDepth,
                  maxDepth: crawlDepth,
                  pagesVisited,
                  totalPages: totalPagesToVisit,
                  currentUrl: linkUrl
                });
              }

              // 페이지 이동
              await page.goto(linkUrl, {
                waitUntil: 'load',
                timeout: maxWaitTime
              });

              // 짧은 대기 (리소스 수집)
              await page.waitForTimeout(waitTime / 2);

              // 네트워크 안정화 대기
              try {
                await page.waitForLoadState('networkidle', { timeout: 3000 });
              } catch (e) {
                // 타임아웃 무시
              }

              pagesVisited++;
              console.log(`✓ Page ${pagesVisited} visited successfully`);

            } catch (error) {
              console.log(`✗ Failed to visit ${linkUrl}: ${error.message}`);
            }
          }

          // 마지막 depth가 아니면 첫 번째 링크로 이동 (다음 depth를 위해)
          if (currentDepth < crawlDepth && linksToProcess.length > 0) {
            try {
              await page.goto(linksToProcess[0], {
                waitUntil: 'load',
                timeout: maxWaitTime
              });
            } catch (e) {
              console.log('Failed to navigate to next depth base URL');
              break;
            }
          }
        }

        console.log(`\n=== Crawling Complete ===`);
        console.log(`Total pages visited: ${pagesVisited}`);
        console.log(`Total unique URLs found: ${visitedUrls.size}`);
      }

      // 결과 정리
      const domainList = Array.from(collectedDomains.values()).map(details => ({
        domain: details.domain,
        count: details.count,
        types: Array.from(details.types),
        firstSeen: details.firstSeen,
        urlCount: details.urls.size,
        urls: Array.from(details.urls).slice(0, 10) // 처음 10개 URL만
      }));

      // 요청 횟수순으로 정렬
      domainList.sort((a, b) => b.count - a.count);

      console.log(`Analysis complete. Found ${domainList.length} unique domains`);

      // DNS 조회를 통한 IP 추출
      console.log('Starting DNS resolution for all domains...');
      const domains = domainList.map(d => d.domain);
      const ipResolutions = await this.resolveBulkIPs(domains);

      // IP 정보를 도메인 목록에 추가
      domainList.forEach(domainInfo => {
        const ips = ipResolutions.get(domainInfo.domain);
        if (ips) {
          domainInfo.ipv4 = ips.ipv4;
          domainInfo.ipv6 = ips.ipv6;
        } else {
          domainInfo.ipv4 = [];
          domainInfo.ipv6 = [];
        }
      });

      // 모든 고유 IP 주소 수집
      const allIPs = new Set();
      domainList.forEach(domainInfo => {
        domainInfo.ipv4.forEach(ip => allIPs.add(ip));
        domainInfo.ipv6.forEach(ip => allIPs.add(ip));
      });

      console.log(`DNS resolution complete. Found ${allIPs.size} unique IP addresses`);

      // CDN 정보 정리
      const cdnList = Array.from(cdnServices.values()).map(cdn => ({
        name: cdn.name,
        domains: Array.from(cdn.domains),
        count: cdn.count
      }));

      // 서드파티 서비스 정보 정리
      const serviceList = Array.from(thirdPartyServices.values()).map(service => ({
        name: service.name,
        domains: Array.from(service.domains),
        count: service.count
      }));

      // 리소스 타입별 통계
      const resourceStats = {};
      domainList.forEach(d => {
        d.types.forEach(type => {
          resourceStats[type] = (resourceStats[type] || 0) + 1;
        });
      });

      // 프로토콜 통계
      const protocolStats = { http: 0, https: 0 };
      domainList.forEach(d => {
        if (d.protocol === 'https') {
          protocolStats.https++;
        } else if (d.protocol === 'http') {
          protocolStats.http++;
        }
      });

      console.log(`Analysis Summary:`);
      console.log(`- Domains: ${domainList.length}`);
      console.log(`- IPs: ${allIPs.size}`);
      console.log(`- CDN Services: ${cdnList.length}`);
      console.log(`- Third-party Services: ${serviceList.length}`);
      console.log(`- Resources tracked: ${resourceDetails.length}`);

      return {
        success: true,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        totalDomains: domainList.length,
        totalIPs: allIPs.size,
        totalCDNs: cdnList.length,
        totalServices: serviceList.length,
        totalResources: resourceDetails.length,
        domains: domainList,
        allIPs: Array.from(allIPs).sort(), // 정렬된 IP 목록
        cdnServices: cdnList, // CDN 서비스 목록
        thirdPartyServices: serviceList, // 서드파티 서비스 목록
        resourceDetails: resourceDetails, // 리소스 상세 정보
        resourceStats: resourceStats, // 리소스 타입별 통계
        protocolStats: protocolStats // 프로토콜 통계
      };

    } catch (error) {
      console.error('Error during headless analysis:', error);
      return {
        success: false,
        url: targetUrl,
        error: error.message,
        domains: []
      };
    } finally {
      // 정리
      try {
        if (page) await page.close().catch(() => {});
        if (context) await context.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }

  // 워크플로우 실행
  async runWorkflow(steps) {
    console.log('Starting workflow execution with', steps.length, 'steps');

    let browser = null;
    let context = null;
    let page = null;

    // 전체 워크플로우에서 수집된 도메인 정보
    const allDomains = new Map();
    const allIPs = new Set();
    const resourceDetails = [];
    const cdnServices = new Map();
    const thirdPartyServices = new Map();
    const resourceStats = {};
    const protocolStats = { 'http': 0, 'https': 0 };

    try {
      // 브라우저 시작
      browser = await chromium.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      // 컨텍스트 생성
      const userDataDir = path.join(os.homedir(), '.domain-tracker-session');
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true
      });

      page = await context.newPage();

      // 리퀘스트 모니터링 설정
      page.on('request', request => {
        const url = request.url();
        const parsedUrl = new URL(url);
        const domain = parsedUrl.hostname;
        const resourceType = request.resourceType();
        const protocol = parsedUrl.protocol.replace(':', '');

        // 프로토콜 통계
        if (protocol === 'http' || protocol === 'https') {
          protocolStats[protocol]++;
        }

        // 리소스 통계
        resourceStats[resourceType] = (resourceStats[resourceType] || 0) + 1;

        // 도메인 정보 저장
        if (!allDomains.has(domain)) {
          allDomains.set(domain, {
            domain,
            count: 0,
            types: new Set(),
            firstSeen: Date.now(),
            urlCount: 0,
            ipv4: [],
            ipv6: []
          });
        }

        const domainInfo = allDomains.get(domain);
        domainInfo.count++;
        domainInfo.types.add(resourceType);
        domainInfo.urlCount++;

        // CDN 감지
        const cdnName = this.detectCDN(domain, request.headers());
        if (cdnName) {
          if (!cdnServices.has(cdnName)) {
            cdnServices.set(cdnName, { name: cdnName, count: 0, domains: new Set() });
          }
          const cdn = cdnServices.get(cdnName);
          cdn.count++;
          cdn.domains.add(domain);
        }

        // 서드파티 서비스 감지
        const serviceName = this.detectThirdPartyService(domain);
        if (serviceName) {
          if (!thirdPartyServices.has(serviceName)) {
            thirdPartyServices.set(serviceName, { name: serviceName, count: 0, domains: new Set() });
          }
          const service = thirdPartyServices.get(serviceName);
          service.count++;
          service.domains.add(domain);
        }

        // 리소스 상세 정보 저장
        resourceDetails.push({
          url: url,
          domain: domain,
          type: resourceType,
          size: null,
          cdn: cdnName,
          service: serviceName
        });
      });

      // 단계별 실행
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        console.log(`Executing step ${i + 1}/${steps.length}: ${step.type} - ${step.name}`);

        try {
          switch (step.type) {
            case 'navigate':
              await this.executeNavigateStep(page, step);
              break;

            case 'login':
              await this.executeLoginStep(page, step);
              break;

            case 'crawl':
              await this.executeCrawlStep(page, step, allDomains, allIPs);
              break;

            case 'wait':
              await this.executeWaitStep(step);
              break;

            case 'click':
              await this.executeClickStep(page, step);
              break;

            case 'fill':
              await this.executeFillStep(page, step);
              break;

            case 'auto-click':
              await this.executeAutoClickStep(page, step);
              break;

            case 'auto-hover':
              await this.executeAutoHoverStep(page, step);
              break;

            case 'auto-scroll':
              await this.executeAutoScrollStep(page, step);
              break;

            case 'auto-fill':
              await this.executeAutoFillStep(page, step);
              break;

            case 'intelligent':
              await this.executeIntelligentStep(page, step);
              break;

            default:
              console.warn(`Unknown step type: ${step.type}`);
          }

          console.log(`Step ${i + 1} completed successfully`);
        } catch (error) {
          console.error(`Error in step ${i + 1}:`, error);
          throw new Error(`Step ${i + 1} (${step.name}) failed: ${error.message}`);
        }
      }

      // DNS 해석 (IP 수집)
      for (const [domain, info] of allDomains) {
        try {
          const addresses = await dns.promises.resolve(domain);
          addresses.forEach(ip => {
            allIPs.add(ip);
            if (ip.includes(':')) {
              info.ipv6.push(ip);
            } else {
              info.ipv4.push(ip);
            }
          });
        } catch (error) {
          // DNS 해석 실패는 무시
        }
      }

      // 결과 반환
      const domainList = Array.from(allDomains.values()).map(info => ({
        ...info,
        types: Array.from(info.types)
      })).sort((a, b) => b.count - a.count);

      const cdnList = Array.from(cdnServices.values()).map(cdn => ({
        ...cdn,
        domains: Array.from(cdn.domains)
      }));

      const serviceList = Array.from(thirdPartyServices.values()).map(service => ({
        ...service,
        domains: Array.from(service.domains)
      }));

      return {
        success: true,
        totalDomains: domainList.length,
        totalIPs: allIPs.size,
        totalCDNs: cdnList.length,
        totalServices: serviceList.length,
        totalResources: resourceDetails.length,
        domains: domainList,
        allIPs: Array.from(allIPs).sort(),
        cdnServices: cdnList,
        thirdPartyServices: serviceList,
        resourceDetails: resourceDetails,
        resourceStats: resourceStats,
        protocolStats: protocolStats
      };

    } catch (error) {
      console.error('Workflow execution error:', error);
      return {
        success: false,
        error: error.message,
        domains: [],
        allIPs: []
      };
    } finally {
      // 정리
      try {
        if (page) await page.close().catch(() => {});
        if (context) await context.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      } catch (error) {
        console.error('Error during workflow cleanup:', error);
      }
    }
  }

  // 워크플로우 단계 실행 메소드들

  async executeNavigateStep(page, step) {
    const url = step.config.url;
    const wait = parseInt(step.config.wait) || 5;

    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(wait * 1000);
    console.log('Navigation complete');
  }

  async executeLoginStep(page, step) {
    const maxWait = parseInt(step.config.maxWait) || 120;

    console.log(`Waiting for manual login (max ${maxWait} seconds)`);
    console.log('User should complete login in the browser window');

    // 여기서는 간단히 대기만 합니다
    // 실제로는 BrowserWindow를 통해 사용자에게 로그인 완료 신호를 받아야 하지만
    // 워크플로우에서는 자동으로 maxWait 시간만큼 대기합니다
    await page.waitForTimeout(maxWait * 1000);

    console.log('Login wait period complete');
  }

  async executeCrawlStep(page, step, allDomains, allIPs) {
    const depth = parseInt(step.config.depth) || 1;
    const sameDomain = step.config.sameDomain !== false;
    const wait = parseInt(step.config.wait) || 5;

    console.log(`Crawling with depth ${depth}, sameDomain: ${sameDomain}`);

    const currentUrl = page.url();
    const baseHostname = new URL(currentUrl).hostname;

    // 현재 페이지 크롤링
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(wait * 1000);

    if (depth > 0) {
      // 링크 추출 및 크롤링
      const visitedUrls = new Set([currentUrl]);
      await this.crawlPage(page, currentUrl, depth, sameDomain, baseHostname, visitedUrls, wait);
    }

    console.log('Crawl complete');
  }

  async executeWaitStep(step) {
    const duration = parseInt(step.config.duration) || 5;
    console.log(`Waiting for ${duration} seconds`);
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
    console.log('Wait complete');
  }

  async executeClickStep(page, step) {
    const selector = step.config.selector;
    const wait = parseInt(step.config.wait) || 2;

    console.log(`Clicking element: ${selector}`);

    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      await page.click(selector);
      await page.waitForTimeout(wait * 1000);
      console.log('Click complete');
    } catch (error) {
      throw new Error(`Failed to click ${selector}: ${error.message}`);
    }
  }

  async executeFillStep(page, step) {
    const selector = step.config.selector;
    const value = step.config.value;

    console.log(`Filling ${selector} with value`);

    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      await page.fill(selector, value);
      console.log('Fill complete');
    } catch (error) {
      throw new Error(`Failed to fill ${selector}: ${error.message}`);
    }
  }

  // 자동 클릭 단계 실행
  async executeAutoClickStep(page, step) {
    const maxClicks = parseInt(step.config.maxClicks) || 50;
    const clickDelay = parseInt(step.config.clickDelay) || 500;
    const excludeSelectors = step.config.excludeSelectors ?
      step.config.excludeSelectors.split(',').map(s => s.trim()).filter(s => s) :
      ['.logout', '.delete', '.close', '[href*="logout"]', '[href*="signout"]'];

    console.log(`Auto-clicking elements (max: ${maxClicks}, delay: ${clickDelay}ms)`);

    try {
      const clickedElements = new Set();
      let clickCount = 0;

      // 클릭 가능한 모든 요소 찾기
      const clickableSelectors = [
        'button:not([disabled])',
        'a[href]',
        '[role="button"]',
        '[onclick]',
        '.btn',
        '.button',
        'input[type="submit"]',
        'input[type="button"]'
      ];

      for (const selector of clickableSelectors) {
        if (clickCount >= maxClicks) break;

        const elements = await page.$$(selector);

        for (const element of elements) {
          if (clickCount >= maxClicks) break;

          try {
            // 제외 선택자 체크
            let shouldSkip = false;
            for (const excludeSelector of excludeSelectors) {
              const matches = await element.evaluate((el, sel) => {
                try {
                  return el.matches(sel);
                } catch {
                  return false;
                }
              }, excludeSelector);

              if (matches) {
                shouldSkip = true;
                break;
              }
            }

            if (shouldSkip) continue;

            // 요소가 보이는지 확인
            const isVisible = await element.isVisible();
            if (!isVisible) continue;

            // 이미 클릭한 요소인지 체크 (DOM 경로로)
            const elementPath = await element.evaluate(el => {
              const path = [];
              let current = el;
              while (current && current !== document.body) {
                let selector = current.tagName.toLowerCase();
                if (current.id) selector += '#' + current.id;
                if (current.className) selector += '.' + current.className.split(' ').join('.');
                path.unshift(selector);
                current = current.parentElement;
              }
              return path.join(' > ');
            });

            if (clickedElements.has(elementPath)) continue;

            // 클릭 시도
            await element.click({ timeout: 3000 }).catch(() => {});
            clickedElements.add(elementPath);
            clickCount++;

            console.log(`Clicked element ${clickCount}/${maxClicks}`);
            await page.waitForTimeout(clickDelay);

          } catch (error) {
            // 개별 클릭 실패는 무시하고 계속
            console.log(`Failed to click element, continuing...`);
          }
        }
      }

      console.log(`Auto-click complete: ${clickCount} elements clicked`);
    } catch (error) {
      console.error('Auto-click error:', error);
      throw new Error(`Auto-click failed: ${error.message}`);
    }
  }

  // 자동 호버 단계 실행
  async executeAutoHoverStep(page, step) {
    const hoverSelector = step.config.hoverSelector || '.menu, .dropdown, nav';
    const hoverDuration = parseInt(step.config.hoverDuration) || 1000;
    const maxHovers = parseInt(step.config.maxHovers) || 20;

    console.log(`Auto-hovering elements (selectors: ${hoverSelector}, duration: ${hoverDuration}ms)`);

    try {
      const selectors = hoverSelector.split(',').map(s => s.trim()).filter(s => s);
      let hoverCount = 0;

      for (const selector of selectors) {
        if (hoverCount >= maxHovers) break;

        const elements = await page.$$(selector);

        for (const element of elements) {
          if (hoverCount >= maxHovers) break;

          try {
            const isVisible = await element.isVisible();
            if (!isVisible) continue;

            await element.hover({ timeout: 3000 });
            hoverCount++;

            console.log(`Hovered element ${hoverCount}/${maxHovers}`);
            await page.waitForTimeout(hoverDuration);

            // 호버로 나타난 요소들이 로드될 시간 추가 대기
            await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

          } catch (error) {
            console.log(`Failed to hover element, continuing...`);
          }
        }
      }

      console.log(`Auto-hover complete: ${hoverCount} elements hovered`);
    } catch (error) {
      console.error('Auto-hover error:', error);
      throw new Error(`Auto-hover failed: ${error.message}`);
    }
  }

  // 자동 스크롤 단계 실행
  async executeAutoScrollStep(page, step) {
    const scrollMethod = step.config.scrollMethod || 'smooth';
    const scrollDelay = parseInt(step.config.scrollDelay) || 1000;
    const maxScrolls = parseInt(step.config.maxScrolls) || 10;

    console.log(`Auto-scrolling (method: ${scrollMethod}, delay: ${scrollDelay}ms)`);

    try {
      let scrollCount = 0;
      let previousHeight = 0;

      while (scrollCount < maxScrolls) {
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);

        if (currentHeight === previousHeight && scrollCount > 0) {
          console.log('Reached end of page');
          break;
        }

        previousHeight = currentHeight;

        if (scrollMethod === 'smooth') {
          // 부드러운 스크롤
          await page.evaluate(() => {
            window.scrollBy({
              top: window.innerHeight * 0.8,
              behavior: 'smooth'
            });
          });
        } else if (scrollMethod === 'step') {
          // 단계별 스크롤
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
          });
        } else if (scrollMethod === 'full') {
          // 전체 스크롤
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
        }

        scrollCount++;
        console.log(`Scrolled ${scrollCount}/${maxScrolls}`);

        await page.waitForTimeout(scrollDelay);
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
      }

      // 맨 위로 스크롤
      await page.evaluate(() => window.scrollTo(0, 0));

      console.log(`Auto-scroll complete: ${scrollCount} scrolls performed`);
    } catch (error) {
      console.error('Auto-scroll error:', error);
      throw new Error(`Auto-scroll failed: ${error.message}`);
    }
  }

  // 자동 폼 입력 단계 실행
  async executeAutoFillStep(page, step) {
    const formDataStr = step.config.formData || '{}';
    const fillVisible = step.config.fillVisible !== false;
    const wait = parseInt(step.config.wait) || 2;

    console.log(`Auto-filling forms (visible only: ${fillVisible})`);

    try {
      let formData = {};
      try {
        formData = JSON.parse(formDataStr);
      } catch (e) {
        console.warn('Invalid JSON for form data, using sample data');
        formData = {
          name: 'Test User',
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test123!',
          phone: '010-1234-5678',
          message: 'This is a test message'
        };
      }

      // 모든 input 필드 찾기
      const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');

      for (const input of inputs) {
        try {
          if (fillVisible) {
            const isVisible = await input.isVisible();
            if (!isVisible) continue;
          }

          const type = await input.getAttribute('type');
          const name = await input.getAttribute('name');
          const id = await input.getAttribute('id');
          const placeholder = await input.getAttribute('placeholder');

          // 적절한 값 찾기
          let value = '';

          if (name && formData[name]) {
            value = formData[name];
          } else if (id && formData[id]) {
            value = formData[id];
          } else {
            // 타입/이름/placeholder 기반으로 추측
            const fieldText = `${name} ${id} ${placeholder}`.toLowerCase();

            if (fieldText.includes('email') || type === 'email') {
              value = formData.email || 'test@example.com';
            } else if (fieldText.includes('name')) {
              value = formData.name || 'Test User';
            } else if (fieldText.includes('user')) {
              value = formData.username || 'testuser';
            } else if (fieldText.includes('pass') || type === 'password') {
              value = formData.password || 'Test123!';
            } else if (fieldText.includes('phone') || fieldText.includes('tel') || type === 'tel') {
              value = formData.phone || '010-1234-5678';
            } else if (type === 'number') {
              value = '123';
            } else if (type === 'date') {
              value = '2024-01-01';
            } else if (type === 'checkbox') {
              await input.check();
              continue;
            } else if (type === 'radio') {
              await input.check();
              continue;
            } else {
              value = formData[Object.keys(formData)[0]] || 'test';
            }
          }

          if (value && type !== 'checkbox' && type !== 'radio') {
            await input.fill(String(value));
            console.log(`Filled field: ${name || id || type}`);
          }

        } catch (error) {
          console.log(`Failed to fill input, continuing...`);
        }
      }

      // textarea 처리
      const textareas = await page.$$('textarea');
      for (const textarea of textareas) {
        try {
          if (fillVisible) {
            const isVisible = await textarea.isVisible();
            if (!isVisible) continue;
          }

          const value = formData.message || 'This is a test message';
          await textarea.fill(value);
          console.log('Filled textarea');
        } catch (error) {
          console.log(`Failed to fill textarea, continuing...`);
        }
      }

      // select 처리
      const selects = await page.$$('select');
      for (const select of selects) {
        try {
          if (fillVisible) {
            const isVisible = await select.isVisible();
            if (!isVisible) continue;
          }

          const options = await select.$$('option');
          if (options.length > 1) {
            await select.selectOption({ index: 1 });
            console.log('Selected option');
          }
        } catch (error) {
          console.log(`Failed to select option, continuing...`);
        }
      }

      await page.waitForTimeout(wait * 1000);
      console.log('Auto-fill complete');

    } catch (error) {
      console.error('Auto-fill error:', error);
      throw new Error(`Auto-fill failed: ${error.message}`);
    }
  }

  // 지능형 탐색 단계 실행
  async executeIntelligentStep(page, step) {
    const exploreDepth = parseInt(step.config.exploreDepth) || 2;
    const maxTimePerElement = parseInt(step.config.maxTimePerElement) || 3;
    const avoidLogout = step.config.avoidLogout !== false;
    const clickButtons = step.config.clickButtons !== false;
    const hoverMenus = step.config.hoverMenus !== false;

    console.log(`Intelligent exploration (depth: ${exploreDepth}, max time per element: ${maxTimePerElement}s)`);

    try {
      const exploredElements = new Set();

      // 로그아웃/위험 패턴
      const dangerousPatterns = avoidLogout ? [
        'logout', 'log-out', 'signout', 'sign-out', 'exit',
        'delete', 'remove', 'cancel', 'close-account'
      ] : [];

      for (let depth = 0; depth < exploreDepth; depth++) {
        console.log(`Exploration depth ${depth + 1}/${exploreDepth}`);

        // 1. 메뉴 호버
        if (hoverMenus) {
          const menuSelectors = ['nav', '.menu', '.dropdown', '[role="menu"]', 'header'];
          for (const selector of menuSelectors) {
            const elements = await page.$$(selector);
            for (const el of elements.slice(0, 5)) {
              try {
                const isVisible = await el.isVisible();
                if (isVisible) {
                  await el.hover({ timeout: 2000 });
                  await page.waitForTimeout(800);
                }
              } catch (e) {
                // 무시
              }
            }
          }
        }

        // 2. 중요 버튼 클릭
        if (clickButtons) {
          const buttonSelectors = [
            'button:not([disabled])',
            '.btn:not(.btn-danger)',
            '[role="button"]',
            'a.button'
          ];

          for (const selector of buttonSelectors) {
            const buttons = await page.$$(selector);

            for (const btn of buttons.slice(0, 10)) {
              try {
                const isVisible = await btn.isVisible();
                if (!isVisible) continue;

                // 텍스트로 위험 버튼 체크
                const text = await btn.textContent();
                const isDangerous = dangerousPatterns.some(pattern =>
                  text.toLowerCase().includes(pattern)
                );

                if (isDangerous) {
                  console.log(`Skipping dangerous button: ${text}`);
                  continue;
                }

                // 요소 경로 생성
                const elementPath = await btn.evaluate(el => {
                  const path = [];
                  let current = el;
                  while (current && current !== document.body) {
                    let selector = current.tagName.toLowerCase();
                    if (current.id) selector += '#' + current.id;
                    path.unshift(selector);
                    current = current.parentElement;
                  }
                  return path.join('>');
                });

                if (exploredElements.has(elementPath)) continue;

                // 클릭
                await btn.click({ timeout: maxTimePerElement * 1000 }).catch(() => {});
                exploredElements.add(elementPath);

                await page.waitForTimeout(1000);
                await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

              } catch (e) {
                // 개별 실패 무시
              }
            }
          }
        }

        // 3. 스크롤하여 레이지 로딩 트리거
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(1000);

        // 4. 네트워크가 안정될 때까지 대기
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      }

      // 원래 위치로 스크롤
      await page.evaluate(() => window.scrollTo(0, 0));

      console.log(`Intelligent exploration complete: ${exploredElements.size} elements explored`);

    } catch (error) {
      console.error('Intelligent exploration error:', error);
      throw new Error(`Intelligent exploration failed: ${error.message}`);
    }
  }

  // 크롤링 헬퍼 메소드 (재귀적 크롤링)
  async crawlPage(page, url, remainingDepth, sameDomain, baseHostname, visitedUrls, wait) {
    if (remainingDepth <= 0) return;

    try {
      // 현재 페이지의 링크 추출
      const links = await page.evaluate(() => {
        const foundLinks = new Set();
        const anchors = Array.from(document.querySelectorAll('a[href]'));

        anchors.forEach(a => {
          try {
            const href = a.href;
            if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
              foundLinks.add(href);
            }
          } catch (e) {
            // 무시
          }
        });

        return Array.from(foundLinks);
      });

      console.log(`Found ${links.length} links at depth ${remainingDepth}`);

      // 각 링크 탐색
      for (const link of links.slice(0, 10)) { // 최대 10개 링크만
        if (visitedUrls.has(link)) continue;

        try {
          const linkUrl = new URL(link);

          // 같은 도메인 체크
          if (sameDomain && linkUrl.hostname !== baseHostname) {
            continue;
          }

          visitedUrls.add(link);
          console.log(`Crawling: ${link}`);

          await page.goto(link, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(wait * 1000);

          // 재귀 크롤링
          await this.crawlPage(page, link, remainingDepth - 1, sameDomain, baseHostname, visitedUrls, wait);

        } catch (error) {
          console.log(`Failed to crawl ${link}:`, error.message);
          continue;
        }
      }

    } catch (error) {
      console.error('Error during crawl:', error);
    }
  }
}

module.exports = PlaywrightController;