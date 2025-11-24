/**
 * Domain Tracker - Network Monitor Service
 *
 * 네트워크 요청 모니터링 및 도메인 수집 서비스입니다.
 * PlaywrightController에서 네트워크 모니터링 책임을 분리했습니다.
 *
 * SRP(Single Responsibility Principle) 준수:
 * - 네트워크 요청 모니터링
 * - 도메인 정보 수집
 * - DNS 해석 및 IP 수집
 */

import { Page, Request, WebSocket } from 'playwright';
import { DomainInfo, ResourceType, FiveTupleConnection } from '../types';
import { IDNSResolver } from '../interfaces/IDNSResolver';
import { Injectable, Inject } from '../decorators';
import { IDetector } from '../interfaces/IDetector';
import * as domainUtils from '../utils/domainUtils';
import * as os from 'os';

/**
 * 수집 중인 도메인 상세 정보
 */
interface CollectedDomainData {
  domain: string;
  count: number;
  types: Set<ResourceType>;
  urls: Set<string>;
  firstSeen: string;
  protocol: 'http' | 'https';
  isCDN?: boolean;
  cdnName?: string;
  isThirdParty?: boolean;
  thirdPartyName?: string;
  isWebSocket?: boolean;
  ipv4: Set<string>;
  ipv6: Set<string>;
}

/**
 * NetworkMonitor 클래스
 *
 * 네트워크 요청을 모니터링하고 도메인/IP 정보를 수집합니다.
 */
@Injectable()
export class NetworkMonitor {
  private isMonitoring: boolean = false;
  private visitedDomains: Set<string> = new Set();
  private domainDetails: Map<string, CollectedDomainData> = new Map();
  private visitedIPs: Set<string> = new Set();
  private fiveTupleLogs: FiveTupleConnection[] = [];
  private sourceIp: string = '0.0.0.0';
  private monitoredPages: Map<Page, {
    requestListener: (request: Request) => void;
    webSocketListener: (ws: WebSocket) => void;
  }> = new Map();

  /**
   * 생성자
   *
   * @param detector - CDN/서드파티 감지 서비스 (DI)
   * @param dnsResolver - DNS 해석 서비스 (DI)
   */
  constructor(
    @Inject('IDetector') private detector: IDetector,
    @Inject('IDNSResolver') private dnsResolver: IDNSResolver
  ) {
    this.sourceIp = this.getLocalIpAddress();
    console.log('[NetworkMonitor] Initialized with source IP:', this.sourceIp);
  }

  /**
   * 로컬 IP 주소를 가져옵니다.
   *
   * @returns 로컬 IP 주소
   */
  private getLocalIpAddress(): string {
    const networkInterfaces = os.networkInterfaces();

    // 모든 네트워크 인터페이스를 순회
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (!interfaces) continue;

      for (const iface of interfaces) {
        // IPv4, 내부 네트워크가 아닌 경우
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }

    // 적절한 IP를 찾지 못한 경우 localhost 반환
    return '127.0.0.1';
  }

  /**
   * 네트워크 모니터링을 시작합니다.
   *
   * @param page - Playwright Page 인스턴스
   */
  startMonitoring(page: Page): void {
    if (!this.isMonitoring) {
      console.log('[NetworkMonitor] Starting network monitoring...');

      // 상태 초기화 (최초 시작 시에만)
      this.visitedDomains.clear();
      this.domainDetails.clear();
      this.visitedIPs.clear();
      this.monitoredPages.clear();

      this.isMonitoring = true;
    }

    // 이미 모니터링 중인 페이지면 스킵
    if (this.monitoredPages.has(page)) {
      console.log('[NetworkMonitor] Page already being monitored');
      return;
    }

    // 요청 리스너 설정
    const requestListener = (request: Request) => {
      this.handleRequest(request).catch(error => {
        // 에러는 조용히 무시 (네트워크 모니터링 실패가 앱을 중단시키면 안됨)
      });
    };

    // WebSocket 리스너 설정
    const webSocketListener = (ws: WebSocket) => {
      this.handleWebSocket(ws).catch(error => {
        // 에러는 조용히 무시
      });
    };

    page.on('request', requestListener);
    page.on('websocket', webSocketListener);

    // 페이지가 닫힐 때 자동으로 리스너 제거
    page.once('close', () => {
      this.stopMonitoringPage(page);
    });

    // 모니터링 중인 페이지 목록에 추가
    this.monitoredPages.set(page, { requestListener, webSocketListener });

    console.log(`[NetworkMonitor] Started monitoring page (total: ${this.monitoredPages.size} pages)`);
  }

  /**
   * 특정 페이지의 모니터링을 중지합니다.
   *
   * @param page - 모니터링을 중지할 페이지
   */
  private stopMonitoringPage(page: Page): void {
    const listeners = this.monitoredPages.get(page);
    if (listeners) {
      try {
        page.removeListener('request', listeners.requestListener);
        page.removeListener('websocket', listeners.webSocketListener);
      } catch (error) {
        // 페이지가 이미 닫혔을 수 있으므로 에러 무시
      }
      this.monitoredPages.delete(page);
      console.log(`[NetworkMonitor] Stopped monitoring page (remaining: ${this.monitoredPages.size} pages)`);
    }
  }

  /**
   * 네트워크 모니터링을 중지하고 결과를 반환합니다.
   *
   * @returns 수집된 도메인 및 IP 목록
   */
  stopMonitoring(): { domains: DomainInfo[], ips: string[] } {
    console.log('[NetworkMonitor] Stopping network monitoring...');

    // 모든 페이지의 리스너 제거
    for (const [page, listeners] of this.monitoredPages.entries()) {
      try {
        page.removeListener('request', listeners.requestListener);
        page.removeListener('websocket', listeners.webSocketListener);
      } catch (error) {
        // 페이지가 이미 닫혔을 수 있으므로 에러 무시
      }
    }

    this.monitoredPages.clear();
    this.isMonitoring = false;

    const result = this.getResults();
    console.log(`[NetworkMonitor] Collected ${result.domains.length} domains, ${result.ips.length} IPs`);

    return result;
  }

  /**
   * 네트워크 요청을 처리합니다.
   *
   * @param request - Playwright Request 객체
   */
  private async handleRequest(request: Request): Promise<void> {
    try {
      const url = request.url();
      const domain = domainUtils.extractDomain(url);
      const resourceType = request.resourceType() as ResourceType;

      if (!domain) return;

      // localhost는 제외하지만 IP 주소는 수집
      if (domain.includes('localhost')) {
        return;
      }

      // IP 주소인 경우 IP 목록에 추가
      if (domainUtils.isIPAddress(domain)) {
        this.visitedIPs.add(domain);
        console.log(`[IP] ${domain}`);
        return;
      }

      // 도메인 Set에 추가
      this.visitedDomains.add(domain);

      // 도메인 상세 정보 수집
      if (!this.domainDetails.has(domain)) {
        const urlObj = new URL(url);

        // CDN 및 서드파티 서비스 감지
        const cdnInfo = this.detector.detectCDN(domain);
        const thirdPartyInfo = this.detector.detectThirdPartyService(domain);
        const isWebSocket = urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';

        this.domainDetails.set(domain, {
          domain: domain,
          count: 0,
          types: new Set<ResourceType>(),
          urls: new Set<string>(),
          firstSeen: new Date().toISOString(),
          protocol: urlObj.protocol.replace(':', '') as 'http' | 'https',
          isCDN: !!cdnInfo,
          cdnName: cdnInfo || undefined,
          isThirdParty: !!thirdPartyInfo,
          thirdPartyName: thirdPartyInfo || undefined,
          isWebSocket: isWebSocket,
          ipv4: new Set<string>(),
          ipv6: new Set<string>()
        });
      }

      const details = this.domainDetails.get(domain)!;
      details.count++;
      details.types.add(resourceType);

      const urlObj = new URL(url);
      details.urls.add(urlObj.pathname + urlObj.search);

      console.log(`[${resourceType}] ${domain} (${details.count} requests)`);

      // HTTP 메소드 정보 (Request 객체에서 가져오기)
      const method = request.method();

      // DNS 조회하여 IP 수집 및 5-tuple 로그 생성
      this.resolveDNSAsync(domain, url, method, resourceType);
    } catch (error) {
      // URL 파싱 에러 무시 (invalid URL 등)
    }
  }

  /**
   * DNS 해석을 비동기로 수행합니다.
   *
   * @param domain - 해석할 도메인
   * @param url - 요청 URL (5-tuple 로깅용)
   * @param method - HTTP 메소드 (5-tuple 로깅용)
   * @param resourceType - 리소스 타입 (5-tuple 로깅용)
   */
  private async resolveDNSAsync(
    domain: string,
    url?: string,
    method?: string,
    resourceType?: ResourceType
  ): Promise<void> {
    try {
      const ips = await this.dnsResolver.resolve(domain);
      const domainInfo = this.domainDetails.get(domain);

      if (domainInfo) {
        // 도메인별 IP 저장
        ips.ipv4.forEach(ip => {
          domainInfo.ipv4.add(ip);
          this.visitedIPs.add(ip);
        });
        ips.ipv6.forEach(ip => {
          domainInfo.ipv6.add(ip);
          this.visitedIPs.add(ip);
        });

        // 5-tuple 로그 생성 (URL과 메소드가 제공된 경우)
        if (url && method && resourceType) {
          this.create5TupleLog(domain, url, method, resourceType, ips.ipv4, ips.ipv6);
        }
      }
    } catch (err) {
      // DNS 조회 실패는 무시
    }
  }

  /**
   * 5-tuple 연결 로그를 생성합니다.
   *
   * @param domain - 도메인
   * @param url - 요청 URL
   * @param method - HTTP 메소드
   * @param resourceType - 리소스 타입
   * @param ipv4List - IPv4 주소 목록
   * @param ipv6List - IPv6 주소 목록
   */
  private create5TupleLog(
    domain: string,
    url: string,
    method: string,
    resourceType: ResourceType,
    ipv4List: string[],
    ipv6List: string[]
  ): void {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.replace(':', '').toUpperCase();

      // 포트 결정 (명시적 포트가 없으면 프로토콜 기본 포트 사용)
      let destinationPort = 80;
      if (urlObj.port) {
        destinationPort = parseInt(urlObj.port, 10);
      } else if (protocol === 'HTTPS' || protocol === 'WSS') {
        destinationPort = 443;
      } else if (protocol === 'WS') {
        destinationPort = 80;
      }

      // 소스 포트 생성 (브라우저에서 실제 포트를 알 수 없으므로 임시 포트 범위 사용)
      const sourcePort = Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152;

      // IPv4 주소에 대한 5-tuple 로그 생성
      ipv4List.forEach(destinationIp => {
        const fiveTuple: FiveTupleConnection = {
          timestamp: new Date().toISOString(),
          sourceIp: this.sourceIp,
          sourcePort: sourcePort,
          destinationIp: destinationIp,
          destinationPort: destinationPort,
          protocol: protocol,
          url: url,
          domain: domain,
          method: method,
          resourceType: resourceType
        };

        this.fiveTupleLogs.push(fiveTuple);
      });

      // IPv6 주소에 대한 5-tuple 로그 생성
      ipv6List.forEach(destinationIp => {
        const fiveTuple: FiveTupleConnection = {
          timestamp: new Date().toISOString(),
          sourceIp: this.sourceIp,
          sourcePort: sourcePort,
          destinationIp: destinationIp,
          destinationPort: destinationPort,
          protocol: protocol,
          url: url,
          domain: domain,
          method: method,
          resourceType: resourceType
        };

        this.fiveTupleLogs.push(fiveTuple);
      });
    } catch (error) {
      // 5-tuple 로그 생성 실패는 무시
    }
  }

  /**
   * WebSocket 연결을 처리합니다.
   *
   * @param ws - Playwright WebSocket 객체
   */
  private async handleWebSocket(ws: WebSocket): Promise<void> {
    try {
      const url = ws.url();

      console.log(`[WebSocket] Connection: ${url}`);

      // URL에서 도메인 추출
      const domain = domainUtils.extractDomain(url);
      if (!domain) return;

      // localhost는 제외
      if (domain.includes('localhost')) {
        return;
      }

      // IP 주소인 경우 IP 목록에 추가
      if (domainUtils.isIPAddress(domain)) {
        this.visitedIPs.add(domain);
        console.log(`[WebSocket IP] ${domain}`);
        return;
      }

      // 도메인 Set에 추가
      this.visitedDomains.add(domain);

      // 도메인 상세 정보 수집
      if (!this.domainDetails.has(domain)) {
        const urlObj = new URL(url);

        // CDN 및 서드파티 서비스 감지
        const cdnInfo = this.detector.detectCDN(domain);
        const thirdPartyInfo = this.detector.detectThirdPartyService(domain);

        this.domainDetails.set(domain, {
          domain: domain,
          count: 0,
          types: new Set<ResourceType>(['websocket']),
          urls: new Set<string>(),
          firstSeen: new Date().toISOString(),
          protocol: urlObj.protocol.replace(':', '') as 'http' | 'https',
          isCDN: !!cdnInfo,
          cdnName: cdnInfo || undefined,
          isThirdParty: !!thirdPartyInfo,
          thirdPartyName: thirdPartyInfo || undefined,
          isWebSocket: true,
          ipv4: new Set<string>(),
          ipv6: new Set<string>()
        });

        // DNS 조회하여 IP 수집 (백그라운드에서 실행)
        this.resolveDNSAsync(domain);
      }

      const details = this.domainDetails.get(domain)!;
      details.count++;
      details.types.add('websocket');
      details.isWebSocket = true;

      const urlObj = new URL(url);
      details.urls.add(urlObj.pathname + urlObj.search);

      console.log(`[WebSocket] ${domain} (${details.count} connections)`);
    } catch (error) {
      // URL 파싱 에러 무시
    }
  }

  /**
   * 수집된 결과를 가져옵니다.
   *
   * @returns 도메인 정보 및 IP 목록
   */
  private getResults(): { domains: DomainInfo[], ips: string[] } {
    // 도메인 상세 정보를 배열로 변환
    const domainList: DomainInfo[] = Array.from(this.domainDetails.values()).map(details => ({
      domain: details.domain,
      count: details.count,
      types: Array.from(details.types),
      firstSeen: details.firstSeen,
      urlCount: details.urls.size,
      urls: Array.from(details.urls).slice(0, 10), // 처음 10개만
      ipv4: Array.from(details.ipv4),
      ipv6: Array.from(details.ipv6),
      protocol: details.protocol,
      isCDN: details.isCDN,
      cdnName: details.cdnName,
      isThirdParty: details.isThirdParty,
      thirdPartyName: details.thirdPartyName,
      isWebSocket: details.isWebSocket
    }));

    // 요청 횟수순으로 정렬
    domainList.sort((a, b) => b.count - a.count);

    // IP 목록을 배열로 변환
    const ipList = Array.from(this.visitedIPs);

    return {
      domains: domainList,
      ips: ipList
    };
  }

  /**
   * 현재까지 수집된 도메인 정보를 가져옵니다.
   *
   * @returns 도메인 정보 목록
   */
  getCurrentDomains(): DomainInfo[] {
    return this.getResults().domains;
  }

  /**
   * 현재까지 수집된 IP 목록을 가져옵니다.
   *
   * @returns IP 목록
   */
  getCurrentIPs(): string[] {
    return this.getResults().ips;
  }

  /**
   * 모니터링 중인지 확인합니다.
   *
   * @returns 모니터링 중이면 true
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * 수집된 데이터를 초기화합니다.
   */
  clear(): void {
    this.visitedDomains.clear();
    this.domainDetails.clear();
    this.visitedIPs.clear();
    this.fiveTupleLogs = [];
    console.log('[NetworkMonitor] Data cleared');
  }

  /**
   * 수집된 5-tuple 연결 로그를 가져옵니다.
   *
   * @returns 5-tuple 연결 로그 목록
   */
  getFiveTupleLogs(): FiveTupleConnection[] {
    return this.fiveTupleLogs;
  }
}
