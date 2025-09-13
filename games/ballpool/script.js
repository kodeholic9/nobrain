import {
  ballConfig,
  BallPoolGameEngine,
} from './modules/ballPoolGameEngine.js';

// 게임 상태 관리
class GameUI {
  constructor() {
    this.isGameRunning = false;
    this.currentDropX = 0;
    this.gameEngine = null;

    // DOM 요소 참조
    this.elements = {
      settingsBtn: document.getElementById('settingsBtn'),
      settingsPopup: document.getElementById('settingsPopup'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      gameCanvas: document.getElementById('gameCanvas'),
      dropGuide: document.getElementById('dropGuide'),
      scoreValue: document.getElementById('scoreValue'),
      nextBall: document.getElementById('nextBall'),

      newGame: document.getElementById('newGame'),
      debugBtn: document.getElementById('debugBtn'),
      gameSettingsBtn: document.getElementById('gameSettingsBtn'),
      ballCheckBtn: document.getElementById('ballCheckBtn'),
      autoDropBtn: document.getElementById('autoDropBtn'),
      additionalButtons: document.getElementById('additionalButtons'),
    };

    // 설정 상태
    this.gameSettings = {
      debugMode: false,
    };

    this.gameState = {
      score: 0,
      nextBalls: [],
    };

    this.init();
  }

  init() {
    this.setupCanvas();
    this.bindEvents();
    this.initializeGame();
    this.setupSettingsButtons();
  }

  setupCanvas() {}

  bindEvents() {
    // 설정 팝업 이벤트
    this.elements.settingsBtn.addEventListener('click', () => {
      this.toggleSettings(true);
    });

    this.elements.closeSettingsBtn.addEventListener('click', () => {
      this.toggleSettings(false);
    });

    this.elements.settingsPopup.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsPopup) {
        this.toggleSettings(false);
      }
    });

    // ESC 키로 설정 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleSettings(false);
      }
    });
  }

  initializeGame() {
    try {
      this.gameEngine = new BallPoolGameEngine(
        this.elements.gameCanvas,
        this.gameSettings
      );
      this.gameEngine.on((action, args) => {
        console.log('게임 이벤트:', action, args);
        switch (action) {
          case 'score-update':
            this.gameState.score = args;
            break;

          case 'next-ball-update':
            this.gameState.nextBalls = args;
            break;
        }
        this.updateState();
      });

      // 게임 엔진 이벤트 리스너 등록
      this.isGameRunning = true;
      console.log('게임 엔진이 초기화되었습니다.');
    } catch (error) {
      console.error('게임 초기화 중 오류 발생:', error);
      this.setupFallbackMode();
    }
  }

  setupFallbackMode() {
    // 게임 엔진이 없을 때의 대체 모드
    console.log('Fallback 모드로 실행됩니다.');
    this.isGameRunning = false;

    // 더미 데이터로 UI 테스트
    this.gameState.score = 0;
    this.gameState.nextBalls = [];
    this.updateState();
  }

  toggleSettings(show) {
    if (show) {
      this.elements.settingsPopup.classList.add('active');
    } else {
      this.elements.settingsPopup.classList.remove('active');
    }
  }

  setupSettingsButtons() {
    // 새게임 버튼
    this.elements.newGame.addEventListener('click', () => {
      this.restartGame();
    });

    // 디버그 버튼
    this.elements.debugBtn.addEventListener('click', () => {
      this.gameSettings.debugMode = !this.gameSettings.debugMode;
      this.applyGameSettings();
    });

    // 게임설정 버튼
    this.elements.gameSettingsBtn.addEventListener('click', () => {});

    // 공 확인 버튼
    this.elements.ballCheckBtn.addEventListener('click', () => {});

    // 자동 드롭 버튼
    this.elements.autoDropBtn.addEventListener('click', () => {});
  }

  // 확장성을 위한 버튼 추가 메서드
  addSettingButton(text, callback, options = {}) {
    const button = document.createElement('button');
    button.className = 'setting-btn';
    button.textContent = text;
    button.addEventListener('click', callback);

    if (options.color) {
      button.style.background = options.color;
    }

    this.elements.additionalButtons.appendChild(button);
    return button;
  }

  showGameSettings() {
    alert('게임 설정 기능은 개발 중입니다.');
    // TODO: 게임 설정 모달 구현
  }

  showBallInfo() {}

  updateState() {
    this.elements.scoreValue.textContent =
      this.gameState.score.toLocaleString();
    if (this.gameState.nextBalls.length > 0) {
      this.elements.nextBall.src =
        ballConfig[this.gameState.nextBalls[0]].imgPath;
    }
  }

  applyGameSettings() {
    if (this.gameEngine) {
      this.gameEngine.updateConfig(this.gameSettings);
      console.log('게임 설정이 적용되었습니다:', this.gameSettings);
    }
  }

  handleGameOver(data) {
    this.isGameRunning = false;
    this.stopAutoDrop();
    alert(`게임 오버!\n최종 점수: ${data.score}`);
  }

  handleBallMerged(data) {
    console.log('공 합성:', data);
    // TODO: 합성 이펙트 구현
  }

  // 게임 재시작
  restartGame() {
    if (this.gameEngine) {
      this.gameEngine.reset();
      this.isGameRunning = true;
      console.log('게임이 재시작되었습니다.');
    }
  }
}

// DOM 로드 완료 후 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 로드 완료. 게임 UI를 초기화합니다.');

  const gameUI = new GameUI();
  gameUI.restartGame();

  console.log('게임 UI가 초기화되었습니다.');
});
