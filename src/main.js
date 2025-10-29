const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const PlaywrightController = require('./playwrightController');

class DomainTracker {
  constructor() {
    this.mainWindow = null;
    this.playwrightController = new PlaywrightController();
    this.setupIpcHandlers();
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIpcHandlers() {
    // 트래킹 시작
    ipcMain.handle('start-tracking', async () => {
      try {
        await this.playwrightController.startTracking();
        return { success: true };
      } catch (error) {
        console.error('Error starting tracking:', error);
        return { success: false, error: error.message };
      }
    });

    // 트래킹 중지
    ipcMain.handle('stop-tracking', async () => {
      try {
        const domains = await this.playwrightController.stopTracking();
        return { success: true, domains };
      } catch (error) {
        console.error('Error stopping tracking:', error);
        return { success: false, error: error.message };
      }
    });

    // 트래킹 상태 확인
    ipcMain.handle('get-tracking-status', () => {
      return this.playwrightController.isTracking();
    });

    // 현재까지 수집된 도메인 가져오기
    ipcMain.handle('get-current-domains', () => {
      return this.playwrightController.getCurrentDomains();
    });

    // URL 자동 분석 (headless)
    ipcMain.handle('analyze-url', async (event, targetUrl, options) => {
      try {
        const result = await this.playwrightController.analyzeUrl(targetUrl, options);
        return result;
      } catch (error) {
        console.error('Error analyzing URL:', error);
        return {
          success: false,
          url: targetUrl,
          error: error.message,
          domains: []
        };
      }
    });

    // 로그인 완료 신호
    ipcMain.handle('login-complete', async (event, analysisId) => {
      try {
        this.playwrightController.signalLoginComplete(analysisId);
        return { success: true };
      } catch (error) {
        console.error('Error signaling login complete:', error);
        return { success: false, error: error.message };
      }
    });

    // 저장된 세션 확인
    ipcMain.handle('check-saved-session', async () => {
      const sessionPath = path.join(os.homedir(), '.domain-tracker-session.json');
      const exists = fs.existsSync(sessionPath);
      return { exists, path: sessionPath };
    });

    // 저장된 세션 삭제
    ipcMain.handle('clear-saved-session', async () => {
      try {
        const sessionPath = path.join(os.homedir(), '.domain-tracker-session.json');
        if (fs.existsSync(sessionPath)) {
          fs.unlinkSync(sessionPath);
          return { success: true };
        }
        return { success: true, message: 'No session to clear' };
      } catch (error) {
        console.error('Error clearing session:', error);
        return { success: false, error: error.message };
      }
    });

    // 워크플로우 실행
    ipcMain.handle('run-workflow', async (event, steps) => {
      try {
        const result = await this.playwrightController.runWorkflow(steps);
        return result;
      } catch (error) {
        console.error('Error running workflow:', error);
        return {
          success: false,
          error: error.message,
          domains: [],
          allIPs: []
        };
      }
    });
  }

  async init() {
    await app.whenReady();
    this.createMainWindow();

    app.on('window-all-closed', async () => {
      await this.playwrightController.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // 앱 종료 시 정리
    app.on('before-quit', async () => {
      await this.playwrightController.cleanup();
    });
  }
}

// 앱 인스턴스 생성 및 실행
const domainTracker = new DomainTracker();
domainTracker.init();