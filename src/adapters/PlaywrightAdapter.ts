/**
 * Domain Tracker - Playwright Adapter
 *
 * Playwright 라이브러리를 IBrowserAutomation 인터페이스로 래핑하는 어댑터입니다.
 * Adapter 패턴을 사용하여 Playwright에 대한 의존성을 추상화합니다.
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { IBrowserAutomation, BrowserLaunchOptions, BrowserContextOptions } from '../interfaces/IBrowserAutomation';
import { Injectable } from '../decorators';
import { BrowserType } from '../types';

/**
 * PlaywrightAdapter 클래스
 *
 * Playwright의 chromium 브라우저를 IBrowserAutomation 인터페이스로 감쌉니다.
 * 이를 통해 다른 브라우저 자동화 라이브러리로 교체하거나 테스트용 Mock을 주입할 수 있습니다.
 */
@Injectable()
export class PlaywrightAdapter implements IBrowserAutomation {
  /**
   * 브라우저를 시작합니다.
   *
   * @param options - 브라우저 실행 옵션
   * @param browserType - 브라우저 타입 (chromium, firefox, webkit)
   * @returns Browser 인스턴스
   */
  async launch(options: BrowserLaunchOptions, browserType: BrowserType = 'chromium'): Promise<Browser> {
    console.log('[PlaywrightAdapter] Launching browser...');
    console.log('[PlaywrightAdapter] Browser type:', browserType);
    console.log('[PlaywrightAdapter] Options:', {
      headless: options.headless,
      executablePath: options.executablePath || 'default',
      hasArgs: !!options.args
    });

    const launchOptions: any = {
      headless: options.headless
    };

    // executablePath가 지정되어 있으면 사용
    if (options.executablePath) {
      launchOptions.executablePath = options.executablePath;
    }

    // args가 지정되어 있으면 사용
    if (options.args) {
      launchOptions.args = options.args;
    }

    // 기타 옵션 전달
    Object.keys(options).forEach(key => {
      if (key !== 'headless' && key !== 'executablePath' && key !== 'args') {
        launchOptions[key] = options[key];
      }
    });

    // 브라우저 타입에 따라 적절한 브라우저 실행
    let browser: Browser;
    switch (browserType) {
      case 'chromium':
        browser = await chromium.launch(launchOptions);
        break;
      case 'firefox':
        browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        browser = await webkit.launch(launchOptions);
        break;
      default:
        console.warn(`[PlaywrightAdapter] Unknown browser type: ${browserType}, using chromium`);
        browser = await chromium.launch(launchOptions);
    }

    console.log('[PlaywrightAdapter] Browser launched successfully');
    return browser;
  }

  /**
   * 새로운 브라우저 컨텍스트를 생성합니다.
   *
   * @param browser - Browser 인스턴스
   * @param options - 컨텍스트 옵션
   * @returns BrowserContext 인스턴스
   */
  async newContext(browser: Browser, options?: BrowserContextOptions): Promise<BrowserContext> {
    console.log('[PlaywrightAdapter] Creating new context...');

    const contextOptions: any = {};

    if (options) {
      // viewport 설정
      if (options.viewport !== undefined) {
        contextOptions.viewport = options.viewport;
      }

      // userAgent 설정
      if (options.userAgent) {
        contextOptions.userAgent = options.userAgent;
      }

      // ignoreHTTPSErrors 설정
      if (options.ignoreHTTPSErrors !== undefined) {
        contextOptions.ignoreHTTPSErrors = options.ignoreHTTPSErrors;
      }

      // 기타 옵션 전달
      Object.keys(options).forEach(key => {
        if (key !== 'viewport' && key !== 'userAgent' && key !== 'ignoreHTTPSErrors') {
          contextOptions[key] = options[key];
        }
      });
    }

    const context = await browser.newContext(contextOptions);
    console.log('[PlaywrightAdapter] Context created successfully');
    return context;
  }

  /**
   * 새로운 페이지를 생성합니다.
   *
   * @param context - BrowserContext 인스턴스
   * @returns Page 인스턴스
   */
  async newPage(context: BrowserContext): Promise<Page> {
    console.log('[PlaywrightAdapter] Creating new page...');
    const page = await context.newPage();
    console.log('[PlaywrightAdapter] Page created successfully');
    return page;
  }

  /**
   * 브라우저를 종료합니다.
   *
   * @param browser - Browser 인스턴스
   */
  async close(browser: Browser): Promise<void> {
    console.log('[PlaywrightAdapter] Closing browser...');
    await browser.close();
    console.log('[PlaywrightAdapter] Browser closed successfully');
  }
}
