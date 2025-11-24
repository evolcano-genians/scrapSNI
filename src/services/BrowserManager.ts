/**
 * Domain Tracker - Browser Manager Service
 *
 * 브라우저 라이프사이클 관리 서비스입니다.
 * PlaywrightController에서 브라우저 관리 책임을 분리했습니다.
 *
 * SRP(Single Responsibility Principle) 준수:
 * - 브라우저 시작/종료만 담당
 * - 네트워크 모니터링, 크롤링 등의 책임은 다른 클래스로 분리
 */

import { Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { IBrowserAutomation } from '../interfaces/IBrowserAutomation';
import { BrowserConfig } from '../types';
import { Injectable, Inject } from '../decorators';

/**
 * BrowserManager 클래스
 *
 * 브라우저 인스턴스의 생성, 관리, 종료를 담당합니다.
 *
 * ✅ @Injectable() 데코레이터 적용
 * ✅ @Inject() 데코레이터로 의존성 명시
 */
@Injectable()
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * 생성자
   *
   * @param config - 브라우저 설정
   * @param automation - 브라우저 자동화 어댑터 (DI)
   */
  constructor(
    private config: BrowserConfig,
    @Inject('IBrowserAutomation') private automation: IBrowserAutomation
  ) {
    console.log('[BrowserManager] Initialized');
  }

  /**
   * 브라우저의 실행 경로를 찾습니다.
   *
   * 우선순위:
   * 1. 앱에 번들된 브라우저 (배포용)
   * 2. 시스템에 설치된 Playwright 브라우저 (개발용)
   *
   * @param browserType - 브라우저 타입 (chromium, firefox, webkit)
   * @returns 브라우저 실행 파일 경로, 없으면 null
   */
  private getBrowserPath(browserType: string): string | null {
    console.log(`[Browser Path] Starting search for ${browserType}...`);
    console.log('[Browser Path] Platform:', process.platform);
    console.log('[Browser Path] process.resourcesPath:', process.resourcesPath);

    let executableSubPath: string;
    let browserDirName: string;

    // 브라우저 타입별 디렉토리명 및 실행 파일 경로
    if (browserType === 'firefox') {
      browserDirName = 'firefox-1466'; // Playwright firefox version
      if (process.platform === 'win32') {
        executableSubPath = path.join('firefox', 'firefox.exe');
      } else if (process.platform === 'darwin') {
        executableSubPath = path.join('Firefox.app', 'Contents', 'MacOS', 'firefox');
      } else {
        executableSubPath = path.join('firefox', 'firefox');
      }
    } else if (browserType === 'webkit') {
      browserDirName = 'webkit-2104'; // Playwright webkit version
      if (process.platform === 'win32') {
        executableSubPath = path.join('MiniBrowser.exe');
      } else if (process.platform === 'darwin') {
        executableSubPath = path.join('Playwright.app', 'Contents', 'MacOS', 'Playwright');
      } else {
        executableSubPath = path.join('minibrowser-gtk', 'pw_run.sh');
      }
    } else {
      // chromium (default)
      browserDirName = 'chromium-1194'; // Playwright chromium version
      if (process.platform === 'win32') {
        executableSubPath = path.join('chrome-win', 'chrome.exe');
      } else if (process.platform === 'darwin') {
        executableSubPath = path.join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
      } else {
        executableSubPath = path.join('chrome-linux', 'chrome');
      }
    }

    // 1순위: 앱에 번들된 브라우저 찾기 (배포용)
    try {
      const bundledPath = path.join(process.resourcesPath, 'playwright', browserDirName, executableSubPath);
      console.log(`[Browser Path] Checking bundled path:`, bundledPath);

      if (fs.existsSync(bundledPath)) {
        console.log(`✓ Found bundled ${browserType} at:`, bundledPath);
        return bundledPath;
      }
    } catch (error) {
      console.log(`[Browser Path] Error checking bundled ${browserType}:`, (error as Error).message);
    }

    // 2순위: 시스템에 설치된 Playwright 브라우저 찾기 (개발용)
    const homeDir = os.homedir();
    let playwrightPath: string;

    if (process.platform === 'win32') {
      playwrightPath = path.join(homeDir, 'AppData', 'Local', 'ms-playwright');
    } else if (process.platform === 'darwin') {
      playwrightPath = path.join(homeDir, 'Library', 'Caches', 'ms-playwright');
    } else {
      // Linux
      playwrightPath = path.join(homeDir, '.cache', 'ms-playwright');
    }

    try {
      if (!fs.existsSync(playwrightPath)) {
        console.log('⚠ Playwright directory not found');
        return null;
      }

      const dirs = fs.readdirSync(playwrightPath);
      const browserDir = dirs.find(dir => dir.startsWith(`${browserType}-`));

      if (browserDir) {
        const executablePath = path.join(playwrightPath, browserDir, executableSubPath);
        if (fs.existsSync(executablePath)) {
          console.log(`✓ Found system ${browserType} at:`, executablePath);
          return executablePath;
        }
      }
    } catch (error) {
      console.log(`⚠ Could not find ${browserType}:`, (error as Error).message);
    }

    return null;
  }

  /**
   * 브라우저를 시작합니다.
   *
   * @param headless - Headless 모드 여부 (기본값: config에서 가져옴)
   * @param contextOptions - 브라우저 컨텍스트 옵션 (선택사항)
   */
  async startBrowser(headless?: boolean, contextOptions?: any): Promise<void> {
    if (this.browser) {
      throw new Error('Browser is already running');
    }

    try {
      const browserPath = this.getBrowserPath(this.config.browserType);

      // 브라우저 실행 옵션 (자동화 감지 우회)
      const launchOptions: any = {
        headless: headless !== undefined ? headless : this.config.headless,
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled', // 자동화 감지 비활성화
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--allow-running-insecure-content',
          '--disable-backgrounding-occluded-windows',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certifcate-errors',
          '--ignore-certifcate-errors-spki-list',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      };

      if (browserPath) {
        launchOptions.executablePath = browserPath;
      }

      // 브라우저 시작 (설정에서 browserType 전달)
      this.browser = await this.automation.launch(launchOptions, this.config.browserType);

      // 실제 Chrome User-Agent (최신 버전)
      const realChromeUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

      // 브라우저 컨텍스트 생성 (자동화 감지 우회)
      const defaultContextOptions = {
        viewport: null, // 전체 화면 사용
        ignoreHTTPSErrors: true, // HTTPS 인증서 오류 무시
        userAgent: realChromeUserAgent, // 실제 Chrome UA 사용
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        permissions: ['geolocation', 'notifications'],
        extraHTTPHeaders: {
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Sec-Fetch-Dest': 'document',
          'Upgrade-Insecure-Requests': '1'
        }
      };

      const finalContextOptions = contextOptions
        ? { ...defaultContextOptions, ...contextOptions }
        : defaultContextOptions;

      this.context = await this.automation.newContext(this.browser, finalContextOptions);

      // 새 페이지 생성
      this.page = await this.automation.newPage(this.context);

      // navigator.webdriver 숨기기 및 기타 bot detection 우회
      await this.page.addInitScript(() => {
        // navigator.webdriver를 undefined로 설정
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Chrome 객체 추가 (Headless 감지 우회)
        (window as any).chrome = {
          runtime: {}
        };

        // Permissions 객체 수정
        const originalQuery = (window.navigator as any).permissions.query;
        (window.navigator as any).permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Plugin array 추가 (빈 브라우저처럼 보이지 않도록)
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });

        // Languages 설정
        Object.defineProperty(navigator, 'languages', {
          get: () => ['ko-KR', 'ko', 'en-US', 'en']
        });

        // Platform 설정
        Object.defineProperty(navigator, 'platform', {
          get: () => 'MacIntel'
        });

        // WebGL vendor 설정 (Headless 감지 우회)
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Intel Inc.';
          }
          if (parameter === 37446) {
            return 'Intel Iris OpenGL Engine';
          }
          return getParameter.call(this, parameter);
        };

        // console.debug 비활성화 (일부 사이트에서 automation 감지에 사용)
        console.debug = () => {};
      });

      console.log('[BrowserManager] Browser started successfully');
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 브라우저를 종료합니다.
   */
  async stopBrowser(): Promise<void> {
    await this.cleanup();
  }

  /**
   * 브라우저 리소스를 정리합니다.
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.automation.close(this.browser);
        this.browser = null;
      }

      console.log('[BrowserManager] Browser cleanup completed');
    } catch (error) {
      console.error('[BrowserManager] Error during cleanup:', error);
    }
  }

  /**
   * 페이지 인스턴스를 가져옵니다.
   *
   * @returns Page 인스턴스
   * @throws {Error} 브라우저가 시작되지 않은 경우
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not started. Call startBrowser() first.');
    }
    return this.page;
  }

  /**
   * 브라우저 인스턴스를 가져옵니다.
   *
   * @returns Browser 인스턴스
   * @throws {Error} 브라우저가 시작되지 않은 경우
   */
  getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('Browser not started. Call startBrowser() first.');
    }
    return this.browser;
  }

  /**
   * 브라우저 컨텍스트를 가져옵니다.
   *
   * @returns BrowserContext 인스턴스
   * @throws {Error} 브라우저가 시작되지 않은 경우
   */
  getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('Browser not started. Call startBrowser() first.');
    }
    return this.context;
  }

  /**
   * 브라우저가 실행 중인지 확인합니다.
   *
   * @returns 실행 중이면 true
   */
  isRunning(): boolean {
    return this.browser !== null && this.page !== null;
  }
}
