// modules/debugInfo.js

let isDebugMode = false;
const debugInfoElement = document.getElementById('debug-info');

export function updateDebugInfo(info, currentImageViewer = null) {
  if (!isDebugMode) return;

  if (debugInfoElement) {
    document.getElementById('gesture-state').textContent =
      info.gestureState || 'N/A';
    document.getElementById('debug-x').textContent = info.x
      ? info.x.toFixed(2)
      : '0';
    document.getElementById('debug-y').textContent = info.y
      ? info.y.toFixed(2)
      : '0';
    document.getElementById('debug-scale').textContent = info.scale
      ? info.scale.toFixed(2)
      : '1';

    if (currentImageViewer) {
      const img = currentImageViewer.image;
      const container = currentImageViewer.container;
      const { renderedWidth, renderedHeight } =
        currentImageViewer.getRenderedImageDimensions();

      document.getElementById('debug-natural-wh').textContent =
        `${img.naturalWidth}x${img.naturalHeight}`;
      document.getElementById('debug-container-wh').textContent =
        `${container.offsetWidth}x${container.offsetHeight}`;
      document.getElementById('debug-rendered-wh').textContent =
        `${renderedWidth.toFixed(2)}x${renderedHeight.toFixed(2)}`;
    } else {
      document.getElementById('debug-natural-wh').textContent = 'N/A';
      document.getElementById('debug-container-wh').textContent = 'N/A';
      document.getElementById('debug-rendered-wh').textContent = 'N/A';
    }

    // !!! 추가된 클릭 좌표 정보 업데이트 !!!
    if (info.clickCoords) {
      document.getElementById('click-container-x').textContent =
        info.clickCoords.containerX.toFixed(2);
      document.getElementById('click-container-y').textContent =
        info.clickCoords.containerY.toFixed(2);
      document.getElementById('click-rendered-x').textContent =
        info.clickCoords.renderedImageX.toFixed(2);
      document.getElementById('click-rendered-y').textContent =
        info.clickCoords.renderedImageY.toFixed(2);
      document.getElementById('click-original-x').textContent =
        info.clickCoords.originalImageX.toFixed(2);
      document.getElementById('click-original-y').textContent =
        info.clickCoords.originalImageY.toFixed(2);
    } else {
      document.getElementById('click-container-x').textContent = 'N/A';
      document.getElementById('click-container-y').textContent = 'N/A';
      document.getElementById('click-rendered-x').textContent = 'N/A';
      document.getElementById('click-rendered-y').textContent = 'N/A';
      document.getElementById('click-original-x').textContent = 'N/A';
      document.getElementById('click-original-y').textContent = 'N/A';
    }
  }
}

export function toggleDebugMode(forceState) {
  if (typeof forceState === 'boolean') {
    isDebugMode = forceState;
  } else {
    isDebugMode = !isDebugMode;
  }

  if (debugInfoElement) {
    debugInfoElement.classList.toggle('active', isDebugMode);
    if (!isDebugMode) {
      updateDebugInfo({}); // 디버그 모드 비활성화 시 정보 초기화
    }
  }
  console.log(`디버그 모드: ${isDebugMode ? '활성화' : '비활성화'}`);
}

toggleDebugMode(false);
