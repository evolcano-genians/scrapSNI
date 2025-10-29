const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 수 있는 안전한 API를 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 트래킹 시작
  startTracking: () => {
    return ipcRenderer.invoke('start-tracking');
  },

  // 트래킹 중지
  stopTracking: () => {
    return ipcRenderer.invoke('stop-tracking');
  },

  // 트래킹 상태 확인
  getTrackingStatus: () => {
    return ipcRenderer.invoke('get-tracking-status');
  },

  // 현재까지 수집된 도메인 가져오기
  getCurrentDomains: () => {
    return ipcRenderer.invoke('get-current-domains');
  },

  // URL 자동 분석 (headless)
  analyzeUrl: (targetUrl, options) => {
    return ipcRenderer.invoke('analyze-url', targetUrl, options);
  },

  // 로그인 완료 신호
  loginComplete: (analysisId) => {
    return ipcRenderer.invoke('login-complete', analysisId);
  },

  // 저장된 세션 확인
  checkSavedSession: () => {
    return ipcRenderer.invoke('check-saved-session');
  },

  // 저장된 세션 삭제
  clearSavedSession: () => {
    return ipcRenderer.invoke('clear-saved-session');
  }
});