/**
 * Domain Tracker - Workflow Service
 *
 * 워크플로우 실행 서비스입니다.
 *
 * TODO: Strategy + Factory 패턴으로 전체 리팩토링 필요
 * - IWorkflowStepExecutor 인터페이스 구현
 * - WorkflowStepFactory 생성
 * - 각 단계별 Executor 구현 (NavigateExecutor, LoginExecutor, CrawlExecutor 등)
 *
 * 현재는 임시 스텁 구현입니다.
 */

import { Injectable } from '../decorators';
import { WorkflowStep, AnalysisResult } from '../types';

/**
 * WorkflowService 클래스
 *
 * 워크플로우를 실행하는 서비스입니다.
 */
@Injectable()
export class WorkflowService {
  constructor() {
    console.log('[WorkflowService] Initialized (stub implementation)');
  }

  /**
   * 워크플로우를 실행합니다.
   *
   * TODO: 전체 구현 필요
   *
   * @param steps - 워크플로우 단계 배열
   * @returns 실행 결과
   */
  async runWorkflow(steps: WorkflowStep[]): Promise<AnalysisResult> {
    console.log(`[WorkflowService] Workflow execution not yet implemented`);
    console.log(`[WorkflowService] ${steps.length} steps provided`);

    // 임시로 not-implemented 응답 반환
    return {
      success: false,
      error: 'Workflow execution not yet implemented in refactored WorkflowService. Please use the old version or wait for full Strategy + Factory pattern implementation.',
      domains: []
    };
  }

  /**
   * 리소스를 정리합니다.
   */
  async cleanup(): Promise<void> {
    console.log('[WorkflowService] Cleanup (no-op in stub implementation)');
  }
}
