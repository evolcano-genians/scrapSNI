/**
 * Domain Tracker - 도메인 유틸리티 함수
 *
 * 이 파일은 도메인과 IP 주소 처리에 관련된 유틸리티 함수들을 제공합니다.
 */

/**
 * 주어진 문자열이 IP 주소인지 확인합니다.
 *
 * @param {string} str - 확인할 문자열
 * @returns {boolean} IP 주소이면 true, 아니면 false
 *
 * @example
 * isIPAddress('192.168.1.1') // true
 * isIPAddress('example.com') // false
 * isIPAddress('2001:0db8:85a3::8a2e:0370:7334') // true
 */
export function isIPAddress(str: string): boolean {
  // IPv4 패턴: 0-255 범위의 4개 옥텟
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  // IPv6 패턴: 16진수 그룹과 콜론
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Pattern.test(str) || ipv6Pattern.test(str);
}

/**
 * IPv4 주소가 유효한지 확인합니다.
 * 각 옥텟이 0-255 범위 내에 있는지 검증합니다.
 *
 * @param {string} ip - 확인할 IPv4 주소
 * @returns {boolean} 유효한 IPv4 주소이면 true
 *
 * @example
 * isValidIPv4('192.168.1.1') // true
 * isValidIPv4('256.1.1.1')   // false
 * isValidIPv4('192.168.1')   // false
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Pattern);

  if (!match) {
    return false;
  }

  // 각 옥텟이 0-255 범위 내에 있는지 확인
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  return true;
}

/**
 * IPv6 주소가 유효한지 확인합니다.
 *
 * @param {string} ip - 확인할 IPv6 주소
 * @returns {boolean} 유효한 IPv6 주소이면 true
 *
 * @example
 * isValidIPv6('2001:0db8:85a3::8a2e:0370:7334') // true
 * isValidIPv6('::1')                            // true
 * isValidIPv6('gggg::1')                        // false
 */
export function isValidIPv6(ip: string): boolean {
  // IPv6 축약형 지원 (::)
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  return ipv6Pattern.test(ip);
}

/**
 * 도메인명이 유효한지 확인합니다.
 *
 * @param {string} domain - 확인할 도메인명
 * @returns {boolean} 유효한 도메인명이면 true
 *
 * @example
 * isValidDomain('example.com')      // true
 * isValidDomain('sub.example.com')  // true
 * isValidDomain('192.168.1.1')      // false
 * isValidDomain('example')          // false (TLD 없음)
 */
export function isValidDomain(domain: string): boolean {
  // IP 주소는 도메인이 아님
  if (isIPAddress(domain)) {
    return false;
  }

  // 도메인 패턴: 알파벳, 숫자, 하이픈, 점으로 구성
  // 최소 하나의 점이 있어야 함 (TLD 필요)
  const domainPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  return domainPattern.test(domain);
}

/**
 * URL에서 도메인을 추출합니다.
 *
 * @param {string} url - URL 문자열
 * @returns {string | null} 추출된 도메인, 실패 시 null
 *
 * @example
 * extractDomain('https://www.example.com/path')  // 'www.example.com'
 * extractDomain('http://example.com:8080')       // 'example.com'
 * extractDomain('invalid-url')                   // null
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // URL 파싱 실패
    return null;
  }
}

/**
 * URL에서 프로토콜을 추출합니다.
 *
 * @param {string} url - URL 문자열
 * @returns {'http' | 'https' | null} 프로토콜 (http 또는 https), 실패 시 null
 *
 * @example
 * extractProtocol('https://example.com')  // 'https'
 * extractProtocol('http://example.com')   // 'http'
 * extractProtocol('ftp://example.com')    // null
 */
export function extractProtocol(url: string): 'http' | 'https' | null {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');

    if (protocol === 'http' || protocol === 'https') {
      return protocol;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * localhost나 로컬 네트워크 주소인지 확인합니다.
 *
 * @param {string} domain - 확인할 도메인 또는 IP
 * @returns {boolean} 로컬 주소이면 true
 *
 * @example
 * isLocalAddress('localhost')     // true
 * isLocalAddress('127.0.0.1')     // true
 * isLocalAddress('192.168.1.1')   // true
 * isLocalAddress('example.com')   // false
 */
export function isLocalAddress(domain: string): boolean {
  // localhost 패턴
  if (domain === 'localhost' || domain.includes('localhost')) {
    return true;
  }

  // 127.x.x.x (loopback)
  if (domain.startsWith('127.')) {
    return true;
  }

  // 로컬 네트워크 (Private IP ranges)
  // 10.x.x.x
  if (domain.startsWith('10.')) {
    return true;
  }

  // 172.16.x.x - 172.31.x.x
  const match172 = domain.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  // 192.168.x.x
  if (domain.startsWith('192.168.')) {
    return true;
  }

  // IPv6 loopback (::1)
  if (domain === '::1' || domain === '[::1]') {
    return true;
  }

  return false;
}

/**
 * 도메인 목록에서 중복을 제거합니다.
 *
 * @param {string[]} domains - 도메인 목록
 * @returns {string[]} 중복이 제거된 도메인 목록
 *
 * @example
 * deduplicateDomains(['example.com', 'test.com', 'example.com'])
 * // ['example.com', 'test.com']
 */
export function deduplicateDomains(domains: string[]): string[] {
  return Array.from(new Set(domains));
}

/**
 * 도메인 목록을 알파벳순으로 정렬합니다.
 *
 * @param {string[]} domains - 도메인 목록
 * @returns {string[]} 정렬된 도메인 목록
 *
 * @example
 * sortDomains(['zzz.com', 'aaa.com', 'mmm.com'])
 * // ['aaa.com', 'mmm.com', 'zzz.com']
 */
export function sortDomains(domains: string[]): string[] {
  return [...domains].sort((a, b) => a.localeCompare(b));
}

/**
 * 도메인이 특정 패턴과 일치하는지 확인합니다.
 * 와일드카드(*) 지원
 *
 * @param {string} domain - 확인할 도메인
 * @param {string} pattern - 패턴 (예: '*.example.com')
 * @returns {boolean} 패턴과 일치하면 true
 *
 * @example
 * matchDomainPattern('sub.example.com', '*.example.com')    // true
 * matchDomainPattern('example.com', '*.example.com')        // false
 * matchDomainPattern('test.com', '*test.com')               // true
 */
export function matchDomainPattern(domain: string, pattern: string): boolean {
  // 와일드카드를 정규표현식으로 변환
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // . 을 이스케이프
    .replace(/\*/g, '.*');  // * 을 .* 로 변환

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(domain);
}

/**
 * 두 도메인이 같은 최상위 도메인(루트 도메인)을 가지는지 확인합니다.
 *
 * @param {string} domain1 - 첫 번째 도메인
 * @param {string} domain2 - 두 번째 도메인
 * @returns {boolean} 같은 루트 도메인이면 true
 *
 * @example
 * isSameRootDomain('sub1.example.com', 'sub2.example.com')  // true
 * isSameRootDomain('example.com', 'test.com')               // false
 */
export function isSameRootDomain(domain1: string, domain2: string): boolean {
  const root1 = getRootDomain(domain1);
  const root2 = getRootDomain(domain2);

  return root1 === root2;
}

/**
 * 도메인에서 루트 도메인(최상위 도메인)을 추출합니다.
 *
 * @param {string} domain - 도메인명
 * @returns {string} 루트 도메인
 *
 * @example
 * getRootDomain('sub.example.com')  // 'example.com'
 * getRootDomain('example.com')      // 'example.com'
 * getRootDomain('sub.co.uk')        // 'sub.co.uk' (단순 구현으로 인한 제한)
 */
export function getRootDomain(domain: string): string {
  const parts = domain.split('.');

  // 최소 2개 부분이 있어야 함 (domain.tld)
  if (parts.length < 2) {
    return domain;
  }

  // 마지막 두 부분을 루트 도메인으로 간주
  // 주의: co.uk 같은 복합 TLD는 제대로 처리하지 못함
  return parts.slice(-2).join('.');
}

/**
 * IP 주소 목록을 정렬합니다.
 * IPv4와 IPv6를 분리하여 각각 정렬
 *
 * @param {string[]} ips - IP 주소 목록
 * @returns {string[]} 정렬된 IP 주소 목록 (IPv4 먼저, 그 다음 IPv6)
 *
 * @example
 * sortIPs(['192.168.1.10', '10.0.0.1', '::1', '192.168.1.2'])
 * // ['10.0.0.1', '192.168.1.2', '192.168.1.10', '::1']
 */
export function sortIPs(ips: string[]): string[] {
  const ipv4s: string[] = [];
  const ipv6s: string[] = [];

  // IPv4와 IPv6 분리
  ips.forEach(ip => {
    if (isValidIPv4(ip)) {
      ipv4s.push(ip);
    } else if (isValidIPv6(ip)) {
      ipv6s.push(ip);
    }
  });

  // IPv4 정렬 (숫자 기반)
  ipv4s.sort((a, b) => {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 4; i++) {
      if (partsA[i] !== partsB[i]) {
        return partsA[i] - partsB[i];
      }
    }

    return 0;
  });

  // IPv6 정렬 (문자열 기반)
  ipv6s.sort();

  // IPv4가 먼저, 그 다음 IPv6
  return [...ipv4s, ...ipv6s];
}

/**
 * URL이 유효한지 확인합니다.
 *
 * @param {string} url - 확인할 URL
 * @returns {boolean} 유효한 URL이면 true
 *
 * @example
 * isValidURL('https://example.com')        // true
 * isValidURL('not-a-url')                  // false
 * isValidURL('http://192.168.1.1:8080')    // true
 */
export function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // http 또는 https 프로토콜만 허용
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * URL에 프로토콜이 없으면 추가합니다.
 *
 * @param {string} url - URL 문자열
 * @param {'http' | 'https'} defaultProtocol - 기본 프로토콜 (기본값: 'https')
 * @returns {string} 프로토콜이 포함된 URL
 *
 * @example
 * ensureProtocol('example.com')            // 'https://example.com'
 * ensureProtocol('http://example.com')     // 'http://example.com'
 * ensureProtocol('example.com', 'http')    // 'http://example.com'
 */
export function ensureProtocol(url: string, defaultProtocol: 'http' | 'https' = 'https'): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${defaultProtocol}://${url}`;
}
