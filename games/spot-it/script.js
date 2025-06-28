// script.js
import { ImageViewer } from './modules/imageViewer.js';
import { updateDebugInfo, toggleDebugMode } from './modules/debugInfo.js';

document.addEventListener('DOMContentLoaded', () => {
  const imageElementLeft = document.getElementById('target-image-left');
  const imageContainerLeft = document.getElementById('image-container-left');
  const imageElementRight = document.getElementById('target-image-right');
  const imageContainerRight = document.getElementById('image-container-right');

  const toggleDebugBtn = document.getElementById('toggle-debug-btn');
  if (toggleDebugBtn) {
    toggleDebugBtn.addEventListener('click', () => toggleDebugMode());
  }

  let imageViewerLeft;
  let imageViewerRight;

  function setupImageViewer(
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

  async function initializeAllViewers() {
    imageViewerLeft = await setupImageViewer(
      imageElementLeft,
      imageContainerLeft,
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
      (state) => {
        if (imageViewerLeft) {
          imageViewerLeft.setState(state);
        }
      },
      { minScale: 1, maxScale: 3 }
    );

    bindGestures(imageViewerLeft, imageContainerLeft);
    bindGestures(imageViewerRight, imageContainerRight);

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
  }

  initializeAllViewers();

  function bindGestures(viewer, container) {
    const hammer = new Hammer(container);

    hammer.on('panstart', (e) => {
      e.preventDefault();
      viewer.startPan();
    });
    hammer.on('panmove', (e) => {
      e.preventDefault();
      viewer.pan(e.deltaX, e.deltaY);
    });
    hammer.on('panend', (e) => {
      e.preventDefault();
      viewer.endPan();
    });

    hammer.get('pinch').set({ enable: true });
    hammer.on('pinchstart', (e) => {
      e.preventDefault();
      viewer.startPinch();
    });
    hammer.on('pinchmove', (e) => {
      e.preventDefault();
      viewer.pinch(e.scale, e.center);
    });
    hammer.on('pinchend', (e) => {
      e.preventDefault();
      viewer.endPinch();
    });

    // !!! 변경: tap 이벤트에 clientX, clientY 전달 !!!
    hammer.on('tap', (e) => {
      e.preventDefault();
      console.log(`e: `, e);
      viewer.click(e.center.x, e.center.y); // 클릭된 지점의 전역 좌표 전달
    });

    container.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const clientX = e.clientX;
        const clientY = e.clientY;
        viewer.wheelZoom(e.deltaY, clientX, clientY);
      },
      { passive: false }
    );
  }
});
