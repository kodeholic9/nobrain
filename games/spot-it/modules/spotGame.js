// modules/spotGame.js

import { ImageViewer } from './imageViewer.js';
import { debugInfo } from './debugInfo.js';
import { gameCore } from './gameCore.js';
import SpotChecker from './spotChecker.js'; // SpotChecker 클래스 import
//import { Hammer } from '../../libs/hammer.min.js';

const allSpotsData = [
  {
    ruleId: 1,
    originImage: 'https://www.jjangnan.xyz/images/1_1.jpg',
    variantImage: 'https://www.jjangnan.xyz/images/1_2.jpg',
    spots: [
      {
        circles: [
          { centerX: 309, centerY: 378, radius: 20 },
          { centerX: 291, centerY: 389, radius: 20 },
        ],
      },
      {
        circles: [
          { centerX: 344, centerY: 356, radius: 15 },
          { centerX: 372, centerY: 335, radius: 15 },
          { centerX: 382, centerY: 288, radius: 15 },
        ],
      },
      {
        circles: [{ centerX: 434, centerY: 122, radius: 25 }],
      },
    ],
  },
  {
    ruleId: 2,
    originImage: 'https://www.jjangnan.xyz/images/2_1.jpg',
    variantImage: 'https://www.jjangnan.xyz/images/2_2.jpg',
    spots: [
      { circles: [{ centerX: 100, centerY: 100, radius: 25 }] },
      { circles: [{ centerX: 120, centerY: 100, radius: 20 }] },
    ],
  },
];

class SpotGame {
  constructor() {
    this.imageViewerLeft = null;
    this.imageViewerRight = null;
    this.spotChecker = null; // SpotChecker 인스턴스

    // 뷰어에서 발생하는 이벤트 리스너 바인딩
    this.handleViewerTransformUpdatedBound =
      this.handleViewerTransformUpdated.bind(this);
  }

  /**
   * 주어진 이미지 요소와 컨테이너에 ImageViewer를 설정하고 초기화합니다.
   * @param {HTMLImageElement} imageElement - 대상 이미지 요소
   * @param {HTMLElement} containerElement - 이미지 컨테이너 요소
   * @param {string} viewerId - 이 뷰어의 고유 ID (예: 'image-container-left')
   * @returns {Promise<ImageViewer>} ImageViewer 인스턴스를 resolve하는 Promise
   */
  async setupImageViewerForGame(
    imageElement,
    containerElement,
    viewerId,
    options
  ) {
    return new Promise((resolve) => {
      const setImageContainerHeightAndInitViewer = () => {
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

        const viewer = new ImageViewer(
          imageElement,
          containerElement,
          // 디버그 콜백
          (info) => debugInfo.updateDebugInfo(info, viewer),
          // 미러링 콜백: 다른 뷰어의 상태를 동기화
          (state) => {
            // 미러링 대상이 되는 뷰어가 있어야만 동작
            if (viewerId === 'image-container-left' && this.imageViewerRight) {
              this.imageViewerRight.setState(state);
            } else if (
              viewerId === 'image-container-right' &&
              this.imageViewerLeft
            ) {
              this.imageViewerLeft.setState(state);
            }
          },
          options
        );
        resolve(viewer);
      };

      if (imageElement.complete && imageElement.naturalWidth > 0) {
        setImageContainerHeightAndInitViewer();
      } else {
        imageElement.addEventListener(
          'load',
          setImageContainerHeightAndInitViewer,
          {
            once: true,
          }
        );
        imageElement.addEventListener(
          'error',
          () => {
            console.error(
              `Error loading image: ${imageElement.src}. Attempting to set height with fallback.`
            );
            setImageContainerHeightAndInitViewer();
          },
          { once: true }
        );
      }
    });
  }

  /**
   * 제스처를 ImageViewer 인스턴스에 바인딩합니다.
   * @param {ImageViewer} viewer - 대상 ImageViewer 인스턴스
   * @param {HTMLElement} container - 제스처를 감지할 컨테이너 요소
   * @param {string} viewerId - 해당 뷰어의 ID ('image-container-left' or 'image-container-right')
   */
  bindGesturesForGame(viewer, container, viewerId) {
    const hammer = new Hammer(container);

    const isGestureAllowed = () => {
      const { isGameStarted, isGameEnded } = gameCore.getGameState();
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
        // ImageViewer의 click 메소드를 호출하여 좌표 변환 및 'viewerClick' 이벤트 발생시킴
        viewer.click(e.center.x, e.center.y);

        // spot 판별을 위해 클릭 좌표를 원본 이미지 좌표로 변환
        const coords = viewer.getOriginalImageCoordinates(
          e.center.x,
          e.center.y
        );
        this.checkSpot(coords); // SpotChecker를 통해 스팟 판별
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

    // ImageViewer가 발생시키는 'viewerTransformUpdated' 이벤트를 수신 (스팟 재그리기용)
    container.addEventListener(
      'viewerTransformUpdated',
      this.handleViewerTransformUpdatedBound
    );
  }

  /**
   * SpotGame (틀린 그림 찾기 게임)을 초기화하는 메인 함수.
   */
  async initializeSpotGame() {
    const imageElementLeft = document.getElementById('target-image-left');
    const imageContainerLeft = document.getElementById('image-container-left');
    const imageElementRight = document.getElementById('target-image-right');
    const imageContainerRight = document.getElementById(
      'image-container-right'
    );

    this.imageViewerLeft = await this.setupImageViewerForGame(
      imageElementLeft,
      imageContainerLeft,
      'image-container-left',
      { minScale: 1, maxScale: 3 }
    );

    this.imageViewerRight = await this.setupImageViewerForGame(
      imageElementRight,
      imageContainerRight,
      'image-container-right',
      { minScale: 1, maxScale: 3 }
    );

    this.bindGesturesForGame(
      this.imageViewerLeft,
      imageContainerLeft,
      'image-container-left'
    );
    this.bindGesturesForGame(
      this.imageViewerRight,
      imageContainerRight,
      'image-container-right'
    );

    console.log('SpotGame 초기화 완료. 이미지 뷰어 및 제스처 바인딩 완료.');

    // 게임 코어 이벤트 리스너 등록
    gameCore.addGameEventListener('onGameReset', () => {
      // 게임 리셋 시 뷰어 상태 초기화
      if (this.imageViewerLeft) {
        this.imageViewerLeft.reset();
      }
      if (this.imageViewerRight) {
        this.imageViewerRight.reset();
      }
      // SpotChecker 리셋
      if (this.spotChecker) {
        this.spotChecker.reset({ spots: [] }); // 빈 스팟으로 초기화
      }
      debugInfo.updateDebugInfo({
        currentRuleId: 'N/A',
        totalSpots: 0,
        foundSpots: 0,
      }); // 디버그 정보 초기화
      console.log(
        'SpotGame: 게임 리셋 이벤트 처리 - 뷰어 및 스팟 데이터 초기화'
      );
    });

    gameCore.addGameEventListener('onGameStart', (detail) => {
      const currentRule = allSpotsData.find(
        (rule) => rule.ruleId === detail.ruleId
      );
      if (currentRule) {
        // SpotChecker 인스턴스 생성 또는 재활용 및 초기화
        // SpotChecker는 판별만 담당하므로 ruleData만 넘김
        if (!this.spotChecker) {
          this.spotChecker = new SpotChecker(currentRule);
        } else {
          this.spotChecker.reset(currentRule);
        }

        // 이미지 뷰어에 이미지 로드
        this.imageViewerLeft.loadImage(currentRule.originImage);
        this.imageViewerRight.loadImage(currentRule.variantImage);

        // 이미지 뷰어에 스팟 데이터 설정 (뷰어는 이제 그릴 스팟 데이터를 직접 가짐)
        this.imageViewerLeft.setSpotsData(currentRule.spots);
        this.imageViewerRight.setSpotsData(currentRule.spots);

        debugInfo.updateDebugInfo({
          currentRuleId: detail.ruleId,
          totalSpots: currentRule.spots.length,
          foundSpots: 0,
        });
        console.log(
          `SpotGame: 게임 시작 이벤트 처리 - Rule ID: ${detail.ruleId}`
        );
      } else {
        console.error(
          `SpotGame: Rule ID ${detail.ruleId} not found for game start.`
        );
      }
    });

    gameCore.addGameEventListener('onGameEnd', (detail) => {
      console.log(
        `SpotGame: 게임 종료 이벤트 처리 - 성공: ${detail.success}, 이유: ${detail.reason}`
      );
      // 게임 종료 시 모든 스팟을 발견된 상태로 표시
      if (detail.success && this.spotChecker) {
        // SpotChecker 내부의 foundSpotsStatus를 모두 true로 설정 (강제로)
        this.spotChecker.foundSpotsStatus.fill(true);
        this.imageViewerLeft.redrawSpots(); // 모든 스팟을 다시 그리도록 요청
        this.imageViewerRight.redrawSpots();
      }
    });
  }

  /**
   * spot 판별을 위한 클릭 좌표를 확인합니다.
   * @param {*} coords
   * @returns
   */
  checkSpot(coords) {
    // 게임이 시작되지 않았거나 종료되었다면 클릭 처리하지 않음
    if (
      !gameCore.getGameState().isGameStarted ||
      gameCore.getGameState().isGameEnded
    ) {
      return;
    }
    if (!this.spotChecker) {
      console.warn('SpotGame: SpotChecker not initialized for click check.');
      gameCore.wrongClick();
      return;
    }
    // SpotChecker에게 클릭 좌표를 전달하여 스팟 판별을 요청
    const checkResult = this.spotChecker.checkSpot(
      coords.originalImageX,
      coords.originalImageY
    );
    console.log(
      `SpotGame: Click at (${coords.originalImageX}, ${coords.originalImageY})`
    );

    if (checkResult.isCorrect) {
      console.log(`SpotGame: Correct spot found! Index: ${checkResult.index}`);
      // 양쪽 뷰어 모두에게 해당 스팟을 "발견됨"으로 표시하고 그리도록 명령
      this.imageViewerLeft.markSpotAsFound(checkResult.index);
      this.imageViewerRight.markSpotAsFound(checkResult.index); // 양쪽 뷰어 모두에게 스팟 발견 알림
      const numFoundSpots = this.spotChecker.getFoundSpotCount();
      debugInfo.updateDebugInfo({
        foundSpotIndex: checkResult.index,
        foundSpots: numFoundSpots,
        totalSpots: this.spotChecker.ruleData.spots.length,
      });
      gameCore.spotFound(checkResult.index, numFoundSpots); // gameCore에 스팟 발견 이벤트 알림
      if (this.spotChecker.areAllSpotsFound()) {
        gameCore.gameEnd(true, 'All spots found'); // 모든 스팟 발견 시 게임 종료
      }
    } else {
      console.log('SpotGame: Wrong click!');
      gameCore.wrongClick(); // gameCore에 오답 클릭 이벤트 알림
    }
  }

  /**
   * ImageViewer에서 이미지 변환(pan, zoom)이 발생했을 때 호출되는 핸들러.
   * 양쪽 뷰어에게 스팟을 다시 그리도록 요청합니다.
   * @param {CustomEvent} event - viewerTransformUpdated 커스텀 이벤트 객체
   */
  handleViewerTransformUpdated(event) {
    // 게임 중이 아닐 때는 스팟을 다시 그릴 필요 없음
    if (
      !gameCore.getGameState().isGameStarted ||
      gameCore.getGameState().isGameEnded
    ) {
      return;
    }

    // 특정 뷰어가 변환되면, 양쪽 뷰어 모두에게 스팟을 다시 그리도록 요청
    // 각 뷰어가 자신의 캔버스에 이미 발견된 스팟들을 다시 그릴 것임
    if (this.imageViewerLeft) {
      this.imageViewerLeft.redrawSpots();
    }
    if (this.imageViewerRight) {
      this.imageViewerRight.redrawSpots();
    }
  }

  /**
   * 모든 스팟을 다시 그립니다.
   */
  drawAllSpots() {
    // 모든 스팟을 다시 그리는 메서드
    if (this.imageViewerLeft) {
      this.imageViewerLeft.drawAllSpots();
    }
    if (this.imageViewerRight) {
      this.imageViewerRight.drawAllSpots();
    }
  }
}

export const spotGame = new SpotGame(); // 싱글톤 인스턴스 내보내기
