/**
 * Domain Tracker - App Module
 *
 * NestJS 스타일의 메인 애플리케이션 모듈입니다.
 * 모든 서비스와 의존성을 정의합니다.
 */

import 'reflect-metadata';
import { Module } from '../decorators';
import { PlaywrightAdapter } from '../adapters/PlaywrightAdapter';
import { DNSResolver } from '../services/DNSResolver';
import { Detector } from '../services/Detector';
import { BrowserManager } from '../services/BrowserManager';
import { NetworkMonitor } from '../services/NetworkMonitor';
import { WebCrawler } from '../services/WebCrawler';
import { PageInteractor } from '../services/PageInteractor';
import { TrackingService } from '../services/TrackingService';
import { WorkflowService } from '../services/WorkflowService';
import { SNIWhitelistService } from '../services/SNIWhitelistService';
import { DomainBlockTester } from '../services/DomainBlockTester';

/**
 * AppModule
 *
 * 애플리케이션의 루트 모듈입니다.
 *
 * @Module() 데코레이터로 다음을 정의:
 * - providers: 제공할 서비스 목록
 * - exports: 다른 모듈에서 사용할 수 있는 서비스
 */
@Module({
  providers: [
    // Adapters
    PlaywrightAdapter,

    // Core Services
    DNSResolver,
    Detector,

    // High-level Services
    BrowserManager,
    NetworkMonitor,
    WebCrawler,
    PageInteractor,
    TrackingService,
    WorkflowService,
    SNIWhitelistService,
    DomainBlockTester
  ],
  exports: [
    TrackingService,
    WorkflowService,
    SNIWhitelistService,
    DomainBlockTester
  ]
})
export class AppModule {}
