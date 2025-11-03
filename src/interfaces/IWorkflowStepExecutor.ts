/**
 * Domain Tracker - 워크플로우 단계 실행 인터페이스
 *
 * Strategy 패턴을 사용하여 워크플로우 단계 실행 로직을 추상화합니다.
 * OCP(Open-Closed Principle)를 준수하여 새 단계 추가 시 기존 코드 수정 불필요합니다.
 */

import { Page } from 'playwright';
import { WorkflowStep, WorkflowStepType } from '../types';

/**
 * 워크플로우 실행 컨텍스트
 *
 * 워크플로우 단계 실행 시 필요한 모든 의존성과 상태를 포함합니다.
 */
export interface ExecutionContext {
  page: Page;
  [key: string]: any; // 확장 가능하도록 인덱스 시그니처 추가
}

/**
 * 워크플로우 단계 실행자 인터페이스
 *
 * 각 워크플로우 단계 타입별로 구현됩니다.
 */
export interface IWorkflowStepExecutor {
  /**
   * 이 executor가 처리하는 단계 타입을 반환합니다.
   *
   * @returns 단계 타입
   */
  getStepType(): WorkflowStepType;

  /**
   * 워크플로우 단계를 실행합니다.
   *
   * @param step - 실행할 워크플로우 단계
   * @param context - 실행 컨텍스트
   */
  execute(step: WorkflowStep, context: ExecutionContext): Promise<void>;

  /**
   * 단계 설정을 검증합니다.
   *
   * @param step - 검증할 워크플로우 단계
   * @returns 설정이 유효하면 true
   */
  validate(step: WorkflowStep): boolean;

  /**
   * 단계 설명을 반환합니다 (UI 표시용).
   *
   * @param step - 워크플로우 단계
   * @returns 사람이 읽을 수 있는 설명
   */
  getDescription(step: WorkflowStep): string;
}
