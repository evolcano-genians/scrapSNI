const PlaywrightController = require('./src/playwrightController');

async function testPlaywrightController() {
  console.log('=== Playwright Controller Test ===\n');

  const controller = new PlaywrightController();

  try {
    // 트래킹 시작 테스트
    console.log('1. Starting tracking...');
    await controller.startTracking();
    console.log('   ✅ Tracking started successfully');
    console.log('   📍 Browser window should be visible now');

    // 트래킹 상태 확인
    console.log('\n2. Checking tracking status...');
    const isTracking = controller.isTracking();
    console.log(`   ✅ Tracking status: ${isTracking ? 'Active' : 'Inactive'}`);

    // 5초 대기 (사용자가 브라우저에서 몇 개의 사이트를 방문할 시간 제공)
    console.log('\n3. Waiting 10 seconds for manual navigation...');
    console.log('   ℹ️  Please navigate to some websites in the opened browser');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 현재 도메인 확인
    console.log('\n4. Getting current domains...');
    const currentDomains = controller.getCurrentDomains();
    console.log(`   ✅ Collected ${currentDomains.length} unique domains so far:`);
    currentDomains.forEach((domain, index) => {
      console.log(`      ${index + 1}. ${domain}`);
    });

    // 추가 5초 대기
    console.log('\n5. Waiting another 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 트래킹 중지
    console.log('\n6. Stopping tracking...');
    const finalDomains = await controller.stopTracking();
    console.log('   ✅ Tracking stopped successfully');

    // 최종 결과 출력
    console.log('\n=== Final Results ===');
    console.log(`Total unique domains collected: ${finalDomains.length}`);
    if (finalDomains.length > 0) {
      console.log('\nDomain list:');
      finalDomains.forEach((domain, index) => {
        console.log(`  ${index + 1}. ${domain}`);
      });
    }

    console.log('\n✅ All tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);

    // 에러 발생 시 정리
    try {
      await controller.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }

    process.exit(1);
  }
}

// 테스트 실행
console.log('Starting Playwright Controller test...\n');
testPlaywrightController().then(() => {
  console.log('\nTest completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\nTest failed with error:', error);
  process.exit(1);
});