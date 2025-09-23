import {
  ballConfig,
  BallPoolGameEngine,
} from './modules/ballPoolGameEngine.js';

import { ProfileManager } from '../../modules/profileManager.js';
import { BallPoolGameManager } from './modules/ballPoolGameManager.js';

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
      gamePopup: document.getElementById('gamePopup'),
      closeGameBtn: document.getElementById('closeGameBtn'),
      canvasContainer: document.getElementById('canvasContainer'),
      gameCanvas: document.getElementById('gameCanvas'),
      dropGuide: document.getElementById('dropGuide'),
      bestScoreValue: document.getElementById('bestScoreValue'),
      scoreValue: document.getElementById('scoreValue'),
      nextBall: document.getElementById('nextBall'),
      dropZone: document.getElementById('dropZone'),
      dropLine: document.getElementById('dropLine'),

      additionalText: document.getElementById('additionalText'),
    };

    // 설정 상태
    this.gameSettings = {
      debugMode: false,
      gameOverLine: 120,
      dropYPos: 80,
    };

    this.gameState = {
      bestScore: 0,
      score: 0,
      nextBalls: [],
      showDropZone: false,
      showDropLine: false,
      dropX: 0,
      containerSize: { width: 0, height: 0 },
      testDrop: false,
    };

    this.resizeTimeout = null;

    // 각종 매니저 초기화
    this.profileManager = new ProfileManager();
    this.gameManager = new BallPoolGameManager();
    this.init();
  }

  init() {
    this.setupCanvas();
    this.bindEvents();
    this.initializeGame();
    // this.setupResizeHandler();
    this.loadBestScore();
  }

  setupCanvas() {
    const container = this.elements.canvasContainer;
    this.containerSize = {
      width: container.clientWidth,
      height: container.clientHeight,
    };
  }

  bindEvents() {
    // 설정 팝업 이벤트
    this.elements.settingsBtn.addEventListener('click', () => {
      this.gameManager.showMenuPopup({
        newGame: () => {
          this.restartGame();
        },
        dropAllBalls: () => {
          this.gameEngine.dropAllBalls();
        },
        myProfile: () => {
          this.profileManager.showProfilePopup();
        },
        debugMode: () => {
          this.gameSettings.debugMode = !this.gameSettings.debugMode;
          this.applyGameSettings();
        },
        testDrop: () => {
          this.gameState.testDrop = !this.gameState.testDrop;
          if (this.gameState.testDrop) {
            this.gameEngine.dropBall();
          }
        },
      });
    });
  }

  initializeGame() {
    try {
      this.gameEngine = new BallPoolGameEngine(
        this.elements.gameCanvas,
        this.gameSettings
      );

      // 게임 엔진 이벤트 리스너 등록
      this.gameEngine.on((action, args) => {
        console.log('게임 이벤트:', action, args);
        switch (action) {
          case 'game-reset':
            this.gameState.score = 0;
            this.gameState.testDrop = false;
            this.updateState();

            // 다음공의 위치 조정
            this.gameState.dropX = this.containerSize.width / 2;
            this.gameState.showDropZone = true;
            this.updateDropZone();
            break;

          case 'score-update':
            this.gameState.score = args;
            this.gameState.bestScore = Math.max(
              this.gameState.bestScore,
              this.gameState.score
            );
            this.updateState();
            break;

          case 'next-ball-update':
            this.gameState.nextBalls = args;
            this.updateState();
            this.updateDropZone();
            break;

          case 'drop-zone-update':
            this.gameState.dropX = args.dropX;
            this.updateDropZone();
            this.updateDropLine(args.gesture);
            break;

          case 'ball-dropped':
            this.gameState.showDropZone = false;
            this.updateDropZone();
            break;

          case 'ball-ready':
            this.gameState.showDropZone = true;
            this.updateDropZone();

            if (this.gameState.testDrop) {
              this.gameEngine.dropBall();
            }
            break;

          case 'game-over':
            this.gameState.showDropZone = false;
            const gameState = this.gameEngine.getGameState();
            this.saveBestScore(gameState.score);
            this.updateState();
            this.showGameOverPopup(gameState);
            break;
        }
      });

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

  toggleGamePopup(show) {
    if (show) {
      this.elements.gamePopup.classList.add('active');
    } else {
      this.elements.gamePopup.classList.remove('active');
    }
  }

  showGameSettings() {
    alert('게임 설정 기능은 개발 중입니다.');
    // TODO: 게임 설정 모달 구현
  }

  showSettings() {}

  showBallInfo() {}

  updateState() {
    this.elements.scoreValue.textContent =
      this.gameState.score.toLocaleString();
    this.elements.bestScoreValue.textContent =
      this.gameState.bestScore.toLocaleString();
    if (this.gameState.nextBalls.length >= 2) {
      this.elements.nextBall.src =
        ballConfig[this.gameState.nextBalls[1]].imgPath;
    }
  }

  updateDropZone() {
    if (!this.gameEngine || !this.gameState.nextBalls[0]) {
      return;
    }

    if (!this.gameState.showDropZone) {
      this.elements.dropZone.style.display = 'none';
      return;
    }

    const bcfg = ballConfig[this.gameState.nextBalls[0]];
    const size = this.gameEngine.sizeOfBall(this.gameState.nextBalls[0]);

    const minX = size;
    const maxX = this.containerSize.width - size;
    const left = Math.max(minX, Math.min(maxX, this.gameState.dropX));

    const borderWidth = 2;
    const outerSize = size * 2;
    const innerSize = outerSize - borderWidth * 2;

    // css를 갱신한다.
    // this.elements.dropZone.style.display = 'flex';
    // this.elements.dropZone.style.top = this.gameSettings.dropYPos + 'px';
    // this.elements.dropZone.style.left = left + 'px';
    // this.elements.dropZone.style.width = outerSize + 'px';
    // this.elements.dropZone.style.height = outerSize + 'px';
    // this.elements.dropZone.style.backgroundColor = '#000';
    // this.elements.dropZone.style.backgroundImage = `url(${bcfg.imgPath})`;
    // this.elements.dropZone.style.backgroundSize = `${innerSize}px ${innerSize}px`;
    // this.elements.dropZone.style.backgroundPosition = 'center';
    // this.elements.dropZone.style.backgroundRepeat = 'no-repeat';

    this.elements.dropZone.style.display = 'flex';
    this.elements.dropZone.style.top = this.gameSettings.dropYPos + 'px';
    this.elements.dropZone.style.left = left + 'px';
    this.elements.dropZone.style.width = outerSize + 'px';
    this.elements.dropZone.style.height = outerSize + 'px';
    //this.elements.dropZone.style.backgroundColor = '#000';
    this.elements.dropZone.style.backgroundImage = `url(${bcfg.imgPath})`;
    this.elements.dropZone.style.backgroundSize = `${outerSize}px ${outerSize}px`;
    this.elements.dropZone.style.backgroundPosition = 'center';
    this.elements.dropZone.style.backgroundRepeat = 'no-repeat';
  }

  updateDropLine(gesture) {
    if (!this.gameEngine || !this.gameState.nextBalls[0]) {
      return;
    }

    if (gesture === 'up' || gesture === 'cancel') {
      this.elements.dropLine.style.display = 'none';
      return;
    }

    const bcfg = ballConfig[this.gameState.nextBalls[0]];
    const size = this.gameEngine.sizeOfBall(this.gameState.nextBalls[0]);

    const dropLineWidth = 6; // 점선 두께를 변수로 관리
    const minX = size;
    const maxX = this.containerSize.width - size;
    const centerX = Math.max(minX, Math.min(maxX, this.gameState.dropX));
    const left = centerX - dropLineWidth / 2; // 중앙 정렬을 위해 두께의 절반만큼 빼기
    const top = this.gameSettings.dropYPos + size + 5;
    const height = this.containerSize.height - top;

    // css를 갱신한다.
    this.elements.dropLine.style.display = 'flex';
    this.elements.dropLine.style.top = top + 'px';
    this.elements.dropLine.style.left = left + 'px';
    this.elements.dropLine.style.width = dropLineWidth + 'px';
    this.elements.dropLine.style.height = height + 'px';
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

  //
  showGameOverPopup(gameState) {
    const s = `게임 오버!\n최종 점수: ${gameState.score}\n합성 레벨: ${gameState.highestBallValue}`;
    this.elements.additionalText.textContent = s;

    this.toggleGamePopup(true);
  }

  showConfirmStartPopup() {
    showConfirm('게임을 시작할까?');
  }

  loadBestScore() {
    try {
      const str = localStorage.getItem('ballPoolGameStore');
      const stored = str ? JSON.parse(str) : {};
      if (stored) {
        this.gameState.bestScore = stored.bestScore || 0;
        console.log(`기존 최고 점수: ${this.gameState.bestScore}`);
      } else {
        console.log('저장된 최고 점수가 없습니다.');
      }
    } catch (e) {
      console.error('최고 점수 로드 중 오류 발생:', e);
    }
  }

  saveBestScore(score) {
    const str = localStorage.getItem('ballPoolGameStore');
    const stored = str ? JSON.parse(str) : {};

    try {
      if (stored.bestScore && stored.bestScore >= score) {
        console.log(
          `현재 점수(${score})가 기존 최고 점수(${stored.bestScore})보다 낮아 저장하지 않습니다.`
        );
        return;
      }
      localStorage.setItem(
        'ballPoolGameStore',
        JSON.stringify({
          ...stored,
          bestScore: score,
        })
      );
      this.gameState.bestScore = score;
    } catch (e) {
      console.error('최고 점수 저장 중 오류 발생:', e);
      return;
    }
  }

  // 리사이즈 이벤트 핸들러 설정
  setupResizeHandler() {
    const handleResize = () => {
      // 디바운싱을 통해 리사이즈 이벤트 최적화
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.gameEngine.handleResize();
      }, 100); // 100ms 지연
    };

    // 리사이즈 이벤트 등록
    window.addEventListener('resize', handleResize);

    // 화면 회전 이벤트도 처리 (모바일)
    /*
    window.addEventListener('orientationchange', () => {
      // 화면 회전 후 약간의 지연 필요
      setTimeout(() => {
        this.gameEngine.handleResize();
      }, 300);
    }); */

    // 디바이스 픽셀 비율 변경 감지 (확대/축소 등)
    if ('matchMedia' in window) {
      const mediaQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`
      );
      mediaQuery.addListener(() => {
        setTimeout(() => {
          this.gameEngine.handleResize();
        }, 100);
      });
    }
  }
}

// DOM 로드 완료 후 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 로드 완료. 게임 UI를 초기화합니다.');

  const gameUI = new GameUI();
  setTimeout(() => {
    gameUI.restartGame();
  }, 500);

  console.log('게임 UI가 초기화되었습니다.');
});
