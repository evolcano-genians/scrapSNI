/**
 * Domain Tracker - Preload 스크립트
 *
 * 이 파일은 Electron의 preload 스크립트로, 메인 프로세스와 렌더러 프로세스 사이의
 * 안전한 통신 브릿지를 제공합니다.
 *
 * contextBridge를 사용하여 선택적으로 API만 노출하여 보안을 강화합니다.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { AnalysisOptions, WorkflowStep } from './types';

/**
 * ElectronAPI 인터페이스
 *
 * 렌더러 프로세스에서 사용할 수 있는 모든 API를 정의합니다.
 * window.electronAPI로 접근 가능합니다.
 */
interface ElectronAPI {
  // 트래킹 관련
  startTracking: () => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<{ success: boolean; domains?: any[]; error?: string }>;
  getTrackingStatus: () => Promise<boolean>;
  getCurrentDomains: () => Promise<any[]>;

  // 자동 분석 관련
  analyzeUrl: (targetUrl: string, options: AnalysisOptions) => Promise<any>;
  loginComplete: (analysisId: string) => Promise<{ success: boolean; error?: string }>;

  // 세션 관리
  checkSavedSession: () => Promise<{ exists: boolean; path: string }>;
  clearSavedSession: () => Promise<{ success: boolean; message?: string; error?: string }>;

  // 워크플로우
  runWorkflow: (steps: WorkflowStep[]) => Promise<any>;

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
   * @returns {Promise} 성공 여부와 에러 메시지
   *
   * @example
   * const result = await window.electronAPI.startTracking();
   * if (result.success) {
   *   console.log('트래킹 시작됨');
   * } else {
   *   console.error(result.error);
   * }
   */
  startTracking: () => {
    return ipcRenderer.invoke('start-tracking');
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
