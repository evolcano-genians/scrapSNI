/**
 * Domain Tracker - Module Container
 *
 * NestJS 스타일의 모듈 컨테이너입니다.
 * @Module() 데코레이터가 적용된 모듈을 로드하고 서비스를 관리합니다.
 */

import 'reflect-metadata';
import { AppConfig } from '../types';
import { getConfig } from '../config/config';
import { getModuleMetadata, isModule } from '../decorators/module.decorator';
import { getInjectableMetadata, getConstructorParamTypes } from '../decorators/injectable.decorator';
import { getInjectTokens } from '../decorators/inject.decorator';
import { IBrowserAutomation } from '../interfaces/IBrowserAutomation';
import { IDNSResolver } from '../interfaces/IDNSResolver';
import { IDetector } from '../interfaces/IDetector';
import { PlaywrightAdapter } from '../adapters/PlaywrightAdapter';
import { DNSResolver } from '../services/DNSResolver';
import { Detector } from '../services/Detector';
import { TrackingService } from '../services/TrackingService';
import { WorkflowService } from '../services/WorkflowService';

/**
 * ModuleContainer 클래스
 *
 * 모듈 기반 의존성 주입 컨테이너입니다.
 */
export class ModuleContainer {
  private config: AppConfig;
  private instances: Map<string, any> = new Map();
  private tokenToClass: Map<string, any> = new Map();

  constructor(config?: AppConfig) {
    this.config = config || getConfig();
    console.log('[ModuleContainer] Initializing...');
    this.registerDefaultMappings();
  }

  /**
   * 기본 인터페이스 -> 구현 클래스 매핑을 등록합니다.
   */
  private registerDefaultMappings(): void {
    // 인터페이스 토큰 -> 구현 클래스 매핑
    this.tokenToClass.set('IBrowserAutomation', PlaywrightAdapter);
    this.tokenToClass.set('IDNSResolver', DNSResolver);
    this.tokenToClass.set('IDetector', Detector);

    console.log('[ModuleContainer] Default token mappings registered');
  }

  /**
   * 모듈을 로드합니다.
   *
   * @param moduleClass - @Module() 데코레이터가 적용된 모듈 클래스
   */
  loadModule(moduleClass: any): void {
    if (!isModule(moduleClass)) {
      throw new Error(`${moduleClass.name} is not a module. Apply @Module() decorator.`);
    }

    const metadata = getModuleMetadata(moduleClass);
    if (!metadata) {
      throw new Error(`Failed to get metadata for module: ${moduleClass.name}`);
    }

    console.log(`[ModuleContainer] Loading module: ${moduleClass.name}`);

    // providers 등록
    if (metadata.providers) {
      for (const provider of metadata.providers) {
        this.registerProvider(provider);
      }
    }

    console.log(`[ModuleContainer] Module ${moduleClass.name} loaded successfully`);
  }

  /**
   * Provider를 등록합니다.
   *
   * @param providerClass - Provider 클래스
   */
  private registerProvider(providerClass: any): void {
    console.log(`[ModuleContainer] Registering provider: ${providerClass.name}`);

    // 이미 등록되어 있으면 스킵
    if (this.instances.has(providerClass.name)) {
      console.log(`[ModuleContainer]   Already registered, skipping`);
      return;
    }

    // 인스턴스 생성하지 않고 클래스만 등록 (Lazy instantiation)
    this.tokenToClass.set(providerClass.name, providerClass);
  }

  /**
   * 서비스를 해결합니다 (의존성 주입).
   *
   * @param token - 서비스 토큰 (클래스 이름 또는 인터페이스 토큰)
   * @returns 서비스 인스턴스
   */
  resolve<T>(token: string | any): T {
    const tokenName = typeof token === 'string' ? token : token.name;

    // 이미 생성된 인스턴스가 있으면 반환 (Singleton)
    if (this.instances.has(tokenName)) {
      return this.instances.get(tokenName) as T;
    }

    // 토큰에 해당하는 클래스 찾기
    const targetClass = this.tokenToClass.get(tokenName);
    if (!targetClass) {
      throw new Error(`[ModuleContainer] No provider found for token: ${tokenName}`);
    }

    console.log(`[ModuleContainer] Resolving: ${tokenName} (${targetClass.name})`);

    // 생성자 파라미터 해결
    const paramTypes = getConstructorParamTypes(targetClass) || [];
    const injectTokens = getInjectTokens(targetClass);

    const dependencies: any[] = [];

    for (let i = 0; i < paramTypes.length; i++) {
      // @Inject() 데코레이터가 있으면 해당 토큰 사용
      if (injectTokens[i]) {
        const token = injectTokens[i];
        console.log(`[ModuleContainer]   Resolving dependency[${i}]: ${typeof token === 'string' ? token : token.name}`);
        dependencies.push(this.resolve(token));
      }
      // Config 타입이면 설정 주입
      else if (paramTypes[i]?.name === 'BrowserConfig' || paramTypes[i]?.name === 'DNSConfig' || paramTypes[i]?.name === 'CrawlerConfig') {
        console.log(`[ModuleContainer]   Injecting config[${i}]: ${paramTypes[i].name}`);
        if (paramTypes[i].name === 'BrowserConfig') {
          dependencies.push(this.config.browser);
        } else if (paramTypes[i].name === 'DNSConfig') {
          dependencies.push(this.config.dns);
        } else if (paramTypes[i].name === 'CrawlerConfig') {
          dependencies.push(this.config.crawler);
        }
      }
      // AppConfig 타입이면 전체 설정 주입
      else if (paramTypes[i]?.name === 'AppConfig') {
        console.log(`[ModuleContainer]   Injecting AppConfig[${i}]`);
        dependencies.push(this.config);
      }
      // Object 타입이면 설정 객체로 간주 (TypeScript에서 인터페이스는 Object로 컴파일됨)
      else if (paramTypes[i]?.name === 'Object') {
        console.log(`[ModuleContainer]   Injecting config object[${i}] (detected as Object type)`);
        // 첫 번째 파라미터면 DNSConfig 또는 BrowserConfig로 간주
        if (targetClass.name === 'DNSResolver') {
          dependencies.push(this.config.dns);
        } else if (targetClass.name === 'BrowserManager') {
          dependencies.push(this.config.browser);
        } else if (targetClass.name === 'WebCrawler') {
          dependencies.push(this.config.crawler);
        } else {
          // 기본값: 전체 config
          dependencies.push(this.config);
        }
      }
      // 일반 클래스면 재귀적으로 resolve
      else if (paramTypes[i]) {
        console.log(`[ModuleContainer]   Resolving dependency[${i}]: ${paramTypes[i].name}`);
        dependencies.push(this.resolve(paramTypes[i]));
      }
    }

    // 인스턴스 생성
    const instance = new targetClass(...dependencies);

    // 싱글톤으로 캐시
    this.instances.set(tokenName, instance);
    this.instances.set(targetClass.name, instance);

    console.log(`[ModuleContainer] Resolved: ${tokenName}`);

    return instance as T;
  }

  /**
   * 서비스 인스턴스를 제거합니다.
   *
   * @param token - 서비스 토큰
   */
  clear(token: string | any): void {
    const tokenName = typeof token === 'string' ? token : token.name;
    this.instances.delete(tokenName);
  }

  /**
   * 모든 서비스 인스턴스를 제거합니다.
   */
  clearAll(): void {
    this.instances.clear();
  }

  /**
   * 설정을 가져옵니다.
   *
   * @returns 애플리케이션 설정
   */
  getConfig(): AppConfig {
    return this.config;
  }
}
