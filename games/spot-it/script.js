// script.js

import { debugInfo } from './modules/debugInfo.js'; // debugInfo 싱글톤 인스턴스 import
import { gameCore } from './modules/gameCore.js'; // gameCore 싱글톤 인스턴스 import
import { spotGame } from './modules/spotGame.js'; // spotGame 싱글톤 인스턴스 import

document.addEventListener('DOMContentLoaded', () => {
  // 디버그 토글 버튼 이벤트 리스너 (애플리케이션 전역 UI)
  const toggleDebugBtn = document.getElementById('toggle-debug-btn');
  if (toggleDebugBtn) {
    // debugInfo 인스턴스의 toggleDebugMode 메서드 호출
    toggleDebugBtn.addEventListener('click', () => {
      debugInfo.toggleDebugMode();
      //spotGame.drawAllSpots();
    });
  }

  // gameCore 인스턴스의 initializeGameCore 메서드 호출
  gameCore.initializeGameCore();

  // spotGame 인스턴스의 initializeSpotGame 메서드 호출
  spotGame.initializeSpotGame();

  console.log('애플리케이션 메인 스크립트 실행 완료.');
});
