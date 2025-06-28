// modules/gameCore.js

class GameCore {
  constructor() {
    // DOM 요소 참조 (constructor 시점에는 아직 없을 수 있으므로 initializeGameCore에서 할당)
    this.startGameBtn = null;
    this.resetGameBtn = null;
    this.remainingTimeSpan = null;
    this.gameMessageDiv = null;

    // 게임 상태 변수
    this.gameState = {
      isGameStarted: false,
      isGameEnded: false,
      remainingTime: 0, // 초 단위
      timerIntervalId: null,
    };

    // 게임 설정
    this.DEFAULT_GAME_DURATION_SECONDS = 60; // 기본 게임 시간 1분 (60초)
    this.currentGameDuration = this.DEFAULT_GAME_DURATION_SECONDS;

    // 외부에서 게임 상태 변경을 감지할 콜백 함수들
    this.gameEventListeners = {
      onGameStart: [],
      onGameEnd: [],
      onGameReset: [],
      onTimeUpdate: [], // 시간 업데이트 시 콜백
    };
  }

  /**
   * 게임 관련 DOM 요소를 초기화하고 이벤트 리스너를 바인딩합니다.
   * 이 함수는 `script.js` 또는 `spotGame.js`에서 게임 시작 전에 호출되어야 합니다.
   */
  initializeGameCore() {
    this.startGameBtn = document.getElementById('startGameBtn');
    this.resetGameBtn = document.getElementById('resetGameBtn');
    this.remainingTimeSpan = document.getElementById('remainingTime');
    this.gameMessageDiv = document.getElementById('gameMessage');

    if (
      !this.startGameBtn ||
      !this.resetGameBtn ||
      !this.remainingTimeSpan ||
      !this.gameMessageDiv
    ) {
      console.error(
        'Game control UI elements not found. Please check index.html.'
      );
      return;
    }

    this.startGameBtn.addEventListener('click', () => {
      this.startGame(100); // 예시로 100초 전달, 실제 값은 호출하는 곳에서 결정
    });
    this.resetGameBtn.addEventListener('click', () => {
      this.resetGame();
    });
    console.log('GameCore 모듈 초기화 완료.');
  }

  /**
   * 게임 상태를 반환합니다. (읽기 전용)
   * @returns {Object} 현재 게임 상태 객체
   */
  getGameState() {
    return { ...this.gameState }; // 상태 객체 복사본 반환 (외부에서 직접 수정 방지)
  }

  /**
   * 특정 게임 이벤트 발생 시 호출될 콜백을 등록합니다.
   * @param {string} eventName - 'onGameStart', 'onGameEnd', 'onGameReset', 'onTimeUpdate'
   * @param {Function} callback - 호출될 함수
   */
  addGameEventListener(eventName, callback) {
    if (this.gameEventListeners[eventName] && typeof callback === 'function') {
      this.gameEventListeners[eventName].push(callback);
    } else {
      console.warn(
        `Invalid eventName: ${eventName} or callback is not a function.`
      );
    }
  }

  /**
   * 등록된 게임 이벤트 리스너들을 실행합니다.
   * @param {string} eventName - 실행할 이벤트 이름
   * @param {any[]} args - 콜백에 전달할 인자들
   */
  emitGameEvent(eventName, ...args) {
    if (this.gameEventListeners[eventName]) {
      this.gameEventListeners[eventName].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${eventName} event listener:`, error);
        }
      });
    }
  }

  /**
   * 주어진 초를 MM:SS 형식으로 변환합니다.
   * @param {number} seconds - 변환할 초
   * @returns {string} MM:SS 형식의 문자열
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * 타이머 디스플레이를 업데이트하고 onTimeUpdate 이벤트를 발생시킵니다.
   */
  updateTimerDisplay() {
    this.remainingTimeSpan.textContent = this.formatTime(
      this.gameState.remainingTime
    );
    this.emitGameEvent('onTimeUpdate', this.gameState.remainingTime);
  }

  /**
   * 게임 메시지를 표시합니다.
   * @param {string} message - 표시할 메시지
   * @param {string} type - 'success', 'failure', 'info' 등 메시지 타입 (CSS 클래스용)
   */
  showGameMessage(message, type = '') {
    this.gameMessageDiv.textContent = message;
    this.gameMessageDiv.className = `game-message ${type}`; // 기존 클래스 제거 후 새 클래스 적용
    this.gameMessageDiv.style.display = 'block';
  }

  /**
   * 게임 메시지를 숨깁니다.
   */
  hideGameMessage() {
    this.gameMessageDiv.style.display = 'none';
    this.gameMessageDiv.textContent = '';
    this.gameMessageDiv.className = 'game-message';
  }

  /**
   * 게임을 시작합니다.
   * @param {number} [durationSeconds] - 게임 시간 (초). 지정하지 않으면 기본값 사용.
   */
  startGame(durationSeconds = this.DEFAULT_GAME_DURATION_SECONDS) {
    if (this.gameState.isGameStarted) {
      console.warn('게임이 이미 시작되었습니다.');
      return;
    }

    const parsedDuration = parseInt(durationSeconds, 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      console.warn(
        `유효하지 않은 게임 시간: ${durationSeconds}. 기본값 ${this.DEFAULT_GAME_DURATION_SECONDS}초를 사용합니다.`
      );
      this.currentGameDuration = this.DEFAULT_GAME_DURATION_SECONDS;
    } else {
      this.currentGameDuration = parsedDuration;
    }

    console.log('게임 시작!');
    this.gameState.isGameStarted = true;
    this.gameState.isGameEnded = false;
    this.gameState.remainingTime = this.currentGameDuration; // 남은 시간 초기화

    // UI 업데이트
    this.startGameBtn.style.display = 'none'; // 시작 버튼 숨기기
    this.resetGameBtn.style.display = 'inline-block'; // 리셋 버튼 보이기
    this.hideGameMessage(); // 메시지 숨기기
    this.updateTimerDisplay(); // 타이머 초기화 표시

    // 타이머 시작
    this.gameState.timerIntervalId = setInterval(() => {
      this.gameState.remainingTime--;
      this.updateTimerDisplay();

      if (this.gameState.remainingTime <= 0) {
        this.endGame(false); // 시간 초과로 게임 종료 (실패)
      }
    }, 1000); // 1초마다 갱신

    this.emitGameEvent('onGameStart');
  }

  /**
   * 게임을 종료합니다.
   * @param {boolean} success - 게임 성공 여부 (true: 성공, false: 실패)
   */
  endGame(success) {
    if (this.gameState.isGameEnded) {
      console.warn('게임이 이미 종료되었습니다.');
      return;
    }

    console.log(`게임 종료! 결과: ${success ? '성공' : '실패'}`);
    this.gameState.isGameEnded = true;
    clearInterval(this.gameState.timerIntervalId); // 타이머 중지
    this.gameState.timerIntervalId = null; // 인터벌 ID 초기화

    // UI 업데이트
    this.showGameMessage(
      success ? '게임 성공! 🎉' : '시간 초과! ⏱️',
      success ? 'success' : 'failure'
    );

    this.emitGameEvent('onGameEnd', success);
  }

  /**
   * 게임을 리셋합니다 (재시작 준비).
   */
  resetGame() {
    console.log('게임 리셋!');
    clearInterval(this.gameState.timerIntervalId); // 혹시 모를 타이머 중지
    this.gameState.timerIntervalId = null;

    this.gameState.isGameStarted = false;
    this.gameState.isGameEnded = false;
    this.gameState.remainingTime = this.currentGameDuration; // 초기 설정 시간으로 리셋

    // UI 초기화
    this.startGameBtn.style.display = 'inline-block'; // 시작 버튼 보이기
    this.resetGameBtn.style.display = 'none'; // 리셋 버튼 숨기기
    this.hideGameMessage(); // 메시지 숨기기
    this.updateTimerDisplay(); // 타이머 초기화 표시

    this.emitGameEvent('onGameReset');
  }
}

export const gameCore = new GameCore(); // 싱글톤 인스턴스 내보내기
