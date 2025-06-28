// modules/debugInfo.js (initDebugValues 적용 버전)

import { gameCore } from './gameCore.js'; // gameCore 인스턴스를 import 합니다.

class DebugInfo {
  constructor() {
    this.isDebugMode = false;
    this.debugInfoElement = document.getElementById('debug-info');

    // 모든 디버그 정보를 담을 내부 상태 객체
    // initDebugValues 메서드의 반환 값을 할당하여 초기화합니다.
    this._debug = this.initDebugValues();

    this.initializeDebugMode();
  }

  // 디버그 초기값을 반환하는 메서드
  initDebugValues() {
    return {
      gestureState: 'N/A',
      x: 0, // 숫자로 초기화
      y: 0, // 숫자로 초기화
      scale: 1, // 숫자로 초기화
      imageDimensions: {
        naturalWidth: 'N/A',
        naturalHeight: 'N/A',
        containerWidth: 'N/A',
        containerHeight: 'N/A',
        renderedWidth: 'N/A',
        renderedHeight: 'N/A',
      },
      clickCoordinates: {
        containerX: 'N/A',
        containerY: 'N/A',
        renderedImageX: 'N/A',
        renderedImageY: 'N/A',
        originalImageX: 'N/A',
        originalImageY: 'N/A',
      },
      gameCore: {
        isGameStarted: false,
        remainingTime: 0,
      },
    };
  }

  initializeDebugMode() {
    this.toggleDebugMode(false);
  }

  /**
   * _debug 상태 객체의 현재 값을 JSON 문자열로 변환하여 DOM에 렌더링합니다.
   */
  renderDebugInfo() {
    if (!this.debugInfoElement) {
      console.warn(
        'Debug info element not found. Cannot render debug elements.'
      );
      return;
    }

    const debugJsonString = JSON.stringify(
      this._debug,
      (key, value) => {
        // 소수점 2자리로 제한하고 싶은 숫자 값에 대한 처리
        // imageDimensions 내부의 너비/높이 값은 정수이므로 toFixed 적용하지 않도록 예외 처리
        if (
          typeof value === 'number' &&
          key !== 'naturalWidth' &&
          key !== 'naturalHeight' &&
          key !== 'containerWidth' &&
          key !== 'containerHeight' &&
          key !== 'renderedWidth' &&
          key !== 'renderedHeight'
        ) {
          return parseFloat(value.toFixed(2));
        }
        return value;
      },
      2
    ); // 2칸 들여쓰기

    this.debugInfoElement.innerHTML = `
            <pre>${debugJsonString}</pre>
        `;
  }

  /**
   * 디버그 정보를 업데이트하고 _debug 상태 객체를 수정합니다.
   * @param {Object} info - 업데이트할 디버그 정보 객체
   * @param {ImageViewer|null} currentImageViewer - 현재 활성화된 ImageViewer 인스턴스
   */
  updateDebugInfo(info, currentImageViewer = null) {
    if (!this.isDebugMode) {
      return;
    }

    // _debug 상태 객체를 업데이트합니다.
    this._debug.gestureState = info.gestureState || 'N/A';
    this._debug.x = info.x !== undefined ? info.x : 0;
    this._debug.y = info.y !== undefined ? info.y : 0;
    this._debug.scale = info.scale !== undefined ? info.scale : 1;

    if (currentImageViewer) {
      const img = currentImageViewer.image;
      const container = currentImageViewer.container;
      const { renderedWidth, renderedHeight } =
        currentImageViewer.getRenderedImageDimensions();

      this._debug.imageDimensions.naturalWidth = img.naturalWidth || 'N/A';
      this._debug.imageDimensions.naturalHeight = img.naturalHeight || 'N/A';
      this._debug.imageDimensions.containerWidth =
        container.offsetWidth || 'N/A';
      this._debug.imageDimensions.containerHeight =
        container.offsetHeight || 'N/A';
      this._debug.imageDimensions.renderedWidth = renderedWidth || 'N/A';
      this._debug.imageDimensions.renderedHeight = renderedHeight || 'N/A';
    } else {
      this._debug.imageDimensions.naturalWidth = 'N/A';
      this._debug.imageDimensions.naturalHeight = 'N/A';
      this._debug.imageDimensions.containerWidth = 'N/A';
      this._debug.imageDimensions.containerHeight = 'N/A';
      this._debug.imageDimensions.renderedWidth = 'N/A';
      this._debug.imageDimensions.renderedHeight = 'N/A';
    }

    if (info.clickCoords) {
      this._debug.clickCoordinates.containerX = info.clickCoords.containerX;
      this._debug.clickCoordinates.containerY = info.clickCoords.containerY;
      this._debug.clickCoordinates.renderedImageX =
        info.clickCoords.renderedImageX;
      this._debug.clickCoordinates.renderedImageY =
        info.clickCoords.renderedImageY;
      this._debug.clickCoordinates.originalImageX =
        info.clickCoords.originalImageX;
      this._debug.clickCoordinates.originalImageY =
        info.clickCoords.originalImageY;
    } else {
      this._debug.clickCoordinates.containerX = 'N/A';
      this._debug.clickCoordinates.containerY = 'N/A';
      this._debug.clickCoordinates.renderedImageX = 'N/A';
      this._debug.clickCoordinates.renderedImageY = 'N/A';
      this._debug.clickCoordinates.originalImageX = 'N/A';
      this._debug.clickCoordinates.originalImageY = 'N/A';
    }

    // gameCore 모듈의 싱글톤 인스턴스를 통해 게임 상태를 가져옵니다.
    const gameState = gameCore.getGameState();
    this._debug.gameCore.isGameStarted =
      gameState.isGameStarted !== undefined ? gameState.isGameStarted : false;
    this._debug.gameCore.remainingTime =
      gameState.remainingTime !== undefined ? gameState.remainingTime : 0;

    // 상태 객체가 업데이트되었으니, DOM을 다시 렌더링합니다.
    this.renderDebugInfo();
  }

  toggleDebugMode(forceState) {
    if (typeof forceState === 'boolean') {
      this.isDebugMode = forceState;
    } else {
      this.isDebugMode = !this.isDebugMode;
    }

    if (this.debugInfoElement) {
      if (this.isDebugMode) {
        // 디버그 모드가 활성화되면, 초기화된 값으로 DOM을 렌더링
        this.renderDebugInfo();
      }

      this.debugInfoElement.classList.toggle('active', this.isDebugMode);

      if (!this.isDebugMode) {
        // 디버그 모드 비활성화 시 _debug 상태를 초기화 메서드를 통해 리셋하고 DOM을 다시 렌더링
        this._debug = this.initDebugValues(); // 초기화 메서드 호출
        this.renderDebugInfo(); // 초기화된 상태를 DOM에 반영
      }
    }
    console.log(`디버그 모드: ${this.isDebugMode ? '활성화' : '비활성화'}`);
  }
}

export const debugInfo = new DebugInfo();
