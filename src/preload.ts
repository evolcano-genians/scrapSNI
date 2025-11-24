/**
 * Domain Tracker - Preload 스크립트
 *
 * 이 파일은 Electron의 preload 스크립트로, 메인 프로세스와 렌더러 프로세스 사이의
 * 안전한 통신 브릿지를 제공합니다.
 *
 * contextBridge를 사용하여 선택적으로 API만 노출하여 보안을 강화합니다.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { AnalysisOptions, WorkflowStep, SNIWhitelistResult, SNIExportOptions } from './types';

/**
 * ElectronAPI 인터페이스
 *
 * 렌더러 프로세스에서 사용할 수 있는 모든 API를 정의합니다.
 * window.electronAPI로 접근 가능합니다.
 */
interface ElectronAPI {
  // 트래킹 관련
  startTracking: (browserType?: string) => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<{ success: boolean; domains?: any[]; error?: string }>;
  getTrackingStatus: () => Promise<boolean>;
  getCurrentDomains: () => Promise<any[]>;
  startAutoCrawl: (depth: number, maxLinks: number) => Promise<{ success: boolean; error?: string }>;

  // 세션 관리
  saveSession: (sessionPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadSession: (sessionPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  exportSession: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  importSession: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  onCrawlProgress: (callback: (message: string) => void) => void;

  // 자동 분석 관련
  analyzeUrl: (targetUrl: string, options: AnalysisOptions) => Promise<any>;
  loginComplete: (analysisId: string) => Promise<{ success: boolean; error?: string }>;

  // 세션 관리
  checkSavedSession: () => Promise<{ exists: boolean; path: string }>;
  clearSavedSession: () => Promise<{ success: boolean; message?: string; error?: string }>;

  // 워크플로우
  runWorkflow: (steps: WorkflowStep[]) => Promise<any>;

  // SNI 화이트리스트
  analyzeSNIWhitelist: (domains: any[], ips: string[]) => Promise<{ success: boolean; data?: SNIWhitelistResult; error?: string }>;
  exportSNIWhitelist: (result: SNIWhitelistResult, options: SNIExportOptions) => Promise<{ success: boolean; data?: string; error?: string }>;

  // 파일 저장
  saveFile: (defaultPath: string, content: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
}

/**
 * 렌더러 프로세스에서 사용할 수 있는 안전한 API를 노출합니다.
 *
 * contextBridge.exposeInMainWorld를 사용하여 window.electronAPI에
 * 안전한 API만 노출합니다. 이를 통해:
 * - 렌더러 프로세스는 제한된 API만 사용 가능
 * - 메인 프로세스의 모든 기능에 직접 접근 불가
 * - XSS 공격으로부터 보호
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 트래킹 관련 ====================

  /**
   * 수동 트래킹을 시작합니다.
   *
   * @param {string} browserType - 브라우저 타입 (chromium, firefox, webkit) - 선택사항
   * @returns {Promise} 성공 여부와 에러 메시지
   *
   * @example
   * const result = await window.electronAPI.startTracking('firefox');
   * if (result.success) {
   *   console.log('트래킹 시작됨');
   * } else {
   *   console.error(result.error);
   * }
   */
  startTracking: (browserType?: string) => {
    return ipcRenderer.invoke('start-tracking', browserType);
  },

  /**
   * 트래킹을 중지합니다.
   *
   * @returns {Promise} 성공 여부와 수집된 도메인 목록
   *
   * @example
   * const result = await window.electronAPI.stopTracking();
   * if (result.success) {
   *   console.log('수집된 도메인:', result.domains);
   * }
   */
  stopTracking: () => {
    return ipcRenderer.invoke('stop-tracking');
  },

  /**
   * 현재 트래킹 상태를 확인합니다.
   *
   * @returns {Promise<boolean>} 트래킹 중이면 true
   *
   * @example
   * const isTracking = await window.electronAPI.getTrackingStatus();
   * console.log('트래킹 상태:', isTracking);
   */
  getTrackingStatus: () => {
    return ipcRenderer.invoke('get-tracking-status');
  },

  /**
   * 현재까지 수집된 도메인 목록을 가져옵니다.
   *
   * @returns {Promise<Array>} 도메인 정보 배열
   *
   * @example
   * const domains = await window.electronAPI.getCurrentDomains();
   * console.log('현재 도메인:', domains);
   */
  getCurrentDomains: () => {
    return ipcRenderer.invoke('get-current-domains');
  },

  /**
   * 자동 크롤링을 시작합니다 (Manual Tracking 중).
   *
   * @param {number} depth - 크롤링 깊이 (0-3)
   * @param {number} maxLinks - 각 깊이별 최대 링크 수
   * @returns {Promise} 성공 여부
   *
   * @example
   * const result = await window.electronAPI.startAutoCrawl(1, 10);
   * if (result.success) {
   *   console.log('자동 크롤링 시작');
   * }
   */
  startAutoCrawl: (depth: number, maxLinks: number) => {
    return ipcRenderer.invoke('start-auto-crawl', depth, maxLinks);
  },

  // ==================== 세션 관리 ====================

  /**
   * 현재 브라우저 세션을 저장합니다.
   *
   * @param {string} sessionPath - 세션 파일 경로
   * @returns {Promise} 성공 여부와 저장 경로
   *
   * @example
   * const result = await window.electronAPI.saveSession('/path/to/session.json');
   * if (result.success) {
   *   console.log('세션 저장됨:', result.path);
   * }
   */
  saveSession: (sessionPath: string) => {
    return ipcRenderer.invoke('save-session', sessionPath);
  },

  /**
   * 저장된 세션을 로드합니다.
   *
   * @param {string} sessionPath - 세션 파일 경로
   * @returns {Promise} 성공 여부와 로드 경로
   *
   * @example
   * const result = await window.electronAPI.loadSession('/path/to/session.json');
   * if (result.success) {
   *   console.log('세션 로드됨:', result.path);
   * }
   */
  loadSession: (sessionPath: string) => {
    return ipcRenderer.invoke('load-session', sessionPath);
  },

  /**
   * 세션을 사용자 지정 경로로 내보냅니다.
   *
   * @returns {Promise} 성공 여부, 저장 경로, 취소 여부
   *
   * @example
   * const result = await window.electronAPI.exportSession();
   * if (result.success) {
   *   console.log('세션 내보내기 완료:', result.path);
   * } else if (result.canceled) {
   *   console.log('사용자가 취소함');
   * }
   */
  exportSession: () => {
    return ipcRenderer.invoke('export-session');
  },

  /**
   * 사용자 지정 경로에서 세션을 가져옵니다.
   *
   * @returns {Promise} 성공 여부, 로드 경로, 취소 여부
   *
   * @example
   * const result = await window.electronAPI.importSession();
   * if (result.success) {
   *   console.log('세션 가져오기 완료:', result.path);
   * } else if (result.canceled) {
   *   console.log('사용자가 취소함');
   * }
   */
  importSession: () => {
    return ipcRenderer.invoke('import-session');
  },

  /**
   * 크롤링 진행 상황을 수신합니다.
   *
   * @param {Function} callback - 진행 상황 메시지를 받을 콜백
   *
   * @example
   * window.electronAPI.onCrawlProgress((message) => {
   *   console.log('크롤링 진행:', message);
   * });
   */
  onCrawlProgress: (callback: (message: string) => void) => {
    ipcRenderer.on('crawl-progress', (_event, message) => callback(message));
  },

  // ==================== 자동 분석 관련 ====================

  /**
   * URL을 자동으로 분석합니다.
   *
   * @param {string} targetUrl - 분석할 URL
   * @param {AnalysisOptions} options - 분석 옵션
   * @returns {Promise} 분석 결과
   *
   * @example
   * const result = await window.electronAPI.analyzeUrl('https://example.com', {
   *   waitTime: 5000,
   *   crawlDepth: 1
   * });
   * console.log('분석 결과:', result.domains);
   */
  analyzeUrl: (targetUrl: string, options: AnalysisOptions) => {
    return ipcRenderer.invoke('analyze-url', targetUrl, options);
  },

  /**
   * 로그인 완료 신호를 전송합니다.
   *
   * @param {string} analysisId - 분석 세션 ID
   * @returns {Promise} 성공 여부
   *
   * @example
   * await window.electronAPI.loginComplete('session-123');
   */
  loginComplete: (analysisId: string) => {
    return ipcRenderer.invoke('login-complete', analysisId);
  },

  // ==================== 세션 관리 ====================

  /**
   * 저장된 세션 파일이 있는지 확인합니다.
   *
   * @returns {Promise} 세션 파일 존재 여부와 경로
   *
   * @example
   * const sessionInfo = await window.electronAPI.checkSavedSession();
   * if (sessionInfo.exists) {
   *   console.log('세션 파일 경로:', sessionInfo.path);
   * }
   */
  checkSavedSession: () => {
    return ipcRenderer.invoke('check-saved-session');
  },

  /**
   * 저장된 세션 파일을 삭제합니다.
   *
   * @returns {Promise} 성공 여부와 메시지
   *
   * @example
   * const result = await window.electronAPI.clearSavedSession();
   * if (result.success) {
   *   console.log(result.message);
   * }
   */
  clearSavedSession: () => {
    return ipcRenderer.invoke('clear-saved-session');
  },

  // ==================== 워크플로우 관련 ====================

  /**
   * 워크플로우를 실행합니다.
   *
   * @param {WorkflowStep[]} steps - 워크플로우 단계 배열
   * @returns {Promise} 실행 결과
   *
   * @example
   * const steps = [
   *   { type: 'navigate', name: '페이지 이동', config: { url: 'https://example.com' } },
   *   { type: 'crawl', name: '크롤링', config: { depth: 1 } }
   * ];
   * const result = await window.electronAPI.runWorkflow(steps);
   * console.log('수집된 도메인:', result.domains);
   */
  runWorkflow: (steps: WorkflowStep[]) => {
    return ipcRenderer.invoke('run-workflow', steps);
  },

  // ==================== SNI 화이트리스트 관련 ====================

  /**
   * SNI 화이트리스트를 분석합니다.
   *
   * @param {Array} domains - 수집된 도메인 정보 배열
   * @param {string[]} ips - 수집된 IP 주소 배열
   * @returns {Promise} 분석 결과 (필수/선택적 도메인, 와일드카드, IP 필터링 등)
   *
   * @example
   * const result = await window.electronAPI.analyzeSNIWhitelist(domains, ips);
   * if (result.success) {
   *   console.log('필수 도메인:', result.data.essentialDomains);
   *   console.log('와일드카드 패턴:', result.data.wildcardPatterns);
   *   console.log('공인 IP:', result.data.publicIPs);
   * }
   */
  analyzeSNIWhitelist: (domains: any[], ips: string[]) => {
    return ipcRenderer.invoke('analyze-sni-whitelist', domains, ips);
  },

  /**
   * SNI 화이트리스트를 지정된 형식으로 export합니다.
   *
   * @param {SNIWhitelistResult} result - 분석 결과
   * @param {SNIExportOptions} options - Export 옵션 (format, includeWildcards 등)
   * @returns {Promise} Export된 문자열
   *
   * @example
   * const exported = await window.electronAPI.exportSNIWhitelist(result, {
   *   format: 'txt',
   *   includeWildcards: true,
   *   includeIPs: true,
   *   includeOptional: false,
   *   includeComments: true
   * });
   * if (exported.success) {
   *   console.log('Export된 데이터:', exported.data);
   * }
   */
  exportSNIWhitelist: (result: SNIWhitelistResult, options: SNIExportOptions) => {
    return ipcRenderer.invoke('export-sni-whitelist', result, options);
  },

  // ==================== 파일 저장 관련 ====================

  /**
   * 파일 저장 다이얼로그를 열고 파일을 저장합니다.
   *
   * @param {string} defaultPath - 기본 파일명 (확장자 포함)
   * @param {string} content - 저장할 내용
   * @returns {Promise} 저장 결과 (성공 여부, 파일 경로, 취소 여부, 에러)
   *
   * @example
   * const result = await window.electronAPI.saveFile('domains-2024-01-01.txt', 'example.com\ngoogle.com');
   * if (result.success) {
   *   console.log('파일 저장됨:', result.filePath);
   * } else if (result.canceled) {
   *   console.log('사용자가 취소함');
   * } else {
   *   console.error('저장 실패:', result.error);
   * }
   */
  saveFile: (defaultPath: string, content: string) => {
    return ipcRenderer.invoke('save-file', defaultPath, content);
  }
} as ElectronAPI);

/**
 * 전역 Window 인터페이스 확장
 *
 * TypeScript가 window.electronAPI를 인식하도록 선언을 확장합니다.
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 개발 모드에서 디버깅 정보 출력
if (process.env.NODE_ENV === 'development') {
  console.log('[Preload] electronAPI exposed to renderer process');
  console.log('[Preload] Available methods:', Object.keys((contextBridge as any).electronAPI || {}));
}
