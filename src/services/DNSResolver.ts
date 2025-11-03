/**
 * Domain Tracker - DNS Resolver Service
 *
 * DNS 해석 서비스 클래스입니다.
 * Singleton 패턴을 제거하고 DI(Dependency Injection)를 지원합니다.
 */

import * as dns from 'dns';
import { promisify } from 'util';
import { IPAddresses, DNSConfig } from '../types';
import { IDNSResolver } from '../interfaces/IDNSResolver';
import { Injectable } from '../decorators';

// dns.promises API를 사용 (Node.js 내장)
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

/**
 * DNS 캐시 항목 인터페이스
 */
interface DNSCacheEntry {
  ips: IPAddresses;     // 해석된 IP 주소
  timestamp: number;    // 캐시된 시각 (밀리초)
  ttl: number;          // Time To Live (밀리초)
}

/**
 * DNSResolver 클래스
 *
 * 도메인명을 IP 주소로 변환하는 기능을 제공합니다.
 * 캐싱과 배치 처리를 통해 성능을 최적화합니다.
 *
 * ✅ Singleton 패턴 제거됨
 * ✅ IDNSResolver 인터페이스 구현
 * ✅ 생성자 주입을 통한 설정 전달
 * ✅ @Injectable() 데코레이터 적용
 */
@Injectable()
export class DNSResolver implements IDNSResolver {
  private cache: Map<string, DNSCacheEntry>;  // DNS 캐시
  private readonly defaultTTL: number = 300000; // 기본 캐시 TTL: 5분
  private readonly batchSize: number;
  private readonly timeout: number;

  /**
   * 생성자
   *
   * @param config - DNS 설정 (배치 크기, 타임아웃)
   */
  constructor(config: DNSConfig) {
    this.cache = new Map<string, DNSCacheEntry>();
    this.batchSize = config.batchSize;
    this.timeout = config.timeout;
    console.log('[DNSResolver] Initialized with batch size:', this.batchSize);
  }

  /**
   * 단일 도메인의 IP 주소를 해석합니다.
   *
   * 캐시를 먼저 확인하고, 캐시에 없거나 만료되었으면 DNS 조회를 수행합니다.
   *
   * @param domain - 해석할 도메인명
   * @param useCache - 캐시 사용 여부 (기본: true)
   * @returns IPv4 및 IPv6 주소 목록
   */
  public async resolve(domain: string, useCache: boolean = true): Promise<IPAddresses> {
    // 캐시 확인
    if (useCache) {
      const cached = this.getFromCache(domain);
      if (cached) {
        console.log(`[DNS Cache Hit] ${domain}`);
        return cached;
      }
    }

    console.log(`[DNS Resolving] ${domain}`);

    const ips: IPAddresses = {
      ipv4: [],
      ipv6: []
    };

    // IPv4 조회
    try {
      const ipv4Addresses = await resolve4(domain);
      ips.ipv4 = ipv4Addresses;
      console.log(`[DNS IPv4] ${domain} => ${ipv4Addresses.join(', ')}`);
    } catch (error) {
      // IPv4 조회 실패는 정상적인 경우도 있음 (IPv6 only 도메인 등)
      console.log(`[DNS IPv4 Failed] ${domain}: ${(error as Error).message}`);
    }

    // IPv6 조회
    try {
      const ipv6Addresses = await resolve6(domain);
      ips.ipv6 = ipv6Addresses;
      console.log(`[DNS IPv6] ${domain} => ${ipv6Addresses.join(', ')}`);
    } catch (error) {
      // IPv6 조회 실패는 정상적인 경우도 있음 (IPv4 only 도메인 등)
      console.log(`[DNS IPv6 Failed] ${domain}: ${(error as Error).message}`);
    }

    // 캐시에 저장
    if (useCache) {
      this.addToCache(domain, ips);
    }

    return ips;
  }

  /**
   * 여러 도메인의 IP 주소를 배치로 해석합니다.
   *
   * 설정된 배치 크기에 따라 병렬 처리를 수행하여 성능을 최적화합니다.
   * 과도한 동시 요청으로 인한 시스템 부하를 방지합니다.
   *
   * @param domains - 해석할 도메인 목록
   * @param useCache - 캐시 사용 여부 (기본: true)
   * @returns 도메인을 키로, IP 주소를 값으로 하는 맵
   */
  public async resolveBatch(domains: string[], useCache: boolean = true): Promise<Map<string, IPAddresses>> {
    const results = new Map<string, IPAddresses>();

    console.log(`[DNS Batch] Resolving ${domains.length} domains (batch size: ${this.batchSize})`);

    // 배치 단위로 처리
    for (let i = 0; i < domains.length; i += this.batchSize) {
      const batch = domains.slice(i, i + this.batchSize);

      // 배치 내에서 병렬 처리
      const promises = batch.map(async (domain) => {
        try {
          const ips = await this.resolve(domain, useCache);
          return { domain, ips };
        } catch (error) {
          console.error(`[DNS Error] ${domain}:`, error);
          // 에러가 발생해도 빈 결과 반환
          return {
            domain,
            ips: { ipv4: [], ipv6: [] }
          };
        }
      });

      // 배치 처리 완료 대기
      const batchResults = await Promise.all(promises);

      // 결과를 Map에 추가
      batchResults.forEach(({ domain, ips }) => {
        results.set(domain, ips);
      });

      console.log(`[DNS Batch Progress] ${Math.min(i + this.batchSize, domains.length)}/${domains.length} completed`);
    }

    console.log(`[DNS Batch Complete] Resolved ${results.size} domains`);
    return results;
  }

  /**
   * 캐시를 완전히 비웁니다.
   */
  public clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[DNS Cache Cleared] ${size} entries removed`);
  }

  /**
   * 캐시에서 도메인의 IP 주소를 가져옵니다.
   *
   * 캐시된 항목이 만료되었으면 null을 반환하고 캐시에서 제거합니다.
   *
   * @param domain - 도메인명
   * @returns 캐시된 IP 주소, 없거나 만료되었으면 null
   */
  private getFromCache(domain: string): IPAddresses | null {
    const entry = this.cache.get(domain);

    if (!entry) {
      return null;
    }

    // TTL 확인
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // 만료됨
      this.cache.delete(domain);
      console.log(`[DNS Cache Expired] ${domain}`);
      return null;
    }

    return entry.ips;
  }

  /**
   * 도메인의 IP 주소를 캐시에 추가합니다.
   *
   * @param domain - 도메인명
   * @param ips - IP 주소
   * @param ttl - Time To Live (밀리초, 선택사항)
   */
  private addToCache(domain: string, ips: IPAddresses, ttl?: number): void {
    this.cache.set(domain, {
      ips,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });

    console.log(`[DNS Cached] ${domain} (TTL: ${(ttl || this.defaultTTL) / 1000}s)`);
  }

  /**
   * 현재 캐시 크기를 반환합니다.
   *
   * @returns 캐시된 항목 수
   */
  public getCacheSize(): number {
    return this.cache.size;
  }
}
