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
      currentRuleId: null, // 현재 게임의 ruleId를 여기에 추가
      totalSpots: 0, // 현재 게임의 총 스팟 개수
      foundSpots: 0, // 현재 게임에서 찾은 스팟 개수
      wrongClicks: 0, // 현재 게임의 오답 클릭 횟수
    };

    // 게임 설정
    this.DEFAULT_GAME_DURATION_SECONDS = 60; // 기본 게임 시간 1분 (60초)
    this.currentGameDuration = this.DEFAULT_GAME_DURATION_SECONDS;
    this.MAX_WRONG_CLICKS = 3; // 최대 허용 오답 클릭 수

    // 외부에서 게임 상태 변경을 감지할 콜백 함수들
    this.gameEventListeners = {
      onGameStart: [],
      onGameEnd: [],
      onGameReset: [],
      onTimeUpdate: [], // 시간 업데이트 시 콜백
      onSpotFound: [], // 스팟 발견 시 콜백 (새로 추가)
      onWrongClick: [], // 오답 클릭 시 콜백 (새로 추가)
      onScoreUpdate: [], // 점수 업데이트 시 콜백 (선택 사항)
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
      // TODO: 실제 게임에서는 사용자가 선택한 ruleId를 가져오거나,
      // 라운드 진행 로직에 따라 다음 ruleId를 결정해야 합니다.
      // 여기서는 임시로 ruleId 1을 사용합니다.
      this.startGame(1, this.DEFAULT_GAME_DURATION_SECONDS);
    });
    this.resetGameBtn.addEventListener('click', () => {
      this.resetGame();
    });
    console.log('GameCore 모듈 초기화 완료.');
    this.updateTimerDisplay(); // 초기 로드 시 시간 표시
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
   * @param {string} eventName - 'onGameStart', 'onGameEnd', 'onGameReset', 'onTimeUpdate', 'onSpotFound', 'onWrongClick'
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
   * @param {any} detail - 콜백에 전달할 상세 정보 객체
   */
  emitGameEvent(eventName, detail = {}) {
    if (this.gameEventListeners[eventName]) {
      this.gameEventListeners[eventName].forEach((callback) => {
        try {
          callback(detail); // detail 객체를 콜백에 전달
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
    this.emitGameEvent('onTimeUpdate', {
      remainingTime: this.gameState.remainingTime,
    });
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
   * @param {number} ruleId - 현재 라운드의 ruleId
   * @param {number} [durationSeconds] - 게임 시간 (초). 지정하지 않으면 기본값 사용.
   * @param {number} [totalSpots] - 현재 라운드의 총 스팟 개수 (선택 사항)
   */
  startGame(
    ruleId,
    durationSeconds = this.DEFAULT_GAME_DURATION_SECONDS,
    totalSpots = 0
  ) {
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

    console.log(`게임 시작! Rule ID: ${ruleId}`);
    this.gameState.isGameStarted = true;
    this.gameState.isGameEnded = false;
    this.gameState.remainingTime = this.currentGameDuration; // 남은 시간 초기화
    this.gameState.currentRuleId = ruleId; // 현재 ruleId 저장
    this.gameState.totalSpots = totalSpots; // 총 스팟 개수 저장
    this.gameState.foundSpots = 0; // 찾은 스팟 개수 초기화
    this.gameState.wrongClicks = 0; // 오답 클릭 횟수 초기화

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
        this.endGame(false, 'time_up'); // 시간 초과로 게임 종료 (실패)
      }
    }, 1000); // 1초마다 갱신

    // onGameStart 이벤트 발생 시 ruleId와 duration을 detail 객체에 담아 전달
    this.emitGameEvent('onGameStart', {
      ruleId: this.gameState.currentRuleId,
      duration: this.currentGameDuration,
      totalSpots: this.gameState.totalSpots,
    });
  }

  /**
   * 게임을 종료합니다.
   * @param {boolean} success - 게임 성공 여부 (true: 성공, false: 실패)
   * @param {string} reason - 게임 종료 사유 (예: 'time_up', 'all_spots_found', 'too_many_wrong_clicks')
   */
  endGame(success, reason = '') {
    if (this.gameState.isGameEnded) {
      console.warn('게임이 이미 종료되었습니다.');
      return;
    }

    console.log(
      `게임 종료! 결과: ${success ? '성공' : '실패'}, 사유: ${reason}`
    );
    this.gameState.isGameEnded = true;
    clearInterval(this.gameState.timerIntervalId); // 타이머 중지
    this.gameState.timerIntervalId = null; // 인터벌 ID 초기화

    // UI 업데이트
    let message = '';
    let type = '';
    if (success) {
      message = '게임 성공! 🎉';
      type = 'success';
    } else {
      if (reason === 'time_up') {
        message = '시간 초과! ⏱️';
      } else if (reason === 'too_many_wrong_clicks') {
        message = `오답 ${this.MAX_WRONG_CLICKS}회 초과! ❌`;
      } else {
        message = '게임 실패! 😢';
      }
      type = 'failure';
    }
    this.showGameMessage(message, type);

    this.emitGameEvent('onGameEnd', {
      success: success,
      reason: reason,
      finalScore: this.gameState.foundSpots,
    });
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
    this.gameState.currentRuleId = null; // ruleId 초기화
    this.gameState.totalSpots = 0; // 총 스팟 개수 초기화
    this.gameState.foundSpots = 0; // 찾은 스팟 개수 초기화
    this.gameState.wrongClicks = 0; // 오답 클릭 횟수 초기화

    // UI 초기화
    this.startGameBtn.style.display = 'inline-block'; // 시작 버튼 보이기
    this.resetGameBtn.style.display = 'none'; // 리셋 버튼 숨기기
    this.hideGameMessage(); // 메시지 숨기기
    this.updateTimerDisplay(); // 타이머 초기화 표시

    this.emitGameEvent('onGameReset');
  }

  /**
   * 스팟을 찾았을 때 호출됩니다.
   * @param {number} spotIndex - 발견된 스팟의 인덱스
   * @param {number} numFoundSpots - 현재까지 찾은 스팟의 총 개수
   */
  spotFound(spotIndex, numFoundSpots) {
    this.gameState.foundSpots = numFoundSpots;
    this.emitGameEvent('onSpotFound', {
      spotIndex: spotIndex,
      foundSpotsCount: numFoundSpots,
      totalSpots: this.gameState.totalSpots,
    });
    // 스코어 업데이트 이벤트 등 추가 가능
  }

  /**
   * 오답 클릭 시 호출됩니다.
   */
  wrongClick() {
    if (!this.gameState.isGameStarted || this.gameState.isGameEnded) return;

    this.gameState.wrongClicks++;
    this.emitGameEvent('onWrongClick', {
      wrongClicks: this.gameState.wrongClicks,
      maxWrongClicks: this.MAX_WRONG_CLICKS,
    });

    // if (this.gameState.wrongClicks >= this.MAX_WRONG_CLICKS) {
    //   this.endGame(false, 'too_many_wrong_clicks');
    // }
  }
}

export const gameCore = new GameCore(); // 싱글톤 인스턴스 내보내기
