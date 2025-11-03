/**
 * Domain Tracker - Injectable Decorator
 *
 * NestJS 스타일의 @Injectable() 데코레이터입니다.
 * 클래스를 의존성 주입 가능한 서비스로 표시합니다.
 */

import 'reflect-metadata';

// Injectable 메타데이터 키
export const INJECTABLE_METADATA_KEY = 'injectable';

/**
 * Injectable 데코레이터 옵션
 */
export interface InjectableOptions {
  /**
   * 서비스의 스코프
   * - 'singleton': 단일 인스턴스 (기본값)
   * - 'transient': 매번 새 인스턴스 생성
   */
  scope?: 'singleton' | 'transient';
}

/**
 * @Injectable() 데코레이터
 *
 * 클래스를 의존성 주입 컨테이너에서 관리할 수 있는 서비스로 표시합니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private dependency: SomeDependency) {}
 * }
 * ```
 *
 * @param options - Injectable 옵션
 * @returns 클래스 데코레이터
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target: any) => {
    // 메타데이터 설정
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, {
      scope: options.scope || 'singleton',
      target: target
    }, target);

    // 생성자 파라미터 타입 정보 저장 (의존성 자동 주입용)
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    Reflect.defineMetadata('injectable:paramtypes', paramTypes, target);

    console.log(`[Injectable] Registered: ${target.name}`);
  };
}

/**
 * 클래스가 Injectable인지 확인합니다.
 *
 * @param target - 확인할 클래스
 * @returns Injectable이면 true
 */
export function isInjectable(target: any): boolean {
  return Reflect.hasMetadata(INJECTABLE_METADATA_KEY, target);
}

/**
 * Injectable 메타데이터를 가져옵니다.
 *
 * @param target - 클래스
 * @returns Injectable 메타데이터
 */
export function getInjectableMetadata(target: any): InjectableOptions | undefined {
  return Reflect.getMetadata(INJECTABLE_METADATA_KEY, target);
}

/**
 * 생성자 파라미터 타입들을 가져옵니다.
 *
 * @param target - 클래스
 * @returns 파라미터 타입 배열
 */
export function getConstructorParamTypes(target: any): any[] {
  return Reflect.getMetadata('injectable:paramtypes', target) || [];
}
