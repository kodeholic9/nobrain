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
   * 이미지가 로드된 후 컨테이너 크기를 설정하고 ImageViewer를 초기화하는 함수
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
      const setImageDimensions = () => {
        // 이미지의 자연(원본) 크기를 사용하여 컨테이너 크기 설정
        containerElement.style.width = `${imageElement.naturalWidth}px`;
        containerElement.style.height = `${imageElement.naturalHeight}px`;
        console.log(
          `컨테이너 '${containerElement.id}' 크기 설정됨: ${imageElement.naturalWidth}x${imageElement.naturalHeight}`
        );

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

      if (imageElement.complete && imageElement.naturalWidth > 0) {
        // 이미지가 이미 로드되어 있거나 캐시된 경우
        setImageDimensions();
      } else {
        // 이미지가 아직 로드되지 않은 경우, 'load' 이벤트를 기다림
        imageElement.addEventListener('load', setImageDimensions, {
          once: true,
        });
        // 이미지 로드 실패 시의 처리 (필요에 따라 폴백 크기 설정 등)
        imageElement.addEventListener(
          'error',
          () => {
            console.error(
              `Error loading image: ${imageElement.src}. Using fallback dimensions.`
            );
            containerElement.style.width = `400px`; // 폴백 크기
            containerElement.style.height = `300px`;
            const viewer = new ImageViewer(
              imageElement,
              containerElement,
              debugCallback,
              onStateChangeCallback,
              options
            );
            resolve(viewer);
          },
          { once: true }
        );
      }
    });
  }

  /**
   * 모든 이미지 뷰어를 초기화하고 제스처를 바인딩하는 비동기 함수
   */
  async function initializeAllViewers() {
    // 왼쪽 뷰어 설정
    imageViewerLeft = await setupImageViewer(
      imageElementLeft,
      imageContainerLeft,
      updateDebugInfo,
      (state) => {
        if (imageViewerRight) {
          // 오른쪽 뷰어가 존재할 때만 미러링
          imageViewerRight.setState(state);
        }
      },
      { minScale: 1, maxScale: 2 }
    );

    // 오른쪽 뷰어 설정
    imageViewerRight = await setupImageViewer(
      imageElementRight,
      imageContainerRight,
      updateDebugInfo,
      (state) => {
        if (imageViewerLeft) {
          // 왼쪽 뷰어가 존재할 때만 미러링
          imageViewerLeft.setState(state);
        }
      },
      { minScale: 1, maxScale: 3 }
    );

    // 두 뷰어의 초기화(크기 설정 포함)가 완료된 후 제스처 바인딩
    bindGestures(imageViewerLeft, imageContainerLeft);
    bindGestures(imageViewerRight, imageContainerRight);

    // 디버그 정보 패널의 너비를 동적으로 계산하여 설정
    const leftWidth = imageContainerLeft.offsetWidth;
    const rightWidth = imageContainerRight.offsetWidth;
    const borderThickness = 1; // 컨테이너 테두리 두께
    const gap = 2; // 컨테이너 사이 간격
    const totalCalculatedWidth =
      leftWidth + rightWidth + gap + borderThickness * 4; // 두 뷰어 너비 + 간격 + 양쪽 컨테이너의 좌우 테두리

    document.getElementById('debug-info').style.width =
      `${totalCalculatedWidth}px`;

    console.log(
      '두 개의 이미지 뷰어에 Hammer.js 및 휠 제스처가 바인딩 되었고 미러링이 설정되었습니다.'
    );
    console.log(
      '컨테이너 크기가 이미지의 원본 크기에 맞춰 동적으로 설정되었습니다.'
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
