/**
 * Domain Tracker - SNI Whitelist Service
 *
 * SNI 필터링을 위한 화이트리스트 분석 및 생성 서비스입니다.
 *
 * 주요 기능:
 * - 서브도메인 분석 및 와일드카드 패턴 생성
 * - 필수/선택적 도메인 분류 (리소스 타입 기반)
 * - 내부 IP 필터링 (사설 IP 제외)
 * - 다양한 형식의 화이트리스트 export
 */

import { Injectable } from '../decorators';
import {
  DomainInfo,
  ClassifiedDomain,
  DomainClassification,
  WildcardPattern,
  SNIWhitelistResult,
  SNIExportOptions
} from '../types';

/**
 * SNIWhitelistService 클래스
 *
 * 수집된 도메인 정보를 분석하여 SNI 화이트리스트를 생성합니다.
 */
@Injectable()
export class SNIWhitelistService {
  /**
   * 필수 리소스 타입
   * 이 타입들은 웹사이트 동작에 필수적입니다.
   */
  private readonly ESSENTIAL_RESOURCE_TYPES = [
    'document',   // HTML 페이지
    'script',     // JavaScript
    'fetch',      // API 호출
    'xhr',        // AJAX 요청
    'websocket'   // WebSocket 연결
  ];

  /**
   * 선택적 리소스 타입
   * 이 타입들은 UX 향상을 위해 필요하지만 필수는 아닙니다.
   */
  private readonly OPTIONAL_RESOURCE_TYPES = [
    'stylesheet', // CSS
    'font',       // 웹폰트
    'image'       // 이미지
  ];

  /**
   * 제외할 리소스 타입
   * 이 타입들은 선택적으로 제외할 수 있습니다.
   */
  private readonly EXCLUDABLE_RESOURCE_TYPES = [
    'media',      // 비디오/오디오
    'ping',       // 분석 ping
    'other'       // 기타
  ];

  constructor() {
    console.log('[SNIWhitelistService] Initialized');
  }

  /**
   * 도메인 목록을 분석하여 SNI 화이트리스트를 생성합니다.
   *
   * @param domains - 수집된 도메인 정보 목록
   * @param ips - 수집된 IP 주소 목록
   * @returns SNI 화이트리스트 분석 결과
   */
  analyzeDomains(domains: DomainInfo[], ips: string[]): SNIWhitelistResult {
    console.log(`[SNIWhitelistService] Analyzing ${domains.length} domains and ${ips.length} IPs...`);

    // 1. 도메인 분류
    const classifiedDomains = this.classifyDomains(domains);

    // 2. 와일드카드 패턴 생성
    const wildcardPatterns = this.generateWildcardPatterns(domains);

    // 3. IP 필터링 (공인 IP vs 사설 IP)
    const { publicIPs, privateIPs } = this.filterIPs(ips);

    // 4. 결과 생성
    const result: SNIWhitelistResult = {
      timestamp: new Date().toISOString(),
      totalDomains: domains.length,
      totalIPs: ips.length,

      essentialDomains: classifiedDomains.filter(d => d.classification === 'essential'),
      optionalDomains: classifiedDomains.filter(d => d.classification === 'optional'),
      excludedDomains: classifiedDomains.filter(d => d.classification === 'excluded'),

      wildcardPatterns,

      publicIPs,
      privateIPs,

      stats: {
        essentialCount: classifiedDomains.filter(d => d.classification === 'essential').length,
        optionalCount: classifiedDomains.filter(d => d.classification === 'optional').length,
        excludedCount: classifiedDomains.filter(d => d.classification === 'excluded').length,
        wildcardCount: wildcardPatterns.length,
        publicIPCount: publicIPs.length,
        privateIPCount: privateIPs.length
      }
    };

    console.log(`[SNIWhitelistService] Analysis complete:`);
    console.log(`  - Essential domains: ${result.stats.essentialCount}`);
    console.log(`  - Optional domains: ${result.stats.optionalCount}`);
    console.log(`  - Excluded domains: ${result.stats.excludedCount}`);
    console.log(`  - Wildcard patterns: ${result.stats.wildcardCount}`);
    console.log(`  - Public IPs: ${result.stats.publicIPCount}`);
    console.log(`  - Private IPs: ${result.stats.privateIPCount}`);

    return result;
  }

  /**
   * 도메인을 분류합니다 (필수/선택적/제외).
   *
   * @param domains - 도메인 정보 목록
   * @returns 분류된 도메인 목록
   */
  private classifyDomains(domains: DomainInfo[]): ClassifiedDomain[] {
    return domains.map(domain => {
      const classification = this.classifyDomain(domain);
      const reason = this.getClassificationReason(domain, classification);

      return {
        domain: domain.domain,
        classification,
        reason,
        info: domain
      };
    });
  }

  /**
   * 단일 도메인을 분류합니다.
   *
   * @param domain - 도메인 정보
   * @returns 도메인 분류
   */
  private classifyDomain(domain: DomainInfo): DomainClassification {
    const types = domain.types;

    // 필수 리소스 타입이 하나라도 있으면 필수
    if (types.some(type => this.ESSENTIAL_RESOURCE_TYPES.includes(type))) {
      return 'essential';
    }

    // 선택적 리소스 타입만 있으면 선택적
    if (types.some(type => this.OPTIONAL_RESOURCE_TYPES.includes(type))) {
      return 'optional';
    }

    // 나머지는 제외 가능
    return 'excluded';
  }

  /**
   * 분류 이유를 생성합니다.
   *
   * @param domain - 도메인 정보
   * @param classification - 도메인 분류
   * @returns 분류 이유 문자열
   */
  private getClassificationReason(domain: DomainInfo, classification: DomainClassification): string {
    const types = domain.types;

    if (classification === 'essential') {
      const essentialTypes = types.filter(type => this.ESSENTIAL_RESOURCE_TYPES.includes(type));
      return `Essential resource types: ${essentialTypes.join(', ')}`;
    } else if (classification === 'optional') {
      const optionalTypes = types.filter(type => this.OPTIONAL_RESOURCE_TYPES.includes(type));
      return `Optional resource types: ${optionalTypes.join(', ')}`;
    } else {
      return `Excludable resource types: ${types.join(', ')}`;
    }
  }

  /**
   * 서브도메인을 분석하여 와일드카드 패턴을 생성합니다.
   *
   * @param domains - 도메인 정보 목록
   * @returns 와일드카드 패턴 목록
   */
  private generateWildcardPatterns(domains: DomainInfo[]): WildcardPattern[] {
    // 도메인을 base domain별로 그룹화
    const domainGroups = new Map<string, DomainInfo[]>();

    for (const domain of domains) {
      const baseDomain = this.extractBaseDomain(domain.domain);
      if (!domainGroups.has(baseDomain)) {
        domainGroups.set(baseDomain, []);
      }
      domainGroups.get(baseDomain)!.push(domain);
    }

    // 각 base domain에 대해 와일드카드 패턴 생성
    const patterns: WildcardPattern[] = [];

    for (const [baseDomain, groupDomains] of domainGroups.entries()) {
      // 서브도메인이 2개 이상인 경우에만 와일드카드 생성
      if (groupDomains.length >= 2) {
        const totalCount = groupDomains.reduce((sum, d) => sum + d.count, 0);
        patterns.push({
          pattern: `*.${baseDomain}`,
          matchedDomains: groupDomains.map(d => d.domain),
          count: totalCount
        });
      }
    }

    // 요청 수가 많은 순으로 정렬
    patterns.sort((a, b) => b.count - a.count);

    return patterns;
  }

  /**
   * 도메인에서 base domain을 추출합니다.
   * 예: auth.my.example.com -> example.com
   *
   * @param domain - 전체 도메인
   * @returns base domain
   */
  private extractBaseDomain(domain: string): string {
    const parts = domain.split('.');

    // IP 주소인 경우 그대로 반환
    if (this.isIPAddress(domain)) {
      return domain;
    }

    // 최소 2개 파트가 필요 (domain.tld)
    if (parts.length < 2) {
      return domain;
    }

    // 특수 TLD 처리 (co.kr, co.jp 등)
    const specialTLDs = ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac'];
    if (parts.length >= 3 && specialTLDs.includes(parts[parts.length - 2])) {
      // 마지막 3개 파트 반환 (example.co.kr)
      return parts.slice(-3).join('.');
    }

    // 일반 TLD (마지막 2개 파트 반환)
    return parts.slice(-2).join('.');
  }

  /**
   * IP 주소 여부를 확인합니다.
   *
   * @param domain - 확인할 문자열
   * @returns IP 주소면 true
   */
  private isIPAddress(domain: string): boolean {
    // IPv4 패턴
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 패턴 (간단한 버전)
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    return ipv4Pattern.test(domain) || ipv6Pattern.test(domain);
  }

  /**
   * IP 주소를 공인 IP와 사설 IP로 분류합니다.
   *
   * @param ips - IP 주소 목록
   * @returns 공인 IP와 사설 IP 목록
   */
  private filterIPs(ips: string[]): { publicIPs: string[], privateIPs: string[] } {
    const publicIPs: string[] = [];
    const privateIPs: string[] = [];

    for (const ip of ips) {
      if (this.isPrivateIP(ip)) {
        privateIPs.push(ip);
      } else {
        publicIPs.push(ip);
      }
    }

    return { publicIPs, privateIPs };
  }

  /**
   * 사설 IP 여부를 확인합니다.
   *
   * @param ip - IP 주소
   * @returns 사설 IP면 true
   */
  private isPrivateIP(ip: string): boolean {
    // IPv6는 간단하게 처리 (링크로컬, 사이트로컬, 루프백)
    if (ip.includes(':')) {
      return ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('::1');
    }

    // IPv4 사설 IP 범위
    const parts = ip.split('.').map(Number);

    if (parts.length !== 4 || parts.some(isNaN)) {
      return false;
    }

    // 10.0.0.0 - 10.255.255.255
    if (parts[0] === 10) {
      return true;
    }

    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }

    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }

    // 127.0.0.0 - 127.255.255.255 (루프백)
    if (parts[0] === 127) {
      return true;
    }

    // 169.254.0.0 - 169.254.255.255 (링크로컬)
    if (parts[0] === 169 && parts[1] === 254) {
      return true;
    }

    return false;
  }

  /**
   * SNI 화이트리스트를 지정된 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns Export된 문자열
   */
  exportWhitelist(result: SNIWhitelistResult, options: SNIExportOptions): string {
    switch (options.format) {
      case 'txt':
        return this.exportAsText(result, options);
      case 'json':
        return this.exportAsJSON(result, options);
      case 'csv':
        return this.exportAsCSV(result, options);
      case 'squid':
        return this.exportAsSquid(result, options);
      case 'pfsense':
        return this.exportAsPfSense(result, options);
      case 'fortigate':
        return this.exportAsFortigate(result, options);
      default:
        return this.exportAsText(result, options);
    }
  }

  /**
   * 텍스트 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns 텍스트 문자열
   */
  private exportAsText(result: SNIWhitelistResult, options: SNIExportOptions): string {
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push('# SNI Whitelist');
      lines.push(`# Generated: ${result.timestamp}`);
      lines.push(`# Total Domains: ${result.totalDomains}`);
      lines.push(`# Essential: ${result.stats.essentialCount}, Optional: ${result.stats.optionalCount}`);
      lines.push('');
    }

    // 와일드카드 패턴
    if (options.includeWildcards && result.wildcardPatterns.length > 0) {
      if (options.includeComments) {
        lines.push('# Wildcard Patterns');
      }
      result.wildcardPatterns.forEach(pattern => {
        lines.push(pattern.pattern);
      });
      lines.push('');
    }

    // 필수 도메인
    if (options.includeComments) {
      lines.push('# Essential Domains');
    }
    result.essentialDomains.forEach(d => {
      lines.push(d.domain);
    });

    // 선택적 도메인
    if (options.includeOptional) {
      lines.push('');
      if (options.includeComments) {
        lines.push('# Optional Domains');
      }
      result.optionalDomains.forEach(d => {
        lines.push(d.domain);
      });
    }

    // IP 주소
    if (options.includeIPs) {
      lines.push('');
      if (options.includeComments) {
        lines.push('# Public IP Addresses');
      }
      result.publicIPs.forEach(ip => {
        lines.push(ip);
      });
    }

    return lines.join('\n');
  }

  /**
   * JSON 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns JSON 문자열
   */
  private exportAsJSON(result: SNIWhitelistResult, options: SNIExportOptions): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * CSV 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns CSV 문자열
   */
  private exportAsCSV(result: SNIWhitelistResult, options: SNIExportOptions): string {
    const lines: string[] = [];

    // 헤더
    lines.push('Domain,Classification,Request Count,Resource Types,Reason');

    // 필수 도메인
    result.essentialDomains.forEach(d => {
      lines.push(`${d.domain},essential,${d.info.count},"${d.info.types.join(', ')}","${d.reason}"`);
    });

    // 선택적 도메인
    if (options.includeOptional) {
      result.optionalDomains.forEach(d => {
        lines.push(`${d.domain},optional,${d.info.count},"${d.info.types.join(', ')}","${d.reason}"`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Squid proxy 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns Squid 설정 문자열
   */
  private exportAsSquid(result: SNIWhitelistResult, options: SNIExportOptions): string {
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push('# Squid ACL Whitelist');
      lines.push(`# Generated: ${result.timestamp}`);
      lines.push('');
    }

    lines.push('acl whitelist_domains dstdomain \\');

    const domains: string[] = [];

    // 와일드카드
    if (options.includeWildcards) {
      result.wildcardPatterns.forEach(p => {
        domains.push(p.pattern.replace('*.', '.'));
      });
    }

    // 필수 도메인
    result.essentialDomains.forEach(d => {
      domains.push(d.domain);
    });

    // 선택적 도메인
    if (options.includeOptional) {
      result.optionalDomains.forEach(d => {
        domains.push(d.domain);
      });
    }

    domains.forEach((domain, index) => {
      if (index < domains.length - 1) {
        lines.push(`  ${domain} \\`);
      } else {
        lines.push(`  ${domain}`);
      }
    });

    lines.push('');
    lines.push('http_access allow whitelist_domains');

    return lines.join('\n');
  }

  /**
   * pfSense 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns pfSense 설정 문자열
   */
  private exportAsPfSense(result: SNIWhitelistResult, options: SNIExportOptions): string {
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push('# pfSense Alias List');
      lines.push(`# Generated: ${result.timestamp}`);
      lines.push('# Add this to Firewall > Aliases > URLs');
      lines.push('');
    }

    // 필수 도메인
    result.essentialDomains.forEach(d => {
      lines.push(d.domain);
    });

    // 선택적 도메인
    if (options.includeOptional) {
      result.optionalDomains.forEach(d => {
        lines.push(d.domain);
      });
    }

    return lines.join('\n');
  }

  /**
   * FortiGate 형식으로 export합니다.
   *
   * @param result - SNI 화이트리스트 분석 결과
   * @param options - Export 옵션
   * @returns FortiGate 설정 문자열
   */
  private exportAsFortigate(result: SNIWhitelistResult, options: SNIExportOptions): string {
    const lines: string[] = [];

    if (options.includeComments) {
      lines.push('# FortiGate URL Filter');
      lines.push(`# Generated: ${result.timestamp}`);
      lines.push('');
    }

    lines.push('config webfilter urlfilter');
    lines.push('  edit "SNI_Whitelist"');
    lines.push('    config entries');

    let id = 1;

    // 필수 도메인
    result.essentialDomains.forEach(d => {
      lines.push(`      edit ${id}`);
      lines.push(`        set url "${d.domain}"`);
      lines.push(`        set type simple`);
      lines.push(`        set action allow`);
      lines.push(`      next`);
      id++;
    });

    // 선택적 도메인
    if (options.includeOptional) {
      result.optionalDomains.forEach(d => {
        lines.push(`      edit ${id}`);
        lines.push(`        set url "${d.domain}"`);
        lines.push(`        set type simple`);
        lines.push(`        set action allow`);
        lines.push(`      next`);
        id++;
      });
    }

    lines.push('    end');
    lines.push('  next');
    lines.push('end');

    return lines.join('\n');
  }
}
