/**
 * Domain Tracker - Inject Decorator
 *
 * NestJS 스타일의 @Inject() 데코레이터입니다.
 * 특정 토큰으로 의존성을 주입합니다.
 */

import 'reflect-metadata';

// Inject 메타데이터 키
export const INJECT_METADATA_KEY = 'inject';

/**
 * @Inject() 데코레이터
 *
 * 생성자 파라미터에 특정 토큰의 의존성을 주입합니다.
 * 인터페이스 기반 주입에 유용합니다.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @Inject('IBrowserAutomation') private browser: IBrowserAutomation,
 *     @Inject('IDNSResolver') private dns: IDNSResolver
 *   ) {}
 * }
 * ```
 *
 * @param token - 주입할 의존성의 토큰 (문자열 또는 클래스)
 * @returns 파라미터 데코레이터
 */
export function Inject(token: string | any): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // 기존 inject 메타데이터 가져오기
    const existingInjects = Reflect.getMetadata(INJECT_METADATA_KEY, target) || {};

    // 새 inject 정보 추가
    existingInjects[parameterIndex] = token;

    // 메타데이터 저장
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingInjects, target);

    console.log(`[Inject] ${target.constructor.name} parameter[${parameterIndex}] -> ${typeof token === 'string' ? token : token.name}`);
  };
}

/**
 * 생성자 파라미터의 inject 토큰을 가져옵니다.
 *
 * @param target - 클래스
 * @returns 파라미터 인덱스를 키로 하는 토큰 맵
 */
export function getInjectTokens(target: any): Record<number, string | any> {
  return Reflect.getMetadata(INJECT_METADATA_KEY, target) || {};
}
