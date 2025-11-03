/**
 * Domain Tracker - 설정 관리
 *
 * 이 파일은 애플리케이션의 모든 설정 값을 중앙에서 관리합니다.
 * 설정은 런타임에 변경 가능하며, 기본값이 제공됩니다.
 */

import { AppConfig } from '../types';
import * as constants from '../utils/constants';

/**
 * 기본 애플리케이션 설정
 */
const defaultConfig: AppConfig = {
  // 크롤러 설정
  crawler: {
    maxLinksPerDepth: constants.MAX_LINKS_PER_DEPTH,       // 각 깊이별 최대 링크 수: 10개
    clickTimeout: constants.CLICK_TIMEOUT,                 // 클릭 타임아웃: 3초
    loadTimeout: constants.LOAD_TIMEOUT,                   // 로드 타임아웃: 5초
    networkIdleTimeout: constants.NETWORK_IDLE_TIMEOUT,    // 네트워크 idle 타임아웃: 2초
    scrollDelay: constants.SCROLL_DELAY                    // 스크롤 간 대기 시간: 300ms
  },

  // DNS 설정
  dns: {
    batchSize: constants.DNS_BATCH_SIZE,   // 배치 처리 크기: 10개
    timeout: constants.DNS_TIMEOUT         // DNS 조회 타임아웃: 5초
  },

  // 제한 설정
  limits: {
    maxDomains: constants.MAX_DOMAINS,                 // 최대 도메인 수: 10,000개
    maxIPs: constants.MAX_IPS,                         // 최대 IP 수: 5,000개
    maxResourceDetails: constants.MAX_RESOURCE_DETAILS  // 최대 리소스 상세 정보 수: 100개
  },

  // 브라우저 설정
  browser: {
    headless: false,                                     // Headless 모드 여부 (기본: 화면 표시)
    userAgent: constants.DEFAULT_USER_AGENT,            // User-Agent 문자열
    defaultWaitTime: constants.DEFAULT_WAIT_TIME,       // 기본 대기 시간: 5초
    defaultMaxWaitTime: constants.DEFAULT_MAX_WAIT_TIME // 기본 최대 대기 시간: 30초
  }
};

/**
 * 현재 애플리케이션 설정
 * 초기값은 defaultConfig를 복사하여 사용
 */
let currentConfig: AppConfig = JSON.parse(JSON.stringify(defaultConfig));

/**
 * 현재 설정을 가져옵니다.
 *
 * @returns {AppConfig} 현재 애플리케이션 설정
 */
export function getConfig(): AppConfig {
  return currentConfig;
}

/**
 * 설정을 업데이트합니다.
 * 부분적인 업데이트를 지원하며, 제공되지 않은 값은 기존 값을 유지합니다.
 *
 * @param {Partial<AppConfig>} newConfig - 업데이트할 설정 (부분)
 */
export function updateConfig(newConfig: Partial<AppConfig>): void {
  // 깊은 병합 (deep merge)을 수행
  currentConfig = {
    ...currentConfig,
    crawler: {
      ...currentConfig.crawler,
      ...(newConfig.crawler || {})
    },
    dns: {
      ...currentConfig.dns,
      ...(newConfig.dns || {})
    },
    limits: {
      ...currentConfig.limits,
      ...(newConfig.limits || {})
    },
    browser: {
      ...currentConfig.browser,
      ...(newConfig.browser || {})
    }
  };
}

/**
 * 설정을 기본값으로 초기화합니다.
 */
export function resetConfig(): void {
  currentConfig = JSON.parse(JSON.stringify(defaultConfig));
}

/**
 * 특정 카테고리의 설정만 가져옵니다.
 *
 * @param {keyof AppConfig} category - 설정 카테고리 ('crawler', 'dns', 'limits', 'browser')
 * @returns 해당 카테고리의 설정
 */
export function getConfigCategory<K extends keyof AppConfig>(category: K): AppConfig[K] {
  return currentConfig[category];
}

/**
 * 특정 카테고리의 설정만 업데이트합니다.
 *
 * @param {keyof AppConfig} category - 설정 카테고리
 * @param {Partial<AppConfig[K]>} newConfig - 업데이트할 설정 (부분)
 */
export function updateConfigCategory<K extends keyof AppConfig>(
  category: K,
  newConfig: Partial<AppConfig[K]>
): void {
  currentConfig[category] = {
    ...currentConfig[category],
    ...newConfig
  };
}

/**
 * 설정을 검증합니다.
 * 설정 값이 유효한 범위 내에 있는지 확인합니다.
 *
 * @param {AppConfig} config - 검증할 설정
 * @returns {boolean} 설정이 유효하면 true, 아니면 false
 */
export function validateConfig(config: AppConfig): boolean {
  try {
    // 크롤러 설정 검증
    if (config.crawler.maxLinksPerDepth < 1 || config.crawler.maxLinksPerDepth > 100) {
      console.error('Invalid maxLinksPerDepth: must be between 1 and 100');
      return false;
    }
    if (config.crawler.clickTimeout < 1000 || config.crawler.clickTimeout > 30000) {
      console.error('Invalid clickTimeout: must be between 1000 and 30000 ms');
      return false;
    }
    if (config.crawler.loadTimeout < 1000 || config.crawler.loadTimeout > 60000) {
      console.error('Invalid loadTimeout: must be between 1000 and 60000 ms');
      return false;
    }

    // DNS 설정 검증
    if (config.dns.batchSize < 1 || config.dns.batchSize > 50) {
      console.error('Invalid DNS batchSize: must be between 1 and 50');
      return false;
    }
    if (config.dns.timeout < 1000 || config.dns.timeout > 30000) {
      console.error('Invalid DNS timeout: must be between 1000 and 30000 ms');
      return false;
    }

    // 제한 설정 검증
    if (config.limits.maxDomains < 100 || config.limits.maxDomains > 100000) {
      console.error('Invalid maxDomains: must be between 100 and 100000');
      return false;
    }
    if (config.limits.maxIPs < 100 || config.limits.maxIPs > 100000) {
      console.error('Invalid maxIPs: must be between 100 and 100000');
      return false;
    }

    // 브라우저 설정 검증
    if (config.browser.defaultWaitTime < 1000 || config.browser.defaultWaitTime > 60000) {
      console.error('Invalid defaultWaitTime: must be between 1000 and 60000 ms');
      return false;
    }
    if (config.browser.defaultMaxWaitTime < 5000 || config.browser.defaultMaxWaitTime > 300000) {
      console.error('Invalid defaultMaxWaitTime: must be between 5000 and 300000 ms');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating config:', error);
    return false;
  }
}

/**
 * 설정을 JSON 파일로 내보냅니다.
 *
 * @returns {string} JSON 형식의 설정 문자열
 */
export function exportConfig(): string {
  return JSON.stringify(currentConfig, null, 2);
}

/**
 * JSON 파일에서 설정을 가져옵니다.
 *
 * @param {string} jsonString - JSON 형식의 설정 문자열
 * @returns {boolean} 가져오기 성공 여부
 */
export function importConfig(jsonString: string): boolean {
  try {
    const newConfig = JSON.parse(jsonString) as AppConfig;

    // 설정 검증
    if (!validateConfig(newConfig)) {
      console.error('Invalid config provided');
      return false;
    }

    currentConfig = newConfig;
    return true;
  } catch (error) {
    console.error('Error importing config:', error);
    return false;
  }
}

// 기본 내보내기
export default {
  getConfig,
  updateConfig,
  resetConfig,
  getConfigCategory,
  updateConfigCategory,
  validateConfig,
  exportConfig,
  importConfig
};
