/**
 * Domain Tracker - Tracking Service
 *
 * 통합 트래킹 서비스입니다.
 * PlaywrightController를 대체하며, 모든 하위 서비스를 조합합니다.
 *
 * 의존성:
 * - BrowserManager: 브라우저 라이프사이클 관리
 * - NetworkMonitor: 네트워크 모니터링
 * - WebCrawler: 웹 크롤링
 * - PageInteractor: 페이지 상호작용
 * - IDNSResolver: DNS 해석
 * - IDetector: CDN/서드파티 감지
 * - IBrowserAutomation: 브라우저 자동화
 */

import { Injectable, Inject } from '../decorators';
import { DomainInfo, AnalysisOptions, AnalysisResult, AppConfig, WorkflowStep } from '../types';
import { BrowserManager } from './BrowserManager';
import { NetworkMonitor } from './NetworkMonitor';
import { WebCrawler } from './WebCrawler';
import { PageInteractor } from './PageInteractor';
import { IDNSResolver } from '../interfaces/IDNSResolver';
import { IDetector } from '../interfaces/IDetector';
import { IBrowserAutomation } from '../interfaces/IBrowserAutomation';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * TrackingService 클래스
 *
 * Domain Tracker의 핵심 기능을 제공하는 통합 서비스입니다.
 */
@Injectable()
export class TrackingService {
  private browserManager: BrowserManager;
  private networkMonitor: NetworkMonitor;
  private webCrawler: WebCrawler;
  private pageInteractor: PageInteractor;
  private dnsResolver: IDNSResolver;

  // 로그인 관련
  private loginCompleteResolver: (() => void) | null = null;
  private currentAnalysisId: string | null = null;

  /**
   * 생성자
   *
   * @param automation - 브라우저 자동화 어댑터
   * @param detector - CDN/서드파티 감지 서비스
   * @param dnsResolver - DNS 해석 서비스
   * @param config - 애플리케이션 설정
   */
  constructor(
    @Inject('IBrowserAutomation') automation: IBrowserAutomation,
    @Inject('IDetector') detector: IDetector,
    @Inject('IDNSResolver') dnsResolver: IDNSResolver,
    config: AppConfig
  ) {
    console.log('[TrackingService] Initializing...');

    // DNS Resolver 저장
    this.dnsResolver = dnsResolver;

    // 하위 서비스 생성
    this.browserManager = new BrowserManager(config.browser, automation);
    this.networkMonitor = new NetworkMonitor(detector, dnsResolver);
    this.webCrawler = new WebCrawler(config.crawler);
    this.pageInteractor = new PageInteractor(
      config.crawler.clickTimeout,
      config.crawler.scrollDelay
    );

    console.log('[TrackingService] Initialized successfully');
  }

  /**
   * 수동 트래킹을 시작합니다.
   *
   * 사용자가 직접 브라우저를 조작하면서 도메인을 수집합니다.
   */
  async startTracking(): Promise<void> {
    console.log('[TrackingService] Starting manual tracking...');

    if (this.browserManager.isRunning()) {
      throw new Error('Tracking is already in progress');
    }

    try {
      // 브라우저 시작 (headless: false - GUI 모드)
      await this.browserManager.startBrowser(false);

      const page = this.browserManager.getPage();
      const context = this.browserManager.getContext();

      // 네트워크 모니터링 시작 (초기 페이지)
      this.networkMonitor.startMonitoring(page);

      // Navigation 이벤트 로깅 (redirect 추적)
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          console.log(`[TrackingService] Main frame navigated to: ${frame.url()}`);
        }
      });

      // 새로 생성되는 모든 페이지/탭에 대해 자동으로 모니터링 시작
      context.on('page', (newPage) => {
        console.log('[TrackingService] New tab/page detected, starting monitoring...');
        this.networkMonitor.startMonitoring(newPage);

        // 새 탭에도 navigation 로깅 추가
        newPage.on('framenavigated', (frame) => {
          if (frame === newPage.mainFrame()) {
            console.log(`[TrackingService] New tab navigated to: ${frame.url()}`);
          }
        });
      });

      // 빈 페이지로 시작 (사용자가 URL 직접 입력)
      await page.goto('about:blank');

      console.log('[TrackingService] Manual tracking started successfully');
      console.log('[TrackingService] All new tabs will be automatically monitored');
    } catch (error) {
      await this.browserManager.stopBrowser();
      throw error;
    }
  }

  /**
   * 트래킹을 중지하고 수집된 데이터를 반환합니다.
   *
   * @returns 수집된 도메인 및 IP 목록
   */
  async stopTracking(): Promise<{ domains: DomainInfo[], ips: string[] }> {
    console.log('[TrackingService] Stopping tracking...');

    if (!this.browserManager.isRunning()) {
      throw new Error('No tracking session is in progress');
    }

    try {
      // 네트워크 모니터링 중지 및 결과 수집 (모든 페이지/탭)
      const result = this.networkMonitor.stopMonitoring();

      // 브라우저 종료
      await this.browserManager.stopBrowser();

      console.log(`[TrackingService] Tracking stopped. Collected ${result.domains.length} domains, ${result.ips.length} IPs`);

      return result;
    } catch (error) {
      await this.browserManager.stopBrowser();
      throw error;
    }
  }

  /**
   * URL을 자동으로 분석합니다.
   *
   * @param targetUrl - 분석할 URL
   * @param options - 분석 옵션
   * @returns 분석 결과
   */
  async analyzeUrl(targetUrl: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    console.log(`[TrackingService] Analyzing URL: ${targetUrl}`);

    const {
      waitTime = 5000,
      maxWaitTime = 30000,
      requiresLogin = false,
      analysisId = null,
      savedSession = null,
      crawlDepth = 0,
      sameDomainOnly = true,
      onProgress = undefined
    } = options;

    try {
      // 분석 ID 저장
      if (analysisId) {
        this.currentAnalysisId = analysisId;
      }

      console.log(`- Requires Login: ${requiresLogin}`);
      console.log(`- Crawl Depth: ${crawlDepth}`);
      console.log(`- Same Domain Only: ${sameDomainOnly}`);

      // 브라우저 컨텍스트 옵션
      const contextOptions: any = {
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        javaScriptEnabled: true,
        serviceWorkers: 'block'
      };

      // 저장된 세션 로드
      if (savedSession && fs.existsSync(savedSession)) {
        console.log(`✓ Loading saved session from: ${savedSession}`);
        contextOptions.storageState = savedSession;
      }

      if (requiresLogin) {
        contextOptions.viewport = null;
      }

      // 브라우저 시작
      await this.browserManager.startBrowser(!requiresLogin, contextOptions);

      const page = this.browserManager.getPage();
      const context = this.browserManager.getContext();

      // 네트워크 모니터링 시작 (초기 페이지)
      this.networkMonitor.startMonitoring(page);

      // Navigation 이벤트 로깅 (redirect 추적)
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          console.log(`[TrackingService] → Navigated to: ${frame.url()}`);
        }
      });

      // 새로 생성되는 모든 페이지/탭에 대해 자동으로 모니터링 시작
      context.on('page', (newPage) => {
        console.log('[TrackingService] New tab/page detected during analysis, starting monitoring...');
        this.networkMonitor.startMonitoring(newPage);

        // 새 탭에도 navigation 로깅 추가
        newPage.on('framenavigated', (frame) => {
          if (frame === newPage.mainFrame()) {
            console.log(`[TrackingService] → New tab navigated to: ${frame.url()}`);
          }
        });
      });

      // 페이지 로드 (리다이렉트 적극 처리)
      console.log('→ Loading page...');

      try {
        // 매우 짧은 timeout으로 시도 - 리다이렉트 페이지는 즉시 이동함
        await Promise.race([
          page.goto(targetUrl, {
            waitUntil: 'commit',
            timeout: 2000 // 2초만 대기
          }),
          // 2초 후 강제로 resolve
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);

        console.log(`→ Initial navigation complete, current URL: ${page.url()}`);
      } catch (error: any) {
        // 에러 무시하고 계속 진행
        console.log(`⚠ Navigation error (normal for redirects), current URL: ${page.url()}`);
      }

      // 짧은 대기 후 URL 변경 확인
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      if (currentUrl !== targetUrl && currentUrl !== 'about:blank') {
        console.log(`→ Redirected to: ${currentUrl}`);

        // 리다이렉트된 페이지 로드 대기 (더 관대한 조건)
        try {
          await Promise.race([
            page.waitForLoadState('domcontentloaded', { timeout: 10000 }),
            page.waitForTimeout(5000) // 5초 후 강제 종료
          ]);
          console.log('✓ Redirect target loaded');
        } catch (e) {
          console.log('⚠ Redirect target load timeout, continuing anyway...');
        }
      } else if (currentUrl === 'about:blank' || currentUrl === targetUrl) {
        // 여전히 원본 URL이거나 blank면 좀 더 대기
        console.log('→ Waiting for redirect to complete...');
        await page.waitForTimeout(3000);

        const finalUrl = page.url();
        if (finalUrl !== targetUrl && finalUrl !== 'about:blank') {
          console.log(`→ Redirected to: ${finalUrl}`);
          try {
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
          } catch (e) {
            console.log('⚠ Final page load timeout, continuing...');
          }
        }
      }

      console.log(`✓ Page ready at: ${page.url()}`);

      // 로그인 필요한 경우 사용자 대기
      if (requiresLogin) {
        console.log('→ Waiting for user to complete login...');
        await this.waitForLoginComplete();
        console.log('✓ Login completed, continuing analysis...');

        // 세션 저장
        const context = this.browserManager.getContext();
        const sessionPath = path.join(os.homedir(), '.domain-tracker-session.json');
        await context.storageState({ path: sessionPath });
        console.log(`✓ Session saved to: ${sessionPath}`);
      }

      // 네트워크 안정화 대기
      console.log('→ Waiting for network idle...');
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        console.log('⚠ Network idle timeout, continuing...');
      }

      // 스크롤하여 lazy loading 트리거
      console.log('→ Scrolling to trigger lazy-loaded resources...');
      await this.pageInteractor.autoScroll(page, 'step', 5);

      // 동적 콘텐츠 대기
      console.log(`→ Waiting ${waitTime}ms for dynamic content...`);
      await page.waitForTimeout(waitTime);

      // Depth 기반 크롤링
      if (crawlDepth > 0) {
        console.log(`\n=== Starting depth-based crawling (depth: ${crawlDepth}) ===`);
        await this.webCrawler.crawl(page, targetUrl, crawlDepth, sameDomainOnly, onProgress);
      }

      // 결과 수집 (모든 모니터링 중인 페이지)
      const result = this.networkMonitor.stopMonitoring();

      // DNS 해석
      console.log('→ Starting DNS resolution for all domains...');
      const domains = result.domains.map(d => d.domain);
      const ipResolutions = await this.dnsResolver.resolveBatch(domains, true);

      // IP 정보를 도메인 목록에 추가
      result.domains.forEach(domainInfo => {
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
      const allIPs = new Set<string>();
      result.domains.forEach(domainInfo => {
        domainInfo.ipv4?.forEach(ip => allIPs.add(ip));
        domainInfo.ipv6?.forEach(ip => allIPs.add(ip));
      });

      console.log(`✓ DNS resolution complete. Found ${allIPs.size} unique IP addresses`);

      // 브라우저 종료
      await this.browserManager.stopBrowser();

      console.log(`\n✓ Analysis complete. Found ${result.domains.length} unique domains`);

      return {
        success: true,
        url: targetUrl,
        timestamp: new Date().toISOString(),
        totalDomains: result.domains.length,
        totalIPs: allIPs.size,
        domains: result.domains,
        allIPs: Array.from(allIPs)
      };
    } catch (error) {
      await this.browserManager.stopBrowser();
      console.error('[TrackingService] Analysis failed:', error);
      return {
        success: false,
        url: targetUrl,
        error: (error as Error).message,
        domains: []
      };
    }
  }

  /**
   * 워크플로우를 실행합니다.
   *
   * 주의: 이 메서드는 간소화된 버전입니다.
   * 전체 워크플로우 기능은 PlaywrightController.runWorkflow()를 참조하세요.
   *
   * @param steps - 워크플로우 단계 배열
   * @returns 실행 결과
   */
  async runWorkflow(steps: WorkflowStep[]): Promise<AnalysisResult> {
    console.log(`[TrackingService] Workflow execution not yet implemented in refactored version`);
    console.log(`[TrackingService] Please use PlaywrightController.runWorkflow() for now`);

    // TODO: Strategy + Factory 패턴으로 구현
    // 현재는 기본 오류 응답 반환
    return {
      success: false,
      error: 'Workflow execution not yet implemented in refactored TrackingService',
      domains: []
    };
  }

  /**
   * 현재까지 수집된 도메인 목록을 가져옵니다.
   *
   * @returns 도메인 정보 목록
   */
  getCurrentDomains(): { domains: DomainInfo[], ips: string[] } {
    if (!this.browserManager.isRunning()) {
      return { domains: [], ips: [] };
    }

    const domains = this.networkMonitor.getCurrentDomains();
    const ips = this.networkMonitor.getCurrentIPs();

    return { domains, ips };
  }

  /**
   * 트래킹 상태를 확인합니다.
   *
   * @returns 트래킹 중이면 true
   */
  isTracking(): boolean {
    return this.browserManager.isRunning() && this.networkMonitor.isActive();
  }

  /**
   * 로그인 완료 신호를 받습니다.
   *
   * @param analysisId - 분석 ID
   */
  signalLoginComplete(analysisId: string): void {
    console.log(`[TrackingService] Login complete signal received for analysis: ${analysisId}`);

    if (this.currentAnalysisId === analysisId && this.loginCompleteResolver) {
      this.loginCompleteResolver();
      this.loginCompleteResolver = null;
      this.currentAnalysisId = null;
    }
  }

  /**
   * 로그인 완료를 기다립니다.
   *
   * @returns Promise
   */
  private async waitForLoginComplete(): Promise<void> {
    return new Promise((resolve) => {
      this.loginCompleteResolver = resolve;
    });
  }

  /**
   * Manual Tracking 중에 현재 페이지부터 자동 크롤링을 시작합니다.
   *
   * @param depth - 크롤링 깊이 (0-3)
   * @param maxLinks - 각 깊이별 최대 링크 수
   * @param onProgress - 진행 상황 콜백
   */
  async startAutoCrawling(
    depth: number = 1,
    maxLinks: number = 10,
    onProgress?: (message: string) => void
  ): Promise<void> {
    console.log(`[TrackingService] Starting auto-crawling (depth: ${depth}, maxLinks: ${maxLinks})`);

    if (!this.browserManager.isRunning()) {
      throw new Error('Browser is not running. Start tracking first.');
    }

    const page = this.browserManager.getPage();
    const currentUrl = page.url();

    if (!currentUrl || currentUrl === 'about:blank') {
      throw new Error('No page loaded. Navigate to a page first.');
    }

    try {
      // 진행 상황 보고
      const reportProgress = (msg: string) => {
        console.log(`[Auto-Crawl] ${msg}`);
        if (onProgress) {
          onProgress(msg);
        }
      };

      reportProgress(`Starting from: ${currentUrl}`);

      // 방문한 URL 추적 (중복 방지)
      const visitedUrls = new Set<string>([currentUrl]);

      // 도메인 추출 (same domain only)
      const startDomain = new URL(currentUrl).hostname;
      reportProgress(`Base domain: ${startDomain}`);

      // 재귀 크롤링 함수
      const crawlRecursive = async (url: string, currentDepth: number): Promise<void> => {
        if (currentDepth > depth) {
          return;
        }

        reportProgress(`[Depth ${currentDepth}] Visiting: ${url}`);

        try {
          // 페이지 이동
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });

          // 페이지 로드 대기
          await page.waitForTimeout(2000);

          reportProgress(`[Depth ${currentDepth}] Page loaded, extracting links...`);

          // 링크 추출
          const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors
              .map(a => (a as HTMLAnchorElement).href)
              .filter(href => href && (href.startsWith('http://') || href.startsWith('https://')));
          });

          reportProgress(`[Depth ${currentDepth}] Found ${links.length} links`);

          // 같은 도메인의 링크만 필터링
          const sameDomainLinks = links.filter(link => {
            try {
              const linkDomain = new URL(link).hostname;
              return linkDomain === startDomain;
            } catch {
              return false;
            }
          });

          reportProgress(`[Depth ${currentDepth}] ${sameDomainLinks.length} same-domain links`);

          // 아직 방문하지 않은 링크 선택
          const unvisitedLinks = sameDomainLinks
            .filter(link => !visitedUrls.has(link))
            .slice(0, maxLinks); // 최대 링크 수 제한

          reportProgress(`[Depth ${currentDepth}] ${unvisitedLinks.length} new links to visit`);

          // 방문한 것으로 표시
          unvisitedLinks.forEach(link => visitedUrls.add(link));

          // 다음 깊이로 재귀 크롤링
          if (currentDepth < depth) {
            for (const link of unvisitedLinks) {
              await crawlRecursive(link, currentDepth + 1);
            }
          }
        } catch (error) {
          reportProgress(`[Depth ${currentDepth}] Error: ${(error as Error).message}`);
          // 에러가 발생해도 계속 진행
        }
      };

      // 크롤링 시작
      await crawlRecursive(currentUrl, 0);

      reportProgress(`Crawling completed! Visited ${visitedUrls.size} pages total.`);
    } catch (error) {
      console.error('[TrackingService] Auto-crawling error:', error);
      throw error;
    }
  }

  /**
   * 현재 브라우저 세션을 저장합니다.
   *
   * @param sessionPath - 세션 파일 경로
   */
  async saveSession(sessionPath: string): Promise<void> {
    console.log(`[TrackingService] Saving session to: ${sessionPath}`);

    if (!this.browserManager.isRunning()) {
      throw new Error('Browser is not running. Start tracking first.');
    }

    const context = this.browserManager.getContext();

    try {
      // 세션 저장 (쿠키, localStorage, sessionStorage)
      await context.storageState({ path: sessionPath });
      console.log('[TrackingService] Session saved successfully');
    } catch (error) {
      console.error('[TrackingService] Error saving session:', error);
      throw error;
    }
  }

  /**
   * 저장된 세션을 로드합니다.
   *
   * Note: 브라우저 시작 전에 세션을 로드해야 합니다.
   * 브라우저가 이미 실행 중이면 재시작이 필요합니다.
   *
   * @param sessionPath - 세션 파일 경로
   */
  async loadSession(sessionPath: string): Promise<void> {
    console.log(`[TrackingService] Loading session from: ${sessionPath}`);

    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session file not found: ${sessionPath}`);
    }

    // 브라우저가 실행 중이면 재시작
    if (this.browserManager.isRunning()) {
      console.log('[TrackingService] Restarting browser to load session...');
      await this.browserManager.stopBrowser();
    }

    try {
      // 세션 파일 읽기
      const sessionData = fs.readFileSync(sessionPath, 'utf-8');
      const storageState = JSON.parse(sessionData);

      // 세션과 함께 브라우저 시작
      await this.browserManager.startBrowser(undefined, { storageState });

      // 네트워크 모니터링 시작
      const page = this.browserManager.getPage();
      this.networkMonitor.startMonitoring(page);

      console.log('[TrackingService] Session loaded and browser started');
    } catch (error) {
      console.error('[TrackingService] Error loading session:', error);
      throw error;
    }
  }

  /**
   * 리소스를 정리합니다.
   */
  async cleanup(): Promise<void> {
    console.log('[TrackingService] Cleaning up...');
    await this.browserManager.stopBrowser();
    this.networkMonitor.clear();
    this.webCrawler.clear();
    console.log('[TrackingService] Cleanup complete');
  }
}
