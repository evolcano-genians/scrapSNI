/**
 * Domain Tracker - 진행 상황 관찰자 인터페이스
 *
 * Observer 패턴을 사용하여 진행 상황 알림을 구현합니다.
 * 느슨한 결합을 통해 여러 관찰자가 독립적으로 진행 상황을 받을 수 있습니다.
 */

import { CrawlProgress } from '../types';

/**
 * 진행 상황 관찰자 인터페이스
 *
 * 크롤링, 워크플로우 실행 등의 진행 상황을 받을 수 있습니다.
 */
export interface IProgressObserver {
  /**
   * 진행 상황이 업데이트되었을 때 호출됩니다.
   *
   * @param progress - 진행 상황 정보
   */
  onProgress(progress: CrawlProgress): void;

  /**
   * 작업이 완료되었을 때 호출됩니다.
   */
  onComplete(): void;

  /**
   * 오류가 발생했을 때 호출됩니다.
   *
   * @param error - 발생한 오류
   */
  onError(error: Error): void;
}
