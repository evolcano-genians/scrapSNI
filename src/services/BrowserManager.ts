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
   * Chromium의 실행 경로를 찾습니다.
   *
   * 우선순위:
   * 1. 앱에 번들된 Chromium (배포용)
   * 2. 시스템에 설치된 Playwright Chromium (개발용)
   *
   * @returns Chromium 실행 파일 경로, 없으면 null
   */
  private getChromiumPath(): string | null {
    console.log('[Chromium Path] Starting search...');
    console.log('[Chromium Path] Platform:', process.platform);
    console.log('[Chromium Path] process.resourcesPath:', process.resourcesPath);

    let executableSubPath: string;

    // 플랫폼별 실행 파일 경로
    if (process.platform === 'win32') {
      executableSubPath = path.join('chrome-win', 'chrome.exe');
    } else if (process.platform === 'darwin') {
      executableSubPath = path.join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
    } else {
      // Linux
      executableSubPath = path.join('chrome-linux', 'chrome');
    }

    // 1순위: 앱에 번들된 Chromium 찾기 (배포용)
    try {
      const bundledPath = path.join(process.resourcesPath, 'playwright', 'chromium-1194', executableSubPath);
      console.log('[Chromium Path] Checking bundled path:', bundledPath);

      if (fs.existsSync(bundledPath)) {
        console.log('✓ Found bundled Chromium at:', bundledPath);
        return bundledPath;
      }
    } catch (error) {
      console.log('[Chromium Path] Error checking bundled Chromium:', (error as Error).message);
    }

    // 2순위: 시스템에 설치된 Playwright Chromium 찾기 (개발용)
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
      const chromiumDir = dirs.find(dir => dir.startsWith('chromium-'));

      if (chromiumDir) {
        const executablePath = path.join(playwrightPath, chromiumDir, executableSubPath);
        if (fs.existsSync(executablePath)) {
          console.log('✓ Found system Chromium at:', executablePath);
          return executablePath;
        }
      }
    } catch (error) {
      console.log('⚠ Could not find Chromium:', (error as Error).message);
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
      const chromiumPath = this.getChromiumPath();

      // 브라우저 실행 옵션
      const launchOptions: any = {
        headless: headless !== undefined ? headless : this.config.headless,
        args: ['--start-maximized']
      };

      if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
      }

      // 브라우저 시작
      this.browser = await this.automation.launch(launchOptions);

      // 브라우저 컨텍스트 생성
      const defaultContextOptions = {
        viewport: null, // 전체 화면 사용
        ignoreHTTPSErrors: true, // HTTPS 인증서 오류 무시
        userAgent: this.config.userAgent
      };

      const finalContextOptions = contextOptions
        ? { ...defaultContextOptions, ...contextOptions }
        : defaultContextOptions;

      this.context = await this.automation.newContext(this.browser, finalContextOptions);

      // 새 페이지 생성
      this.page = await this.automation.newPage(this.context);

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
