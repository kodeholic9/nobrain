// modules/spotGame.js

import { ImageViewer } from './imageViewer.js';
import { updateDebugInfo } from './debugInfo.js'; // 디버그 토글은 script.js에서 관리
import {
  initializeGameCore,
  getGameState,
  addGameEventListener,
  startGame,
  endGame,
  resetGame,
} from './gameCore.js'; // !!! 변경: gameCore 모듈 임포트 !!!

// ImageViewer 인스턴스 (전역에서 접근 가능하도록)
let imageViewerLeft;
let imageViewerRight;

/**
 * 주어진 이미지 요소와 컨테이너에 ImageViewer를 설정하고 초기화합니다.
 * @param {HTMLImageElement} imageElement - 대상 이미지 요소
 * @param {HTMLElement} containerElement - 이미지 컨테이너 요소
 * @param {Function} onStateChangeCallback - 상태 변경 알림 콜백 (미러링용)
 * @param {Object} options - ImageViewer에 전달할 옵션 (minScale, maxScale 등)
 * @returns {Promise<ImageViewer>} ImageViewer 인스턴스를 resolve하는 Promise
 */
function setupImageViewerForGame(
  imageElement,
  containerElement,
  onStateChangeCallback,
  options
) {
  return new Promise((resolve) => {
    const setImageContainerHeight = () => {
      if (imageElement.naturalWidth === 0 || imageElement.naturalHeight === 0) {
        console.warn(
          `이미지 '${imageElement.src}'의 자연 크기가 0입니다. 로딩 상태를 확인하거나 폴백 크기를 적용합니다.`
        );
        containerElement.style.height = `${containerElement.offsetWidth * (3 / 4)}px`;
      } else {
        const imageAspectRatio =
          imageElement.naturalWidth / imageElement.naturalHeight;
        const containerWidth = containerElement.offsetWidth;
        const calculatedHeight = containerWidth / imageAspectRatio;

        containerElement.style.height = `${calculatedHeight}px`;
      }

      const viewer = new ImageViewer(
        imageElement,
        containerElement,
        (info) => updateDebugInfo(info, viewer),
        onStateChangeCallback,
        options
      );
      resolve(viewer);
    };

    if (imageElement.complete && imageElement.naturalWidth > 0) {
      setImageContainerHeight();
    } else {
      imageElement.addEventListener('load', setImageContainerHeight, {
        once: true,
      });
      imageElement.addEventListener(
        'error',
        () => {
          console.error(
            `Error loading image: ${imageElement.src}. Attempting to set height with fallback.`
          );
          setImageContainerHeight();
        },
        { once: true }
      );
    }

    window.addEventListener('resize', setImageContainerHeight);
  });
}

/**
 * 제스처를 ImageViewer 인스턴스에 바인딩합니다.
 * @param {ImageViewer} viewer - 대상 ImageViewer 인스턴스
 * @param {HTMLElement} container - 제스처를 감지할 컨테이너 요소
 */
function bindGesturesForGame(viewer, container) {
  const hammer = new Hammer(container);

  // 제스처 활성화 여부를 게임 상태에 따라 결정하는 헬퍼 함수
  const isGestureAllowed = () => {
    const { isGameStarted, isGameEnded } = getGameState();
    return isGameStarted && !isGameEnded;
  };

  hammer.on('panstart', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.startPan();
    }
  });
  hammer.on('panmove', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.pan(e.deltaX, e.deltaY);
    }
  });
  hammer.on('panend', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.endPan();
    }
  });

  hammer.get('pinch').set({ enable: true });
  hammer.on('pinchstart', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.startPinch();
    }
  });
  hammer.on('pinchmove', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.pinch(e.scale, e.center);
    }
  });
  hammer.on('pinchend', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.endPinch();
    }
  });

  hammer.on('tap', (e) => {
    e.preventDefault();
    if (isGestureAllowed()) {
      viewer.click(e.center.x, e.center.y);
      // TODO: 여기에 게임 로직 추가: 스팟 확인 등
      console.log(`클릭 발생! (게임 중)`);
      // 예: checkSpot(e.center.x, e.center.y, viewer);
    } else {
      console.log(`클릭 발생! (게임 미시작 또는 종료됨)`);
    }
  });

  container.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (isGestureAllowed()) {
        const clientX = e.clientX;
        const clientY = e.clientY;
        viewer.wheelZoom(e.deltaY, clientX, clientY);
      }
    },
    { passive: false }
  );
}

/**
 * SpotGame (틀린 그림 찾기 게임)을 초기화하는 메인 함수.
 * 이 함수는 script.js에서 호출될 것입니다.
 */
export async function initializeSpotGame() {
  // 이미지 뷰어 관련 DOM 요소 참조
  const imageElementLeft = document.getElementById('target-image-left');
  const imageContainerLeft = document.getElementById('image-container-left');
  const imageElementRight = document.getElementById('target-image-right');
  const imageContainerRight = document.getElementById('image-container-right');

  // 이미지 뷰어 초기화
  imageViewerLeft = await setupImageViewerForGame(
    imageElementLeft,
    imageContainerLeft,
    (state) => {
      if (imageViewerRight) {
        imageViewerRight.setState(state);
      }
    },
    { minScale: 1, maxScale: 3 }
  );

  imageViewerRight = await setupImageViewerForGame(
    imageElementRight,
    imageContainerRight,
    (state) => {
      if (imageViewerLeft) {
        imageViewerLeft.setState(state);
      }
    },
    { minScale: 1, maxScale: 3 }
  );

  bindGesturesForGame(imageViewerLeft, imageContainerLeft);
  bindGesturesForGame(imageViewerRight, imageContainerRight);

  // 디버그 정보 패널 너비 조정 (이 로직은 그대로 유지)
  const leftWidth = imageContainerLeft.offsetWidth;
  const rightWidth = imageContainerRight.offsetWidth;
  const gap = 2;
  const borderThickness = 1;
  const totalCalculatedWidth =
    leftWidth + rightWidth + gap + borderThickness * 4;
  const debugInfoPanel = document.getElementById('debug-info');
  if (debugInfoPanel) {
    debugInfoPanel.style.width = `${totalCalculatedWidth}px`;
  }

  console.log('SpotGame 초기화 완료. 이미지 뷰어 및 제스처 바인딩 완료.');

  // 게임 코어 이벤트 리스너 등록
  addGameEventListener('onGameReset', () => {
    // 게임 리셋 시 이미지 뷰어 상태 초기화
    if (imageViewerLeft) {
      imageViewerLeft.setState({ x: 0, y: 0, scale: 1 }, true);
      imageViewerLeft.centerImage();
      imageViewerLeft.updateImageTransform();
    }
    if (imageViewerRight) {
      imageViewerRight.setState({ x: 0, y: 0, scale: 1 }, true);
      imageViewerRight.centerImage();
      imageViewerRight.updateImageTransform();
    }
    console.log('SpotGame: 게임 리셋 이벤트 처리 - 뷰어 초기화');
  });

  addGameEventListener('onGameEnd', (success) => {
    // 게임 종료 시 추가적인 SpotGame 관련 처리
    console.log(`SpotGame: 게임 종료 이벤트 처리 - 성공: ${success}`);
    // 예: 모든 제스처 비활성화 또는 클릭 스팟 강조 표시
  });
}

// TODO: 틀린 스팟 데이터를 정의하고, 클릭 시 스팟을 판별하는 로직은 여기에 추가됩니다.
// function checkSpot(clientX, clientY, viewer) { ... }
