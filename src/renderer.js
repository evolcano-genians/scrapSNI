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