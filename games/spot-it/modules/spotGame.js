// modules/spotGame.js

import { ImageViewer } from './imageViewer.js'; // ImageViewer 클래스 자체를 import
import { debugInfo } from './debugInfo.js'; // debugInfo 싱글톤 인스턴스 import
import { gameCore } from './gameCore.js'; // gameCore 싱글톤 인스턴스 import
// import { Hammer } from '../../libs/hammer.min.js'; // Hammer.js 라이브러리 import

const allSpotsData = [
  {
    ruleId: 1,
    originImage: 'https://jjangnan.xyz/images/1_1.png',
    variantImage: 'https://jjangnan.xyz/images/1_2.png',
    spots: [
      {
        // spotIndex: 0
        circles: [{ centerX: 72, centerY: 84, radius: 20 }],
      },
      {
        // spotIndex: 1
        circles: [
          { centerX: 200, centerY: 150, radiusX: 30, radiusY: 15 }, // 타원 예시
        ],
      },
      {
        // spotIndex: 2
        circles: [{ centerX: 400, centerY: 300, radius: 15 }],
      },
      // ... 더 많은 스팟들
    ],
  },
  {
    ruleId: 2,
    originImage: 'https://jjangnan.xyz/images/2_1.png',
    variantImage: 'https://jjangnan.xyz/images/2_2.png',
    spots: [
      {
        // spotIndex: 0
        circles: [
          { centerX: 100, centerY: 100, radius: 25 },
          { centerX: 120, centerY: 100, radius: 20 }, // 복수 서클 예시
        ],
      },
    ],
  },
  // ... 다른 ruleId (게임 라운드/단계)
];

class SpotGame {
  constructor() {
    this.imageViewerLeft = null;
    this.imageViewerRight = null;
  }

  /**
   * 주어진 이미지 요소와 컨테이너에 ImageViewer를 설정하고 초기화합니다.
   * @param {HTMLImageElement} imageElement - 대상 이미지 요소
   * @param {HTMLElement} containerElement - 이미지 컨테이너 요소
   * @param {Function} onStateChangeCallback - 상태 변경 알림 콜백 (미러링용)
   * @param {Object} options - ImageViewer에 전달할 옵션 (minScale, maxScale 등)
   * @returns {Promise<ImageViewer>} ImageViewer 인스턴스를 resolve하는 Promise
   */
  async setupImageViewerForGame(
    imageElement,
    containerElement,
    onStateChangeCallback,
    options
  ) {
    return new Promise((resolve) => {
      const setImageContainerHeight = () => {
        if (
          imageElement.naturalWidth === 0 ||
          imageElement.naturalHeight === 0
        ) {
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

        // debugInfo의 updateDebugInfo 메서드 호출 시 현재 뷰어를 전달
        const viewer = new ImageViewer(
          imageElement,
          containerElement,
          (info) => debugInfo.updateDebugInfo(info, viewer),
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
  bindGesturesForGame(viewer, container) {
    const hammer = new Hammer(container);

    // 제스처 활성화 여부를 게임 상태에 따라 결정하는 헬퍼 함수
    const isGestureAllowed = () => {
      const { isGameStarted, isGameEnded } = gameCore.getGameState(); // gameCore 인스턴스 사용
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
      // 디버그 정보 업데이트 (여기서는 pinch 이벤트가 발생할 때마다 뷰어 상태 업데이트가 일어나므로 필요 없을 수 있지만, 명시적으로 추가)
      // debugInfo.updateDebugInfo(viewer.getState(), viewer);
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
        // 클릭 이벤트 처리 및 디버그 정보 업데이트
        viewer.click(e.center.x, e.center.y);
        // TODO: 여기에 게임 로직 추가: 스팟 확인 등
        console.log(`클릭 발생! (게임 중)`);
        // 예: this.checkSpot(e.center.x, e.center.y, viewer);
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
  async initializeSpotGame() {
    // 게임 코어 초기화 (SpotGame 클래스 내에서 초기화하거나, 외부에서 미리 초기화할 수 있음)
    // 여기서는 SpotGame 초기화 시점에 GameCore도 초기화하는 것이 자연스러움.
    gameCore.initializeGameCore();

    // 이미지 뷰어 관련 DOM 요소 참조
    const imageElementLeft = document.getElementById('target-image-left');
    const imageContainerLeft = document.getElementById('image-container-left');
    const imageElementRight = document.getElementById('target-image-right');
    const imageContainerRight = document.getElementById(
      'image-container-right'
    );

    // 이미지 뷰어 초기화
    this.imageViewerLeft = await this.setupImageViewerForGame(
      imageElementLeft,
      imageContainerLeft,
      (state) => {
        if (this.imageViewerRight) {
          this.imageViewerRight.setState(state);
        }
      },
      { minScale: 1, maxScale: 3 }
    );

    this.imageViewerRight = await this.setupImageViewerForGame(
      imageElementRight,
      imageContainerRight,
      (state) => {
        if (this.imageViewerLeft) {
          this.imageViewerLeft.setState(state);
        }
      },
      { minScale: 1, maxScale: 3 }
    );

    this.bindGesturesForGame(this.imageViewerLeft, imageContainerLeft);
    this.bindGesturesForGame(this.imageViewerRight, imageContainerRight);

    // 디버그 정보 패널 너비 조정 (이 로직은 그대로 유지)
    const leftWidth = imageContainerLeft.offsetWidth;
    const rightWidth = imageContainerRight.offsetWidth;
    const gap = 2;
    const borderThickness = 1;
    const totalCalculatedWidth =
      leftWidth + rightWidth + gap + borderThickness * 4;
    console.log('SpotGame 초기화 완료. 이미지 뷰어 및 제스처 바인딩 완료.');

    // 게임 코어 이벤트 리스너 등록
    gameCore.addGameEventListener('onGameReset', () => {
      // 게임 리셋 시 이미지 뷰어 상태 초기화
      if (this.imageViewerLeft) {
        this.imageViewerLeft.setState({ x: 0, y: 0, scale: 1 }, true);
        this.imageViewerLeft.centerImage();
        this.imageViewerLeft.updateImageTransform();
      }
      if (this.imageViewerRight) {
        this.imageViewerRight.setState({ x: 0, y: 0, scale: 1 }, true);
        this.imageViewerRight.centerImage();
        this.imageViewerRight.updateImageTransform();
      }
      console.log('SpotGame: 게임 리셋 이벤트 처리 - 뷰어 초기화');
    });

    gameCore.addGameEventListener('onGameEnd', (success) => {
      // 게임 종료 시 추가적인 SpotGame 관련 처리
      console.log(`SpotGame: 게임 종료 이벤트 처리 - 성공: ${success}`);
      // 예: 모든 제스처 비활성화 또는 클릭 스팟 강조 표시
    });
  }

  // TODO: 틀린 스팟 데이터를 정의하고, 클릭 시 스팟을 판별하는 로직은 여기에 추가됩니다.
  // checkSpot(clientX, clientY, viewer) { ... }
}

export const spotGame = new SpotGame(); // 싱글톤 인스턴스 내보내기
