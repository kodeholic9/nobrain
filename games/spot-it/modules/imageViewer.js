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
    this.onStateChange = onStateChange; // 미러링 등을 위해 외부에 상태 변경을 알림

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

    this.spotsData = []; // 이 뷰어가 렌더링할 스팟 정의 (원본 이미지 좌표). setSpotsData로 설정됨
    this.foundSpotsStatus = []; // 각 스팟의 발견 상태 [true, false, ...], setSpotsData로 초기화

    this.canvas = null; // 스팟을 그릴 캔버스 요소
    this.ctx = null; // 캔버스 컨텍스트

    this.initializeCanvas(); // 캔버스 초기화 호출

    // 이미지 로딩 완료 후 초기 위치 설정
    if (this.image.complete && this.image.naturalWidth > 0) {
      this.centerImage();
      this.updateImageTransform();
      // 스팟은 setSpotsData가 호출될 때 그려지므로 여기서는 호출하지 않음
    } else {
      this.image.addEventListener(
        'load',
        () => {
          this.centerImage();
          this.updateImageTransform();
          // 스팟은 setSpotsData가 호출될 때 그려지므로 여기서는 호출하지 않음
        },
        { once: true }
      );
    }

    // 윈도우 리사이즈 시 뷰어 크기 및 스팟 다시 그리기
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * 뷰어에 연결된 캔버스 요소를 초기화하고 컨텍스트를 얻습니다.
   * 컨테이너에 캔버스가 없으면 새로 생성합니다.
   */
  initializeCanvas() {
    let existingCanvas = this.container.querySelector('.spot-overlay-canvas');
    if (existingCanvas) {
      this.canvas = existingCanvas;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'spot-overlay-canvas'; // 클래스 이름 추가
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '10'; // 이미지 위에 그려지도록
      this.container.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas(); // 캔버스 초기 크기 설정
  }

  /**
   * 캔버스 크기를 컨테이너에 맞춰 조정하고 스팟을 다시 그립니다.
   */
  resizeCanvas() {
    if (this.canvas && this.container) {
      this.canvas.width = this.container.offsetWidth;
      this.canvas.height = this.container.offsetHeight;
      this.redrawSpots(); // 크기 조정 후 스팟 다시 그리기
    }
  }

  /**
   * 새로운 이미지를 로드하고 뷰어 상태를 초기화합니다.
   * @param {string} imageUrl - 로드할 이미지 URL
   */
  loadImage(imageUrl) {
    this.image.src = ''; // 기존 이미지 src를 비워 재로드 트리거
    this.image.src = imageUrl;
    // 이미지 로드는 'load' 이벤트 리스너가 처리하므로 추가적인 center/update 호출은 불필요
  }

  /**
   * 현재 뷰어의 상태를 반환합니다.
   * @returns {object} 현재 뷰어의 { x, y, scale } 상태
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 뷰어의 상태를 설정하고 이미지 변환을 업데이트합니다.
   * @param {object} newState - 설정할 새로운 상태 { x, y, scale }
   * @param {boolean} [triggerUpdate=true] - 이미지 변환 업데이트를 바로 실행할지 여부
   */
  setState(newState, triggerUpdate = true) {
    this.state.x = newState.x;
    this.state.y = newState.y;
    this.state.scale = Math.max(
      this.minScale,
      Math.min(this.maxScale, newState.scale)
    );
    this.state.startX = this.state.x; // 시작점도 현재 상태로 업데이트
    this.state.startY = this.state.y;
    this.state.startScale = this.state.scale;

    if (triggerUpdate) {
      this.updateImageTransform();
    }
  }

  /**
   * 뷰어의 상태를 초기값으로 리셋합니다.
   */
  reset() {
    this.state = {
      scale: 1,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      startScale: 1,
    };
    this.centerImage();
    this.updateImageTransform();
    this.clearSpotsData(); // 스팟 데이터도 초기화 (foundSpotsStatus도 포함)
    this.reportDebugInfo('reset');
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

    // 중앙 정렬 (확대되어 컨테이너보다 커지면 0, 0을 기준으로 왼쪽 위가 맞춰짐)
    if (currentScaledWidth <= containerWidth) {
      this.state.x = (containerWidth - currentScaledWidth) / 2;
    } else {
      // 이미지가 컨테이너보다 크면 좌측 끝을 0으로 맞춤
      this.state.x = 0;
    }

    if (currentScaledHeight <= containerHeight) {
      this.state.y = (containerHeight - currentScaledHeight) / 2;
    } else {
      // 이미지가 컨테이너보다 크면 상단 끝을 0으로 맞춤
      this.state.y = 0;
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
    const scaledContentHeight = renderedHeight * this.state.scale;

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

  /**
   * 뷰어 내의 클릭 좌표를 원본 이미지 좌표로 변환합니다.
   * @param {number} clientX - 화면 기준 클릭 X 좌표
   * @param {number} clientY - 화면 기준 클릭 Y 좌표
   * @returns {object} { containerX, containerY, renderedImageX, renderedImageY, originalImageX, originalImageY }
   */
  getOriginalImageCoordinates(clientX, clientY) {
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

    return {
      containerX,
      containerY,
      renderedImageX,
      renderedImageY,
      originalImageX,
      originalImageY,
    };
  }

  /**
   * 원본 이미지 기준의 좌표를 현재 렌더링된 이미지 기준의 캔버스 좌표로 변환합니다.
   * 스팟을 그릴 때 사용됩니다.
   * @param {number} originalX - 원본 이미지 X 좌표
   * @param {number} originalY - 원본 이미지 Y 좌표
   * @returns {object} { x, y } - 캔버스에 그릴 좌표
   */
  getRenderedImageCoordinates(originalX, originalY) {
    const naturalWidth = this.image.naturalWidth;
    const naturalHeight = this.image.naturalHeight;
    const { renderedWidth, renderedHeight } = this.getRenderedImageDimensions();

    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    const imageAspectRatio = naturalWidth / naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let scaleFactor; // natural -> rendered (at scale 1)
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspectRatio > containerAspectRatio) {
      scaleFactor = renderedWidth / naturalWidth;
      offsetY = (containerHeight - renderedHeight) / 2; // object-fit: contain으로 생긴 상단 여백
    } else {
      scaleFactor = renderedHeight / naturalHeight;
      offsetX = (containerWidth - renderedWidth) / 2; // object-fit: contain으로 생긴 좌측 여백
    }

    // 원본 이미지 좌표 -> (scale 1 기준) 렌더링된 이미지 내 좌표 -> 현재 뷰어 스케일 적용 -> 현재 뷰어 pan 적용
    const renderedX =
      originalX * scaleFactor * this.state.scale + this.state.x + offsetX;
    const renderedY =
      originalY * scaleFactor * this.state.scale + this.state.y + offsetY;

    return { x: renderedX, y: renderedY };
  }

  click(clientX, clientY) {
    console.log(`Click at: (${clientX}, ${clientY})`);
    const coords = this.getOriginalImageCoordinates(clientX, clientY);
    this.reportDebugInfo('click', { clickCoords: coords });
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
    const scaledContentHeight = renderedHeight * this.state.scale;

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
    this.redrawSpots(); // 스팟 다시 그리기
    // 뷰어 상태 변경 시 외부에 알리는 CustomEvent
    this.container.dispatchEvent(
      new CustomEvent('viewerTransformUpdated', {
        detail: { state: this.state, viewerId: this.container.id },
      })
    );
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

  /**
   * 이 뷰어에 표시할 스팟 데이터를 설정하고 초기화합니다.
   * @param {Array<Object>} spotsData - { circles: [...] } 형태의 스팟 배열
   */
  setSpotsData(spotsData) {
    this.spotsData = spotsData;
    // 외부에서 (spotGame) foundSpotsStatus를 관리한다고 가정하고,
    // 여기서는 그리기용으로만 사용하거나, 초기화만 수행.
    // 현재는 reset()에서만 초기화하고, spotGame이 markSpotAsFound를 호출하여 그릴 스팟을 제어함.
    this.foundSpotsStatus = new Array(spotsData.length).fill(false); // 새로 로드될 때마다 초기화
    this.redrawSpots(); // 새 데이터로 다시 그리기
  }

  /**
   * 이 뷰어의 스팟 데이터를 초기화합니다.
   */
  clearSpotsData() {
    this.spotsData = [];
    this.foundSpotsStatus = [];
    this.clearSpotDrawings();
  }

  /**
   * 캔버스에 모든 스팟을 그립니다 (디버깅 용도).
   */
  drawAllSpots() {
    if (!this.ctx || !this.spotsData) {
      console.warn(
        'Cannot draw all spots. Canvas context or spot data not ready.'
      );
      return;
    }
    this.spotsData.forEach((spot, index) => {
      // 이미 발견된 스팟은 다시 그리지 않거나, 다른 스타일로 그릴 수 있음
      // 여기서는 디버그 모드일 때 발견 여부와 상관없이 모두 그립니다.
      this.drawSingleSpot(index); // 디버그 모드로 그리기
    });
  }

  /**
   * 특정 스팟이 발견되었음을 표시하고 그 스팟을 그립니다.
   * 이 메서드는 spotGame에서 호출되어 특정 스팟을 그리도록 명령합니다.
   * @param {number} spotIndex - 발견된 스팟의 인덱스
   */
  markSpotAsFound(spotIndex) {
    if (spotIndex >= 0 && spotIndex < this.foundSpotsStatus.length) {
      this.foundSpotsStatus[spotIndex] = true;
      this.drawSingleSpot(spotIndex); // 해당 스팟만 다시 그리기
    }
  }

  /**
   * 모든 스팟 그림을 지우고 현재 발견된 스팟들을 다시 그립니다.
   * 뷰어의 확대/축소/이동이 발생할 때마다 호출됩니다.
   */
  redrawSpots() {
    this.clearSpotDrawings();
    this.foundSpotsStatus.forEach((isFound, index) => {
      if (isFound) {
        this.drawSingleSpot(index);
      }
    });
  }

  /**
   * 특정 스팟 인덱스에 해당하는 스팟을 캔버스에 그립니다.
   * @param {number} spotIndex - 그릴 스팟의 인덱스
   */
  drawSingleSpot(spotIndex) {
    if (!this.ctx || !this.spotsData || !this.spotsData[spotIndex]) {
      console.warn(
        `Cannot draw spot. Canvas context or spot data not ready for index ${spotIndex}.`
      );
      return;
    }

    const spot = this.spotsData[spotIndex];
    if (!spot.circles || spot.circles.length === 0) return;

    // --- 스팟 영역 계산 로직 시작 ---
    // 여러 개의 circle을 감싸는 하나의 타원을 그리기 위한 경계 계산
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    spot.circles.forEach((circle) => {
      const centerX = circle.centerX;
      const centerY = circle.centerY;
      const radiusX =
        circle.radiusX !== undefined ? circle.radiusX : circle.radius;
      const radiusY =
        circle.radiusY !== undefined ? circle.radiusY : circle.radius;

      // 각 원/타원의 경계를 포함하도록 min/max 업데이트
      minX = Math.min(minX, centerX - radiusX);
      minY = Math.min(minY, centerY - radiusY);
      maxX = Math.max(maxX, centerX + radiusX);
      maxY = Math.max(maxY, centerY + radiusY);
    });

    // 계산된 경계를 기반으로 통합 타원의 중심점과 반지름(반경) 계산
    const unifiedCenterX = (minX + maxX) / 2;
    const unifiedCenterY = (minY + maxY) / 2;
    const unifiedRadiusX = (maxX - minX) / 2;
    const unifiedRadiusY = (maxY - minY) / 2;
    // --- 스팟 영역 계산 로직 끝 ---

    this.ctx.strokeStyle = '#FF0000'; // 초록색 테두리
    this.ctx.lineWidth = 5;
    this.ctx.setLineDash([]); // 점선

    // 원본 이미지 기준 좌표를 현재 렌더링된 이미지 기준 캔버스 좌표로 변환
    const transformedCenter = this.getRenderedImageCoordinates(
      unifiedCenterX,
      unifiedCenterY
    );
    const renderedRadiusX = unifiedRadiusX * this.state.scale;
    const renderedRadiusY = unifiedRadiusY * this.state.scale;

    this.ctx.beginPath();
    this.ctx.ellipse(
      transformedCenter.x,
      transformedCenter.y,
      renderedRadiusX,
      renderedRadiusY,
      0, // rotation - 0 (라디안)
      0, // startAngle
      2 * Math.PI // endAngle
    );
    this.ctx.stroke();

    /* spot.circles.forEach((circle) => {
      const centerX = circle.centerX;
      const centerY = circle.centerY;
      const originalRadiusX =
        circle.radiusX !== undefined ? circle.radiusX : circle.radius;
      const originalRadiusY =
        circle.radiusY !== undefined ? circle.radiusY : circle.radius;

      // 원본 이미지 기준 좌표를 현재 렌더링된 이미지 기준 캔버스 좌표로 변환
      const transformedCenter = this.getRenderedImageCoordinates(
        centerX,
        centerY
      );
      const renderedRadiusX = originalRadiusX * this.state.scale; // 원본 스케일 1일때의 반지름 * 현재 뷰어 스케일
      const renderedRadiusY = originalRadiusY * this.state.scale; // 원본 스케일 1일때의 반지름 * 현재 뷰어 스케일

      this.ctx.beginPath();
      this.ctx.ellipse(
        transformedCenter.x,
        transformedCenter.y,
        renderedRadiusX,
        renderedRadiusY,
        0, // rotation - 0 (라디안)
        0, // startAngle
        2 * Math.PI // endAngle
      );
      this.ctx.stroke();
    }); */
  }

  /**
   * 캔버스에 그려진 모든 스팟 그림을 지웁니다.
   */
  clearSpotDrawings() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 윈도우 리사이즈 이벤트 핸들러.
   * 뷰어의 크기를 조정하고 스팟을 다시 그립니다.
   */
  handleResize() {
    // 컨테이너 높이 재설정 로직 (setupImageViewerForGame에서 했던 것과 유사)
    if (this.image.naturalWidth > 0 && this.image.naturalHeight > 0) {
      const imageAspectRatio =
        this.image.naturalWidth / this.image.naturalHeight;
      const containerWidth = this.container.offsetWidth;
      const calculatedHeight = containerWidth / imageAspectRatio;
      this.container.style.height = `${calculatedHeight}px`;
    } else {
      // 이미지 로딩 실패 또는 크기 0일 경우 폴백
      this.container.style.height = `${this.container.offsetWidth * (3 / 4)}px`;
    }

    this.centerImage(); // 리사이즈 후 이미지 중앙 정렬 (필요시)
    this.updateImageTransform(); // 이미지 변환 업데이트 (재드로잉 포함)
    this.resizeCanvas(); // 캔버스 크기 조정 (재드로잉 포함)
  }
}
