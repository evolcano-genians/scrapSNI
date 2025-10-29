// DOM 요소들 - 수동 트래킹 탭
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportDomainsBtn = document.getElementById('exportDomainsBtn');
const exportDetailedBtn = document.getElementById('exportDetailedBtn');
const clearBtn = document.getElementById('clearBtn');
const domainsList = document.getElementById('domainsList');
const domainCount = document.getElementById('domainCount');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const elapsedTime = document.getElementById('elapsedTime');
const sessionStatus = document.getElementById('sessionStatus');
const searchBox = document.getElementById('searchBox');
const loadingSpinner = document.getElementById('loadingSpinner');

// DOM 요소들 - 자동 분석 탭
const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const waitTimeInput = document.getElementById('waitTimeInput');
const maxWaitInput = document.getElementById('maxWaitInput');
const requiresLoginCheckbox = document.getElementById('requiresLoginCheckbox');
const useSavedSessionCheckbox = document.getElementById('useSavedSessionCheckbox');
const crawlDepthInput = document.getElementById('crawlDepthInput');
const sameDomainOnlyCheckbox = document.getElementById('sameDomainOnlyCheckbox');
const loginWaitingPanel = document.getElementById('loginWaitingPanel');
const loginCompleteBtn = document.getElementById('loginCompleteBtn');
const crawlProgressPanel = document.getElementById('crawlProgressPanel');
const crawlProgressStats = document.getElementById('crawlProgressStats');
const crawlProgressFill = document.getElementById('crawlProgressFill');
const currentCrawlUrl = document.getElementById('currentCrawlUrl');
const analysisResult = document.getElementById('analysisResult');
const autoDomainCount = document.getElementById('autoDomainCount');
const autoStatus = document.getElementById('autoStatus');
const lastAnalysis = document.getElementById('lastAnalysis');
const exportAutoDomainsBtn = document.getElementById('exportAutoDomainsBtn');
const exportAutoIPsBtn = document.getElementById('exportAutoIPsBtn');
const exportAutoDetailedBtn = document.getElementById('exportAutoDetailedBtn');
const clearAutoBtn = document.getElementById('clearAutoBtn');
const autoDomainsList = document.getElementById('autoDomainsList');
const autoSearchBox = document.getElementById('autoSearchBox');

// 상태 변수들 - 수동 트래킹
let isTracking = false;
let domains = [];
let startTime = null;
let timerInterval = null;
let updateInterval = null;

// 상태 변수들 - 자동 분석
let autoDomains = [];
let autoAllIPs = []; // 모든 IP 주소 목록
let autoCDNServices = []; // CDN 서비스 목록
let autoThirdPartyServices = []; // 서드파티 서비스 목록
let autoResourceDetails = []; // 리소스 상세 정보
let autoResourceStats = {}; // 리소스 타입별 통계
let autoProtocolStats = {}; // 프로토콜 통계
let isAnalyzing = false;
let currentAnalysisId = null; // 현재 분석 세션 ID

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  checkTrackingStatus();
  checkSavedSession(); // 저장된 세션 확인
});

// 이벤트 리스너 설정
function initializeEventListeners() {
  // 수동 트래킹 탭
  startBtn.addEventListener('click', startTracking);
  stopBtn.addEventListener('click', stopTracking);
  exportDomainsBtn.addEventListener('click', exportDomainsList);
  exportDetailedBtn.addEventListener('click', exportDomainsDetailed);
  clearBtn.addEventListener('click', clearDomains);
  searchBox.addEventListener('input', filterDomains);

  // 자동 분석 탭
  analyzeBtn.addEventListener('click', analyzeUrl);
  exportAutoDomainsBtn.addEventListener('click', exportAutoDomainsList);
  exportAutoIPsBtn.addEventListener('click', exportAutoIPsList);
  exportAutoDetailedBtn.addEventListener('click', exportAutoDomainsDetailed);
  clearAutoBtn.addEventListener('click', clearAutoDomains);
  autoSearchBox.addEventListener('input', filterAutoDomains);

  // 로그인 완료 버튼
  loginCompleteBtn.addEventListener('click', handleLoginComplete);

  // URL 입력 필드에서 Enter 키 처리 (개선됨)
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !analyzeBtn.disabled) {
      e.preventDefault();
      analyzeUrl();
    }
  });

  // URL 입력 필드 포커스 시 전체 선택 (편의성)
  urlInput.addEventListener('focus', () => {
    if (urlInput.value) {
      urlInput.select();
    }
  });

  // 탭 전환
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  // 워크플로우 탭
  addStepBtn.addEventListener('click', openStepModal);
  saveWorkflowBtn.addEventListener('click', saveWorkflow);
  loadWorkflowBtn.addEventListener('click', loadWorkflow);
  clearWorkflowBtn.addEventListener('click', clearWorkflow);
  runWorkflowBtn.addEventListener('click', runWorkflow);
  modalClose.addEventListener('click', closeStepModal);
  cancelStepBtn.addEventListener('click', closeStepModal);
  saveStepBtn.addEventListener('click', saveStep);
  stepType.addEventListener('change', updateStepConfigFields);
  workflowSearchBox.addEventListener('input', filterWorkflowDomains);
  exportWorkflowDomainsBtn.addEventListener('click', exportWorkflowDomains);
  exportWorkflowIPsBtn.addEventListener('click', exportWorkflowIPs);
  exportWorkflowDetailedBtn.addEventListener('click', exportWorkflowDetailed);
}

// 트래킹 시작
async function startTracking() {
  try {
    showLoading();
    startBtn.disabled = true;

    const result = await window.electronAPI.startTracking();

    if (result.success) {
      isTracking = true;
      domains = [];
      startTime = Date.now();
      updateUI();
      startTimer();
      startAutoUpdate();
      sessionStatus.textContent = '실행 중';
    } else {
      throw new Error(result.error || 'Failed to start tracking');
    }
  } catch (error) {
    console.error('Error starting tracking:', error);
    alert(`트래킹을 시작할 수 없습니다: ${error.message}`);
    startBtn.disabled = false;
  } finally {
    hideLoading();
  }
}

// 트래킹 중지
async function stopTracking() {
  try {
    showLoading();
    stopBtn.disabled = true;

    const result = await window.electronAPI.stopTracking();

    if (result.success) {
      isTracking = false;
      domains = result.domains || [];
      stopTimer();
      stopAutoUpdate();
      updateUI();
      sessionStatus.textContent = '완료';
    } else {
      throw new Error(result.error || 'Failed to stop tracking');
    }
  } catch (error) {
    console.error('Error stopping tracking:', error);
    alert(`트래킹을 중지할 수 없습니다: ${error.message}`);
    stopBtn.disabled = false;
  } finally {
    hideLoading();
  }
}

// 도메인 목록만 내보내기 (수동 트래킹)
function exportDomainsList() {
  if (domains.length === 0) {
    alert('내보낼 도메인이 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `domains-whitelist-${timestamp}.txt`;
  const content = domains.map(d => d.domain).join('\n');

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}\n\n총 ${domains.length}개의 도메인`);
}

// 상세 정보 내보내기 (수동 트래킹)
function exportDomainsDetailed() {
  if (domains.length === 0) {
    alert('내보낼 도메인이 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `domains-detailed-${timestamp}.txt`;

  let content = '===== 도메인 화이트리스트 (상세 정보) =====\n';
  content += `생성일시: ${new Date().toLocaleString('ko-KR')}\n`;
  content += `총 도메인 수: ${domains.length}\n`;
  content += '=========================================\n\n';

  domains.forEach((domainInfo, index) => {
    content += `[${index + 1}] ${domainInfo.domain}\n`;
    content += `   요청 수: ${domainInfo.count}\n`;
    content += `   리소스 타입: ${domainInfo.types.join(', ')}\n`;
    content += `   발견 시각: ${new Date(domainInfo.firstSeen).toLocaleString('ko-KR')}\n`;
    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}`);
}

// 도메인 목록 초기화
function clearDomains() {
  if (isTracking) {
    alert('트래킹 중에는 초기화할 수 없습니다.');
    return;
  }

  if (domains.length > 0 && !confirm('정말로 모든 도메인을 삭제하시겠습니까?')) {
    return;
  }

  domains = [];
  updateUI();
  sessionStatus.textContent = '-';
}

// 도메인 필터링
function filterDomains() {
  const searchTerm = searchBox.value.toLowerCase();
  displayDomains(domains.filter(d => d.domain.toLowerCase().includes(searchTerm)));
}

// UI 업데이트
function updateUI() {
  // 버튼 상태 업데이트
  startBtn.disabled = isTracking;
  stopBtn.disabled = !isTracking;
  const hasData = domains.length > 0;
  exportDomainsBtn.disabled = !hasData;
  exportDetailedBtn.disabled = !hasData;

  // 상태 표시기 업데이트
  statusIndicator.className = `status-indicator ${isTracking ? 'active' : 'inactive'}`;
  statusText.textContent = isTracking ? '트래킹 중' : '대기 중';

  // 도메인 수 업데이트
  domainCount.textContent = domains.length;

  // 도메인 목록 표시
  displayDomains(domains);
}

// 도메인 목록 표시
function displayDomains(domainsToShow) {
  if (domainsToShow.length === 0) {
    domainsList.innerHTML = `
      <div class="empty-state">
        ${isTracking ? '브라우저에서 웹사이트를 방문하면 도메인이 수집됩니다...' : '트래킹을 시작하고 브라우저에서 웹사이트를 방문하세요.'}
      </div>
    `;
    return;
  }

  domainsList.innerHTML = domainsToShow.map((domainInfo, index) => {
    const typeIcons = {
      'document': '📄',
      'stylesheet': '🎨',
      'image': '🖼️',
      'script': '📜',
      'font': '🔤',
      'xhr': '🔄',
      'fetch': '📡',
      'media': '🎬',
      'other': '📦'
    };

    const typesDisplay = domainInfo.types.slice(0, 3).map(type =>
      typeIcons[type] || '📦'
    ).join(' ');

    return `
      <div class="domain-item">
        <div class="domain-main">
          <span class="domain-url">${domainInfo.domain}</span>
          <div class="domain-meta">
            <span class="domain-types" title="${domainInfo.types.join(', ')}">${typesDisplay}</span>
            <span class="domain-count" title="총 요청 수">${domainInfo.count} 요청</span>
          </div>
        </div>
        <span class="domain-rank">#${index + 1}</span>
      </div>
    `;
  }).join('');
}

// 타이머 시작
function startTimer() {
  timerInterval = setInterval(() => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      elapsedTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

// 타이머 중지
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// 자동 업데이트 시작
function startAutoUpdate() {
  updateInterval = setInterval(async () => {
    if (isTracking) {
      try {
        const currentDomains = await window.electronAPI.getCurrentDomains();
        if (currentDomains) {
          domains = currentDomains;
          domainCount.textContent = domains.length;
          if (searchBox.value === '') {
            displayDomains(domains);
          } else {
            filterDomains();
          }
        }
      } catch (error) {
        console.error('Error updating domains:', error);
      }
    }
  }, 2000); // 2초마다 업데이트
}

// 자동 업데이트 중지
function stopAutoUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// 트래킹 상태 확인
async function checkTrackingStatus() {
  try {
    isTracking = await window.electronAPI.getTrackingStatus();
    if (isTracking) {
      const currentDomains = await window.electronAPI.getCurrentDomains();
      if (currentDomains) {
        domains = currentDomains;
      }
      startAutoUpdate();
    }
    updateUI();
  } catch (error) {
    console.error('Error checking tracking status:', error);
  }
}

// 로딩 표시
function showLoading() {
  loadingSpinner.style.display = 'block';
}

// 로딩 숨기기
function hideLoading() {
  loadingSpinner.style.display = 'none';
}

// 탭 전환
function switchTab(tabName) {
  // 모든 탭 버튼과 콘텐츠 비활성화
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  // 선택된 탭 활성화
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // 자동 분석 탭으로 전환 시 URL 입력 필드에 포커스
  if (tabName === 'auto') {
    setTimeout(() => {
      urlInput.focus();
    }, 100);
  }
}

// URL 자동 분석
async function analyzeUrl() {
  let url = urlInput.value.trim();

  if (!url) {
    alert('URL을 입력하세요.');
    urlInput.focus();
    return;
  }

  // 프로토콜이 없으면 자동으로 https:// 추가
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    urlInput.value = url; // 입력 필드도 업데이트
  }

  // URL 형식 검증 (더 상세한 에러 메시지)
  try {
    const urlObj = new URL(url);
    // 최소한 호스트명이 있는지 확인
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      throw new Error('유효하지 않은 도메인입니다.');
    }
  } catch (error) {
    alert(`올바른 URL 형식이 아닙니다.\n\n예시:\n- https://www.google.com\n- google.com\n- example.com\n\n입력하신 값: ${url}`);
    urlInput.focus();
    urlInput.select();
    return;
  }

  if (isAnalyzing) {
    alert('이미 분석이 진행 중입니다.\n잠시만 기다려주세요.');
    return;
  }

  try {
    isAnalyzing = true;
    analyzeBtn.disabled = true;
    urlInput.disabled = true; // 분석 중에는 URL 변경 불가
    autoStatus.textContent = '분석 중';

    // 로그인 필요 여부 확인
    const requiresLogin = requiresLoginCheckbox.checked;
    const useSavedSession = useSavedSessionCheckbox.checked;
    const crawlDepth = parseInt(crawlDepthInput.value) || 0;
    const sameDomainOnly = sameDomainOnlyCheckbox.checked;

    // 고유한 분석 ID 생성
    currentAnalysisId = Date.now().toString();

    // 분석 옵션
    const options = {
      waitTime: parseInt(waitTimeInput.value) * 1000,
      maxWaitTime: parseInt(maxWaitInput.value) * 1000,
      includeSubresources: true,
      requiresLogin: requiresLogin,
      analysisId: currentAnalysisId,
      crawlDepth: crawlDepth,
      sameDomainOnly: sameDomainOnly
    };

    // 저장된 세션 사용 시 경로 추가
    if (useSavedSession) {
      const sessionInfo = await window.electronAPI.checkSavedSession();
      if (sessionInfo.exists) {
        options.savedSession = sessionInfo.path;
      }
    }

    // 결과 표시
    analysisResult.innerHTML = `<div class="analysis-result">🔄 분석을 시작합니다...<br><small>URL: ${url}</small></div>`;

    // 로그인 필요 시 대기 패널 표시
    if (requiresLogin) {
      loginWaitingPanel.style.display = 'block';
      analysisResult.innerHTML += `<div class="analysis-result info">🔐 브라우저 창에서 로그인을 완료해주세요.</div>`;
    }

    // 크롤링 진행 상황 패널 표시
    if (crawlDepth > 0) {
      crawlProgressPanel.style.display = 'block';
      crawlProgressStats.textContent = `Depth 0/${crawlDepth} | 페이지 0/1`;
      crawlProgressFill.style.width = '0%';
      currentCrawlUrl.textContent = url;
      analysisResult.innerHTML += `<div class="analysis-result info">🔍 깊이 ${crawlDepth} 크롤링을 시작합니다...</div>`;
    }

    console.log('Starting analysis for:', url, 'with options:', options);

    // headless/headed 분석 실행
    const result = await window.electronAPI.analyzeUrl(url, options);

    console.log('Analysis result:', result);

    if (result.success) {
      autoDomains = result.domains;
      autoAllIPs = result.allIPs || []; // IP 목록 저장
      autoCDNServices = result.cdnServices || []; // CDN 서비스 목록
      autoThirdPartyServices = result.thirdPartyServices || []; // 서드파티 서비스 목록
      autoResourceDetails = result.resourceDetails || []; // 리소스 상세 정보
      autoResourceStats = result.resourceStats || {}; // 리소스 타입별 통계
      autoProtocolStats = result.protocolStats || {}; // 프로토콜 통계

      autoDomainCount.textContent = result.totalDomains;
      lastAnalysis.textContent = new Date(result.timestamp).toLocaleTimeString('ko-KR');

      displayAutoDomains(autoDomains);

      // 상세한 분석 결과 표시
      let resultHTML = `
        <div class="analysis-result success">
          ✅ 분석 완료<br>
          📊 도메인: ${result.totalDomains}개 | 🌐 IP: ${result.totalIPs}개<br>
      `;

      if (result.totalCDNs > 0) {
        resultHTML += `☁️ CDN: ${result.totalCDNs}개 | `;
      }
      if (result.totalServices > 0) {
        resultHTML += `🔌 서드파티: ${result.totalServices}개 | `;
      }
      resultHTML += `📦 리소스: ${result.totalResources}개<br>`;

      // CDN 상세
      if (autoCDNServices.length > 0) {
        resultHTML += `<br><small>CDN: ${autoCDNServices.map(c => c.name).join(', ')}</small><br>`;
      }

      // 서드파티 상세
      if (autoThirdPartyServices.length > 0) {
        resultHTML += `<small>서드파티: ${autoThirdPartyServices.slice(0, 5).map(s => s.name).join(', ')}${autoThirdPartyServices.length > 5 ? '...' : ''}</small>`;
      }

      resultHTML += `</div>`;
      analysisResult.innerHTML = resultHTML;

      // 버튼 활성화
      exportAutoDomainsBtn.disabled = false;
      exportAutoIPsBtn.disabled = autoAllIPs.length === 0;
      exportAutoDetailedBtn.disabled = false;
      autoStatus.textContent = '완료';
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Error analyzing URL:', error);
    analysisResult.innerHTML = `
      <div class="analysis-result error">
        ❌ 분석 실패: ${error.message}<br>
        <small>URL을 확인하고 다시 시도해주세요.</small>
      </div>
    `;
    autoStatus.textContent = '실패';
  } finally {
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    urlInput.disabled = false; // 분석 완료 후 다시 활성화
    loginWaitingPanel.style.display = 'none'; // 로그인 대기 패널 숨김
    crawlProgressPanel.style.display = 'none'; // 크롤링 진행 패널 숨김
    currentAnalysisId = null; // 분석 ID 초기화
  }
}

// 자동 분석 도메인 목록 표시
function displayAutoDomains(domainsToShow) {
  if (domainsToShow.length === 0) {
    autoDomainsList.innerHTML = `
      <div class="empty-state">
        URL을 입력하고 분석 시작 버튼을 클릭하세요.
      </div>
    `;
    return;
  }

  const typeIcons = {
    'document': '📄',
    'stylesheet': '🎨',
    'image': '🖼️',
    'script': '📜',
    'font': '🔤',
    'xhr': '🔄',
    'fetch': '📡',
    'media': '🎬',
    'other': '📦'
  };

  autoDomainsList.innerHTML = domainsToShow.map((domainInfo, index) => {
    const typesDisplay = domainInfo.types.slice(0, 3).map(type =>
      typeIcons[type] || '📦'
    ).join(' ');

    // IP 주소 정보
    const hasIPv4 = domainInfo.ipv4 && domainInfo.ipv4.length > 0;
    const hasIPv6 = domainInfo.ipv6 && domainInfo.ipv6.length > 0;
    const ipDisplay = [];

    if (hasIPv4) {
      ipDisplay.push(`IPv4: ${domainInfo.ipv4.join(', ')}`);
    }
    if (hasIPv6) {
      ipDisplay.push(`IPv6: ${domainInfo.ipv6.join(', ')}`);
    }

    const ipTitle = ipDisplay.length > 0 ? ipDisplay.join(' | ') : 'IP 정보 없음';
    const ipIcon = hasIPv4 || hasIPv6 ? '🌐' : '';

    return `
      <div class="domain-item">
        <div class="domain-main">
          <span class="domain-url">${domainInfo.domain}</span>
          <div class="domain-meta">
            <span class="domain-types" title="${domainInfo.types.join(', ')}">${typesDisplay}</span>
            <span class="domain-count" title="총 요청 수">${domainInfo.count} 요청</span>
            ${ipIcon ? `<span class="domain-ip" title="${ipTitle}">${ipIcon} ${hasIPv4 ? domainInfo.ipv4[0] : domainInfo.ipv6[0]}</span>` : ''}
          </div>
        </div>
        <span class="domain-rank">#${index + 1}</span>
      </div>
    `;
  }).join('');
}

// 자동 분석 - 도메인 목록만 내보내기
function exportAutoDomainsList() {
  if (autoDomains.length === 0) {
    alert('내보낼 도메인이 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `auto-analysis-domains-${timestamp}.txt`;
  const content = autoDomains.map(d => d.domain).join('\n');

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}\n\n총 ${autoDomains.length}개의 도메인`);
}

// 자동 분석 - IP 목록만 내보내기
function exportAutoIPsList() {
  if (autoAllIPs.length === 0) {
    alert('내보낼 IP 주소가 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `auto-analysis-ips-${timestamp}.txt`;
  const content = autoAllIPs.join('\n');

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}\n\n총 ${autoAllIPs.length}개의 IP 주소`);
}

// 자동 분석 - 상세 정보 내보내기
function exportAutoDomainsDetailed() {
  if (autoDomains.length === 0) {
    alert('내보낼 도메인이 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const analyzedUrl = urlInput.value.trim();
  const filename = `auto-analysis-detailed-${timestamp}.txt`;

  let content = '===== 자동 분석 결과 (상세 정보) =====\n';
  content += `분석 URL: ${analyzedUrl}\n`;
  content += `생성일시: ${new Date().toLocaleString('ko-KR')}\n`;
  content += `총 도메인 수: ${autoDomains.length}\n`;
  content += `총 IP 수: ${autoAllIPs.length}\n`;
  if (autoCDNServices && autoCDNServices.length > 0) {
    content += `총 CDN 서비스: ${autoCDNServices.length}개\n`;
  }
  if (autoThirdPartyServices && autoThirdPartyServices.length > 0) {
    content += `총 서드파티 서비스: ${autoThirdPartyServices.length}개\n`;
  }
  if (autoResourceDetails && autoResourceDetails.length > 0) {
    content += `총 리소스: ${autoResourceDetails.length}개\n`;
  }
  content += `대기 시간: ${waitTimeInput.value}초\n`;
  content += `최대 대기: ${maxWaitInput.value}초\n`;
  content += '==========================================\n\n';

  autoDomains.forEach((domainInfo, index) => {
    content += `[${index + 1}] ${domainInfo.domain}\n`;
    content += `   요청 수: ${domainInfo.count}\n`;
    content += `   리소스 타입: ${domainInfo.types.join(', ')}\n`;
    content += `   발견 시각: ${new Date(domainInfo.firstSeen).toLocaleString('ko-KR')}\n`;
    content += `   URL 수: ${domainInfo.urlCount}\n`;

    // IP 정보 추가
    if (domainInfo.ipv4 && domainInfo.ipv4.length > 0) {
      content += `   IPv4: ${domainInfo.ipv4.join(', ')}\n`;
    }
    if (domainInfo.ipv6 && domainInfo.ipv6.length > 0) {
      content += `   IPv6: ${domainInfo.ipv6.join(', ')}\n`;
    }

    content += '\n';
  });

  // CDN 서비스 정보 추가
  if (autoCDNServices && autoCDNServices.length > 0) {
    content += '\n===== CDN 서비스 =====\n';
    autoCDNServices.forEach(cdn => {
      content += `${cdn.name}: ${cdn.count}회 사용\n`;
      content += `   도메인: ${cdn.domains.join(', ')}\n\n`;
    });
  }

  // 서드파티 서비스 정보 추가
  if (autoThirdPartyServices && autoThirdPartyServices.length > 0) {
    content += '\n===== 서드파티 서비스 =====\n';
    autoThirdPartyServices.forEach(service => {
      content += `${service.name}: ${service.count}회 호출\n`;
      content += `   도메인: ${service.domains.join(', ')}\n\n`;
    });
  }

  // 리소스 통계 추가
  if (autoResourceStats && Object.keys(autoResourceStats).length > 0) {
    content += '\n===== 리소스 통계 =====\n';
    Object.entries(autoResourceStats).forEach(([type, count]) => {
      content += `${type}: ${count}개\n`;
    });
    content += '\n';
  }

  // 프로토콜 통계 추가
  if (autoProtocolStats && Object.keys(autoProtocolStats).length > 0) {
    content += '\n===== 프로토콜 통계 =====\n';
    Object.entries(autoProtocolStats).forEach(([protocol, count]) => {
      content += `${protocol}: ${count}개\n`;
    });
    content += '\n';
  }

  // 리소스 샘플 추가 (상위 10개)
  if (autoResourceDetails && autoResourceDetails.length > 0) {
    content += '\n===== 리소스 샘플 (상위 10개) =====\n';
    autoResourceDetails.slice(0, 10).forEach((resource, index) => {
      content += `[${index + 1}] ${resource.url}\n`;
      content += `   타입: ${resource.type} | 크기: ${resource.size || '알 수 없음'}\n`;
      if (resource.cdn) {
        content += `   CDN: ${resource.cdn}\n`;
      }
      if (resource.service) {
        content += `   서비스: ${resource.service}\n`;
      }
      content += '\n';
    });
  }

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}`);
}

// 자동 분석 결과 초기화
function clearAutoDomains() {
  if (autoDomains.length > 0 && !confirm('정말로 분석 결과를 삭제하시겠습니까?')) {
    return;
  }

  autoDomains = [];
  autoAllIPs = []; // IP 목록도 초기화
  autoCDNServices = []; // CDN 서비스 초기화
  autoThirdPartyServices = []; // 서드파티 서비스 초기화
  autoResourceDetails = []; // 리소스 상세 정보 초기화
  autoResourceStats = {}; // 리소스 통계 초기화
  autoProtocolStats = {}; // 프로토콜 통계 초기화
  autoDomainCount.textContent = '0';
  autoStatus.textContent = '대기';
  lastAnalysis.textContent = '-';
  analysisResult.innerHTML = '';
  displayAutoDomains(autoDomains);

  // 모든 내보내기 버튼 비활성화
  exportAutoDomainsBtn.disabled = true;
  exportAutoIPsBtn.disabled = true;
  exportAutoDetailedBtn.disabled = true;
}

// 자동 분석 도메인 필터링
function filterAutoDomains() {
  const searchTerm = autoSearchBox.value.toLowerCase();
  displayAutoDomains(autoDomains.filter(d => d.domain.toLowerCase().includes(searchTerm)));
}

// 로그인 완료 처리
async function handleLoginComplete() {
  if (!currentAnalysisId) {
    alert('진행 중인 분석이 없습니다.');
    return;
  }

  try {
    loginCompleteBtn.disabled = true;
    loginCompleteBtn.textContent = '✅ 로그인 완료 처리 중...';

    // 백엔드에 로그인 완료 신호 전송
    const result = await window.electronAPI.loginComplete(currentAnalysisId);

    if (result.success) {
      loginWaitingPanel.style.display = 'none';
      analysisResult.innerHTML = `<div class="analysis-result info">✅ 로그인 완료! 분석을 계속 진행합니다...</div>`;
    } else {
      alert('로그인 완료 처리에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error handling login complete:', error);
    alert(`로그인 완료 처리 중 오류 발생: ${error.message}`);
  } finally {
    loginCompleteBtn.disabled = false;
    loginCompleteBtn.textContent = '✅ 로그인 완료, 분석 계속';
  }
}

// 저장된 세션 확인
async function checkSavedSession() {
  try {
    const sessionInfo = await window.electronAPI.checkSavedSession();

    if (sessionInfo.exists) {
      // 저장된 세션이 있으면 체크박스 옆에 표시
      const label = useSavedSessionCheckbox.parentElement;
      if (label && !label.querySelector('.session-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'session-indicator';
        indicator.textContent = ' ✓';
        indicator.title = `세션 파일: ${sessionInfo.path}`;
        indicator.style.color = '#10b981';
        indicator.style.fontWeight = 'bold';
        label.appendChild(indicator);
      }
    }
  } catch (error) {
    console.error('Error checking saved session:', error);
  }
}

// ==================== 워크플로우 관련 코드 ====================

// 워크플로우 상태 변수
let workflowSteps = [];
let currentEditingStepIndex = null;
let workflowDomains = [];
let workflowAllIPs = [];
let workflowCDNServices = [];
let workflowThirdPartyServices = [];
let workflowResourceDetails = [];
let workflowResourceStats = {};
let workflowProtocolStats = {};

// DOM 요소 참조
const addStepBtn = document.getElementById('addStepBtn');
const saveWorkflowBtn = document.getElementById('saveWorkflowBtn');
const loadWorkflowBtn = document.getElementById('loadWorkflowBtn');
const clearWorkflowBtn = document.getElementById('clearWorkflowBtn');
const runWorkflowBtn = document.getElementById('runWorkflowBtn');
const workflowStepsContainer = document.getElementById('workflowSteps');
const workflowProgress = document.getElementById('workflowProgress');
const workflowProgressStats = document.getElementById('workflowProgressStats');
const workflowProgressFill = document.getElementById('workflowProgressFill');
const currentStepInfo = document.getElementById('currentStepInfo');
const workflowResult = document.getElementById('workflowResult');
const workflowResultsSection = document.getElementById('workflowResultsSection');
const workflowDomainCount = document.getElementById('workflowDomainCount');
const workflowStatus = document.getElementById('workflowStatus');
const workflowCompletedTime = document.getElementById('workflowCompletedTime');
const workflowDomainsList = document.getElementById('workflowDomainsList');
const workflowSearchBox = document.getElementById('workflowSearchBox');
const exportWorkflowDomainsBtn = document.getElementById('exportWorkflowDomainsBtn');
const exportWorkflowIPsBtn = document.getElementById('exportWorkflowIPsBtn');
const exportWorkflowDetailedBtn = document.getElementById('exportWorkflowDetailedBtn');

// 모달 관련
const stepModal = document.getElementById('stepModal');
const modalClose = document.getElementById('modalClose');
const stepType = document.getElementById('stepType');
const stepName = document.getElementById('stepName');
const stepConfig = document.getElementById('stepConfig');
const cancelStepBtn = document.getElementById('cancelStepBtn');
const saveStepBtn = document.getElementById('saveStepBtn');

// 단계 추가 모달 열기
function openStepModal(editIndex = null) {
  currentEditingStepIndex = editIndex;

  if (editIndex !== null) {
    // 편집 모드
    const step = workflowSteps[editIndex];
    document.querySelector('.modal-header h3').textContent = '워크플로우 단계 편집';
    stepType.value = step.type;
    stepName.value = step.name;
    updateStepConfigFields();
    // 설정값 복원
    setTimeout(() => {
      Object.keys(step.config).forEach(key => {
        const input = document.getElementById(`config-${key}`);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = step.config[key];
          } else {
            input.value = step.config[key];
          }
        }
      });
    }, 10);
  } else {
    // 추가 모드
    document.querySelector('.modal-header h3').textContent = '워크플로우 단계 추가';
    stepType.value = 'navigate';
    stepName.value = '';
    updateStepConfigFields();
  }

  stepModal.classList.add('show');
}

// 단계 설정 필드 동적 생성
function updateStepConfigFields() {
  const type = stepType.value;
  let html = '';

  switch(type) {
    case 'navigate':
      html = `
        <div class="form-group">
          <label>이동할 URL:</label>
          <input type="text" id="config-url" class="step-input" placeholder="https://example.com">
        </div>
        <div class="form-group">
          <label>대기 시간 (초):</label>
          <input type="number" id="config-wait" class="step-input" value="5" min="1" max="60">
        </div>
      `;
      break;
    case 'login':
      html = `
        <div class="form-group">
          <label>최대 대기 시간 (초):</label>
          <input type="number" id="config-maxWait" class="step-input" value="120" min="10" max="600">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-saveSession">
            세션 저장
          </label>
        </div>
      `;
      break;
    case 'crawl':
      html = `
        <div class="form-group">
          <label>크롤링 깊이:</label>
          <input type="number" id="config-depth" class="step-input" value="1" min="0" max="3">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-sameDomain" checked>
            같은 도메인만 탐색
          </label>
        </div>
        <div class="form-group">
          <label>대기 시간 (초):</label>
          <input type="number" id="config-wait" class="step-input" value="5" min="1" max="60">
        </div>
      `;
      break;
    case 'wait':
      html = `
        <div class="form-group">
          <label>대기 시간 (초):</label>
          <input type="number" id="config-duration" class="step-input" value="5" min="1" max="300">
        </div>
      `;
      break;
    case 'click':
      html = `
        <div class="form-group">
          <label>선택자 (CSS Selector):</label>
          <input type="text" id="config-selector" class="step-input" placeholder=".button, #submit">
        </div>
        <div class="form-group">
          <label>대기 시간 (초):</label>
          <input type="number" id="config-wait" class="step-input" value="2" min="1" max="60">
        </div>
      `;
      break;
    case 'fill':
      html = `
        <div class="form-group">
          <label>선택자 (CSS Selector):</label>
          <input type="text" id="config-selector" class="step-input" placeholder="#username">
        </div>
        <div class="form-group">
          <label>입력 값:</label>
          <input type="text" id="config-value" class="step-input" placeholder="입력할 텍스트">
        </div>
      `;
      break;
    case 'auto-click':
      html = `
        <div class="form-group">
          <label>최대 클릭 횟수:</label>
          <input type="number" id="config-maxClicks" class="step-input" value="50" min="1" max="200">
        </div>
        <div class="form-group">
          <label>클릭 간격 (ms):</label>
          <input type="number" id="config-clickDelay" class="step-input" value="500" min="100" max="5000">
        </div>
        <div class="form-group">
          <label>제외 선택자 (쉼표 구분):</label>
          <input type="text" id="config-excludeSelectors" class="step-input" placeholder=".logout, .delete, .close">
        </div>
      `;
      break;
    case 'auto-hover':
      html = `
        <div class="form-group">
          <label>호버 대상 (CSS Selector):</label>
          <input type="text" id="config-hoverSelector" class="step-input" placeholder=".menu, .dropdown" value=".menu, .dropdown, nav">
        </div>
        <div class="form-group">
          <label>호버 지속 시간 (ms):</label>
          <input type="number" id="config-hoverDuration" class="step-input" value="1000" min="100" max="5000">
        </div>
        <div class="form-group">
          <label>최대 호버 횟수:</label>
          <input type="number" id="config-maxHovers" class="step-input" value="20" min="1" max="100">
        </div>
      `;
      break;
    case 'auto-scroll':
      html = `
        <div class="form-group">
          <label>스크롤 방법:</label>
          <select id="config-scrollMethod" class="step-input">
            <option value="smooth">부드러운 스크롤</option>
            <option value="step">단계별 스크롤</option>
            <option value="full">전체 스크롤</option>
          </select>
        </div>
        <div class="form-group">
          <label>스크롤 간격 (ms):</label>
          <input type="number" id="config-scrollDelay" class="step-input" value="1000" min="100" max="10000">
        </div>
        <div class="form-group">
          <label>최대 스크롤 횟수:</label>
          <input type="number" id="config-maxScrolls" class="step-input" value="10" min="1" max="50">
        </div>
      `;
      break;
    case 'auto-fill':
      html = `
        <div class="form-group">
          <label>폼 데이터 (JSON):</label>
          <textarea id="config-formData" class="step-input" rows="5" placeholder='{"name": "테스트", "email": "test@example.com"}'></textarea>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-fillVisible" checked>
            보이는 필드만 입력
          </label>
        </div>
        <div class="form-group">
          <label>대기 시간 (초):</label>
          <input type="number" id="config-wait" class="step-input" value="2" min="1" max="60">
        </div>
      `;
      break;
    case 'intelligent':
      html = `
        <div class="form-group">
          <label>탐색 깊이:</label>
          <input type="number" id="config-exploreDepth" class="step-input" value="2" min="1" max="5">
        </div>
        <div class="form-group">
          <label>요소 당 최대 시간 (초):</label>
          <input type="number" id="config-maxTimePerElement" class="step-input" value="3" min="1" max="30">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-avoidLogout" checked>
            로그아웃 버튼 회피
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-clickButtons" checked>
            버튼 자동 클릭
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="config-hoverMenus" checked>
            메뉴 자동 호버
          </label>
        </div>
      `;
      break;
  }

  stepConfig.innerHTML = html;
}

// 모달 닫기
function closeStepModal() {
  stepModal.classList.remove('show');
  currentEditingStepIndex = null;
}

// 단계 저장
function saveStep() {
  const type = stepType.value;
  const name = stepName.value.trim();

  if (!name) {
    alert('단계 이름을 입력하세요.');
    return;
  }

  // 설정값 수집
  const config = {};
  stepConfig.querySelectorAll('input, select').forEach(input => {
    const key = input.id.replace('config-', '');
    if (input.type === 'checkbox') {
      config[key] = input.checked;
    } else {
      config[key] = input.value;
    }
  });

  // 필수 값 검증
  if (type === 'navigate' && !config.url) {
    alert('URL을 입력하세요.');
    return;
  }
  if ((type === 'click' || type === 'fill') && !config.selector) {
    alert('선택자를 입력하세요.');
    return;
  }
  if (type === 'fill' && !config.value) {
    alert('입력 값을 지정하세요.');
    return;
  }

  const step = { type, name, config };

  if (currentEditingStepIndex !== null) {
    // 편집
    workflowSteps[currentEditingStepIndex] = step;
  } else {
    // 추가
    workflowSteps.push(step);
  }

  updateWorkflowUI();
  closeStepModal();
}

// 워크플로우 UI 업데이트
function updateWorkflowUI() {
  if (workflowSteps.length === 0) {
    workflowStepsContainer.innerHTML = '<div class="empty-workflow"><p>➕ 단계 추가 버튼을 클릭하여 워크플로우를 만드세요</p></div>';
    runWorkflowBtn.disabled = true;
  } else {
    let html = '';
    workflowSteps.forEach((step, index) => {
      html += createStepHTML(step, index);
    });
    workflowStepsContainer.innerHTML = html;
    runWorkflowBtn.disabled = false;

    // 각 단계의 액션 버튼에 이벤트 리스너 추가
    workflowSteps.forEach((step, index) => {
      document.getElementById(`edit-${index}`).addEventListener('click', () => openStepModal(index));
      document.getElementById(`delete-${index}`).addEventListener('click', () => deleteStep(index));
      document.getElementById(`up-${index}`).addEventListener('click', () => moveStep(index, -1));
      document.getElementById(`down-${index}`).addEventListener('click', () => moveStep(index, 1));
    });
  }
}

// 단계 HTML 생성
function createStepHTML(step, index) {
  const typeIcons = {
    navigate: '🌐',
    login: '🔐',
    crawl: '🕷️',
    wait: '⏰',
    click: '👆',
    fill: '✏️'
  };

  const typeNames = {
    navigate: '페이지 이동',
    login: '로그인 대기',
    crawl: '크롤링',
    wait: '대기',
    click: '클릭',
    fill: '입력'
  };

  let configDetails = '';
  switch(step.type) {
    case 'navigate':
      configDetails = `URL: ${step.config.url}`;
      break;
    case 'login':
      configDetails = `최대 대기: ${step.config.maxWait}초`;
      break;
    case 'crawl':
      configDetails = `깊이: ${step.config.depth}, 같은 도메인만: ${step.config.sameDomain ? '예' : '아니오'}`;
      break;
    case 'wait':
      configDetails = `시간: ${step.config.duration}초`;
      break;
    case 'click':
      configDetails = `선택자: ${step.config.selector}`;
      break;
    case 'fill':
      configDetails = `선택자: ${step.config.selector}, 값: ${step.config.value}`;
      break;
  }

  return `
    <div class="workflow-step" id="step-${index}">
      <div class="step-header">
        <div class="step-number">${index + 1}</div>
        <div class="step-title">${typeIcons[step.type]} ${step.name}</div>
        <div class="step-actions">
          <button class="step-action-btn" id="up-${index}" title="위로" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button class="step-action-btn" id="down-${index}" title="아래로" ${index === workflowSteps.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="step-action-btn" id="edit-${index}" title="편집">✏️</button>
          <button class="step-action-btn" id="delete-${index}" title="삭제">🗑️</button>
        </div>
      </div>
      <div class="step-details">
        <div class="step-config-item">${typeNames[step.type]}</div>
        <div class="step-config-item">${configDetails}</div>
      </div>
    </div>
  `;
}

// 단계 삭제
function deleteStep(index) {
  if (confirm('이 단계를 삭제하시겠습니까?')) {
    workflowSteps.splice(index, 1);
    updateWorkflowUI();
  }
}

// 단계 이동
function moveStep(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= workflowSteps.length) return;

  [workflowSteps[index], workflowSteps[newIndex]] = [workflowSteps[newIndex], workflowSteps[index]];
  updateWorkflowUI();
}

// 워크플로우 저장
function saveWorkflow() {
  if (workflowSteps.length === 0) {
    alert('저장할 워크플로우가 없습니다.');
    return;
  }

  const data = JSON.stringify(workflowSteps, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `workflow-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`워크플로우가 저장되었습니다:\n${filename}`);
}

// 워크플로우 불러오기
function loadWorkflow() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const steps = JSON.parse(text);

      if (!Array.isArray(steps)) {
        throw new Error('잘못된 워크플로우 파일 형식');
      }

      workflowSteps = steps;
      updateWorkflowUI();
      alert('워크플로우를 불러왔습니다.');
    } catch (error) {
      alert(`워크플로우 불러오기 실패:\n${error.message}`);
    }
  };
  input.click();
}

// 워크플로우 초기화
function clearWorkflow() {
  if (workflowSteps.length > 0 && !confirm('워크플로우를 초기화하시겠습니까?')) {
    return;
  }

  workflowSteps = [];
  workflowDomains = [];
  workflowAllIPs = [];
  workflowCDNServices = [];
  workflowThirdPartyServices = [];
  workflowResourceDetails = [];
  workflowResourceStats = {};
  workflowProtocolStats = {};

  updateWorkflowUI();
  workflowResultsSection.style.display = 'none';
  workflowProgress.style.display = 'none';
  workflowResult.innerHTML = '';
  workflowStatus.textContent = '대기';
  workflowDomainCount.textContent = '0';
  workflowCompletedTime.textContent = '-';
}

// 워크플로우 실행
async function runWorkflow() {
  if (workflowSteps.length === 0) {
    alert('실행할 워크플로우가 없습니다.');
    return;
  }

  try {
    runWorkflowBtn.disabled = true;
    workflowProgress.style.display = 'block';
    workflowStatus.textContent = '실행 중';
    workflowResult.innerHTML = '<div class="analysis-result info">🔄 워크플로우 실행 중...</div>';

    // 기존 결과 초기화
    workflowDomains = [];
    workflowAllIPs = [];
    workflowCDNServices = [];
    workflowThirdPartyServices = [];
    workflowResourceDetails = [];
    workflowResourceStats = {};
    workflowProtocolStats = {};

    // IPC로 워크플로우 실행 요청
    const result = await window.electronAPI.runWorkflow(workflowSteps);

    if (result.success) {
      // 결과 저장
      workflowDomains = result.domains || [];
      workflowAllIPs = result.allIPs || [];
      workflowCDNServices = result.cdnServices || [];
      workflowThirdPartyServices = result.thirdPartyServices || [];
      workflowResourceDetails = result.resourceDetails || [];
      workflowResourceStats = result.resourceStats || {};
      workflowProtocolStats = result.protocolStats || {};

      // UI 업데이트
      workflowDomainCount.textContent = workflowDomains.length;
      workflowStatus.textContent = '완료';
      workflowCompletedTime.textContent = new Date().toLocaleTimeString('ko-KR');

      workflowResult.innerHTML = `
        <div class="analysis-result success">
          ✅ 워크플로우 완료<br>
          📊 도메인: ${result.totalDomains}개 | 🌐 IP: ${result.totalIPs}개<br>
          ☁️ CDN: ${result.totalCDNs || 0}개 | 🔌 서드파티: ${result.totalServices || 0}개 | 📦 리소스: ${result.totalResources || 0}개
        </div>
      `;

      // 결과 섹션 표시
      workflowResultsSection.style.display = 'block';
      displayWorkflowDomains(workflowDomains);

      // 내보내기 버튼 활성화
      exportWorkflowDomainsBtn.disabled = false;
      exportWorkflowIPsBtn.disabled = false;
      exportWorkflowDetailedBtn.disabled = false;

    } else {
      workflowStatus.textContent = '실패';
      workflowResult.innerHTML = `<div class="analysis-result error">❌ 실행 실패: ${result.error}</div>`;
    }

  } catch (error) {
    console.error('Workflow execution error:', error);
    workflowStatus.textContent = '오류';
    workflowResult.innerHTML = `<div class="analysis-result error">❌ 오류: ${error.message}</div>`;
  } finally {
    runWorkflowBtn.disabled = false;
    workflowProgress.style.display = 'none';
  }
}

// 워크플로우 도메인 목록 표시
function displayWorkflowDomains(domains) {
  if (domains.length === 0) {
    workflowDomainsList.innerHTML = '<div class="empty-state">수집된 도메인이 없습니다.</div>';
    return;
  }

  let html = '';
  domains.forEach(domainInfo => {
    html += `
      <div class="domain-item">
        <div class="domain-name">${domainInfo.domain}</div>
        <div class="domain-meta">
          <span>요청: ${domainInfo.count}</span>
          <span>타입: ${domainInfo.types.join(', ')}</span>
          ${domainInfo.ipv4 && domainInfo.ipv4.length > 0 ? `<span>IPv4: ${domainInfo.ipv4.length}</span>` : ''}
          ${domainInfo.ipv6 && domainInfo.ipv6.length > 0 ? `<span>IPv6: ${domainInfo.ipv6.length}</span>` : ''}
        </div>
      </div>
    `;
  });

  workflowDomainsList.innerHTML = html;
}

// 워크플로우 도메인 필터링
function filterWorkflowDomains() {
  const searchTerm = workflowSearchBox.value.toLowerCase();
  const filtered = workflowDomains.filter(d => d.domain.toLowerCase().includes(searchTerm));
  displayWorkflowDomains(filtered);
}

// 워크플로우 도메인 내보내기
function exportWorkflowDomains() {
  if (workflowDomains.length === 0) {
    alert('내보낼 도메인이 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `workflow-domains-${timestamp}.txt`;
  const content = workflowDomains.map(d => d.domain).join('\n');

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}\n\n총 ${workflowDomains.length}개의 도메인`);
}

// 워크플로우 IP 내보내기
function exportWorkflowIPs() {
  if (workflowAllIPs.length === 0) {
    alert('내보낼 IP가 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `workflow-ips-${timestamp}.txt`;
  const content = workflowAllIPs.join('\n');

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}\n\n총 ${workflowAllIPs.length}개의 IP 주소`);
}

// 워크플로우 상세 정보 내보내기
function exportWorkflowDetailed() {
  if (workflowDomains.length === 0) {
    alert('내보낼 도메인이 없습니다.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `workflow-detailed-${timestamp}.txt`;

  let content = '===== 워크플로우 실행 결과 (상세 정보) =====\n';
  content += `생성일시: ${new Date().toLocaleString('ko-KR')}\n`;
  content += `총 도메인 수: ${workflowDomains.length}\n`;
  content += `총 IP 수: ${workflowAllIPs.length}\n`;
  if (workflowCDNServices.length > 0) {
    content += `총 CDN 서비스: ${workflowCDNServices.length}개\n`;
  }
  if (workflowThirdPartyServices.length > 0) {
    content += `총 서드파티 서비스: ${workflowThirdPartyServices.length}개\n`;
  }
  if (workflowResourceDetails.length > 0) {
    content += `총 리소스: ${workflowResourceDetails.length}개\n`;
  }
  content += '==========================================\n\n';

  workflowDomains.forEach((domainInfo, index) => {
    content += `[${index + 1}] ${domainInfo.domain}\n`;
    content += `   요청 수: ${domainInfo.count}\n`;
    content += `   리소스 타입: ${domainInfo.types.join(', ')}\n`;
    if (domainInfo.ipv4 && domainInfo.ipv4.length > 0) {
      content += `   IPv4: ${domainInfo.ipv4.join(', ')}\n`;
    }
    if (domainInfo.ipv6 && domainInfo.ipv6.length > 0) {
      content += `   IPv6: ${domainInfo.ipv6.join(', ')}\n`;
    }
    content += '\n';
  });

  // CDN 서비스 정보
  if (workflowCDNServices.length > 0) {
    content += '\n===== CDN 서비스 =====\n';
    workflowCDNServices.forEach(cdn => {
      content += `${cdn.name}: ${cdn.count}회 사용\n`;
      content += `   도메인: ${cdn.domains.join(', ')}\n\n`;
    });
  }

  // 서드파티 서비스 정보
  if (workflowThirdPartyServices.length > 0) {
    content += '\n===== 서드파티 서비스 =====\n';
    workflowThirdPartyServices.forEach(service => {
      content += `${service.name}: ${service.count}회 호출\n`;
      content += `   도메인: ${service.domains.join(', ')}\n\n`;
    });
  }

  // 리소스 통계
  if (Object.keys(workflowResourceStats).length > 0) {
    content += '\n===== 리소스 통계 =====\n';
    Object.entries(workflowResourceStats).forEach(([type, count]) => {
      content += `${type}: ${count}개\n`;
    });
    content += '\n';
  }

  // 프로토콜 통계
  if (Object.keys(workflowProtocolStats).length > 0) {
    content += '\n===== 프로토콜 통계 =====\n';
    Object.entries(workflowProtocolStats).forEach(([protocol, count]) => {
      content += `${protocol}: ${count}개\n`;
    });
    content += '\n';
  }

  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  alert(`파일이 저장되었습니다:\n${filename}`);
}