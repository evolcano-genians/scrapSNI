/**
 * Domain Tracker - Web Crawler Service
 *
 * 웹 페이지 크롤링 서비스입니다.
 * PlaywrightController에서 크롤링 로직을 분리했습니다.
 *
 * SRP(Single Responsibility Principle) 준수:
 * - 링크 추출 및 크롤링만 담당
 * - 네트워크 모니터링은 NetworkMonitor가 담당
 */

import { Page } from 'playwright';
import { Injectable } from '../decorators';
import { CrawlerConfig, CrawlProgress } from '../types';

/**
 * WebCrawler 클래스
 *
 * 웹 페이지를 depth 기반으로 크롤링합니다.
 */
@Injectable()
export class WebCrawler {
  private visitedUrls: Set<string> = new Set();

  /**
   * 생성자
   *
   * @param config - 크롤러 설정
   */
  constructor(private config: CrawlerConfig) {
    console.log('[WebCrawler] Initialized with config:', config);
  }

  /**
   * 웹 페이지를 크롤링합니다.
   *
   * @param page - Playwright Page 인스턴스
   * @param startUrl - 시작 URL
   * @param depth - 크롤링 깊이
   * @param sameDomainOnly - 같은 도메인만 크롤링할지 여부
   * @param onProgress - 진행 상황 콜백
   * @returns 방문한 URL 목록
   */
  async crawl(
    page: Page,
    startUrl: string,
    depth: number,
    sameDomainOnly: boolean,
    onProgress?: (progress: CrawlProgress) => void
  ): Promise<string[]> {
    console.log(`[WebCrawler] Starting crawl from ${startUrl} with depth ${depth}`);

    // 초기화
    this.visitedUrls.clear();
    this.visitedUrls.add(startUrl);

    const targetDomain = new URL(startUrl).hostname;
    let totalPagesToVisit = 1;
    let pagesVisited = 1;

    // 깊이별 크롤링
    for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
      console.log(`[WebCrawler] Crawling depth ${currentDepth}/${depth}`);

      // 현재 페이지에서 링크 추출
      const links = await this.extractLinksFromPage(page);
      console.log(`[WebCrawler] Found ${links.length} links`);

      // 링크 필터링
      const linksToVisit = this.filterLinks(links, targetDomain, sameDomainOnly);
      console.log(`[WebCrawler] After filtering: ${linksToVisit.length} links`);

      totalPagesToVisit += linksToVisit.length;

      // 진행 상황 알림
      if (onProgress) {
        onProgress({
          currentDepth,
          maxDepth: depth,
          pagesVisited,
          totalPages: totalPagesToVisit,
          currentUrl: page.url()
        });
      }

      // 각 링크 방문
      const linksToProcess = linksToVisit.slice(0, this.config.maxLinksPerDepth);

      for (let i = 0; i < linksToProcess.length; i++) {
        const linkUrl = linksToProcess[i];

        try {
          console.log(`[WebCrawler] [Depth ${currentDepth}] Visiting (${i + 1}/${linksToProcess.length}): ${linkUrl}`);

          // 진행 상황 알림
          if (onProgress) {
            onProgress({
              currentDepth,
              maxDepth: depth,
              pagesVisited,
              totalPages: totalPagesToVisit,
              currentUrl: linkUrl
            });
          }

          // 페이지 이동
          await page.goto(linkUrl, {
            waitUntil: 'load',
            timeout: this.config.loadTimeout
          });

          // 네트워크 안정화 대기
          await page.waitForTimeout(this.config.networkIdleTimeout);

          try {
            await page.waitForLoadState('networkidle', { timeout: 3000 });
          } catch (e) {
            // 타임아웃 무시
          }

          pagesVisited++;
          console.log(`[WebCrawler] Page ${pagesVisited} visited successfully`);
        } catch (error) {
          console.log(`[WebCrawler] Failed to visit ${linkUrl}: ${(error as Error).message}`);
        }
      }

      // 다음 depth를 위한 준비
      if (currentDepth < depth && linksToProcess.length > 0) {
        try {
          await page.goto(linksToProcess[0], {
            waitUntil: 'load',
            timeout: this.config.loadTimeout
          });
        } catch (e) {
          console.log('[WebCrawler] Failed to navigate to next depth base URL');
          break;
        }
      }
    }

    console.log(`[WebCrawler] Crawling complete. Total pages visited: ${pagesVisited}`);
    return Array.from(this.visitedUrls);
  }

  /**
   * 페이지에서 링크를 추출합니다.
   *
   * @param page - Playwright Page 인스턴스
   * @returns 추출된 링크 배열
   */
  private async extractLinksFromPage(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const foundLinks = new Set<string>();

      // 1. 일반 <a> 태그
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      anchors.forEach(a => {
        try {
          const href = (a as HTMLAnchorElement).getAttribute('href');
          if (href) {
            const fullUrl = new URL(href, window.location.href).href;
            if (fullUrl && !fullUrl.startsWith('javascript:') && !fullUrl.startsWith('mailto:') && !fullUrl.includes('#')) {
              foundLinks.add(fullUrl);
            }
          }
        } catch (e) {}
      });

      // 2. data-href, data-url 속성
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

      // 3. onclick 이벤트 패턴
      const clickableElements = Array.from(document.querySelectorAll('[onclick]'));
      clickableElements.forEach(el => {
        try {
          const onclick = el.getAttribute('onclick') || '';
          const urlMatch = onclick.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
          if (urlMatch && urlMatch[1]) {
            const fullUrl = new URL(urlMatch[1], window.location.href).href;
            if (fullUrl && !fullUrl.startsWith('javascript:') && !fullUrl.startsWith('mailto:') && !fullUrl.includes('#')) {
              foundLinks.add(fullUrl);
            }
          }
        } catch (e) {}
      });

      return Array.from(foundLinks);
    });
  }

  /**
   * 링크를 필터링합니다.
   *
   * @param links - 링크 배열
   * @param targetDomain - 대상 도메인
   * @param sameDomainOnly - 같은 도메인만 허용할지 여부
   * @returns 필터링된 링크 배열
   */
  private filterLinks(
    links: string[],
    targetDomain: string,
    sameDomainOnly: boolean
  ): string[] {
    const filtered: string[] = [];

    for (const link of links) {
      try {
        const linkUrl = new URL(link);
        const linkDomain = linkUrl.hostname;

        // 이미 방문한 URL은 제외
        if (this.visitedUrls.has(link)) {
          continue;
        }

        // 같은 도메인만 허용하는 경우
        if (sameDomainOnly && linkDomain !== targetDomain) {
          continue;
        }

        filtered.push(link);
        this.visitedUrls.add(link);
      } catch (e) {
        // URL 파싱 에러 무시
      }
    }

    return filtered;
  }

  /**
   * 방문한 URL 목록을 가져옵니다.
   *
   * @returns 방문한 URL 배열
   */
  getVisitedUrls(): string[] {
    return Array.from(this.visitedUrls);
  }

  /**
   * 방문 기록을 초기화합니다.
   */
  clear(): void {
    this.visitedUrls.clear();
    console.log('[WebCrawler] Visited URLs cleared');
  }
}
