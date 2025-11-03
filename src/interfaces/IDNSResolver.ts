/**
 * Domain Tracker - DNS 해석 인터페이스
 *
 * DNS 해석 기능을 추상화하는 인터페이스입니다.
 * DNSResolverModule의 Singleton 패턴을 제거하고 DI를 가능하게 합니다.
 */

import { IPAddresses } from '../types';

/**
 * DNS 해석 인터페이스
 *
 * 도메인명을 IP 주소로 변환하는 기능을 정의합니다.
 */
export interface IDNSResolver {
  /**
   * 단일 도메인의 IP 주소를 해석합니다.
   *
   * @param domain - 해석할 도메인명
   * @param useCache - 캐시 사용 여부 (기본: true)
   * @returns IPv4 및 IPv6 주소 목록
   */
  resolve(domain: string, useCache?: boolean): Promise<IPAddresses>;

  /**
   * 여러 도메인의 IP 주소를 배치로 해석합니다.
   *
   * @param domains - 해석할 도메인 목록
   * @param useCache - 캐시 사용 여부 (기본: true)
   * @returns 도메인을 키로, IP 주소를 값으로 하는 맵
   */
  resolveBatch(domains: string[], useCache?: boolean): Promise<Map<string, IPAddresses>>;

  /**
   * DNS 캐시를 지웁니다.
   */
  clearCache(): void;
}
