/**
 * 볼풀 게임 매니저 모듈
 * @author kodeholic (powered by Claude)
 * @version 1.0.0
 */

import {
  PopupManager,
  showAlert,
  showConfirm,
} from '../../../modules/popupManager.js';
import {
  StorageManager,
  STORAGE_KEYS,
} from '../../../modules/storageManager.js';

/**
 * 볼풀 게임 매니저 클래스
 */
export class BallPoolGameManager {
  constructor() {
    this.storage = new StorageManager(STORAGE_KEYS.BALL_POOL_GAME);
    this.popupManager = new PopupManager();
    this.currentPopup = null;

    // 설정 메뉴 정의
    this.menuItems = [
      {
        id: 'newGame',
        text: '새게임',
        icon: '🎮',
        color: '#6c5ce7',
        action: 'newGame',
      },
      {
        id: 'debugMode',
        text: '디버그 모드',
        icon: '📋',
        color: '#5cafe7ff',
        action: 'debugMode',
      },
      {
        id: 'dropAllBalls',
        text: '동전확인',
        icon: '📋',
        color: '#5c7ce7ff',
        action: 'dropAllBalls',
      },
      // {
      //   id: 'myProfile',
      //   text: '내 프로필',
      //   icon: '📋',
      //   color: '#6c5ce7',
      //   action: 'myProfile',
      // },
    ];

    // 콜백 함수들
    this.menuClickCallbacks = {};
  }

  /**
   * 게임 데이터 가져오기
   * @returns {Object} 게임 데이터
   */
  getGameData() {
    return this.storage.getItem();
  }

  /**
   * 게임 데이터 저장
   * @param {Object} gameData - 게임 데이터
   * @returns {boolean} 저장 성공 여부
   */
  saveGameData(gameData) {
    return this.storage.saveValue(gameData);
  }

  /**
   * 숫자를 천 단위 구분자로 포맷팅
   * @param {number} num - 숫자
   * @returns {string} 포맷된 문자열
   */
  formatNumber(num) {
    return num.toLocaleString('ko-KR');
  }

  /**
   * 시간을 읽기 쉬운 형태로 변환
   * @param {string} isoString - ISO 형식 시간 문자열
   * @returns {string} 변환된 시간 문자열
   */
  formatDateTime(isoString) {
    if (!isoString) return '기록 없음';

    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    // 1분 미만
    if (diff < 60000) {
      return '방금 전';
    }

    // 1시간 미만
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}분 전`;
    }

    // 24시간 미만
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }

    // 그 외는 날짜 표시
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 웰컴 팝업 HTML 생성
   * @param {Object} gameData - 게임 데이터
   * @param {string} nickName - 플레이어 닉네임
   * @returns {string} HTML 문자열
   */
  createWelcomePopupContent(gameData, nickName = '플레이어') {
    const lastPlayFormatted = this.formatDateTime(gameData.lastPlayTime);
    const hasRecord = gameData.bestScore > 0;

    return `
            <div class="welcome-container" style="padding: 10px; text-align: center;">
                <div class="welcome-header" style="margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎱</div>
                    <h2 style="margin: 0; color: #007bff;">볼풀 게임에 오신 걸 환영합니다!</h2>
                    <p style="margin: 10px 0; color: #666;">${nickName}님, 즐거운 게임 되세요!</p>
                </div>
                
                ${
                  hasRecord
                    ? `
                    <div class="best-records" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px;">🏆 나의 최고 기록</h3>
                        <div class="record-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
                            <div class="record-item">
                                <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${this.formatNumber(gameData.bestScore)}</div>
                                <div style="font-size: 12px; opacity: 0.8;">최고 점수</div>
                            </div>
                            <div class="record-item">
                                <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">Lv.${gameData.bestLevel}</div>
                                <div style="font-size: 12px; opacity: 0.8;">최고 레벨</div>
                            </div>
                        </div>
                        <div style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                            마지막 플레이: ${lastPlayFormatted}
                        </div>
                    </div>
                `
                    : `
                    <div class="first-play" style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #0066cc;">🌟 첫 게임을 시작해보세요!</h3>
                        <p style="margin: 0; color: #555; line-height: 1.5;">
                            볼을 합쳐서 더 큰 볼을 만들고<br>
                            높은 점수에 도전해보세요!
                        </p>
                    </div>
                `
                }
                
                <div class="game-tips" style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left;">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">💡 게임 팁</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #666; line-height: 1.6;">
                        <li>같은 숫자의 볼끼리 합치면 더 큰 볼이 됩니다</li>
                        <li>위험선(빨간 선)을 넘지 않도록 주의하세요</li>
                        <li>전략적으로 볼을 배치해서 연쇄 반응을 노려보세요</li>
                    </ul>
                </div>
            </div>
        `;
  }

  /**
   * 게임 종료 팝업 HTML 생성
   * @param {Object} gameResult - 게임 결과
   * @returns {string} HTML 문자열
   */
  createGameOverPopupContent(gameResult) {
    const {
      finalScore,
      finalLevel,
      ballsCreated,
      isNewBestScore,
      isNewBestLevel,
    } = gameResult;
    const gameData = this.getGameData();

    return `
            <div class="game-over-container" style="padding: 10px; text-align: center;">
                <div class="game-over-header" style="margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">
                        ${isNewBestScore || isNewBestLevel ? '🎉' : '😊'}
                    </div>
                    <h2 style="margin: 0; color: ${isNewBestScore ? '#28a745' : '#dc3545'};">
                        ${isNewBestScore || isNewBestLevel ? '새로운 기록 달성!' : '게임 오버'}
                    </h2>
                </div>
                
                <div class="game-results" style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #495057;">📊 게임 결과</h3>
                    <div class="result-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                        <div class="result-item">
                            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px; color: ${isNewBestScore ? '#28a745' : '#007bff'};">
                                ${this.formatNumber(finalScore)}
                                ${isNewBestScore ? ' 🆕' : ''}
                            </div>
                            <div style="font-size: 12px; color: #666;">최종 점수</div>
                        </div>
                        <div class="result-item">
                            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px; color: ${isNewBestLevel ? '#28a745' : '#007bff'};">
                                Lv.${finalLevel}
                                ${isNewBestLevel ? ' 🆕' : ''}
                            </div>
                            <div style="font-size: 12px; color: #666;">최종 레벨</div>
                        </div>
                        <div class="result-item">
                            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #6f42c1;">
                                ${this.formatNumber(ballsCreated)}
                            </div>
                            <div style="font-size: 12px; color: #666;">생성한 볼</div>
                        </div>
                    </div>
                </div>
                
                <div class="best-records" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #8b4513;">🏆 나의 최고 기록</h4>
                    <div style="display: flex; justify-content: space-around; text-align: center;">
                        <div>
                            <div style="font-size: 16px; font-weight: bold; color: #d2691e;">${this.formatNumber(gameData.bestScore)}</div>
                            <div style="font-size: 11px; color: #8b4513;">최고 점수</div>
                        </div>
                        <div>
                            <div style="font-size: 16px; font-weight: bold; color: #d2691e;">Lv.${gameData.bestLevel}</div>
                            <div style="font-size: 11px; color: #8b4513;">최고 레벨</div>
                        </div>
                    </div>
                </div>
                
                ${
                  isNewBestScore || isNewBestLevel
                    ? `
                    <div class="congratulations" style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <strong>🎊 축하합니다!</strong><br>
                        ${isNewBestScore ? '새로운 최고 점수를 달성했습니다! ' : ''}
                        ${isNewBestLevel ? '새로운 최고 레벨에 도달했습니다!' : ''}
                    </div>
                `
                    : ''
                }
                
                <div class="encouragement" style="font-size: 14px; color: #666; line-height: 1.5;">
                    ${
                      isNewBestScore || isNewBestLevel
                        ? '멋진 실력이네요! 더 높은 기록에 도전해보세요!'
                        : '좋은 게임이었어요! 다시 도전해서 더 높은 점수를 노려보세요!'
                    }
                </div>
            </div>
        `;
  }

  /**
   * 웰컴 팝업 표시
   * @param {string} nickName - 플레이어 닉네임
   * @param {Function} onStartGame - 게임 시작 콜백
   */
  showWelcomePopup(nickName = '플레이어', onStartGame = null) {
    const gameData = this.getGameData();

    this.currentPopup = this.popupManager.create({
      title: '🎱 볼풀 게임',
      content: this.createWelcomePopupContent(gameData, nickName),
      buttons: [
        {
          text: '게임 시작',
          class: 'primary',
          action: 'start',
          handler: () => {
            this.updatePlayTime();
            if (onStartGame) onStartGame();
            return true;
          },
        },
        {
          text: '나중에',
          class: 'secondary',
          action: 'later',
        },
      ],
      closeOnOverlayClick: false,
      onClose: () => {
        this.currentPopup = null;
      },
    });

    this.currentPopup.show();
  }

  /**
   * 게임 종료 팝업 표시
   * @param {Object} gameResult - 게임 결과
   * @param {Function} onRestart - 재시작 콜백
   * @param {Function} onMainMenu - 메인 메뉴 콜백
   */
  showGameOverPopup(gameResult, onRestart = null, onMainMenu = null) {
    // 게임 결과 저장
    const saveResult = this.saveGameResult(
      gameResult.finalScore,
      gameResult.finalLevel
    );
    gameResult.isNewBestScore = saveResult.newBestScore;
    gameResult.isNewBestLevel = saveResult.newBestLevel;

    this.currentPopup = this.popupManager.create({
      title:
        gameResult.isNewBestScore || gameResult.isNewBestLevel
          ? '🎉 새 기록!'
          : '😊 게임 종료',
      content: this.createGameOverPopupContent(gameResult),
      buttons: [
        {
          text: '다시하기',
          class: 'primary',
          action: 'restart',
          handler: () => {
            if (onRestart) onRestart();
            return true;
          },
        },
        {
          text: '메인으로',
          class: 'secondary',
          action: 'menu',
          handler: () => {
            if (onMainMenu) onMainMenu();
            return true;
          },
        },
      ],
      closeOnOverlayClick: false,
      onClose: () => {
        this.currentPopup.hide();
        this.currentPopup = null;
      },
    });

    this.currentPopup.show();
  }

  /**
   * 게임 결과 저장
   * @param {number} score - 최종 점수
   * @param {number} level - 최종 레벨
   * @returns {Object} 저장 결과 { newBestScore: boolean, newBestLevel: boolean }
   */
  saveGameResult(score, level) {
    const gameData = this.getGameData();
    const newBestScore = score > gameData.bestScore;
    const newBestLevel = level > gameData.bestLevel;

    const updateData = {
      lastPlayTime: new Date().toISOString(),
    };

    if (newBestScore) {
      updateData.bestScore = score;
    }

    if (newBestLevel) {
      updateData.bestLevel = level;
    }

    this.saveGameData(updateData);

    return { newBestScore, newBestLevel };
  }

  /**
   * 게임 플레이 시간 업데이트
   * @returns {boolean} 저장 성공 여부
   */
  updatePlayTime() {
    return this.saveGameData({
      lastPlayTime: new Date().toISOString(),
    });
  }

  /**
   * 최고 점수 가져오기
   * @returns {number} 최고 점수
   */
  getBestScore() {
    const gameData = this.getGameData();
    return gameData.bestScore;
  }

  /**
   * 최고 레벨 가져오기
   * @returns {number} 최고 레벨
   */
  getBestLevel() {
    const gameData = this.getGameData();
    return gameData.bestLevel;
  }

  /**
   * 게임 통계 가져오기
   * @returns {Object} 게임 통계
   */
  getGameStats() {
    const gameData = this.getGameData();
    return {
      bestScore: gameData.bestScore,
      bestLevel: gameData.bestLevel,
      lastPlayTime: gameData.lastPlayTime,
      lastPlayFormatted: this.formatDateTime(gameData.lastPlayTime),
      hasPlayed: gameData.bestScore > 0,
    };
  }

  /**
   * 설정 팝업 HTML 생성
   * @returns {string} HTML 문자열
   */
  createMenuPopupContent() {
    const menuItemsHtml = this.menuItems
      .map((item) => {
        return `
                <button 
                    class="settings-menu-item" 
                    data-action="${item.action}"
                    style="
                        width: 100%;
                        padding: 5px 10px;
                        margin-bottom: 12px;
                        background-color: #6c5ce7;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    "
                >
                    ${item.text}
                </button>
            `;
      })
      .join('');

    return `
            <div class="settings-container" style="padding: 10px;">
                <div class="settings-menu" style="display: flex; flex-direction: column;">
                    ${menuItemsHtml}
                </div>
            </div>
        `;
  }

  /**
   * 설정 팝업 표시
   */
  showMenuPopup(callbacks = {}) {
    this.currentPopup = this.popupManager.create({
      title: '메뉴',
      content: this.createMenuPopupContent(),
      closeOnOverlayClick: false,
      onClose: () => {
        this.currentPopup = null;
      },
    });
    this.menuClickCallbacks = callbacks;

    this.currentPopup.show();

    // 메뉴 클릭 이벤트 설정
    setTimeout(() => {
      this.setupMenuEvents();
    }, 100);
  }

  /**
   * 메뉴 클릭 이벤트 설정
   */
  setupMenuEvents() {
    const menuItems = document.querySelectorAll('.settings-menu-item');

    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleMenuAction(action);
      });
    });
  }

  /**
   * 메뉴 액션 처리
   * @param {string} action - 액션명
   */
  handleMenuAction(action) {
    // 팝업 닫기
    if (this.currentPopup) {
      this.currentPopup.hide();
    }
    this.menuClickCallbacks[action]();
    if (!this.menuClickCallbacks[action]) {
      console.warn(`No callback defined for action: ${action}`);
      return;
    }
  }
}

// 기본 export
export default BallPoolGameManager;
