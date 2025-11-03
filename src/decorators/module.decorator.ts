/**
 * Domain Tracker - Module Decorator
 *
 * NestJS 스타일의 @Module() 데코레이터입니다.
 * 애플리케이션의 모듈 구조를 정의합니다.
 */

import 'reflect-metadata';

// Module 메타데이터 키
export const MODULE_METADATA_KEY = 'module';

/**
 * Module 데코레이터 옵션
 */
export interface ModuleOptions {
  /**
   * 모듈에서 제공하는 서비스(Provider) 목록
   */
  providers?: any[];

  /**
   * 다른 모듈에 export할 서비스 목록
   */
  exports?: any[];

  /**
   * 이 모듈이 의존하는 다른 모듈 목록
   */
  imports?: any[];
}

/**
 * @Module() 데코레이터
 *
 * 클래스를 모듈로 표시하고 의존성 관계를 정의합니다.
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [ServiceA, ServiceB],
 *   exports: [ServiceA],
 *   imports: [OtherModule]
 * })
 * export class MyModule {}
 * ```
 *
 * @param options - 모듈 옵션
 * @returns 클래스 데코레이터
 */
export function Module(options: ModuleOptions = {}): ClassDecorator {
  return (target: any) => {
    // 메타데이터 설정
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      providers: options.providers || [],
      exports: options.exports || [],
      imports: options.imports || [],
      target: target
    }, target);

    console.log(`[Module] Registered: ${target.name}`);
    console.log(`  - Providers: ${(options.providers || []).map((p: any) => p.name).join(', ')}`);
    console.log(`  - Exports: ${(options.exports || []).map((e: any) => e.name).join(', ')}`);
    console.log(`  - Imports: ${(options.imports || []).map((i: any) => i.name).join(', ')}`);
  };
}

/**
 * 클래스가 Module인지 확인합니다.
 *
 * @param target - 확인할 클래스
 * @returns Module이면 true
 */
export function isModule(target: any): boolean {
  return Reflect.hasMetadata(MODULE_METADATA_KEY, target);
}

/**
 * Module 메타데이터를 가져옵니다.
 *
 * @param target - 클래스
 * @returns Module 메타데이터
 */
export function getModuleMetadata(target: any): ModuleOptions | undefined {
  return Reflect.getMetadata(MODULE_METADATA_KEY, target);
}
