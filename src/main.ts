/**
 * Domain Tracker - Electron 메인 프로세스
 *
 * 이 파일은 Electron 애플리케이션의 메인 프로세스를 담당합니다.
 * BrowserWindow 생성, IPC 통신 설정, 앱 라이프사이클 관리를 수행합니다.
 *
 * ✅ NestJS 스타일 적용:
 * - @Injectable() 데코레이터로 서비스 표시
 * - @Module() 데코레이터로 모듈 정의
 * - @Inject() 데코레이터로 의존성 명시
 * - ModuleContainer로 모듈 기반 DI 시스템
 */

import 'reflect-metadata';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ModuleContainer } from './di/ModuleContainer';
import { AppModule } from './modules/app.module';
import { TrackingService } from './services/TrackingService';
import { WorkflowService } from './services/WorkflowService';
import { SNIWhitelistService } from './services/SNIWhitelistService';
import { DomainBlockTester } from './services/DomainBlockTester';
import { AnalysisOptions, WorkflowStep, SNIExportOptions, BlockTestOptions } from './types';
import { updateConfigCategory } from './config/config';

/**
 * DomainTracker 클래스
 *
 * Electron 앱의 메인 로직을 담당하는 클래스입니다.
 *
 * ✅ NestJS 스타일 적용 완료:
 * - ModuleContainer로 모듈 기반 의존성 주입
 * - AppModule로 서비스 정의
 * - @Injectable(), @Module(), @Inject() 데코레이터 사용
 */
class DomainTracker {
  private mainWindow: BrowserWindow | null = null;
  private container: ModuleContainer;
  private trackingService: TrackingService;
  private workflowService: WorkflowService;
  private sniWhitelistService: SNIWhitelistService;
  private domainBlockTester: DomainBlockTester;

  constructor() {
    console.log('[DomainTracker] Initializing with NestJS-style architecture...');

    // Module Container 초기화
    this.container = new ModuleContainer();

    // AppModule 로드
    this.container.loadModule(AppModule);

    // 서비스 해결 (DI)
    this.trackingService = this.container.resolve<TrackingService>('TrackingService');
    this.workflowService = this.container.resolve<WorkflowService>('WorkflowService');
    this.sniWhitelistService = this.container.resolve<SNIWhitelistService>('SNIWhitelistService');
    this.domainBlockTester = this.container.resolve<DomainBlockTester>('DomainBlockTester');

    this.setupIpcHandlers();

    console.log('[DomainTracker] Initialized successfully');
  }

  /**
   * 메인 윈도우를 생성합니다.
   *
   * - 크기: 1400x900 (기본)
   * - 최소 크기: 1200x800
   * - 반응형 디자인 지원
   * - preload 스크립트 사용 (보안)
   * - contextIsolation 활성화
   * - nodeIntegration 비활성화
   */
  createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      resizable: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),  // 컴파일된 JS 파일 사용
        contextIsolation: true,   // 보안: 렌더러 프로세스 격리
        nodeIntegration: false    // 보안: Node.js API 접근 차단
      }
    });

    // HTML 파일 로드 (src 폴더에 있음)
    this.mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

    // 개발 모드에서는 DevTools 자동 열기
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    // 윈도우 닫힘 이벤트 처리
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * IPC 핸들러를 설정합니다.
   *
   * 렌더러 프로세스에서 호출할 수 있는 모든 IPC 핸들러를 등록합니다.
   * 각 핸들러는 try-catch로 에러를 처리하고, 일관된 형식으로 응답합니다.
   */
  private setupIpcHandlers(): void {
    // ==================== 트래킹 관련 ====================

    /**
     * 수동 트래킹 시작
     */
    ipcMain.handle('start-tracking', async (_event, browserType?: string, blockedDomains?: string[]) => {
      try {
        // 브라우저 타입이 지정된 경우 설정 업데이트
        if (browserType && (browserType === 'chromium' || browserType === 'firefox' || browserType === 'webkit')) {
          console.log(`[IPC] Updating browser type to: ${browserType}`);
          updateConfigCategory('browser', { browserType: browserType as any });
        }

        // 차단할 도메인 목록 로그
        if (blockedDomains && blockedDomains.length > 0) {
          console.log(`[IPC] Blocked domains:`, blockedDomains);
        }

        await this.trackingService.startTracking(blockedDomains);
        return { success: true };
      } catch (error) {
        console.error('[IPC Error] start-tracking:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 트래킹 중지
     */
    ipcMain.handle('stop-tracking', async () => {
      try {
        const result = await this.trackingService.stopTracking();
        return {
          success: true,
          domains: result.domains,
          ips: result.ips
        };
      } catch (error) {
        console.error('[IPC Error] stop-tracking:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 트래킹 상태 확인
     */
    ipcMain.handle('get-tracking-status', () => {
      try {
        return this.trackingService.isTracking();
      } catch (error) {
        console.error('[IPC Error] get-tracking-status:', error);
        return false;
      }
    });

    /**
     * 현재까지 수집된 도메인 가져오기
     */
    ipcMain.handle('get-current-domains', () => {
      try {
        return this.trackingService.getCurrentDomains();
      } catch (error) {
        console.error('[IPC Error] get-current-domains:', error);
        return [];
      }
    });

    // ==================== 자동 분석 관련 ====================

    /**
     * URL 자동 분석 (headless 또는 headed)
     */
    ipcMain.handle('analyze-url', async (_event, targetUrl: string, options: AnalysisOptions) => {
      try {
        const result = await this.trackingService.analyzeUrl(targetUrl, options);
        return result;
      } catch (error) {
        console.error('[IPC Error] analyze-url:', error);
        return {
          success: false,
          url: targetUrl,
          error: (error as Error).message,
          domains: []
        };
      }
    });

    /**
     * 로그인 완료 신호
     */
    ipcMain.handle('login-complete', async (_event, analysisId: string) => {
      try {
        this.trackingService.signalLoginComplete(analysisId);
        return { success: true };
      } catch (error) {
        console.error('[IPC Error] login-complete:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 자동 크롤링 시작 (Manual Tracking 중)
     */
    ipcMain.handle('start-auto-crawl', async (_event, depth: number, maxLinks: number) => {
      try {
        await this.trackingService.startAutoCrawling(depth, maxLinks, (message) => {
          // 진행 상황을 렌더러에 전달
          this.mainWindow?.webContents.send('crawl-progress', message);
        });
        return { success: true };
      } catch (error) {
        console.error('[IPC Error] start-auto-crawl:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 세션 저장
     */
    ipcMain.handle('save-session', async (_event, sessionPath: string) => {
      try {
        await this.trackingService.saveSession(sessionPath);
        return { success: true, path: sessionPath };
      } catch (error) {
        console.error('[IPC Error] save-session:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 세션 로드
     */
    ipcMain.handle('load-session', async (_event, sessionPath: string) => {
      try {
        await this.trackingService.loadSession(sessionPath);
        return { success: true, path: sessionPath };
      } catch (error) {
        console.error('[IPC Error] load-session:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 세션 내보내기 (사용자 지정 경로)
     */
    ipcMain.handle('export-session', async () => {
      try {
        if (!this.mainWindow) {
          return {
            success: false,
            error: 'Main window not available'
          };
        }

        // 파일 저장 다이얼로그
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: '세션 내보내기',
          defaultPath: 'session.json',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return {
            success: false,
            canceled: true
          };
        }

        // 세션 저장
        await this.trackingService.saveSession(result.filePath);

        return {
          success: true,
          path: result.filePath
        };
      } catch (error) {
        console.error('[IPC Error] export-session:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 세션 가져오기 (사용자 지정 경로)
     */
    ipcMain.handle('import-session', async () => {
      try {
        if (!this.mainWindow) {
          return {
            success: false,
            error: 'Main window not available'
          };
        }

        // 파일 열기 다이얼로그
        const result = await dialog.showOpenDialog(this.mainWindow, {
          title: '세션 가져오기',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: false,
            canceled: true
          };
        }

        const filePath = result.filePaths[0];

        // 세션 로드
        await this.trackingService.loadSession(filePath);

        return {
          success: true,
          path: filePath
        };
      } catch (error) {
        console.error('[IPC Error] import-session:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // ==================== 세션 관리 ====================

    /**
     * 저장된 세션 파일 확인
     */
    ipcMain.handle('check-saved-session', async () => {
      try {
        const sessionPath = path.join(os.homedir(), '.domain-tracker-session.json');
        const exists = fs.existsSync(sessionPath);
        return {
          exists,
          path: sessionPath
        };
      } catch (error) {
        console.error('[IPC Error] check-saved-session:', error);
        return {
          exists: false,
          path: ''
        };
      }
    });

    /**
     * 저장된 세션 삭제
     */
    ipcMain.handle('clear-saved-session', async () => {
      try {
        const sessionPath = path.join(os.homedir(), '.domain-tracker-session.json');
        if (fs.existsSync(sessionPath)) {
          fs.unlinkSync(sessionPath);
          return {
            success: true,
            message: 'Session cleared'
          };
        }
        return {
          success: true,
          message: 'No session to clear'
        };
      } catch (error) {
        console.error('[IPC Error] clear-saved-session:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // ==================== 워크플로우 관련 ====================

    /**
     * 워크플로우 실행
     */
    ipcMain.handle('run-workflow', async (_event, steps: WorkflowStep[]) => {
      try {
        const result = await this.workflowService.runWorkflow(steps);
        return result;
      } catch (error) {
        console.error('[IPC Error] run-workflow:', error);
        return {
          success: false,
          error: (error as Error).message,
          domains: [],
          allIPs: []
        };
      }
    });

    // ==================== SNI 화이트리스트 관련 ====================

    /**
     * SNI 화이트리스트 분석
     * 수집된 도메인/IP를 분석하여 SNI 화이트리스트 생성
     */
    ipcMain.handle('analyze-sni-whitelist', async (_event, domains, ips) => {
      try {
        const result = this.sniWhitelistService.analyzeDomains(domains, ips);
        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('[IPC Error] analyze-sni-whitelist:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * SNI 화이트리스트 export
     * 분석된 결과를 지정된 형식으로 export
     */
    ipcMain.handle('export-sni-whitelist', async (_event, result, options: SNIExportOptions) => {
      try {
        const exported = this.sniWhitelistService.exportWhitelist(result, options);
        return {
          success: true,
          data: exported
        };
      } catch (error) {
        console.error('[IPC Error] export-sni-whitelist:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // ==================== 파일 저장 관련 ====================

    /**
     * 파일 저장 다이얼로그 열기
     */
    ipcMain.handle('save-file', async (_event, defaultPath: string, content: string) => {
      try {
        if (!this.mainWindow) {
          return {
            success: false,
            error: 'Main window not available'
          };
        }

        const result = await dialog.showSaveDialog(this.mainWindow, {
          defaultPath: defaultPath,
          filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return {
            success: false,
            canceled: true
          };
        }

        fs.writeFileSync(result.filePath, content, 'utf-8');

        return {
          success: true,
          filePath: result.filePath
        };
      } catch (error) {
        console.error('[IPC Error] save-file:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 도메인 차단 테스트 실행
     */
    ipcMain.handle('run-block-test', async (_event, options: BlockTestOptions) => {
      try {
        console.log('[IPC] run-block-test called');
        const result = await this.domainBlockTester.runTest(options);
        return result;
      } catch (error) {
        console.error('[IPC Error] run-block-test:', error);
        return {
          success: false,
          url: options.url,
          mode: options.mode,
          timestamp: new Date().toISOString(),
          totalRequests: 0,
          blockedRequests: 0,
          allowedRequests: 0,
          pageErrors: 0,
          blocked: [],
          allowed: [],
          errors: [],
          error: (error as Error).message
        };
      }
    });

    /**
     * 도메인 차단 테스트 중지
     */
    ipcMain.handle('stop-block-test', async () => {
      try {
        console.log('[IPC] stop-block-test called');
        await this.domainBlockTester.stopTest();
        return { success: true };
      } catch (error) {
        console.error('[IPC Error] stop-block-test:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 차단 도메인 파일 가져오기
     */
    ipcMain.handle('import-block-domains', async () => {
      try {
        console.log('[IPC] import-block-domains called');

        // 파일 선택 다이얼로그 열기
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: '차단 도메인 목록 파일 선택',
          filters: [
            { name: '텍스트 파일', extensions: ['txt'] },
            { name: '모든 파일', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        // 사용자가 취소한 경우
        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        console.log('[IPC] Reading file:', filePath);

        // 파일 읽기
        const content = fs.readFileSync(filePath, 'utf-8');

        return {
          success: true,
          content: content.trim()
        };
      } catch (error) {
        console.error('[IPC Error] import-block-domains:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 5-tuple 연결 로그 내보내기
     */
    ipcMain.handle('export-5tuple-logs', async () => {
      try {
        console.log('[IPC] export-5tuple-logs called');

        // 5-tuple 로그 가져오기
        const logContent = this.trackingService.export5TupleLogs();

        // 파일 저장 다이얼로그 열기
        const result = await dialog.showSaveDialog(this.mainWindow!, {
          title: '5-Tuple 연결 로그 저장',
          defaultPath: `5tuple_log_${new Date().toISOString().replace(/:/g, '-').slice(0, 19)}.txt`,
          filters: [
            { name: '텍스트 파일', extensions: ['txt'] },
            { name: '로그 파일', extensions: ['log'] },
            { name: '모든 파일', extensions: ['*'] }
          ]
        });

        // 사용자가 취소한 경우
        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
        }

        const filePath = result.filePath;
        console.log('[IPC] Saving 5-tuple logs to:', filePath);

        // 파일 저장
        fs.writeFileSync(filePath, logContent, 'utf-8');

        return {
          success: true,
          filePath: filePath
        };
      } catch (error) {
        console.error('[IPC Error] export-5tuple-logs:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    /**
     * 파일 선택 및 읽기 (5-Tuple 뷰어용)
     */
    ipcMain.handle('select-file', async () => {
      try {
        console.log('[IPC] select-file called');

        // 파일 선택 다이얼로그 열기
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: '5-Tuple 로그 파일 선택',
          filters: [
            { name: '텍스트 파일', extensions: ['txt'] },
            { name: '로그 파일', extensions: ['log'] },
            { name: '모든 파일', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        // 사용자가 취소한 경우
        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        console.log('[IPC] Reading file:', filePath);

        // 파일 읽기
        const content = fs.readFileSync(filePath, 'utf-8');

        return {
          success: true,
          filePath,
          content: content.trim()
        };
      } catch (error) {
        console.error('[IPC Error] select-file:', error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });
  }

  /**
   * 앱 초기화 및 실행
   *
   * Electron 앱의 라이프사이클을 관리합니다.
   */
  async init(): Promise<void> {
    // Electron이 준비될 때까지 대기
    await app.whenReady();

    // 메인 윈도우 생성
    this.createMainWindow();

    // 모든 윈도우가 닫혔을 때 처리
    app.on('window-all-closed', async () => {
      // TrackingService 정리
      await this.trackingService.cleanup();
      // WorkflowService 정리
      await this.workflowService.cleanup();

      // macOS가 아니면 앱 종료
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // macOS에서 Dock 아이콘 클릭 시 윈도우 재생성
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // 앱 종료 전 정리 작업
    app.on('before-quit', async (event) => {
      // TrackingService 리소스 정리
      await this.trackingService.cleanup();
      // WorkflowService 리소스 정리
      await this.workflowService.cleanup();
      console.log('[App] Cleanup completed');
    });

    // 예기치 않은 에러 처리
    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection]', reason);
    });
  }
}

// ==================== 앱 실행 ====================

/**
 * 앱 인스턴스 생성 및 초기화
 */
const domainTracker = new DomainTracker();
domainTracker.init().catch((error) => {
  console.error('[App Init Error]', error);
  app.quit();
});

// 개발 환경 정보 출력
if (process.argv.includes('--dev')) {
  console.log('[Development Mode]');
  console.log('- Platform:', process.platform);
  console.log('- Electron:', process.versions.electron);
  console.log('- Chrome:', process.versions.chrome);
  console.log('- Node:', process.versions.node);
}
