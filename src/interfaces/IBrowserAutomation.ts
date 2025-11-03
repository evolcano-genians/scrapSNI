/**
 * Domain Tracker - 브라우저 자동화 인터페이스
 *
 * 브라우저 자동화 라이브러리(Playwright 등)를 추상화하는 인터페이스입니다.
 * Adapter 패턴을 사용하여 DIP(Dependency Inversion Principle)를 준수합니다.
 */

import { Browser, BrowserContext, Page } from 'playwright';

/**
 * 브라우저 실행 옵션
 */
export interface BrowserLaunchOptions {
  headless: boolean;
  executablePath?: string;
  args?: string[];
  [key: string]: any;
}

/**
 * 브라우저 컨텍스트 옵션
 */
export interface BrowserContextOptions {
  viewport?: { width: number; height: number } | null;
  userAgent?: string;
  ignoreHTTPSErrors?: boolean;
  [key: string]: any;
}

/**
 * 브라우저 자동화 인터페이스
 *
 * 브라우저 자동화 라이브러리의 핵심 기능을 정의합니다.
 */
export interface IBrowserAutomation {
  /**
   * 브라우저를 시작합니다.
   *
   * @param options - 브라우저 실행 옵션
   * @returns Browser 인스턴스
   */
  launch(options: BrowserLaunchOptions): Promise<Browser>;

  /**
   * 새로운 브라우저 컨텍스트를 생성합니다.
   *
   * @param browser - Browser 인스턴스
   * @param options - 컨텍스트 옵션
   * @returns BrowserContext 인스턴스
   */
  newContext(browser: Browser, options?: BrowserContextOptions): Promise<BrowserContext>;

  /**
   * 새로운 페이지를 생성합니다.
   *
   * @param context - BrowserContext 인스턴스
   * @returns Page 인스턴스
   */
  newPage(context: BrowserContext): Promise<Page>;

  /**
   * 브라우저를 종료합니다.
   *
   * @param browser - Browser 인스턴스
   */
  close(browser: Browser): Promise<void>;
}
