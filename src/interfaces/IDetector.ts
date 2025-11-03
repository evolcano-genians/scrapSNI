/**
 * Domain Tracker - CDN/서드파티 감지 인터페이스
 *
 * CDN 및 서드파티 서비스 감지 기능을 추상화하는 인터페이스입니다.
 * DetectorModule의 Singleton 패턴을 제거하고 DI를 가능하게 합니다.
 */

/**
 * CDN 및 서드파티 서비스 감지 인터페이스
 */
export interface IDetector {
  /**
   * CDN 서비스를 감지합니다.
   *
   * @param domain - 확인할 도메인명
   * @param headers - HTTP 응답 헤더 (선택사항)
   * @returns 감지된 CDN 서비스명, 없으면 null
   */
  detectCDN(domain: string, headers?: Record<string, string>): string | null;

  /**
   * 서드파티 서비스를 감지합니다.
   *
   * @param domain - 확인할 도메인명
   * @returns 감지된 서드파티 서비스명, 없으면 null
   */
  detectThirdPartyService(domain: string): string | null;
}
