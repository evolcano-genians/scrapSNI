/**
 * Domain Tracker - Page Interactor Service
 *
 * 페이지 상호작용 서비스입니다.
 * 자동 클릭, 스크롤, 호버 등의 기능을 제공합니다.
 *
 * SRP(Single Responsibility Principle) 준수:
 * - 페이지 상호작용만 담당
 * - 크롤링 로직은 WebCrawler가 담당
 */

import { Injectable } from '../decorators';
import { Page, Locator } from 'playwright';

/**
 * PageInteractor 클래스
 *
 * 웹 페이지와 자동으로 상호작용합니다.
 */
@Injectable()
export class PageInteractor {
  /**
   * 생성자
   *
   * @param clickTimeout - 클릭 타임아웃 (밀리초)
   * @param scrollDelay - 스크롤 간 대기 시간 (밀리초)
   */
  constructor(
    private clickTimeout: number = 5000,
    private scrollDelay: number = 500
  ) {
    console.log('[PageInteractor] Initialized');
  }

  /**
   * 자동으로 클릭 가능한 요소들을 클릭합니다.
   *
   * @param page - Playwright Page 인스턴스
   * @param maxClicks - 최대 클릭 횟수
   * @param excludeSelectors - 제외할 선택자 목록
   * @returns 클릭한 횟수
   */
  async autoClick(
    page: Page,
    maxClicks: number = 10,
    excludeSelectors: string[] = []
  ): Promise<number> {
    console.log(`[PageInteractor] Auto-clicking (max: ${maxClicks})`);

    let clickCount = 0;

    try {
      // 클릭 가능한 요소 찾기
      const clickableElements = await this.findClickableElements(page, excludeSelectors);
      console.log(`[PageInteractor] Found ${clickableElements.length} clickable elements`);

      for (const element of clickableElements) {
        if (clickCount >= maxClicks) break;

        try {
          await element.click({ timeout: this.clickTimeout });
          await page.waitForTimeout(1000); // 클릭 후 대기
          clickCount++;
          console.log(`[PageInteractor] Click ${clickCount}/${maxClicks} successful`);
        } catch (error) {
          console.log(`[PageInteractor] Click failed: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      console.error('[PageInteractor] Auto-click error:', error);
    }

    return clickCount;
  }

  /**
   * 자동으로 페이지를 스크롤합니다.
   *
   * @param page - Playwright Page 인스턴스
   * @param method - 스크롤 방식 ('smooth', 'step', 'full')
   * @param maxScrolls - 최대 스크롤 횟수
   * @returns 스크롤한 횟수
   */
  async autoScroll(
    page: Page,
    method: 'smooth' | 'step' | 'full' = 'step',
    maxScrolls: number = 10
  ): Promise<number> {
    console.log(`[PageInteractor] Auto-scrolling (method: ${method}, max: ${maxScrolls})`);

    let scrollCount = 0;

    try {
      switch (method) {
        case 'full':
          // 한 번에 끝까지 스크롤
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          scrollCount = 1;
          break;

        case 'smooth':
          // 부드럽게 스크롤
          const viewportHeight = await page.evaluate(() => window.innerHeight);
          const totalHeight = await page.evaluate(() => document.body.scrollHeight);

          for (let i = 0; i < maxScrolls && scrollCount * viewportHeight < totalHeight; i++) {
            await page.evaluate((vh) => {
              window.scrollBy({ top: vh, behavior: 'smooth' });
            }, viewportHeight);
            await page.waitForTimeout(this.scrollDelay);
            scrollCount++;
          }
          break;

        case 'step':
        default:
          // 단계별로 스크롤
          for (let i = 0; i < maxScrolls; i++) {
            const scrolled = await page.evaluate(() => {
              const before = window.pageYOffset;
              window.scrollBy(0, window.innerHeight / 2);
              const after = window.pageYOffset;
              return after > before;
            });

            if (!scrolled) break; // 더 이상 스크롤할 수 없음

            await page.waitForTimeout(this.scrollDelay);
            scrollCount++;
          }
          break;
      }

      console.log(`[PageInteractor] Scrolled ${scrollCount} times`);
    } catch (error) {
      console.error('[PageInteractor] Auto-scroll error:', error);
    }

    return scrollCount;
  }

  /**
   * 자동으로 요소에 호버합니다.
   *
   * @param page - Playwright Page 인스턴스
   * @param hoverSelector - 호버할 선택자
   * @param hoverDuration - 호버 지속 시간 (밀리초)
   * @param maxHovers - 최대 호버 횟수
   * @returns 호버한 횟수
   */
  async autoHover(
    page: Page,
    hoverSelector: string,
    hoverDuration: number = 1000,
    maxHovers: number = 10
  ): Promise<number> {
    console.log(`[PageInteractor] Auto-hovering (selector: ${hoverSelector}, max: ${maxHovers})`);

    let hoverCount = 0;

    try {
      const elements = await page.locator(hoverSelector).all();
      const limitedElements = elements.slice(0, maxHovers);

      for (const element of limitedElements) {
        try {
          await element.hover({ timeout: this.clickTimeout });
          await page.waitForTimeout(hoverDuration);
          hoverCount++;
          console.log(`[PageInteractor] Hover ${hoverCount}/${maxHovers} successful`);
        } catch (error) {
          console.log(`[PageInteractor] Hover failed: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      console.error('[PageInteractor] Auto-hover error:', error);
    }

    return hoverCount;
  }

  /**
   * 클릭 가능한 요소를 찾습니다.
   *
   * @param page - Playwright Page 인스턴스
   * @param excludeSelectors - 제외할 선택자 목록
   * @returns 클릭 가능한 요소 배열
   */
  private async findClickableElements(
    page: Page,
    excludeSelectors: string[]
  ): Promise<Locator[]> {
    // 클릭 가능한 요소 선택자
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      '[role="button"]',
      '[onclick]'
    ];

    // 제외할 선택자 필터
    const excludeFilter = excludeSelectors.length > 0
      ? `:not(${excludeSelectors.join('):not(')})`
      : '';

    const combinedSelector = selectors
      .map(sel => sel + excludeFilter)
      .join(', ');

    return await page.locator(combinedSelector).all();
  }

  /**
   * 지능형 탐색을 수행합니다.
   *
   * 버튼 클릭, 메뉴 호버, 스크롤을 자동으로 수행합니다.
   *
   * @param page - Playwright Page 인스턴스
   * @param options - 탐색 옵션
   */
  async intelligentExplore(
    page: Page,
    options: {
      clickButtons?: boolean;
      hoverMenus?: boolean;
      exploreDepth?: number;
      avoidLogout?: boolean;
    } = {}
  ): Promise<void> {
    const {
      clickButtons = true,
      hoverMenus = true,
      exploreDepth = 1,
      avoidLogout = true
    } = options;

    console.log('[PageInteractor] Starting intelligent exploration');

    // 로그아웃 버튼 제외 선택자
    const excludeSelectors = avoidLogout
      ? ['[href*="logout"]', '[onclick*="logout"]', 'button:has-text("로그아웃")']
      : [];

    // 버튼 자동 클릭
    if (clickButtons) {
      await this.autoClick(page, exploreDepth * 5, excludeSelectors);
    }

    // 메뉴 자동 호버
    if (hoverMenus) {
      await this.autoHover(page, 'nav a, .menu-item', 1000, exploreDepth * 3);
    }

    // 페이지 스크롤
    await this.autoScroll(page, 'step', exploreDepth * 5);

    console.log('[PageInteractor] Intelligent exploration complete');
  }
}
