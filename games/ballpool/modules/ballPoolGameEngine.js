// Matter.js 모듈들
import BallPoolEffects from './ballPoolEffects.js';
import BallPoolAudioManager from './ballPoolAudioManager.js';

// Matter.js 모듈들
const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Body,
  Events,
  Mouse,
  MouseConstraint,
  Vector,
  Sleeping,
} = Matter;

// 기본 게임 설정
const defaultGameConfig = {
  // 기본 물리 속성
  gravity: 1.5,
  restitution: 0.2,
  ballFriction: 0.25,
  wallFriction: 0,
  groundFriction: 0.1,
  frictionAir: 0.01,

  // 엔진 성능
  velocityIterations: 6,
  positionIterations: 8,
  constraintIterations: 4,

  // 안정성
  enableSleeping: false,
  sleepThreshold: 120,
  timeScale: 1.0,
  density: 0.002,
  frictionStatic: 0.01,
  maxVelocity: 20,
  correctionFactor: 0.4,
  stiffness: 1.0, // 강성도 최대 (변형 방지)
  inertia: 1000, // 회전 관성 무한대
  minVelocityThreshold: 0.05, // 최소 속도 임계값

  // 감쇠
  dampingFactor: 0.99,
  angularDamping: 0.1,
  linearDamping: 0.01,
  slop: 0.001,

  // 게임 설정
  sizeMultiplier: 1,
  wallThickness: 50,
  groundThickness: 50,
  gameOverLine: 120,
  dropYPos: 80,
  debugMode: false,
  dropTimeo: 500,
};

// 숫자별 색상과 크기 설정
export const ballConfig = {
  2: {
    color: '#f4a7e4',
    size: 11,
    point: 1,
    mass: 5.5,
    imgPath: 'assets/bp_iron_03.png',
  }, // 탁구
  4: {
    color: '#a6e98f',
    size: 25,
    point: 2,
    mass: 3,
    imgPath: 'assets/bp_old_01.png',
  }, // 당구
  8: {
    color: '#6ce2e2',
    size: 30,
    point: 3,
    mass: 1,
    imgPath: 'assets/bp_bronze_d_01.png',
  }, // 테니스
  16: {
    color: '#87b9ee',
    size: 35,
    point: 4,
    mass: 1,
    imgPath: 'assets/bp_silver_d_01.png',
  }, // 야구
  32: {
    color: '#080403ff',
    size: 45,
    point: 5,
    mass: 0.5,
    restitution: 0.5,
    imgPath: 'assets/bp_plastic_01.png',
  }, // 물놀이
  64: {
    color: '#a8a0f6',
    size: 50,
    point: 6,
    mass: 1,
    imgPath: 'assets/bp_bronze_02.png',
  }, // 핸드볼
  128: {
    color: '#c5c1bb',
    size: 56,
    point: 7,
    mass: 1,
    imgPath: 'assets/bp_stone_01.png',
  }, // 배구
  256: {
    color: '#fbd5a2',
    size: 62,
    point: 8,
    mass: 1,
    imgPath: 'assets/bp_gold_d_06.png',
  }, // 볼링
  512: {
    color: '#ffb8c1',
    size: 70,
    point: 9,
    mass: 1,
    imgPath: 'assets/bp_iron_01.png',
  }, // 축구
  1024: {
    color: '#9bcf1e',
    size: 80,
    point: 10,
    mass: 1,
    imgPath: 'assets/bp_dia_01.png',
  }, // 농구
  2048: {
    color: '#33a64b',
    size: 95,
    point: 1000,
    mass: 1,
    imgPath: 'assets/bp_old_03.png',
  }, // 골프
};

/**
 * 핵심 게임 엔진 클래스
 */
export class BallPoolGameEngine {
  constructor(canvasElement, config = {}) {
    this.canvas = canvasElement;
    this.config = { ...defaultGameConfig, ...config };
    this.callbacks = {};

    // 게임 상태
    this.gameStartTime = null;
    this.lastDropTime = null;
    this.lastWakeAllTime = null;
    this.highestBallValue = 0;
    this.balls = [];
    this.walls = [];
    this.score = 0;
    this.level = 1;
    this.isDropping = false;
    this.isChecking = false;
    this.gameOver = false;
    this.dropX = 200;
    this.nextBalls = [];
    this.playTimeInfo = {};
    this.combo = {};

    // 난이도
    this.lastBallValue = null;
    this.consecutiveCount = 0;

    // 컨테이너의 크기
    this.logicalSize = { width: 0, height: 0 };

    // 게임 이펙트
    this.ballPoolEffects = new BallPoolEffects(this.canvas, ballConfig);
    this.ballPoolAudio = new BallPoolAudioManager();

    // 게임 오버 검사기
    this.gameOverChecker = null;

    // 바인드된 함수들을 미리 저장
    this.boundHandlePointerDown = this.handlePointerDown.bind(this);
    this.boundHandlePointerUp = this.handlePointerUp.bind(this);
    this.boundHandlePointerMove = this.handlePointerMove.bind(this);
    this.boundHandlePointerCancel = this.handlePointerCancel.bind(this);

    this.init();
  }

  // 콜백 등록 메서드
  on(callback) {
    if (!this.callbacks['action']) {
      this.callbacks['action'] = [];
    }
    this.callbacks['action'].push(callback);
  }

  // 콜백 실행 메서드
  emit(eventName, args) {
    if (this.callbacks['action']) {
      this.callbacks['action'].forEach((callback) => callback(eventName, args));
    }
  }

  init() {
    this.setupCanvas();
    this.setupBallConfig();
    this.setupEngine();
    this.setupRender();
    this.setupEventListeners();
    this.createWalls();
    this.startGame();
  }

  async setupSounds() {
    console.log(
      'setupSounds() - initialized: ',
      this.ballPoolAudio.initialized
    );
    if (this.ballPoolAudio.initialized) return;
    await this.ballPoolAudio.init();
    await this.ballPoolAudio.loadMultiple({
      drop: { path: './assets/drop-05.mp3', poolSize: 5, volume: 1 },
      merge: { path: './assets/coin-payout-02.mp3', poolSize: 5, volume: 1 },
      'game-over': {
        path: './assets/brass-fail-01.mp3',
        poolSize: 1,
        volume: 1,
      },
    });
  }

  setupBallConfig() {
    Object.entries(ballConfig).forEach(([key, config]) => {
      if (!config.image && config.imgPath) {
        config.image = new Image();
        // 이미지 렌더링 설정 추가
        config.image.style.imageRendering = 'pixelated';
        //config.image.style.imageRendering = 'crisp-edges';

        config.image.src = config.imgPath;
        config.image.onload = () => {
          console.log(`Ball image loaded: ${key}`, config.imgPath);
          config.cachedCanvas = this.createCacheOfBallRender(
            config,
            this.sizeOfBall(key)
          );
        };
      }
    });
  }

  setupCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const ctx = this.canvas.getContext('2d');

    // 캔버스 크기 설정
    this.logicalSize = {
      dpr: window.devicePixelRatio || 1,
      width: rect.width,
      height: rect.height,
    };

    this.canvas.width = this.logicalSize.width * this.logicalSize.dpr;
    this.canvas.height = this.logicalSize.height * this.logicalSize.dpr;
    this.canvas.style.width = this.logicalSize.width + 'px';
    this.canvas.style.height = this.logicalSize.height + 'px';

    ctx.scale(this.logicalSize.dpr, this.logicalSize.dpr);

    // 이 설정들 추가해보세요
    ctx.imageSmoothingEnabled = false; // 픽셀 완벽하게 선명하게
    // 또는
    //ctx.imageSmoothingEnabled = true;
    //ctx.imageSmoothingQuality = 'high'; // 부드러운 고품질

    // 추가 설정
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    console.log('Canvas pixel ratio:', this.logicalSize);
    console.log(
      'Canvas physical size:',
      this.canvas.width,
      'x',
      this.canvas.height
    );
    console.log(
      'Canvas logical size:',
      this.logicalSize.width,
      'x',
      this.logicalSize.height
    );
    console.log('Container rect:', rect.width, 'x', rect.height);
  }

  setupEngine() {
    this.engine = Engine.create();

    // 물리 엔진 설정 적용
    this.engine.world.gravity.y = this.config.gravity;
    this.engine.velocityIterations = this.config.velocityIterations;
    this.engine.positionIterations = this.config.positionIterations;
    this.engine.constraintIterations = this.config.constraintIterations;
    this.engine.enableSleeping = this.config.enableSleeping;
    this.engine.sleepThreshold = this.config.sleepThreshold;
    this.engine.timing.timeScale = this.config.timeScale;

    this.world = this.engine.world;
  }

  setupRender() {
    this.render = Render.create({
      canvas: this.canvas,
      engine: this.engine,
      options: {
        //        width: this.canvas.width,
        //        height: this.canvas.height,

        width: this.logicalSize.width,
        height: this.logicalSize.height,
        background: 'transparent',
        wireframes: this.config.debugMode,
        showDebug: this.config.debugMode,
        showVelocity: this.config.debugMode,
        showPositions: this.config.debugMode,
        showBounds: this.config.debugMode,
        showCollisions: this.config.debugMode,
        showIds: this.config.debugMode,
        showAngleIndicator: this.config.debugMode,
        showStats: this.config.debugMode,
        pixelRatio: this.logicalSize.dpr,
      },
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      // Matter.js 렌더러 크기도 업데이트 필요
    });

    // Pointer 이벤트 사용
    this.canvas.addEventListener('pointerdown', this.boundHandlePointerDown);
    this.canvas.addEventListener('pointerup', this.boundHandlePointerUp);
    this.canvas.addEventListener('pointermove', this.boundHandlePointerMove);
    this.canvas.addEventListener(
      'pointercancel',
      this.boundHandlePointerCancel
    );

    // CSS에서 터치 동작 제어
    this.canvas.style.touchAction = 'none'; // 브라우저 기본 터치 동작 비활성화

    // 물리 이벤트
    Events.on(this.engine, 'collisionStart', (event) =>
      this.handleCollision(event)
    );
    Events.on(this.engine, 'afterUpdate', () => this.handleAfterUpdate());
    Events.on(this.render, 'afterRender', () => this.handleAfterRender());
  }

  createWalls() {
    // 기존 벽 제거
    if (this.walls.length > 0) {
      World.remove(this.world, this.walls);
      this.walls = [];
    }

    // 현재 캔버스 크기 가져오기
    // const canvasWidth = this.canvas.width;
    // const canvasHeight = this.canvas.height;
    const canvasWidth = this.logicalSize.width;
    const canvasHeight = this.logicalSize.height;
    const wallThickness = this.config.wallThickness;
    const groundThickness = this.config.groundThickness;
    this.walls = [
      // 바닥: 캔버스 하단 중앙, 전체 너비
      Bodies.rectangle(
        canvasWidth / 2,
        canvasHeight + groundThickness / 2 - 10,
        canvasWidth,
        groundThickness,
        {
          isStatic: true,
          render: { fillStyle: '#5f4339' },
          friction: this.config.groundFriction,
          frictionStatic: this.config.groundFriction * 1.2, // 정지마찰 추가
          restitution: 0,
          label: 'ground',
          isGround: true,
        }
      ),
      // 왼쪽 벽: 캔버스 왼쪽 가장자리, 전체 높이
      Bodies.rectangle(
        -wallThickness / 2,
        canvasHeight / 2,
        wallThickness,
        canvasHeight,
        {
          isStatic: true,
          render: { fillStyle: '#ddd' },
          friction: this.config.wallFriction,
          label: 'leftWall',
          isWall: true,
        }
      ),
      // 오른쪽 벽: 캔버스 오른쪽 가장자리, 전체 높이
      Bodies.rectangle(
        canvasWidth + wallThickness / 2,
        canvasHeight / 2,
        wallThickness,
        canvasHeight,
        {
          isStatic: true,
          render: { fillStyle: '#ddd' },
          friction: this.config.wallFriction,
          label: 'rightWall',
          isWall: true,
        }
      ),
    ];

    World.add(this.world, this.walls);
  }

  sizeOfBall(value) {
    const bcfg = ballConfig[value];
    return value == 2048 ? bcfg.size : bcfg.size * this.config.sizeMultiplier;
  }

  createBall(value, x, y, hasCollided = false) {
    const bcfg = ballConfig[value];
    const radius = this.sizeOfBall(value);

    const ball =
      value === 0
        ? this.createEllipse(x, y, radius)
        : this.createCircle(x, y, radius, bcfg.restitution);
    Body.setMass(ball, bcfg.mass);

    console.log('createBall() - id: ', ball.id, value, x, y, hasCollided);

    // 공에 추가 정보
    ball.isBall = true;
    ball.ballValue = value;
    ball.createdAt = Date.now();
    ball.rolling = {
      prevX: x,
      prevY: y,
      displayAngle: 0,
      collidedAt: hasCollided ? Date.now() : null,
    };

    // 가장 높은 값 갱신
    if (value > this.highestBallValue) {
      this.highestBallValue = value;
    }

    this.balls.push(ball);
    World.add(this.world, ball);
    return ball;
  }

  createCircle(x, y, radius, restitution = null) {
    return Bodies.circle(x, y, radius, {
      restitution: restitution || this.config.restitution,
      friction: this.config.ballFriction,
      frictionStatic: this.config.frictionStatic,
      frictionAir: this.config.frictionAir,
      sleepThreshold: this.config.sleepThreshold,
      density: this.config.density,
      // stiffness: this.config.stiffness,
      // inertia: this.config.inertia,
      slop: this.config.slop,
      render: { fillStyle: 'transparent' },
    });
  }

  createEllipse(x, y, radius) {
    const ellipseVertices = [];
    const numVertices = 30;
    const rx = radius * 1.5;
    const ry = radius * 0.8;

    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * 2 * Math.PI;
      const vx = rx * Math.cos(angle);
      const vy = ry * Math.sin(angle);
      ellipseVertices.push({ x: vx, y: vy });
    }

    return Bodies.fromVertices(x, y, ellipseVertices, {
      restitution: this.config.restitution,
      friction: this.config.ballFriction,
      frictionStatic: this.config.frictionStatic,
      frictionAir: this.config.frictionAir,
      sleepThreshold: this.config.sleepThreshold,
      density: this.config.density,
      slop: this.config.slop,
      render: { fillStyle: 'transparent' },
    });
  }

  removeBall(ball) {
    const index = this.balls.indexOf(ball);
    if (index !== -1) {
      console.log('removeBall() - id: ', ball.id, ball.ballValue);
      World.remove(this.world, ball);
      this.balls.splice(index, 1);
    }
  }

  updateDropZone(event, gesture) {
    if (this.gameOver) return;

    // 다음 공의 크기를 가져옴. 없으면 0으로 설정.
    const ballSize = this.nextBalls[0] ? ballConfig[this.nextBalls[0]].size : 0;

    // 공의 반지름을 기준으로 최소, 최대 드랍 위치를 계산
    const minX = ballSize;
    const maxX = this.logicalSize.width - ballSize;

    const rect = this.canvas.getBoundingClientRect();
    this.dropX = event.clientX - rect.left;
    this.dropX = Math.max(minX, Math.min(maxX, this.dropX));
    this.emit('drop-zone-update', { dropX: this.dropX, gesture: gesture });
  }

  dropBall() {
    console.log('dropBall()');
    if (this.isDropping || this.gameOver) return;

    const current = Date.now();
    this.dropX = Math.max(0, Math.min(this.logicalSize.width, this.dropX));

    this.isDropping = true;
    this.lastDropTime = current;
    const ball = this.createBall(
      this.nextBalls.shift(),
      this.dropX,
      this.config.dropYPos
    );

    this.nextBalls.push(this.pickRandomBall());

    this.emit('ball-dropped', ball);
    //this.ballPoolAudio.play('drop', { volume: 1 });

    setTimeout(() => {
      this.isDropping = false;
      this.emit('next-ball-update', this.nextBalls);
      this.emit('ball-ready');
    }, this.config.dropTimeo);
  }

  makeArmingBalls() {
    return [this.pickRandomBall(), this.pickRandomBall()];
  }

  selectStrategicBall(ballValues) {
    // 최근 10개 공 정도만 체크 (성능 고려)
    const topBalls = this.balls
      .slice(-10) // 마지막 10개
      .sort((a, b) => a.position.y - b.position.y);

    const matchables = topBalls.reduce((matchableSet, ball) => {
      // 현재 공과 같은 값이 ballValues에 있으면 추가
      if (ballValues.includes(ball.ballValue)) {
        matchableSet.add(ball.ballValue);
      }
      return matchableSet;
    }, new Set());

    if (matchables.size > 0) {
      const availableMatchable = Array.from(matchables);
      return availableMatchable[
        Math.floor(Math.random() * availableMatchable.length)
      ];
    }

    return null;
  }

  pickRandomBall() {
    const rand = Math.random();
    const ballValues =
      this.highestBallValue >= 32 ? [32, 16, 8, 4, 2] : [16, 8, 4, 2];
    const selectedValue =
      ballValues[Math.floor(Math.random() * ballValues.length)];

    // 연속 카운트 업데이트
    if (selectedValue === this.lastBallValue) {
      this.consecutiveCount += 1;
    } else {
      this.consecutiveCount = 1;
    }
    this.lastBallValue = selectedValue;

    return selectedValue;
  }

  handleCollision(event) {
    const current = Date.now();
    const mergeQueue = event.pairs.reduce((queue, pair) => {
      // 공끼리 충돌시 충돌 시간 기록 - 이후 합치기시 생성 위치 결정에 사용
      if (pair.bodyA.rolling && pair.bodyB.rolling) {
        if (!pair.bodyA.rolling.collidedAt)
          pair.bodyA.rolling.collidedAt = Date.now();
        if (!pair.bodyB.rolling.collidedAt)
          pair.bodyB.rolling.collidedAt = Date.now();
      }

      // 공끼리 충돌하고 값이 같은 경우에만 합치기
      if (
        pair.bodyA.isBall &&
        pair.bodyB.isBall &&
        pair.bodyA.ballValue === pair.bodyB.ballValue
      ) {
        queue.push({
          ballA: pair.bodyA,
          ballB: pair.bodyB,
        });
      }

      return queue;
    }, []);

    // 마지막 drop으로 일정시간이 흐른 경우, 잠자고 있는 공을 깨운다
    // if (this.lastWakeAllTime && (current - this.lastWakeAllTime) >= 5000) {
    //   this.wakeAllBalls()
    // }

    // 충돌한 공이 있으면 주변 공들 깨우기
    // if (mergeQueue.length > 0) {
    //   this.wakeAllBalls()
    // }

    // 충돌한 공들 합치기
    mergeQueue.forEach((pair) => {
      this.mergeBalls(pair.ballA, pair.ballB);
    });
  }

  checkMergePair(ballA, ballB) {
    if (!this.balls.includes(ballA) || !this.balls.includes(ballB)) return null;
    if (!ballA || !ballB || ballA.ballValue !== ballB.ballValue) return null;

    const newValue = ballA.ballValue * 2;
    if (newValue > 2048) return null;

    // 목표 위치 및 속도 계산
    let originBall, targetBall;
    if (ballA.rolling.collidedAt > ballB.rolling.collidedAt) {
      originBall = ballA;
      targetBall = ballB;
    } else {
      originBall = ballB;
      targetBall = ballA;
    }

    return {
      originBall,
      targetBall,
      newValue,
    };
  }

  mergeBalls(ballA, ballB) {
    const mergePair = this.checkMergePair(ballA, ballB);
    if (!mergePair) return;

    console.log(
      `mergeBalls() - originBall: ${mergePair.originBall.id}, targetBall: ${mergePair.targetBall.id}, newValue: ${mergePair.newValue}`
    );

    // 파티클 애니메이션 효과
    this.ballPoolEffects.fadeAndShrink(mergePair.originBall);

    // 바닥공 제거
    this.removeBall(mergePair.originBall);

    // 효과음 재생
    this.ballPoolAudio.play('merge', { volume: 1, pitch: 1.1 });

    // 원래 공의 값만 변경 (즉시 반영)
    mergePair.targetBall.ballValue = mergePair.newValue;

    // 점수 갱신 및 이벤트 발생
    this.score += ballConfig[mergePair.newValue].point;
    this.emit('score-update', this.score);

    //
    // 시간 지연을 두고 새 공 생성 (애니메이션 효과를 위해)
    setTimeout(() => {
      // 혹시 이미 제거된 공이면 중단
      if (!this.balls.includes(mergePair.targetBall)) {
        console.log('이미 제거된 공입니다.', mergePair.targetBall.id);
        return;
      }

      // 위치 및 속도 계산
      const newPos = { ...mergePair.targetBall.position };
      const newVelocity = { ...mergePair.targetBall.velocity };
      // 원래 공 제거
      this.removeBall(mergePair.targetBall);

      // 새 공 생성
      const finalValue = Math.max(
        mergePair.newValue,
        mergePair.targetBall.ballValue
      );
      if (finalValue === 2048) {
        this.emit('hit-the-ball', finalValue);
      }
      const newBall = this.createBall(finalValue, newPos.x, newPos.y, true);

      // 원래 공의 속도 및 방향 유지
      Body.setVelocity(newBall, newVelocity);

      // 파티클 애니메이션 효과
      this.ballPoolEffects.fadeAndShrink(newBall);
    }, 50);
  }

  mergeBalls2(ballA, ballB) {
    const mergePair = this.checkMergePair(ballA, ballB);
    if (!mergePair) return;

    console.log(
      `mergeBalls() - originBall: ${mergePair.originBall.id}, targetBall: ${mergePair.targetBall.id}, newValue: ${mergePair.newValue}`
    );

    // 공 제거
    this.removeBall(mergePair.originBall);
    this.removeBall(mergePair.targetBall);

    // 파티클 애니메이션 효과
    const newPos = { ...mergePair.targetBall.position };
    this.ballPoolEffects.createDefaultEffect(newPos.x, newPos.y);

    // 새 공 생성
    const newBall = this.createBall(
      mergePair.newValue,
      newPos.x,
      newPos.y,
      true
    );

    // 점수 갱신 및 이벤트 발생
    this.score += ballConfig[mergePair.newValue].point;
    this.emit('score-update', this.score);
  }

  handleAfterUpdate() {
    if (!this.isChecking && this.gameOverChecker) this.gameOverChecker.update();
    this.cleanupMicroVelocities();
    this.limitVelocities();
  }

  limitVelocities() {
    this.balls.forEach((ball) => {
      const velocity = Vector.magnitude(ball.velocity);

      // 1. 최대 속도 제한
      if (velocity > this.config.maxVelocity) {
        const scale = this.config.maxVelocity / velocity;
        Body.setVelocity(ball, Vector.mult(ball.velocity, scale));
      }

      // 2. 감쇠 적용 (속도 감소)
      Body.setVelocity(
        ball,
        Vector.mult(ball.velocity, this.config.dampingFactor)
      );
      Body.setAngularVelocity(
        ball,
        ball.angularVelocity * (1 - this.config.angularDamping)
      );
    });
  }

  cleanupMicroVelocities() {
    this.balls.forEach((ball) => {
      // 과학적 표기법으로 된 미세한 값들 제거
      if (Math.abs(ball.velocity.x) < 1e-10) {
        Body.setVelocity(ball, { x: 0, y: ball.velocity.y });
      }
      if (Math.abs(ball.velocity.y) < 1e-10) {
        Body.setVelocity(ball, { x: ball.velocity.x, y: 0 });
      }
      if (Math.abs(ball.angularVelocity) < 1e-10) {
        Body.setAngularVelocity(ball, 0);
      }
    });
  }

  handleAfterRender() {
    if (!this.config.debugMode) {
      //this.drawBalls();
      //this.drawImgBalls();
      this.drawCachedBalls();
    }
    this.drawGameOverLine();
    //this.emit('debug-update', this.balls);
  }

  drawBalls() {
    const ctx = this.render.canvas.getContext('2d');

    this.balls.forEach((ball) => {
      const pos = ball.position;
      const bcfg = ballConfig[ball.ballValue];
      //const radius = bcfg.size * this.config.sizeMultiplier;
      const radius = ball.circleRadius; // Matter.js 실제 반지름 사용

      if (!ball.rolling) {
        ball.rolling = {
          prevX: pos.x,
          prevY: pos.y,
          displayAngle: 0,
        };
      }

      const rolling = ball.rolling;
      const deltaX = pos.x - rolling.prevX;
      const deltaY = pos.y - rolling.prevY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 0.1) {
        const rollAngle = distance / radius;
        const rotationDirection = deltaX < 0 ? -1 : 1;
        rolling.displayAngle += rollAngle * rotationDirection;
        rolling.prevX = pos.x;
        rolling.prevY = pos.y;
      }

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (rolling.collidedAt) {
        ctx.rotate(rolling.displayAngle);
      }

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = bcfg.color;
      ctx.fill();
      //ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeStyle = bcfg.color;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = `bold ${radius * 0.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ball.ballValue.toString(), 0, 0);

      ctx.restore();
    });
  }

  drawImgBalls() {
    const ctx = this.render.canvas.getContext('2d');

    this.balls.forEach((ball) => {
      const pos = ball.position;
      const bcfg = ballConfig[ball.ballValue];
      // const radius = bcfg.size * this.config.sizeMultiplier;
      const radius = ball.circleRadius; // Matter.js 실제 반지름 사용

      if (!ball.rolling) {
        ball.rolling = {
          prevX: pos.x,
          prevY: pos.y,
          displayAngle: 0,
        };
      }

      const rolling = ball.rolling;
      const deltaX = pos.x - rolling.prevX;
      const deltaY = pos.y - rolling.prevY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 0.1) {
        const rollAngle = distance / radius;
        const rotationDirection = deltaX < 0 ? -1 : 1;
        rolling.displayAngle += rollAngle * rotationDirection;
        rolling.prevX = pos.x;
        rolling.prevY = pos.y;
      }

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // 충돌 후에만 회전 적용
      if (rolling.collidedAt) {
        ctx.rotate(rolling.displayAngle);
      }

      // 이미지 그리기 (중심점 기준)
      const imageSize = radius * 2;
      ctx.drawImage(
        bcfg.image,
        -radius,
        -radius, // 중심점에서 offset
        imageSize,
        imageSize // 크기
      );

      // ctx.beginPath();
      // ctx.arc(0, 0, radius, 0, Math.PI * 2);
      // ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      // ctx.lineWidth = 1;
      // ctx.stroke();

      // 디버그: 물리 바디 경계선 표시
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = 1 / this.logicalSize.dpr;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  getHybridDisplayAngle(ball) {
    if (!ball) return 0;

    // 초기화
    if (!ball.rolling) {
      ball.rolling = {
        prevX: ball.position.x,
        prevY: ball.position.y,
        displayAngle: ball.angle, // 초기값은 엔진 angle
      };
    }

    const rolling = ball.rolling;

    // 이동 벡터
    const deltaX = ball.position.x - rolling.prevX;
    const deltaY = ball.position.y - rolling.prevY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 이동 거리 기반 각도 증가량
    let distanceAngle = rolling.displayAngle;
    if (distance > 0.01) {
      const rollAngle = distance / ball.circleRadius;
      const moveAngle = Math.atan2(deltaY, deltaX);

      // 이동 방향의 X축 투영을 이용해 회전 방향 잡기
      const rotationDirection = Math.sign(Math.cos(moveAngle));
      distanceAngle += rollAngle * rotationDirection;

      rolling.prevX = ball.position.x;
      rolling.prevY = ball.position.y;
    }

    // 속도 크기
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);

    // 혼합 비율 (0=엔진 angle, 1=distance 기반)
    // 속도가 빠르고 마찰이 클수록 distance 기반을 더 신뢰
    const weight = Math.min(1, (speed / 10) * ball.friction);

    // 보간(lerp)
    rolling.displayAngle = ball.angle * (1 - weight) + distanceAngle * weight;

    return rolling.displayAngle;
  }

  drawCachedBalls() {
    const ctx = this.render.canvas.getContext('2d');

    this.balls.forEach((ball) => {
      const pos = ball.position;
      const bcfg = ballConfig[ball.ballValue];
      // const radius = bcfg.size * this.config.sizeMultiplier;
      const radius = ball.circleRadius; // Matter.js 실제 반지름 사용
      const displayAngle = this.getHybridDisplayAngle(ball);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // 충돌 후에만 회전 적용
      if (ball.rolling.collidedAt) {
        ctx.rotate(displayAngle);
        //ctx.rotate(ball.angle); // Matter.js 회전도 추가
      }

      // 이미지 그리기 (중심점 기준)
      if (!bcfg.cachedCanvas) {
        bcfg.cachedCanvas = this.createCacheOfBallRender(bcfg, radius);
      }
      const size = radius * 2;
      ctx.drawImage(bcfg.cachedCanvas, -radius, -radius, size, size);

      ctx.restore();
    });
  }

  createCacheOfBallRender(bcfg, radius, bgColor = '#000', borderWidth = 2) {
    const size = radius * 2;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = size * this.logicalSize.dpr;
    offCanvas.height = size * this.logicalSize.dpr;

    const offCtx = offCanvas.getContext('2d');
    offCtx.setTransform(this.logicalSize.dpr, 0, 0, this.logicalSize.dpr, 0, 0);

    // 1. 원 배경 채우기 (테두리 색)
    // offCtx.fillStyle = bgColor;
    // offCtx.beginPath();
    // offCtx.arc(radius, radius, radius, 0, Math.PI * 2);
    // offCtx.fill();

    // 2. 안쪽에 이미지 그리기 (borderWidth 만큼 줄임)
    // const innerSize = size - borderWidth * 2;
    // offCtx.drawImage(
    //   bcfg.image,
    //   borderWidth, // x offset
    //   borderWidth, // y offset
    //   innerSize, // width
    //   innerSize // height
    // );

    const innerSize = size;
    offCtx.drawImage(
      bcfg.image,
      0, // x offset
      0, // y offset
      innerSize, // width
      innerSize // height
    );

    return offCanvas;
  }

  drawGameOverLine() {
    if (this.gameOver) return;

    const ctx = this.render.canvas.getContext('2d');
    const rect = this.canvas.parentElement.getBoundingClientRect();
    ctx.save();

    // 그라데이션 효과
    const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
    gradient.addColorStop(0, 'rgba(255, 107, 107, 0.3)'); // 연한 빨강
    gradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.8)'); // 진한 빨강
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0.3)'); // 연한 빨강

    // 배경 라인 (그림자 효과)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, this.config.gameOverLine + 2);
    ctx.lineTo(rect.width, this.config.gameOverLine + 2);
    ctx.stroke();

    // 메인 라인
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(0, this.config.gameOverLine);
    ctx.lineTo(rect.width, this.config.gameOverLine);
    ctx.stroke();

    // 경고 텍스트 (선택사항)
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText('DANGER LINE', rect.width - 10, this.config.gameOverLine - 8);

    ctx.setLineDash([]);
    ctx.restore();
  }

  wakeAllBalls() {
    this.lastWakeAllTime = Date.now();
    this.balls.forEach((ball) => {
      if (ball.isSleeping) {
        Sleeping.set(ball, false);
      }
    });

    console.log('wake up all balls!');
  }

  shakeAllBalls(intensity = 50) {
    if (this.gameOver) return;

    this.isDropping = true;
    this.balls.forEach((ball) => {
      // 잠든 공 깨우기
      if (ball.isSleeping) {
        Sleeping.set(ball, false);
      }

      // 더 강한 힘으로 수정
      const angle = Math.random() * Math.PI * 2;
      const speed = (intensity / 10) * (1 + Math.random() * 2); // 1~3배 강도로 증가

      const addVelocity = {
        x: Math.cos(angle) * speed,
        // y: Math.sin(angle) * speed * 0.8 - Math.random() * 2 // Y축도 강하게, 위로 더 많이
        y: Math.sin(angle) * speed * 0.8, // Y축도 강하게, 위로 더 많이
      };

      // 현재 속도에 추가 속도를 더함
      const newVelocity = {
        x: ball.velocity.x + addVelocity.x,
        y: ball.velocity.y + addVelocity.y,
      };

      Body.setVelocity(ball, newVelocity);

      // 회전도 더 강하게
      const angularVelocity = (Math.random() - 0.5) * 0.3;
      Body.setAngularVelocity(ball, ball.angularVelocity + angularVelocity);
    });

    setTimeout(() => {
      this.isDropping = false;
      this.emit('ball-ready');
    }, 1000);

    console.log(`${this.balls.length}개 공에 강한 흔들기 적용!`);
  }

  // 설정 업데이트
  updateConfig(newConfig) {
    console.log('updateConfig() - newConfig: ', newConfig);
    this.config = { ...this.config, ...newConfig };
    this.applyConfigChanges();
  }

  applyConfigChanges() {
    console.log('applyConfigChanges() - config: ', this.config);
    // 엔진 설정 적용
    this.engine.world.gravity.y = this.config.gravity;
    this.engine.velocityIterations = this.config.velocityIterations;
    this.engine.positionIterations = this.config.positionIterations;
    this.engine.constraintIterations = this.config.constraintIterations;
    this.engine.timing.timeScale = this.config.timeScale;
    this.engine.sleepThreshold = this.config.sleepThreshold;

    // 렌더 옵션 업데이트
    if (this.render) {
      this.render.options.wireframes = this.config.debugMode;
      this.render.options.showDebug = this.config.debugMode;
      this.render.options.showVelocity = this.config.debugMode;
      this.render.options.showPositions = this.config.debugMode;
      this.render.options.showBounds = this.config.debugMode;
      this.render.options.showCollisions = this.config.debugMode;
      this.render.options.showIds = this.config.debugMode;
      this.render.options.showAngleIndicator = this.config.debugMode;
      this.render.options.showStats = this.config.debugMode;
    }

    // 기존 공들의 물리 속성 업데이트
    this.balls.forEach((ball) => {
      ball.restitution = this.config.restitution;
      ball.friction = this.config.ballFriction;
      ball.frictionStatic = this.config.frictionStatic;
      ball.frictionAir = this.config.frictionAir;
      Body.setDensity(ball, this.config.density);
    });

    // 벽 업데이트
    this.walls.forEach((wall) => {
      if (wall.isGround) wall.friction = this.config.groundFriction;
      if (wall.isWall) wall.friction = this.config.wallFriction;
    });

    // 벽 두께가 변경된 경우 벽 재생성
    this.createWalls();

    // 게임 오버 검사기 재시작
    this.stopGameOverChecker();
    this.startGameOverChecker();
  }

  // 위치 기반으로 볼 찾기
  findBallNearPosition(screenX, screenY, radius) {
    const worldX =
      screenX * (this.render.options.width / this.canvas.offsetWidth);
    const worldY =
      screenY * (this.render.options.height / this.canvas.offsetHeight);

    const closest = this.balls.reduce((closest, ball) => {
      const distance = Math.sqrt(
        Math.pow(ball.position.x - worldX, 2) +
          Math.pow(ball.position.y - worldY, 2)
      );

      if (!closest || distance < closest.distance) {
        return { ball, distance };
      }
      return closest;
    }, null);

    console.log('closest: ', closest);

    return closest && closest.distance <= closest.ball.circleRadius
      ? closest.ball
      : null;
  }

  checkClickedBall() {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 클릭 반경 내의 볼 찾기
    const clickedBall = this.findBallNearPosition(mouseX, mouseY, 30);
    if (clickedBall) {
      this.emit('ball-clicked', clickedBall);
    }
  }

  handlePointerDown(event) {
    this.setupSounds();
    this.updateDropZone(event, 'down');
  }

  handlePointerUp(event) {
    this.updateDropZone(event, 'up');
    this.dropBall();
  }

  handlePointerMove(event) {
    this.updateDropZone(event, 'move');
    this.updateDropZone(event);
  }

  handlePointerCancel(event) {
    this.updateDropZone(event, 'cancel');
    this.updateDropZone(event);
  }

  reset() {
    // 모든 공 제거
    World.remove(this.world, this.balls);

    // 게임 상태 초기화
    this.balls = [];
    this.gameStartTime = Date.now();
    this.highestBallValue = 0;
    this.score = 0;
    this.level = 1;
    this.isDropping = false;
    this.gameOver = false;
    this.nextBalls = this.makeArmingBalls();
    this.playTimeInfo = {
      startAt: new Date(),
      endAt: null,
    };

    // 난이도 설정 초기화
    this.lastBallValue = null;
    this.consecutiveCount = 0;

    // 이벤트 발행
    this.emit('game-reset');
    this.emit('score-update', this.score);
    this.emit('next-ball-update', this.nextBalls);

    this.ballPoolEffects.initAudios();

    this.startGameOverChecker();
  }

  startGame() {
    // Render.run(this.render);
    // Engine.run(this.engine);
    Render.run(this.render);
    Runner.run(this.engine);
  }

  stopGame(emitFlag = true) {
    this.gameOver = true;
    this.balls.forEach((b) => {
      Body.setStatic(b, true);
    });
    this.playTimeInfo.endAt = new Date();

    // 게임 오버 체크 중단
    this.stopGameOverChecker();
    if (emitFlag) {
      this.emit('game-over', this.getGameState());
    }

    // 효과음 재생
    this.ballPoolAudio.play('game-over', { volume: 0.8, pitch: 1.1 });
  }

  cleanUp() {
    if (!this.engine || !this.render) return;

    // 1. 먼저 Runner 정지 (엔진 업데이트 중단)
    if (this.engine) {
      Runner.stop(this.engine);
    }

    // 2. Render 정지 (렌더링 중단)
    if (this.render) {
      Render.stop(this.render);
      this.render = null;
    }

    // 3. 그 다음 World와 Engine 정리
    if (this.engine && this.engine.world) {
      World.clear(this.engine.world);
      Engine.clear(this.engine);
      this.engine = null;
    }

    // 이벤트 리스너 정리
    if (this.canvas) {
      this.canvas.removeEventListener(
        'pointerdown',
        this.boundHandlePointerDown
      );
      this.canvas.removeEventListener('pointerup', this.boundHandlePointerUp);
      this.canvas.removeEventListener(
        'pointermove',
        this.boundHandlePointerMove
      );
      this.canvas.removeEventListener(
        'pointercancel',
        this.boundHandlePointerCancel
      );
    }
  }

  // 게임 상태 반환
  getGameState() {
    return {
      score: this.score,
      balls: this.balls,
      gameOver: this.gameOver,
      dropX: this.dropX,
      isDropping: this.isDropping,
      nextBalls: this.nextBalls,
      highestBallValue: this.highestBallValue,
      playTimeInfo: this.playTimeInfo,
      maxLevelCount: this.balls.filter((x) => x.ballValue === 2048).length,
    };
  }

  dropAllBalls() {
    if (this.isChecking || this.gameOver) return;
    this.isChecking = true;

    Object.keys(ballConfig)
      .reverse()
      .forEach((x) => {
        const ball = this.createBall(x, this.dropX, this.config.dropYPos);
        this.emit('ball-dropped', ball);
      });

    setTimeout(() => {
      this.isChecking = false;
      this.emit('ball-ready');
    }, 5 * 1000);
  }

  handleResize() {
    console.log('Handling resize...');

    // 이전 크기 저장
    const previousSize = { ...this.logicalSize };
    try {
      // 1. 캔버스 크기 재조정
      this.setupCanvas();

      // 2. Matter.js 렌더러 크기 업데이트
      this.updateRenderSize();

      // 3. 게임 월드 경계 업데이트 (벽 등)
      this.createWalls();
    } catch (error) {
      console.error('Error during resize:', error);
    }
  }

  // Matter.js 렌더러 크기 업데이트
  updateRenderSize() {
    if (this.render && this.render.options) {
      // 렌더러 옵션 업데이트
      this.render.options.width = this.logicalSize.width;
      this.render.options.height = this.logicalSize.height;
      this.render.options.pixelRatio = this.logicalSize.dpr;

      // 렌더러 캔버스 정보 업데이트
      this.render.canvas.width = this.canvas.width;
      this.render.canvas.height = this.canvas.height;

      // 렌더러 바운드 업데이트
      if (this.render.bounds) {
        this.render.bounds.max.x = this.logicalSize.width;
        this.render.bounds.max.y = this.logicalSize.height;
      }
    }
  }

  startGameOverChecker() {
    this.gameOverChecker = new GameOverChecker({
      engine: this.engine,
      balls: this.balls,
      gameOverLine: this.config.gameOverLine,
      checkInterval: 650, // 체크 간격
      connectedThreshold: 8, // 최대 연결 갯수
      onGameOver: () => this.stopGame(),
    });
    this.gameOverChecker.start();
  }

  stopGameOverChecker() {
    if (this.gameOverChecker) {
      this.gameOverChecker.stop();
      this.gameOverChecker = null;
    }
  }
}

/**
 * 게임 오버 여부를 체크한다
 */
class GameOverChecker {
  constructor(config) {
    this.engine = config.engine;
    this.balls = config.balls;
    this.gameOverLine = config.gameOverLine;
    this.onGameOver = config.onGameOver;
    this.connectedThreshold = config.connectedThreshold || 10; // 기본값 10개

    // 체크 주기 설정
    this.checkInterval = config.checkInterval || 300; // ms
    this.lastCheckTime = 0;

    // 게임오버 후보들 (2단계 검증용)
    this.gameOverCandidates = new Set();

    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this.lastCheckTime = Date.now();
  }

  stop() {
    this.isRunning = false;
    this.gameOverCandidates.clear();
  }

  // 메인 체크 함수 (주기적으로 호출)
  update() {
    if (!this.isRunning) return;

    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) return;

    this.lastCheckTime = now;
    this.checkGameOverState();
  }

  overLineOfBall(ball) {
    return ball.position.y;
  }

  checkGameOverState() {
    try {
      // 1. 기본 조건 만족하는 공들 필터링
      const eligibleBalls = this.getEligibleBalls();
      if (eligibleBalls.length === 0) {
        this.gameOverCandidates.clear();
        return;
      }
      console.log(
        'GameOverChecker::checkGameOverState() - eligibleBalls: ',
        Array.from(eligibleBalls).map((ball) => this.debugBall(ball))
      );

      // 2. 현재 모든 활성 충돌 가져오기
      const activeContacts = this.getAllActiveContacts();

      // 3. 접점 그래프 구성
      const contactGraph = this.buildContactGraph(activeContacts);

      // 4. 조건 만족하는 공들의 접점 체인 탐색
      const violatingBalls = this.findViolatingBalls(
        eligibleBalls,
        contactGraph
      );

      // 5. 게임오버 처리
      if (violatingBalls.size > 0) {
        console.log(
          `GameOverChecker::Game Over candidates: ${violatingBalls.size} balls.`
        );
        console.log(
          'GameOverChecker::Candidate details:',
          Array.from(violatingBalls).map((ball) => this.debugBall(ball))
        );
        this.onGameOver();
      }
      // 5. 2단계 검증 처리
      // this.processViolatingBalls(violatingBalls);
    } catch (error) {
      console.error('GameOverChecker error:', error);
    }
  }

  // 기본 조건 만족하는 공들 찾기 (게임오버라인 넘음)
  getEligibleBalls() {
    return this.balls.filter((ball) => {
      /*
        0.01 = 거의 정지 (0.6 픽셀/초)
        0.1  = 매우 느림 (6 픽셀/초)
        1.0  = 느림 (60 픽셀/초)
        5.0  = 보통 (300 픽셀/초)
        10.0 = 빠름 (600 픽셀/초)
       */
      const velocity = Vector.magnitude(ball.velocity);
      const velocityThreshold = 0.25;
      return (
        this.overLineOfBall(ball) < this.gameOverLine &&
        velocity < velocityThreshold
      );
    });
  }

  // Matter.js에서 모든 활성 접점 가져오기
  getAllActiveContacts() {
    return this.engine.pairs.list.filter((pair) => pair.isActive);
  }

  // 공들 간의 접점 관계 그래프 구성
  buildContactGraph(contacts) {
    const graph = new Map();

    // 모든 공 초기화
    this.balls.forEach((ball) => {
      graph.set(ball, new Set());
    });

    // 접점 관계 추가 (공끼리만)
    contacts.forEach((pair) => {
      const ballA = this.balls.find((ball) => ball === pair.bodyA);
      const ballB = this.balls.find((ball) => ball === pair.bodyB);

      if (ballA && ballB) {
        graph.get(ballA).add(ballB);
        graph.get(ballB).add(ballA);
      }
    });

    return graph;
  }

  // 조건 만족 공들의 접점 체인 탐색하여 위반자 찾기
  findViolatingBalls(eligibleBalls, contactGraph) {
    const violatingBalls = new Set();

    eligibleBalls.forEach((ball) => {
      // 각 조건 만족 공으로부터 연결된 모든 공 탐색
      const connectedBalls = this.getConnectedBallsWithDepth(
        ball,
        contactGraph
      );
      if (connectedBalls.size >= this.connectedThreshold) {
        violatingBalls.add(ball);
      }
    });

    return violatingBalls;
  }

  // BFS로 지정된 깊이까지 연결된 공들 찾기
  getConnectedBallsWithDepth(startBall, contactGraph) {
    const visited = new Set();
    const result = new Set();
    const queue = [startBall];

    while (queue.length > 0) {
      const currentBall = queue.shift();
      if (visited.has(currentBall)) {
        continue;
      }
      visited.add(currentBall);

      if (currentBall != startBall) {
        result.add(currentBall);
      }

      // 임계값 도달 시 즉시 반환 (조기 종료)
      if (result.size >= this.connectedThreshold) {
        return result;
      }

      // 연결된 모든 공들 추가 (방향 상관없이)
      const connections = contactGraph.get(currentBall) || new Set();
      connections.forEach((ball) => {
        if (!visited.has(ball)) {
          queue.push(ball);
        }
      });
    }

    // 탐색 완료 후 임계값 미달이면 빈 Set 반환
    return new Set();
  }

  // 2단계 검증 처리
  processViolatingBalls(violatingBalls) {
    // 이전 후보들과 교집합 구하기 (2번 연속 위반자들)
    const confirmedViolators = [];
    this.gameOverCandidates.forEach((candidate) => {
      if (violatingBalls.has(candidate)) {
        confirmedViolators.push(candidate);
      }
    });

    // 확정된 위반자가 있으면 게임 종료
    if (confirmedViolators.length > 0) {
      console.log(
        `GameOverChecker::Game Over confirmed! ${confirmedViolators.length} balls violated conditions for 2 consecutive checks`
      );
      console.log(
        'GameOverChecker::Violating balls:',
        confirmedViolators.map((ball) => this.debugBall(ball))
      );

      this.onGameOver();
      return;
    }

    // 다음 체크를 위해 현재 위반자들을 후보로 저장
    this.gameOverCandidates = new Set(violatingBalls);

    if (violatingBalls.size > 0) {
      console.log(
        `GameOverChecker::Game Over candidates: ${violatingBalls.size} balls. Checking again in ${this.checkInterval}ms...`
      );
      console.log(
        'GameOverChecker::Candidate details:',
        Array.from(violatingBalls).map((ball) => this.debugBall(ball))
      );
    } else {
      // 위반자가 없으면 후보 목록 클리어
      this.gameOverCandidates.clear();
    }
  }

  debugBall(ball) {
    return {
      id: ball.id || 'unknown',
      age: Date.now() - ball.createdAt,
      overLine: this.overLineOfBall(ball) < this.gameOverLine,
      y: ball.position.y,
    };
  }
}
