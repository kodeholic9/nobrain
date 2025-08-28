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
  gravity: 1.1,
  restitution: 0.2,
  ballFriction: 0.05,
  wallFriction: 0,
  frictionAir: 0,

  // 엔진 성능
  velocityIterations: 6,
  positionIterations: 8,
  constraintIterations: 4,

  // 안정성
  enableSleeping: true,
  sleepThreshold: 120,
  timeScale: 1.0,
  density: 0.01,
  frictionStatic: 0.1,
  maxVelocity: 20,
  correctionFactor: 0.4,

  // 감쇠
  dampingFactor: 0.99,
  angularDamping: 0.1,
  linearDamping: 0.01,
  slop: 0.05,

  // 게임 설정
  mergeDistance: 1,
  sizeMultiplier: 1,
  wallThickness: 20,
  gameOverLine: 120,
  debugMode: false,
};

// 숫자별 색상과 크기 설정
const ballConfig = {
  2: { color: '#f4a7e4', size: 18, point: 1, imgPath: './ball.png' },
  4: { color: '#a6e98f', size: 22, point: 2, imgPath: './ball.png' },
  8: { color: '#6ce2e2', size: 25, point: 4, imgPath: './ball.png' },
  16: { color: '#87b9ee', size: 28, point: 6, imgPath: './ball.png' },
  32: { color: '#ec9a8a', size: 36, point: 8, imgPath: './ball.png' },
  64: { color: '#a8a0f6', size: 45, point: 10, imgPath: './ball.png' },
  128: { color: '#c5c1bb', size: 54, point: 12, imgPath: './ball.png' },
  256: { color: '#fbd5a2', size: 63, point: 14, imgPath: './ball.png' },
  512: { color: '#ffb8c1', size: 71, point: 16, imgPath: './ball.png' },
  1024: { color: '#9bcf1e', size: 88, point: 18, imgPath: './ball.png' },
  2048: { color: '#33a64b', size: 110, point: 20, imgPath: './ball.png' },
};

/**
 * 핵심 게임 엔진 클래스
 */
export class BallGameEngine {
  constructor(canvasEl, config = {}) {
    this.canvas = canvasEl;
    this.config = { ...defaultGameConfig, ...config };
    this.callbacks = {};

    // 게임 상태
    this.gameStartTime = null;
    this.highestBallValue = 0;
    this.balls = [];
    this.walls = [];
    this.score = 0;
    this.level = 1;
    this.isDropping = false;
    this.gameOver = false;
    this.dropX = 200;
    this.armingBalls = [];

    // 바인드된 함수들을 미리 저장
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);

    this.init();
  }

  // 콜백 등록 메서드
  on(eventName, callback) {
    if (!this.callbacks[eventName]) {
      this.callbacks[eventName] = [];
    }
    this.callbacks[eventName].push(callback);
  }

  // 콜백 실행 메서드
  emit(eventName, ...args) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName].forEach((callback) => callback(...args));
    }
  }

  init() {
    // this.setupBallConfig();
    this.setupEngine();
    this.setupRender();
    this.setupEventListeners();
    this.createWalls();
    this.startGame();
    this.reset();
  }

  setupBallConfig() {
    Object.entries(ballConfig).forEach(([key, config]) => {
      if (!config.image && config.imgPath) {
        config.image = new Image();
        config.image.src = config.imgPath;
      }
    });
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
        width: 400,
        height: 600,
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
      },
    });
  }

  setupEventListeners() {
    // 마우스 이벤트
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', this.boundHandleClick);

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

    const thickness = this.config.wallThickness;
    this.walls = [
      Bodies.rectangle(200, 600 + thickness / 2, 400, thickness, {
        isStatic: true,
        render: { fillStyle: '#ddd' },
        friction: this.config.wallFriction,
        label: 'ground',
      }),
      Bodies.rectangle(-thickness / 2, 300, thickness, 600, {
        isStatic: true,
        render: { fillStyle: '#ddd' },
        friction: this.config.wallFriction,
        label: 'leftWall',
      }),
      Bodies.rectangle(400 + thickness / 2, 300, thickness, 600, {
        isStatic: true,
        render: { fillStyle: '#ddd' },
        friction: this.config.wallFriction,
        label: 'rightWall',
      }),
    ];

    World.add(this.world, this.walls);
  }

  createBall(value, x, y, hasCollided = false) {
    const bcfg = ballConfig[value];
    const radius = bcfg.size * this.config.sizeMultiplier;

    const ball =
      value === 0
        ? this.createEllipse(x, y, radius)
        : this.createCircle(x, y, radius);

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

  createCircle(x, y, radius) {
    return Bodies.circle(x, y, radius, {
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
      World.remove(this.world, ball);
      this.balls.splice(index, 1);
    }
  }

  updateDropZone(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.dropX = event.clientX - rect.left;
    this.dropX = Math.max(30, Math.min(370, this.dropX));
    this.emit('dropZoneUpdate', this.dropX);
  }

  dropBall(event) {
    if (this.isDropping || this.gameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    this.dropX = Math.max(30, Math.min(370, event.clientX - rect.left));

    this.isDropping = true;
    const ball = this.createBall(this.armingBalls.shift(), this.dropX, 80);

    const ballValue = this.pickRandomBall();
    this.armingBalls.push(ballValue);

    this.emit('ballDropped', ball);
    this.emit('nextBallUpdate', this.armingBalls);

    setTimeout(() => {
      this.isDropping = false;
    }, 200);
  }

  makeArmingBalls() {
    return [this.pickRandomBall(), this.pickRandomBall()];
  }

  pickRandomBall() {
    const rand = Math.random();
    const ballValues =
      this.highestBallValue >= 32 ? [2, 4, 8, 16, 32] : [2, 4, 8, 16];
    const index = Math.floor(Math.random() * ballValues.length);

    return ballValues[index];
  }

  handleCollision(event) {
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

    // 충돌한 공들 합치기
    mergeQueue.forEach((pair) => {
      this.mergeBalls(pair.ballA, pair.ballB);
    });
  }

  mergeBalls(ballA, ballB) {
    if (!this.balls.includes(ballA) || !this.balls.includes(ballB)) return;
    if (!ballA || !ballB || ballA.ballValue !== ballB.ballValue) return;

    const newValue = ballA.ballValue * 2;
    if (newValue > 2048) return;

    // 목표 위치 및 속도 계산
    const originalBall =
      ballA.rolling.collidedAt > ballB.rolling.collidedAt ? ballA : ballB;
    const targetBall =
      ballA.rolling.collidedAt > ballB.rolling.collidedAt ? ballB : ballA;

    // 제거 대상의 근처 공들 깨우기
    this.wakeNearbyBalls([ballA, ballB], 150);

    // 공 제거 및 새 공 생성
    this.removeBall(ballA);
    this.removeBall(ballB);

    // 파티클 애니메이션 효과
    this.createParticleEffect(targetBall.position.x, targetBall.position.y);

    // 점수 갱신 및 이벤트 발생
    this.score += ballConfig[newValue].point;
    this.emit('scoreUpdate', this.score, this.level);

    // 시간 지연을 두고 새 공 생성 (애니메이션 효과를 위해)
    setTimeout(() => {
      const newBall = this.createBall(
        newValue,
        targetBall.position.x,
        targetBall.position.y,
        true
      );

      // 원래 공의 속도 유지
      const originalVelocity = {
        x: originalBall.velocity.x,
        y: originalBall.velocity.y,
      };
      Matter.Body.setVelocity(newBall, originalVelocity);
    }, 50);
  }

  wakeNearbyBalls(ballList, radius = null) {
    if (!ballList || ballList.length === 0) return;
    ballList.forEach((x) => {
      const nearby = this.findNearbyBalls(x, radius);
      nearby.forEach((y) => {
        if (this.balls.includes(y) && y.isSleeping) {
          console.log('Wake up nearby ball', y.id);
          Sleeping.set(y, false);
        }
      });
    });
  }

  findNearbyBalls(targetBall, radius = null) {
    const nearby = [];
    const checkRadius = radius || targetBall.circleRadius * 2.2;

    this.balls.forEach((ball) => {
      if (ball === targetBall) return;

      const distance = Math.sqrt(
        Math.pow(ball.position.x - targetBall.position.x, 2) +
          Math.pow(ball.position.y - targetBall.position.y, 2)
      );

      if (distance <= checkRadius) {
        nearby.push(ball);
      }
    });

    return nearby;
  }

  // 파티클 폭발 효과 (기본)
  createParticleExplosion(x, y) {
    const particleCount = 12;
    const particleSize = 3;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 2 * Math.PI + Math.random() * 0.5;
      const speed = 6 + Math.random() * 8;
      const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };

      const particle = Bodies.circle(x, y, particleSize, {
        isSensor: true,
        render: {
          fillStyle: `hsl(${Math.random() * 60 + 20}, 100%, 60%)`,
        },
      });

      World.add(this.world, particle);
      Body.setVelocity(particle, velocity);

      setTimeout(() => {
        World.remove(this.world, particle);
      }, 500);
    }
  }

  // 반짝이는 별 효과
  createStarBurst(x, y) {
    const starCount = 8;
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00BFFF'];

    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * 2 * Math.PI;
      const distance = 40 + Math.random() * 20;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;

      // 별 모양 파티클
      const particle = Bodies.circle(x, y, 2, {
        isSensor: true,
        render: {
          fillStyle: colors[Math.floor(Math.random() * colors.length)],
        },
      });

      World.add(this.world, particle);

      // 애니메이션으로 이동
      const startTime = Date.now();
      const duration = 300;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1) {
          const currentX = x + (endX - x) * progress;
          const currentY = y + (endY - y) * progress;
          Body.setPosition(particle, { x: currentX, y: currentY });
          requestAnimationFrame(animate);
        } else {
          World.remove(this.world, particle);
        }
      };

      animate();
    }
  }

  // 연기 구름 효과
  createSmokeCloud(x, y) {
    const cloudCount = 6;
    const baseColor = [200, 200, 200];

    for (let i = 0; i < cloudCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 30;
      const size = 8 + Math.random() * 12;
      const alpha = 0.7 - distance / 50;

      const particle = Bodies.circle(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        size,
        {
          isSensor: true,
          render: {
            fillStyle: `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`,
          },
        }
      );

      World.add(this.world, particle);

      // 위로 천천히 떠오르면서 사라지기
      Body.setVelocity(particle, {
        x: Math.random() * 2 - 1,
        y: -2 - Math.random() * 3,
      });

      setTimeout(() => {
        World.remove(this.world, particle);
      }, 800);
    }
  }

  // 원형 파동 효과
  createRippleEffect(x, y) {
    const ctx = this.render.canvas.getContext('2d');
    const ripples = [];

    for (let i = 0; i < 3; i++) {
      ripples.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: 50 + i * 15,
        alpha: 1,
        delay: i * 100,
      });
    }

    const startTime = Date.now();
    const duration = 600;

    const animateRipples = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        // 캔버스에 직접 그리기 (다음 프레임에서 자동으로 지워짐)
        ripples.forEach((ripple) => {
          if (elapsed > ripple.delay) {
            const progress = Math.min(
              (elapsed - ripple.delay) / (duration - ripple.delay),
              1
            );
            ripple.radius = ripple.maxRadius * progress;
            ripple.alpha = 1 - progress;

            ctx.save();
            ctx.globalAlpha = ripple.alpha;
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });

        requestAnimationFrame(animateRipples);
      }
    };

    animateRipples();
  }

  // 하트 파티클 효과
  createHeartEffect(x, y) {
    const heartCount = 5;
    const colors = ['#FF69B4', '#FF1493', '#FFB6C1', '#FFC0CB'];

    for (let i = 0; i < heartCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 3 + Math.random() * 4;
      const size = 6 + Math.random() * 4;

      // 하트 모양 대신 원형으로 대체 (Matter.js에서 하트 모양 생성이 복잡함)
      const particle = Bodies.circle(x, y, size, {
        isSensor: true,
        render: {
          fillStyle: colors[Math.floor(Math.random() * colors.length)],
        },
      });

      World.add(this.world, particle);

      const velocity = {
        x: Math.cos(angle) * speed * 0.5,
        y: Math.sin(angle) * speed - 3, // 위로 떠오르기
      };

      Body.setVelocity(particle, velocity);

      setTimeout(() => {
        World.remove(this.world, particle);
      }, 700);
    }
  }

  // 불꽃놀이 효과
  createFirework(x, y) {
    const layers = 3;
    const particlesPerLayer = 6;

    for (let layer = 0; layer < layers; layer++) {
      setTimeout(() => {
        for (let i = 0; i < particlesPerLayer; i++) {
          const angle = (i / particlesPerLayer) * 2 * Math.PI;
          const speed = 8 + layer * 3;
          const size = 3 - layer;
          const hue = (layer * 60) % 360;

          const particle = Bodies.circle(x, y, size, {
            isSensor: true,
            render: {
              fillStyle: `hsl(${hue}, 100%, 60%)`,
            },
          });

          World.add(this.world, particle);

          const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed - 2,
          };

          Body.setVelocity(particle, velocity);

          setTimeout(() => {
            World.remove(this.world, particle);
          }, 600);
        }
      }, layer * 100);
    }
  }

  // 캔버스 직접 그리기 효과 (성능 최적화)
  createCanvasEffect(x, y) {
    const ctx = this.render.canvas.getContext('2d');
    const particles = [];

    // 파티클 데이터만 생성 (Matter.js 물체 생성 없음)
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 3,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        size: 2 + Math.random() * 4,
        color: `hsl(${Math.random() * 360}, 100%, 60%)`,
      });
    }

    const animate = () => {
      let activeParticles = 0;

      particles.forEach((particle) => {
        if (particle.life > 0) {
          activeParticles++;

          // 위치 업데이트
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.2; // 중력
          particle.life -= particle.decay;

          // 그리기
          ctx.save();
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // 메인 파티클 효과 메서드 (원하는 효과 선택)
  createParticleEffect(x, y) {
    // 여기서 원하는 효과를 선택하세요
    // this.createFirework(x, y);  // 기본값: 불꽃놀이 효과

    // 다른 효과들:
    // this.createParticleExplosion(x, y);
    // this.createStarBurst(x, y);
    // this.createSmokeCloud(x, y);
    // this.createRippleEffect(x, y);
    // this.createHeartEffect(x, y);
    this.createCanvasEffect(x, y);
  }

  handleAfterUpdate() {
    this.checkGameOver();
    this.limitVelocities();
  }

  checkGameOver() {
    if (this.isDropping || this.gameOver) return;

    for (const ball of this.balls) {
      const velocity = Vector.magnitude(ball.velocity);

      if (ball.position.y < this.config.gameOverLine && velocity < 0.05) {
        this.gameOver = true;
        this.balls.forEach((b) => {
          Body.setStatic(b, true);
        });
        this.emit('gameOver', this.score);
        break;
      }
    }
  }

  limitVelocities() {
    this.balls.forEach((ball) => {
      const velocity = Vector.magnitude(ball.velocity);
      if (velocity > this.config.maxVelocity) {
        const scale = this.config.maxVelocity / velocity;
        Body.setVelocity(ball, Vector.mult(ball.velocity, scale));
      }

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

  handleAfterRender() {
    if (!this.config.debugMode) {
      this.drawBalls();
      //this.drawImgBalls();
    }
    this.drawGameOverLine();

    if (this.config.debugMode) {
      this.emit('debugUpdate', this.balls);
    }
  }

  drawBalls() {
    const ctx = this.render.canvas.getContext('2d');

    this.balls.forEach((ball) => {
      const pos = ball.position;
      const bcfg = ballConfig[ball.ballValue];
      const radius = bcfg.size * this.config.sizeMultiplier;

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
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
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
      ctx.imageSmoothingEnabled = false; // 안티앨리어싱 끄기
      ctx.translate(pos.x, pos.y);

      // 충돌 후에만 회전 적용
      if (rolling.collidedAt) {
        ctx.rotate(rolling.displayAngle);
      }

      // 이미지 그리기 (중심점 기준)
      const imageSize = radius * 2;
      ctx.drawImage(
        config.image,
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
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  drawGameOverLine() {
    const ctx = this.render.canvas.getContext('2d');
    ctx.save();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, this.config.gameOverLine);
    ctx.lineTo(400, this.config.gameOverLine);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  wakeAllBalls() {
    this.balls.forEach((ball) => {
      if (ball.isSleeping) {
        Sleeping.set(ball, false);
      }
    });
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
    }, 1000);

    console.log(`${this.balls.length}개 공에 강한 흔들기 적용!`);
  }

  // 설정 업데이트
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.applyConfigChanges();
  }

  applyConfigChanges() {
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
      wall.friction = this.config.wallFriction;
    });

    // 벽 두께가 변경된 경우 벽 재생성
    this.createWalls();
  }

  handleClick(event) {
    this.dropBall(event);
  }

  handleMouseMove(event) {
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
    this.armingBalls = this.makeArmingBalls();

    this.emit('gameReset');
    this.emit('scoreUpdate', this.score, this.level);
    this.emit('nextBallUpdate', this.armingBalls);
  }

  startGame() {
    // Render.run(this.render);
    // Engine.run(this.engine);
    Render.run(this.render);
    Runner.run(this.engine);
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
      this.canvas.removeEventListener('click', this.boundHandleClick);
      this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    }
  }

  // 게임 상태 반환
  getGameState() {
    return {
      score: this.score,
      level: this.level,
      balls: this.balls,
      gameOver: this.gameOver,
      isDropping: this.isDropping,
      armingBalls: this.armingBalls,
      highestBallValue: this.highestBallValue,
    };
  }
}
