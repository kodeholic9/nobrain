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

    this.updateImageTransform();
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
    // !!! 이미지 이동 제한 로직 추가 !!!
    const newX = this.state.startX + deltaX;
    const newY = this.state.startY + deltaY;

    // 현재 이미지의 스케일이 적용된 실제 너비/높이
    const scaledImageWidth = this.image.naturalWidth * this.state.scale;
    const scaledImageHeight = this.image.naturalHeight * this.state.scale;

    // 컨테이너의 너비/높이
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    // 이미지가 컨테이너보다 클 때만 이동 제한을 적용
    if (scaledImageWidth > containerWidth) {
      // x축 이동 제한 계산
      // 이미지가 왼쪽 경계를 벗어나지 않도록 (x는 최대 0)
      // 이미지가 오른쪽 경계를 벗어나지 않도록 (x는 최소 - (scaledImageWidth - containerWidth))
      const maxX = 0; // 이미지가 컨테이너 왼쪽 가장자리에 붙는 경우
      const minX = containerWidth - scaledImageWidth; // 이미지가 컨테이너 오른쪽 가장자리에 붙는 경우
      this.state.x = Math.max(minX, Math.min(maxX, newX));
    } else {
      // 이미지가 컨테이너보다 작거나 같으면 중앙 정렬 (선택사항, 현재는 이동 제한 없음)
      // 중앙 정렬을 원한다면: this.state.x = (containerWidth - scaledImageWidth) / 2;
      this.state.x = 0; // 이동할 필요가 없으므로 0 (또는 startX + deltaX의 원래 값 유지)
      // 그러나 사용자가 작은 이미지를 pan하면 움직이지 않게 해야 하므로,
      // 이미지가 작을 경우 pan을 제한하는 것이 합리적입니다.
      // 여기서는 이미지가 컨테이너보다 작을 경우 x 이동을 0으로 강제합니다.
      // 사용자 경험에 따라 이 로직은 변경될 수 있습니다.
    }

    if (scaledImageHeight > containerHeight) {
      // y축 이동 제한 계산
      const maxY = 0;
      const minY = containerHeight - scaledImageHeight;
      this.state.y = Math.max(minY, Math.min(maxY, newY));
    } else {
      this.state.y = 0; // 이미지가 작을 경우 y 이동을 0으로 강제합니다.
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
    let tempX =
      relativeCenterX -
      (relativeCenterX - imageCurrentX) * (newScale / this.state.scale);
    let tempY =
      relativeCenterY -
      (relativeCenterY - imageCurrentY) * (newScale / this.state.scale);

    this.state.scale = newScale; // 먼저 스케일을 업데이트하여 제한 계산에 사용

    // !!! 핀치 후에도 이미지 위치 제한 적용 !!!
    const scaledImageWidth = this.image.naturalWidth * this.state.scale;
    const scaledImageHeight = this.image.naturalHeight * this.state.scale;

    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    if (scaledImageWidth > containerWidth) {
      const maxX = 0;
      const minX = containerWidth - scaledImageWidth;
      this.state.x = Math.max(minX, Math.min(maxX, tempX));
    } else {
      this.state.x = (containerWidth - scaledImageWidth) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
    }

    if (scaledImageHeight > containerHeight) {
      const maxY = 0;
      const minY = containerHeight - scaledImageHeight;
      this.state.y = Math.max(minY, Math.min(maxY, tempY));
    } else {
      this.state.y = (containerHeight - scaledImageHeight) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
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

    // !!! 휠 줌 후에도 이미지 위치 제한 적용 !!!
    const scaledImageWidth = this.image.naturalWidth * this.state.scale;
    const scaledImageHeight = this.image.naturalHeight * this.state.scale;

    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    if (scaledImageWidth > containerWidth) {
      const maxX = 0;
      const minX = containerWidth - scaledImageWidth;
      this.state.x = Math.max(minX, Math.min(maxX, tempX));
    } else {
      this.state.x = (containerWidth - scaledImageWidth) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
    }

    if (scaledImageHeight > containerHeight) {
      const maxY = 0;
      const minY = containerHeight - scaledImageHeight;
      this.state.y = Math.max(minY, Math.min(maxY, tempY));
    } else {
      this.state.y = (containerHeight - scaledImageHeight) / 2; // 이미지가 컨테이너보다 작으면 중앙 정렬
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
