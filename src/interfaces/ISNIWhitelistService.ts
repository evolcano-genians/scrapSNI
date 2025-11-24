/**
 * Domain Tracker - SNI Whitelist Service Interface
 *
 * SNI 화이트리스트 분석 및 생성 서비스 인터페이스입니다.
 */

import {
  DomainInfo,
  SNIWhitelistResult,
  SNIExportOptions
} from '../types';

/**
 * ISNIWhitelistService 인터페이스
 */
export interface ISNIWhitelistService {
  /**
   * 도메인 목록을 분석하여 SNI 화이트리스트를 생성합니다.
   *
   * @param domains - 수집된 도메인 정보 목록
   * @param ips - 수집된 IP 주소 목록
   * @returns SNI 화이트리스트 분석 결과
   */
  analyzeDomains(domains: DomainInfo[], ips: string[]): SNIWhitelistResult;

  /**
   * SNI 화이트리스트를 지정된 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns Export된 문자열
   */
  exportWhitelist(result: SNIWhitelistResult, options: SNIExportOptions): string;
}
