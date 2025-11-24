/**
 * Domain Tracker - Domain Block Tester Service
 *
 * 도메인 차단 시뮬레이션 테스트를 수행하는 서비스입니다.
 * 특정 도메인을 차단했을 때 웹사이트가 정상적으로 작동하는지 테스트합니다.
 */

import { Injectable, Inject } from '../decorators';
import { BrowserManager } from './BrowserManager';
import { Page, Route, ConsoleMessage } from 'playwright';
import {
  BlockTestOptions,
  BlockTestResult,
  BlockedRequest,
  AllowedRequest,
  PageError,
  ResourceType
} from '../types';

/**
 * DomainBlockTester
 *
 * 도메인 차단 테스트 서비스
 * - 블랙리스트 모드: 특정 도메인만 차단하고 나머지는 허용
 * - 화이트리스트 모드: 특정 도메인만 허용하고 나머지는 차단
 */
@Injectable()
export class DomainBlockTester {
  private isTestRunning: boolean = false;

  constructor(
    @Inject('BrowserManager') private browserManager: BrowserManager
  ) {
    console.log('[DomainBlockTester] Initialized');
  }

  /**
   * 도메인 차단 테스트 실행
   *
   * @param options 테스트 옵션
   * @returns 테스트 결과
   */
  async runTest(options: BlockTestOptions): Promise<BlockTestResult> {
    if (this.isTestRunning) {
      throw new Error('Test is already running');
    }

    this.isTestRunning = true;

    try {
      console.log('[DomainBlockTester] Starting test:', {
        url: options.url,
        mode: options.mode,
        domainsCount: options.domains.length
      });

      // 도메인 목록을 정규화 (소문자 변환, 중복 제거)
      const normalizedDomains = new Set(
        options.domains.map(d => d.trim().toLowerCase()).filter(d => d.length > 0)
      );

      // 브라우저 시작
      await this.browserManager.startBrowser(false); // headless = false
      const page: Page = this.browserManager.getPage();

      // 결과 저장용 변수
      const blocked: BlockedRequest[] = [];
      const allowed: AllowedRequest[] = [];
      const errors: PageError[] = [];

      // 네트워크 요청 가로채기 설정
      await page.route('**/*', (route: Route) => {
        try {
          const request = route.request();
          const url = request.url();
          const domain = this.extractDomain(url);
          const type = request.resourceType() as ResourceType;

          // 차단 여부 결정
          const shouldBlock = this.shouldBlockDomain(domain, normalizedDomains, options.mode);

          if (shouldBlock) {
            // 차단
            blocked.push({
              url,
              domain,
              type,
              timestamp: new Date().toISOString()
            });
            route.abort('blockedbyclient');
          } else {
            // 허용
            allowed.push({
              url,
              domain,
              type,
              timestamp: new Date().toISOString()
            });
            route.continue();
          }
        } catch (error) {
          console.error('[DomainBlockTester] Route error:', error);
          route.continue();
        }
      });

      // 콘솔 에러 캡처
      if (options.captureConsoleErrors !== false) {
        page.on('console', (msg: ConsoleMessage) => {
          if (msg.type() === 'error') {
            errors.push({
              message: msg.text(),
              timestamp: new Date().toISOString()
            });
          }
        });

        page.on('pageerror', (error: Error) => {
          errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });
        });
      }

      // 페이지 로딩
      console.log('[DomainBlockTester] Loading page:', options.url);
      await page.goto(options.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      }).catch((error: Error) => {
        console.error('[DomainBlockTester] Page load error:', error);
        errors.push({
          message: `Page load error: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      });

      // 대기 시간
      const waitTime = options.waitTime || 5000;
      console.log(`[DomainBlockTester] Waiting ${waitTime}ms...`);
      await page.waitForTimeout(waitTime);

      // 스크린샷 캡처
      let screenshot: string | undefined;
      if (options.captureScreenshot !== false) {
        try {
          const buffer = await page.screenshot({ fullPage: false });
          screenshot = buffer.toString('base64');
          console.log('[DomainBlockTester] Screenshot captured');
        } catch (error) {
          console.error('[DomainBlockTester] Screenshot error:', error);
        }
      }

      // 브라우저 종료
      await this.browserManager.stopBrowser();

      // 결과 생성
      const result: BlockTestResult = {
        success: true,
        url: options.url,
        mode: options.mode,
        timestamp: new Date().toISOString(),
        totalRequests: blocked.length + allowed.length,
        blockedRequests: blocked.length,
        allowedRequests: allowed.length,
        pageErrors: errors.length,
        blocked,
        allowed,
        errors,
        screenshot
      };

      console.log('[DomainBlockTester] Test completed:', {
        totalRequests: result.totalRequests,
        blockedRequests: result.blockedRequests,
        allowedRequests: result.allowedRequests,
        pageErrors: result.pageErrors
      });

      return result;
    } catch (error) {
      console.error('[DomainBlockTester] Test error:', error);

      // 브라우저 종료 시도
      try {
        await this.browserManager.stopBrowser();
      } catch (closeError) {
        console.error('[DomainBlockTester] Browser close error:', closeError);
      }

      return {
        success: false,
        url: options.url,
        mode: options.mode,
        timestamp: new Date().toISOString(),
        totalRequests: 0,
        blockedRequests: 0,
        allowedRequests: 0,
        pageErrors: 0,
        blocked: [],
        allowed: [],
        errors: [],
        error: (error as Error).message
      };
    } finally {
      this.isTestRunning = false;
    }
  }

  /**
   * 테스트 중지
   */
  async stopTest(): Promise<void> {
    if (!this.isTestRunning) {
      return;
    }

    console.log('[DomainBlockTester] Stopping test...');
    try {
      await this.browserManager.stopBrowser();
    } catch (error) {
      console.error('[DomainBlockTester] Stop test error:', error);
    }
    this.isTestRunning = false;
  }

  /**
   * URL에서 도메인 추출
   *
   * @param url URL
   * @returns 도메인
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (error) {
      return '';
    }
  }

  /**
   * 도메인을 차단해야 하는지 판단
   *
   * @param domain 도메인
   * @param domainList 도메인 목록
   * @param mode 차단 모드
   * @returns 차단 여부
   */
  private shouldBlockDomain(
    domain: string,
    domainList: Set<string>,
    mode: 'blacklist' | 'whitelist'
  ): boolean {
    // 도메인 정규화
    const normalizedDomain = domain.toLowerCase();

    if (mode === 'blacklist') {
      // 블랙리스트: 목록에 있으면 차단
      return domainList.has(normalizedDomain) || this.matchesWildcard(normalizedDomain, domainList);
    } else {
      // 화이트리스트: 목록에 없으면 차단
      return !domainList.has(normalizedDomain) && !this.matchesWildcard(normalizedDomain, domainList);
    }
  }

  /**
   * 와일드카드 매칭
   *
   * @param domain 도메인
   * @param domainList 도메인 목록
   * @returns 매칭 여부
   */
  private matchesWildcard(domain: string, domainList: Set<string>): boolean {
    for (const pattern of domainList) {
      if (pattern.startsWith('*.')) {
        // 와일드카드 패턴 (예: *.example.com)
        const suffix = pattern.substring(2);
        if (domain.endsWith(suffix) || domain === suffix.substring(1)) {
          return true;
        }
      } else if (pattern.startsWith('.')) {
        // 서브도메인 포함 (예: .example.com)
        if (domain.endsWith(pattern) || domain === pattern.substring(1)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 테스트 상태 확인
   *
   * @returns 테스트 실행 중 여부
   */
  isRunning(): boolean {
    return this.isTestRunning;
  }
}
