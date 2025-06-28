// script.js

import { toggleDebugMode } from './modules/debugInfo.js';
import { initializeGameCore } from './modules/gameCore.js'; // !!! 변경: gameCore 임포트 !!!
import { initializeSpotGame } from './modules/spotGame.js';

document.addEventListener('DOMContentLoaded', () => {
  // 디버그 토글 버튼 이벤트 리스너 (애플리케이션 전역 UI)
  const toggleDebugBtn = document.getElementById('toggle-debug-btn');
  if (toggleDebugBtn) {
    toggleDebugBtn.addEventListener('click', () => toggleDebugMode());
  }

  // !!! 변경: GameCore 먼저 초기화 (UI 요소에 접근하기 위함) !!!
  initializeGameCore();

  // !!! 변경: SpotGame 초기화 !!!
  initializeSpotGame();

  console.log('애플리케이션 메인 스크립트 실행 완료.');
});
