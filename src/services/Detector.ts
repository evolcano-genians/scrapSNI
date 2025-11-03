/**
 * Domain Tracker - Detector Service
 *
 * CDN 및 서드파티 서비스 감지 서비스 클래스입니다.
 * Singleton 패턴을 제거하고 DI(Dependency Injection)를 지원합니다.
 */

import { CDN_PATTERNS, THIRD_PARTY_PATTERNS } from '../utils/constants';
import { IDetector } from '../interfaces/IDetector';
import { Injectable } from '../decorators';

/**
 * Detector 클래스
 *
 * CDN과 서드파티 서비스를 감지하는 기능을 제공합니다.
 *
 * ✅ Singleton 패턴 제거됨
 * ✅ IDetector 인터페이스 구현
 * ✅ 생성자 주입 준비
 * ✅ @Injectable() 데코레이터 적용
 */
@Injectable()
export class Detector implements IDetector {
  /**
   * 생성자
   */
  constructor() {
    console.log('[Detector] Initialized');
  }

  /**
   * CDN 서비스를 감지합니다.
   *
   * 도메인명과 HTTP 헤더를 분석하여 알려진 CDN 서비스를 식별합니다.
   * 여러 패턴과 매칭될 수 있으며, 첫 번째로 매칭된 서비스를 반환합니다.
   *
   * @param domain - 확인할 도메인명
   * @param headers - HTTP 응답 헤더 (선택사항)
   * @returns 감지된 CDN 서비스명, 없으면 null
   */
  public detectCDN(domain: string, headers: Record<string, string> = {}): string | null {
    // 도메인명을 소문자로 변환 (대소문자 구분 없이 비교)
    const lowerDomain = domain.toLowerCase();

    // 모든 CDN 패턴 순회
    for (const [cdnName, patterns] of Object.entries(CDN_PATTERNS)) {
      // 각 CDN의 패턴 목록 순회
      for (const pattern of patterns) {
        const lowerPattern = pattern.toLowerCase();

        // 도메인명에 패턴이 포함되어 있는지 확인
        if (lowerDomain.includes(lowerPattern)) {
          console.log(`[CDN Detected] ${cdnName} (domain pattern: ${pattern})`);
          return cdnName;
        }

        // HTTP 헤더에 패턴이 포함되어 있는지 확인
        if (headers) {
          for (const [headerKey, headerValue] of Object.entries(headers)) {
            const lowerHeaderKey = headerKey.toLowerCase();
            const lowerHeaderValue = (headerValue || '').toLowerCase();

            // 헤더 키나 값에 패턴이 포함되어 있는지 확인
            if (lowerHeaderKey.includes(lowerPattern) || lowerHeaderValue.includes(lowerPattern)) {
              console.log(`[CDN Detected] ${cdnName} (header pattern: ${pattern})`);
              return cdnName;
            }
          }
        }
      }
    }

    // 매칭되는 CDN이 없음
    return null;
  }

  /**
   * 서드파티 서비스를 감지합니다.
   *
   * 도메인명을 분석하여 알려진 서드파티 서비스를 식별합니다.
   *
   * @param domain - 확인할 도메인명
   * @returns 감지된 서비스명, 없으면 null
   */
  public detectThirdPartyService(domain: string): string | null {
    const lowerDomain = domain.toLowerCase();

    // 모든 서드파티 서비스 패턴 순회
    for (const [serviceName, patterns] of Object.entries(THIRD_PARTY_PATTERNS)) {
      // 패턴 목록에서 하나라도 일치하면 해당 서비스 반환
      if (patterns.some(pattern => lowerDomain.includes(pattern.toLowerCase()))) {
        console.log(`[Third-Party Service Detected] ${serviceName} (domain: ${domain})`);
        return serviceName;
      }
    }

    // 매칭되는 서비스가 없음
    return null;
  }

  /**
   * 도메인이 CDN 서비스인지 확인합니다.
   *
   * @param domain - 확인할 도메인명
   * @returns CDN 서비스이면 true
   */
  public isCDN(domain: string): boolean {
    return this.detectCDN(domain) !== null;
  }

  /**
   * 도메인이 서드파티 서비스인지 확인합니다.
   *
   * @param domain - 확인할 도메인명
   * @returns 서드파티 서비스이면 true
   */
  public isThirdPartyService(domain: string): boolean {
    return this.detectThirdPartyService(domain) !== null;
  }

  /**
   * 지원하는 모든 CDN 서비스 목록을 반환합니다.
   *
   * @returns CDN 서비스명 목록
   */
  public getSupportedCDNs(): string[] {
    return Object.keys(CDN_PATTERNS);
  }

  /**
   * 지원하는 모든 서드파티 서비스 목록을 반환합니다.
   *
   * @returns 서드파티 서비스명 목록
   */
  public getSupportedThirdPartyServices(): string[] {
    return Object.keys(THIRD_PARTY_PATTERNS);
  }
}
