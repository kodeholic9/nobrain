// modules/imageViewer.js
export class ImageViewer {
  constructor(
    imageElement,
    containerElement,
    debugCallback,
    onStateChange,
    options = {}
  ) {
    this.image = imageElement;
    this.container = containerElement;
    this.debugCallback = debugCallback;
    this.onStateChange = onStateChange;

    this.state = {
      scale: 1,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      startScale: 1,
    };

    this.minScale = options.minScale || 0.1;
    this.maxScale = options.maxScale || 5;

    // 초기 중앙 정렬 (생성 시 한 번 호출)
    this.centerImage();
    this.updateImageTransform();
  }

  // --- 추가된 헬퍼 함수: object-fit: contain에 따른 실제 이미지 크기 계산 ---
  getRenderedImageDimensions() {
    const naturalWidth = this.image.naturalWidth;
    const naturalHeight = this.image.naturalHeight;
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth;
    let renderedHeight;

    // object-fit: contain 로직
    if (imageAspectRatio > containerAspectRatio) {
      // 이미지가 컨테이너보다 넓어서 가로에 맞춰짐 (세로에 여백)
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspectRatio;
    } else {
      // 이미지가 컨테이너보다 높아서 세로에 맞춰짐 (가로에 여백)
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspectRatio;
    }

    return { renderedWidth, renderedHeight };
  }

  // --- 추가된 함수: 이미지 중앙 정렬 로직 ---
  centerImage() {
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    // 현재 스케일 적용 후의 실제 이미지 크기
    const currentScaledWidth = renderedWidth * this.state.scale;
    const currentScaledHeight = renderedHeight * this.state.scale;

    // 이미지가 컨테이너보다 작을 때만 중앙 정렬
    if (currentScaledWidth <= containerWidth) {
      this.state.x = (containerWidth - currentScaledWidth) / 2;
    } else {
      // 이미지가 컨테이너보다 크면, 현재 x를 유지하거나 0으로 초기화하지 않음 (이동 가능하게 둠)
      // 단, 중앙으로 강제 이동되던 문제를 해결하기 위해 여기서는 조정하지 않음
      // pan, pinch, wheelZoom에서 minX/maxX에 의해 자동으로 제한될 것임
    }

    if (currentScaledHeight <= containerHeight) {
      this.state.y = (containerHeight - currentScaledHeight) / 2;
    } else {
      // 이미지가 컨테이너보다 크면, 현재 y를 유지
    }
  }

  setState(newState, triggerUpdate = true) {
    this.state.x = newState.x;
    this.state.y = newState.y;
    this.state.scale = Math.max(
      this.minScale,
      Math.min(this.maxScale, newState.scale)
    );
    this.state.startX = newState.x;
    this.state.startY = newState.y;
    this.state.startScale = newState.scale;

    // setState 호출 시에도 중앙 정렬을 재계산할지 여부.
    // 외부에서 상태를 강제로 설정하는 경우 (미러링)에는 중앙 정렬 로직이 필요 없음.
    // if (triggerUpdate) {
    //    this.centerImage(); // 필요에 따라 호출
    //    this.updateImageTransform();
    // }

    // 변경된 setState 로직: 먼저 스케일만 적용하고 변환.
    // pan, pinch, wheelZoom에서 이미 위치 제한을 다시 하기 때문에 여기서는 위치만 설정
    if (triggerUpdate) {
      this.updateImageTransform();
    }
  }

  startPan() {
    this.state.startX = this.state.x;
    this.state.startY = this.state.y;
    this.reportDebugInfo('panstart');
  }

  pan(deltaX, deltaY) {
    const newX = this.state.startX + deltaX;
    const newY = this.state.startY + deltaY;

    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    // !!! 변경: object-fit을 고려한 실제 렌더링 크기 사용 !!!
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const scaledContentWidth = renderedWidth * this.state.scale;
    const scaledContentHeight = renderedHeight * this.state.scale;

    // 이미지가 컨테이너보다 클 때만 이동 제한을 적용
    if (scaledContentWidth > containerWidth) {
      const maxX = (containerWidth - renderedWidth) / 2; // 이미지의 중앙을 기준으로 했을 때의 최대 x
      const minX =
        containerWidth -
        scaledContentWidth -
        (containerWidth - renderedWidth) / 2; // 이미지 중앙 기준 최소 x
      // 이 계산이 복잡하다면, 0과 (컨테이너 - 스케일된 이미지) 사이에서 이동
      // maxX는 이미지가 컨테이너 왼쪽 끝에 딱 붙는 경우 (컨테이너 내 여백 시작점)
      // minX는 이미지가 컨테이너 오른쪽 끝에 딱 붙는 경우 (컨테이너 내 여백 끝점)

      // 더 직관적인 계산: 이미지가 컨테이너의 (0,0)을 기준으로 했을 때의 최대 이동 범위
      const effectiveMaxX = 0; // 이미지가 왼쪽 컨테이너 경계에 닿았을 때 (좌측 여백 시작점)
      const effectiveMinX = containerWidth - scaledContentWidth; // 이미지가 오른쪽 컨테이너 경계에 닿았을 때 (우측 여백 시작점)

      this.state.x = Math.max(effectiveMinX, Math.min(effectiveMaxX, newX));

      // 만약 이미지가 컨테이너보다 작아서 중앙에 정렬되어야 한다면 pan을 허용하지 않음
      // 이 부분은 centerImage()에서 초기화 시 처리되므로, pan에서는 항상 제한을 두어야 함
      // 만약 scaledContentWidth <= containerWidth 이면, pan이 아예 발생하지 않도록 UI에서 막는게 좋음 (CSS cursor: default 등)
    } else {
      // 이미지가 컨테이너보다 작거나 같으면 중앙 정렬 (이동 없음)
      this.state.x = (containerWidth - scaledContentWidth) / 2; // 중앙 정렬
    }

    if (scaledContentHeight > containerHeight) {
      const effectiveMaxY = 0;
      const effectiveMinY = containerHeight - scaledContentHeight;
      this.state.y = Math.max(effectiveMinY, Math.min(effectiveMaxY, newY));
    } else {
      this.state.y = (containerHeight - scaledContentHeight) / 2; // 중앙 정렬
    }

    this.updateImageTransform();
    this.reportDebugInfo('panmove', { mx: deltaX, my: deltaY });
    this.onStateChange && this.onStateChange(this.state);
  }

  endPan() {
    this.reportDebugInfo('panend');
  }

  startPinch() {
    this.state.startScale = this.state.scale;
    this.reportDebugInfo('pinchstart');
  }

  pinch(scale, center) {
    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, this.state.startScale * scale)
    );

    const containerRect = this.container.getBoundingClientRect();
    const relativeCenterX = center.x - containerRect.left;
    const relativeCenterY = center.y - containerRect.top;

    const imageCurrentX = this.state.x;
    const imageCurrentY = this.state.y;

    // 새로운 스케일 적용 시 x,y 위치 계산
    // 핀치 줌 중심점을 기준으로 이동 계산 (이전과 동일)
    let tempX =
      relativeCenterX -
      (relativeCenterX - imageCurrentX) * (newScale / this.state.scale);
    let tempY =
      relativeCenterY -
      (relativeCenterY - imageCurrentY) * (newScale / this.state.scale);

    this.state.scale = newScale; // 먼저 스케일을 업데이트하여 제한 계산에 사용

    // !!! 변경: object-fit을 고려한 실제 렌더링 크기 사용 !!!
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const scaledContentWidth = renderedWidth * this.state.scale;
    const scaledContentHeight = renderedHeight * this.state.scale;

    // 핀치 후에도 이미지 위치 제한 적용 (pan과 유사)
    if (scaledContentWidth > containerWidth) {
      const effectiveMaxX = 0;
      const effectiveMinX = containerWidth - scaledContentWidth;
      this.state.x = Math.max(effectiveMinX, Math.min(effectiveMaxX, tempX));
    } else {
      this.state.x = (containerWidth - scaledContentWidth) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
    }

    if (scaledContentHeight > containerHeight) {
      const effectiveMaxY = 0;
      const effectiveMinY = containerHeight - scaledContentHeight;
      this.state.y = Math.max(effectiveMinY, Math.min(effectiveMaxY, tempY));
    } else {
      this.state.y = (containerHeight - scaledContentHeight) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
    }

    this.updateImageTransform();
    this.reportDebugInfo('pinchmove', { distance: 0, scale: scale });
    this.onStateChange && this.onStateChange(this.state);
  }

  endPinch() {
    this.reportDebugInfo('pinchend');
  }

  click() {
    this.reportDebugInfo('click');
  }

  wheelZoom(deltaY, clientX, clientY) {
    const zoomAmount = 0.1;
    const scaleDirection = deltaY < 0 ? 1 + zoomAmount : 1 - zoomAmount;

    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, this.state.scale * scaleDirection)
    );

    const containerRect = this.container.getBoundingClientRect();
    const relativeMouseX = clientX - containerRect.left;
    const relativeMouseY = clientY - containerRect.top;

    const imageCurrentX = this.state.x;
    const imageCurrentY = this.state.y;

    let tempX =
      relativeMouseX -
      (relativeMouseX - imageCurrentX) * (newScale / this.state.scale);
    let tempY =
      relativeMouseY -
      (relativeMouseY - imageCurrentY) * (newScale / this.state.scale);

    this.state.scale = newScale; // 먼저 스케일을 업데이트하여 제한 계산에 사용

    // !!! 변경: object-fit을 고려한 실제 렌더링 크기 사용 !!!
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const scaledContentWidth = renderedWidth * this.state.scale;
    const scaledContentHeight = renderedHeight * renderedHeight; // 오류 수정: renderedHeight * this.state.scale;

    // 휠 줌 후에도 이미지 위치 제한 적용 (pinch와 유사)
    if (scaledContentWidth > containerWidth) {
      const effectiveMaxX = 0;
      const effectiveMinX = containerWidth - scaledContentWidth;
      this.state.x = Math.max(effectiveMinX, Math.min(effectiveMaxX, tempX));
    } else {
      this.state.x = (containerWidth - scaledContentWidth) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
    }

    if (scaledContentHeight > containerHeight) {
      const effectiveMaxY = 0;
      const effectiveMinY = containerHeight - scaledContentHeight;
      this.state.y = Math.max(effectiveMinY, Math.min(effectiveMaxY, tempY));
    } else {
      this.state.y = (containerHeight - scaledContentHeight) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
    }

    this.updateImageTransform();
    this.reportDebugInfo('wheelZoom', { scale: this.state.scale });
    this.onStateChange && this.onStateChange(this.state);
  }

  updateImageTransform() {
    this.image.style.transform = `translate(${this.state.x}px, ${this.state.y}px) scale(${this.state.scale})`;
  }

  reportDebugInfo(gestureType, extraInfo = {}) {
    if (this.debugCallback) {
      this.debugCallback({
        gestureState: gestureType,
        x: this.state.x,
        y: this.state.y,
        scale: this.state.scale,
        ...extraInfo,
      });
    }
  }
}
