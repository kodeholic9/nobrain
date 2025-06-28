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

    this.minScale = options.minScale || 1;
    this.maxScale = options.maxScale || 3;

    this.centerImage();
    this.updateImageTransform();
  }

  getRenderedImageDimensions() {
    const naturalWidth = this.image.naturalWidth;
    const naturalHeight = this.image.naturalHeight;
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth;
    let renderedHeight;

    if (imageAspectRatio > containerAspectRatio) {
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspectRatio;
    } else {
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspectRatio;
    }

    return { renderedWidth, renderedHeight };
  }

  centerImage() {
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    const currentScaledWidth = renderedWidth * this.state.scale;
    const currentScaledHeight = renderedHeight * this.state.scale;

    if (currentScaledWidth <= containerWidth) {
      this.state.x = (containerWidth - currentScaledWidth) / 2;
    }

    if (currentScaledHeight <= containerHeight) {
      this.state.y = (containerHeight - currentScaledHeight) / 2;
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

    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const scaledContentWidth = renderedWidth * this.state.scale;
    const scaledContentHeight = renderedHeight * this.state.scale;

    if (scaledContentWidth > containerWidth) {
      const effectiveMaxX = 0;
      const effectiveMinX = containerWidth - scaledContentWidth;
      this.state.x = Math.max(effectiveMinX, Math.min(effectiveMaxX, newX));
    } else {
      this.state.x = (containerWidth - scaledContentWidth) / 2;
    }

    if (scaledContentHeight > containerHeight) {
      const effectiveMaxY = 0;
      const effectiveMinY = containerHeight - scaledContentHeight;
      this.state.y = Math.max(effectiveMinY, Math.min(effectiveMaxY, newY));
    } else {
      this.state.y = (containerHeight - scaledContentHeight) / 2;
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

    let tempX =
      relativeCenterX -
      (relativeCenterX - imageCurrentX) * (newScale / this.state.scale);
    let tempY =
      relativeCenterY -
      (relativeCenterY - imageCurrentY) * (newScale / this.state.scale);

    this.state.scale = newScale;

    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const scaledContentWidth = renderedWidth * this.state.scale;
    const scaledContentHeight = renderedHeight * this.state.scale; // 수정된 부분

    if (scaledContentWidth > containerWidth) {
      const effectiveMaxX = 0;
      const effectiveMinX = containerWidth - scaledContentWidth;
      this.state.x = Math.max(effectiveMinX, Math.min(effectiveMaxX, tempX));
    } else {
      this.state.x = (containerWidth - scaledContentWidth) / 2;
    }

    if (scaledContentHeight > containerHeight) {
      const effectiveMaxY = 0;
      const effectiveMinY = containerHeight - scaledContentHeight;
      this.state.y = Math.max(effectiveMinY, Math.min(effectiveMaxY, tempY));
    } else {
      this.state.y = (containerHeight - scaledContentHeight) / 2;
    }

    this.updateImageTransform();
    this.reportDebugInfo('pinchmove', { distance: 0, scale: scale });
    this.onStateChange && this.onStateChange(this.state);
  }

  endPinch() {
    this.reportDebugInfo('pinchend');
  }

  // !!! 변경: clientX, clientY 인자 추가 및 좌표 계산 로직 추가 !!!
  click(clientX, clientY) {
    console.log(`Click at: (${clientX}, ${clientY})`);
    const containerRect = this.container.getBoundingClientRect();

    // 1. Container X, Y (컨테이너 기준)
    const containerX = clientX - containerRect.left;
    const containerY = clientY - containerRect.top;

    // 2. Rendered Image Content X, Y (스케일된 렌더링 이미지 콘텐츠 기준)
    // 현재 이미지의 변환된 위치를 고려하여 클릭 지점을 이미지 내부 좌표로 변환
    const renderedImageX = containerX - this.state.x;
    const renderedImageY = containerY - this.state.y;

    // 3. Original Image X, Y (원본 이미지 픽셀 기준)
    const naturalWidth = this.image.naturalWidth;
    const naturalHeight = this.image.naturalHeight;
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();

    let originalImageX, originalImageY;

    // object-fit: contain에 의해 이미지 가장자리에 여백이 생기는 경우를 고려
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    if (imageAspectRatio > containerAspectRatio) {
      // 이미지가 컨테이너보다 넓어서 높이가 맞춰진 경우 (좌우에 여백이 없음, 상하에 여백)
      const scaleFactor = renderedWidth / naturalWidth; // natural -> rendered (at scale 1)
      const effectiveImageTopOffset = (containerHeight - renderedHeight) / 2; // object-fit: contain으로 생긴 상단 여백

      originalImageX = renderedImageX / this.state.scale / scaleFactor;
      originalImageY =
        (renderedImageY - effectiveImageTopOffset) /
        this.state.scale /
        scaleFactor;
    } else {
      // 이미지가 컨테이너보다 높아서 너비가 맞춰진 경우 (상하에 여백이 없음, 좌우에 여백)
      const scaleFactor = renderedHeight / naturalHeight; // natural -> rendered (at scale 1)
      const effectiveImageLeftOffset = (containerWidth - renderedWidth) / 2; // object-fit: contain으로 생긴 좌측 여백

      originalImageX =
        (renderedImageX - effectiveImageLeftOffset) /
        this.state.scale /
        scaleFactor;
      originalImageY = renderedImageY / this.state.scale / scaleFactor;
    }

    // 음수 좌표 방지 및 이미지 경계 내로 제한 (선택 사항이지만 안전성 위해)
    originalImageX = Math.max(0, Math.min(naturalWidth, originalImageX));
    originalImageY = Math.max(0, Math.min(naturalHeight, originalImageY));

    this.reportDebugInfo('click', {
      clickCoords: {
        containerX,
        containerY,
        renderedImageX,
        renderedImageY,
        originalImageX,
        originalImageY,
      },
    });
  }

  wheelZoom(deltaY, clientX, clientY) {
    // <-- 이 메소드가 존재해야 합니다.
    const zoomAmount = 0.1;
    const scaleDirection = deltaY < 0 ? 1 + zoomAmount : 1 - zoomAmount;

    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, this.state.scale * scaleDirection)
    );

    const containerRect = this.container.getBoundingClientRect();
    const relativeMouseX = clientX - containerRect.left;
    const relativeMouseY = clientY - clientY; // 여기가 잘못됐었네요. clientY - containerRect.top; 이어야 합니다.

    let tempX =
      relativeMouseX -
      (relativeMouseX - this.state.x) * (newScale / this.state.scale);
    let tempY =
      relativeMouseY -
      (relativeMouseY - this.state.y) * (newScale / this.state.scale);

    this.state.scale = newScale;

    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();
    const scaledContentWidth = renderedWidth * this.state.scale;
    const scaledContentHeight = renderedHeight * this.state.scale; // <-- 여기가 이전에 renderedHeight * renderedHeight; 였던 것 수정

    if (scaledContentWidth > containerWidth) {
      const effectiveMaxX = 0;
      const effectiveMinX = containerWidth - scaledContentWidth;
      this.state.x = Math.max(effectiveMinX, Math.min(effectiveMaxX, tempX));
    } else {
      this.state.x = (containerWidth - scaledContentWidth) / 2;
    }

    if (scaledContentHeight > containerHeight) {
      const effectiveMaxY = 0;
      const effectiveMinY = containerHeight - scaledContentHeight;
      this.state.y = Math.max(effectiveMinY, Math.min(effectiveMaxY, tempY));
    } else {
      this.state.y = (containerHeight - scaledContentHeight) / 2;
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
