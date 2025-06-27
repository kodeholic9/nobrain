// script.js
import { ImageViewer } from './modules/imageViewer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 왼쪽 뷰어 요소
  const imageElementLeft = document.getElementById('target-image-left');
  const imageContainerLeft = document.getElementById('image-container-left');

  // 오른쪽 뷰어 요소
  const imageElementRight = document.getElementById('target-image-right');
  const imageContainerRight = document.getElementById('image-container-right');

  // 디버그 정보 UI 요소
  const debugState = document.getElementById('gesture-state');
  const debugX = document.getElementById('debug-x');
  const debugY = document.getElementById('debug-y');
  const debugMovement = document.getElementById('debug-movement');
  const debugScale = document.getElementById('debug-scale');
  const debugDistance = document.getElementById('debug-distance');
  const debugClickCount = document.getElementById('debug-click-count');

  let clickCount = 0; // 클릭 횟수 추적

  // 디버그 정보를 업데이트하는 콜백 함수
  const updateDebugInfo = (info) => {
    debugState.textContent = info.gestureState || '대기 중';
    debugX.textContent = info.x ? info.x.toFixed(2) : '0';
    debugY.textContent = info.y ? info.y.toFixed(2) : '0';
    debugScale.textContent = info.scale ? info.scale.toFixed(2) : '1';

    debugMovement.textContent = `${info.mx ? info.mx.toFixed(2) : 0}, ${info.my ? info.my.toFixed(2) : 0}`;
    debugDistance.textContent = info.distance ? info.distance.toFixed(2) : '0';

    if (info.gestureState === 'click') {
      clickCount++;
      debugClickCount.textContent = clickCount;
    }
  };

  // ImageViewer 인스턴스 (초기에는 undefined)
  let imageViewerLeft;
  let imageViewerRight;

  /**
   * 이미지가 로드된 후 컨테이너 높이를 설정하고 ImageViewer를 초기화하는 함수
   * CSS가 컨테이너의 width를 정의하고, JS는 height만 이미지 비율에 맞춰 설정
   * @param {HTMLImageElement} imageElement - 대상 이미지 요소
   * @param {HTMLElement} containerElement - 이미지 컨테이너 요소
   * @param {Function} debugCallback - 디버그 정보 업데이트 콜백
   * @param {Function} onStateChangeCallback - 상태 변경 알림 콜백 (미러링용)
   * @param {Object} options - ImageViewer에 전달할 옵션 (minScale, maxScale 등)
   * @returns {Promise<ImageViewer>} ImageViewer 인스턴스를 resolve하는 Promise
   */
  function setupImageViewer(
    imageElement,
    containerElement,
    debugCallback,
    onStateChangeCallback,
    options
  ) {
    return new Promise((resolve) => {
      const setImageContainerHeight = () => {
        // 이미지가 아직 로드되지 않았거나 (0x0), 오류 상태일 경우 대비
        if (
          imageElement.naturalWidth === 0 ||
          imageElement.naturalHeight === 0
        ) {
          console.warn(
            `이미지 '${imageElement.src}'의 자연 크기가 0입니다. 로딩 상태를 확인하거나 폴백 크기를 적용합니다.`
          );
          // Fallback height (예: 컨테이너의 현재 너비에 4:3 비율 적용)
          containerElement.style.height = `${containerElement.offsetWidth * (3 / 4)}px`;
          console.log(
            `폴백 컨테이너 높이 설정됨: ${containerElement.offsetWidth}x${containerElement.style.height}`
          );
        } else {
          const imageAspectRatio =
            imageElement.naturalWidth / imageElement.naturalHeight;
          // !!! 변경: CSS에 의해 결정된 컨테이너의 현재 너비를 가져옵니다. !!!
          const containerWidth = containerElement.offsetWidth;
          const calculatedHeight = containerWidth / imageAspectRatio;

          containerElement.style.height = `${calculatedHeight}px`;
          console.log(
            `컨테이너 '${containerElement.id}' 높이 설정됨: ${containerWidth}x${calculatedHeight.toFixed(2)} (원본 ${imageElement.naturalWidth}x${imageElement.naturalHeight})`
          );
        }

        // ImageViewer 인스턴스 생성 및 반환
        const viewer = new ImageViewer(
          imageElement,
          containerElement,
          debugCallback,
          onStateChangeCallback,
          options
        );
        resolve(viewer);
      };

      // 이미지가 로드된 후 또는 이미 캐시된 경우 높이 설정
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
            setImageContainerHeight(); // 에러 시에도 높이 설정 시도 (폴백 로직 포함)
          },
          { once: true }
        );
      }

      // !!! 추가: 뷰포트 크기 변경 시에도 컨테이너 높이 재설정 !!!
      // CSS의 width가 바뀌면 offsetWidth도 바뀌므로 height를 재계산해야 함
      window.addEventListener('resize', setImageContainerHeight);
    });
  }

  async function initializeAllViewers() {
    // 옵션에는 더 이상 width 관련 값을 전달할 필요 없음 (CSS가 담당)
    // (minScale, maxScale은 imageViewer.js에 전달)
    imageViewerLeft = await setupImageViewer(
      imageElementLeft,
      imageContainerLeft,
      updateDebugInfo,
      (state) => {
        if (imageViewerRight) {
          imageViewerRight.setState(state);
        }
      },
      { minScale: 1, maxScale: 3 }
    );

    imageViewerRight = await setupImageViewer(
      imageElementRight,
      imageContainerRight,
      updateDebugInfo,
      (state) => {
        if (imageViewerLeft) {
          imageViewerLeft.setState(state);
        }
      },
      { minScale: 1, maxScale: 3 }
    );

    bindGestures(imageViewerLeft, imageContainerLeft);
    bindGestures(imageViewerRight, imageContainerRight);

    // 디버그 정보 패널 너비 조정 (이 부분은 CSS가 이미 컨테이너 크기를 정한 후에 호출되므로 문제 없음)
    const leftWidth = imageContainerLeft.offsetWidth;
    const rightWidth = imageContainerRight.offsetWidth;
    const gap = 2;
    const borderThickness = 1;
    const totalCalculatedWidth =
      leftWidth + rightWidth + gap + borderThickness * 4;
    document.getElementById('debug-info').style.width =
      `${totalCalculatedWidth}px`;

    console.log(
      '모든 뷰어 초기화 및 제스처 바인딩 완료. 컨테이너 너비는 CSS, 높이는 JS에 의해 제어됩니다.'
    );
  }

  // 모든 초기화 프로세스 시작
  initializeAllViewers();

  // --- Hammer.js 및 Wheel 이벤트 바인딩 함수 (이전과 동일, 별도 변경 없음) ---
  function bindGestures(viewer, container) {
    const hammer = new Hammer(container);

    hammer.get('pinch').set({ enable: true });
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammer.get('tap').set({ enable: true });

    // 이미지 요소의 HTML 기본 드래그 방지 (이전 수정사항)
    const imgElement = container.querySelector('.target-image');
    if (imgElement) {
      imgElement.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
    }
    container.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });

    // Pan 제스처
    hammer.on('panstart', (e) => {
      viewer.startPan();
      container.style.cursor = 'grabbing';
    });
    hammer.on('panmove', (e) => {
      viewer.pan(e.deltaX, e.deltaY);
    });
    hammer.on('panend', (e) => {
      viewer.endPan();
      container.style.cursor = 'grab';
      updateDebugInfo({
        gestureState: '대기 중',
        x: viewer.state.x,
        y: viewer.state.y,
        scale: viewer.state.scale,
        mx: 0,
        my: 0,
      });
    });

    // Pinch 제스처
    hammer.on('pinchstart', (e) => {
      viewer.startPinch();
    });
    hammer.on('pinchmove', (e) => {
      viewer.pinch(e.scale, e.center);
    });
    hammer.on('pinchend', (e) => {
      viewer.endPinch();
      updateDebugInfo({
        gestureState: '대기 중',
        x: viewer.state.x,
        y: viewer.state.y,
        scale: viewer.state.scale,
        distance: 0,
      });
    });

    // Tap (Click) 제스처
    hammer.on('tap', (e) => {
      viewer.click();
      updateDebugInfo({
        gestureState: '대기 중',
        x: viewer.state.x,
        y: viewer.state.y,
        scale: viewer.state.scale,
      });
    });

    // Wheel 이벤트 (마우스 휠 확대/축소)
    container.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        viewer.wheelZoom(e.deltaY, e.clientX, e.clientY);
      },
      { passive: false }
    );
  }
});
