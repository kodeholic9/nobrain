/**
 * ballPoolEffects.js
 * 볼 게임의 모든 시각적 효과를 관리하는 클래스
 */

const sparkColors = [
  '#f56565', // 소프트 빨강
  '#ed8936', // 소프트 주황
  '#ecc94b', // 소프트 노랑
  '#48bb78', // 소프트 초록
  '#4299e1', // 소프트 파랑
  '#667eea', // 소프트 남색
  '#9f7aea', // 소프트 보라
];

const waveColors = [
  '#e2e8f0', // 쿨톤 오프화이트
  '#f1f5f9', // 블루그레이 화이트
  '#ede9fe', // 라벤더 오프화이트
  '#fef7cd', // 크림 옐로우 화이트
  '#ecfdf5', // 민트그린 화이트
  '#fef2f2', // 로즈 오프화이트
  '#f8fafc', // 소프트 그레이 화이트
];

/**
 * BallPoolEffects.js
 * 볼풀 게임을 위한 간단하고 직관적인 효과 클래스
 */

class BallPoolEffects {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.activeEffects = new Map();

    this.sounds = {};
    this.volume = 0.5; // 기본 볼륨
    this.muted = false; // 음소거 상태
    this.audioReady = false;
  }

  initAudios() {
    if (this.audioReady) return;

    // 모든 사운드를 무음으로 한번 재생
    Object.values(this.sounds).forEach((sound) => {
      sound.volume = 0;
      sound
        .play()
        .then(() => {
          sound.pause();
          sound.currentTime = 0;
          sound.volume = this.volume;
        })
        .catch(() => {});
    });

    this.audioReady = true;
  }

  // 사운드 로드
  loadSound(name, path) {
    this.sounds[name] = new Audio(path);
    this.sounds[name].volume = this.volume;
    this.sounds[name].preload = 'auto';
  }

  // 사운드 재생
  playSound(name) {
    if (this.muted || !this.sounds[name]) return;

    // 이미 재생 중이면 처음부터 다시
    this.sounds[name].currentTime = 0;
    this.sounds[name].play().catch((e) => console.log('Sound play failed:', e));
  }

  // 볼륨 설정
  setVolume(volume) {
    this.volume = volume;
    Object.values(this.sounds).forEach((sound) => {
      sound.volume = volume;
    });
  }

  // 음소거
  toggleMute() {
    this.muted = !this.muted;
  }

  // ========================
  // 주요 효과들
  // ========================

  // 기본 효과
  defaultEffect(ball) {
    const x = ball.position.x;
    const y = ball.position.y;

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
          this.ctx.save();
          this.ctx.globalAlpha = particle.life;
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * 링 웨이브 효과 (충격파)
   */
  ringWave(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;

    const effect = {
      id: `ring_${Date.now()}`,
      particles: [],
      duration: 300,
    };

    //const colors = ['#e2e8f0', '#f1f5f9', '#f8fafc']
    //const colors = ['#A7F3D0', '#BFDBFE', '#DDD6FE']
    //const colors = ['#FBCFE8', '#FDE68A', '#FCA5A5']
    //const colors = ['#93C5FD', '#60A5FA', '#818CF8'];
    const colors = ['#e6c2a6', '#d9b199', '#cc9f8c'];

    for (let i = 0; i < 3; i++) {
      effect.particles.push({
        x,
        y,
        baseSize: size * 0.5,
        maxSize: size * (1 + i * 1.5),
        delay: i * 90, // 시작 간격도 살짝 줄임
        color: colors[i],
        lineWidth: 25 - i,
        startTime: performance.now(),
      });
    }

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      let activeParticles = 0;
      const now = performance.now();

      effect.particles.forEach((p) => {
        const elapsed = now - (p.startTime + p.delay);
        if (elapsed < 0) return;

        const rawProgress = Math.min(elapsed / effect.duration, 1);
        const progress = easeOutCubic(rawProgress);

        if (rawProgress < 1) {
          activeParticles++;

          const currentSize = p.baseSize + (p.maxSize - p.baseSize) * progress;
          const alpha = 1 - rawProgress; // 투명도는 linear로 유지

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.strokeStyle = p.color;
          this.ctx.lineWidth = p.lineWidth;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * 에너지 수렴 효과
   */
  energyConverge(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;
    const effect = {
      id: `energy_${Date.now()}`,
      particles: [],
      duration: 450,
    };

    const particleCount = Math.floor(size / 2) + 20;
    // const colors = ['#e2e8f0', '#f1f5f9', '#ede9fe', '#ecfdf5'];
    // const glowColor = '#fff';

    //const colors = ['#60A5FA', '#A78BFA', '#F472B6', '#34D399']; // 블루, 보라, 핑크, 민트
    // const glowColor = '#A78BFA'

    // const colors = ['#FACC15', '#FB923C', '#F43F5E', '#3B82F6']; // 노랑, 오렌지, 레드, 블루
    // const glowColor = '#FACC15';
    //
    // const colors = ['#34D399', '#10B981', '#6EE7B7', '#A7F3D0'] // 그린·민트 계열
    // const glowColor ='#6EE7B7'

    // const colors = ['#e6c2a6', '#d9b199', '#cc9f8c'];
    // const glowColor = '#FACC15';

    // const colors = ['#6b7280', '#4b5563', '#374151', '#1f2937'];
    // const glowColor = '#9ca3af';

    // const colors = ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db'];
    // const glowColor = '#ffffff';

    // const colors = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'];
    // const glowColor = '#f8fafc';

    // const colors = ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4'];
    //const glowColor = '#ffffff';

    //const colors = ['#e6c2a6', '#d9b199', '#cc9f8c', '#bfa58f', '#b3a192'];

    //const colors = ['#8B5CF6', '#A855F7', '#C084FC', '#E879F9', '#06B6D4'];
    //const colors = ['#1E40AF', '#3B82F6', '#06B6D4', '#0891B2', '#164E63'];
    //const colors = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#5B21B6'];
    //const colors = ['#7C3AED', '#A855F7', '#EC4899', '#F472B6', '#3B82F6'];
    //const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981'];
    const colors = [
      '#64748B',
      '#94A3B8',
      '#CBD5E1',
      '#E2E8F0',
      '#F1F5F9',
      '#f9fafb',
      '#f3f4f6',
    ];
    //const colors = ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'];
    //const colors = ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#F8FAFC'];
    //const colors = ['#71717A', '#A1A1AA', '#D4D4D8', '#E4E4E7', '#FAFAFA'];
    //const colors = ['#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#F4F4F5'];

    // 크기에 따른 decay 값 계산
    const baseDecay = 0.09;
    const sizeMultiplier = Math.max(0.5, Math.min(2.0, size / 15)); // 크기에 따른 배수
    const adjustedDecay = baseDecay / sizeMultiplier; // 크기가 클수록 decay는 작아짐 (오래 지속)

    // 외곽에서 중심으로 수렴하는 파티클
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = size * 2 + Math.random() * size;

      effect.particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        targetX: x,
        targetY: y,
        life: 1,
        decay: adjustedDecay,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'converge',
        speed: 6 + Math.random() * 3,
      });
    }

    // 중심 발광
    /*effect.particles.push({
      x,
      y,
      life: 1,
      decay: 0.015,
      currentSize: 5,
      maxSize: size * 1.5,
      color: glowColor,
      type: 'glow',
    });*/

    const animate = () => {
      let activeParticles = 0;

      effect.particles.forEach((particle) => {
        if (particle.life > 0) {
          activeParticles++;

          if (particle.type === 'converge') {
            const dx = particle.targetX - particle.x;
            const dy = particle.targetY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
              particle.x += (dx / distance) * particle.speed;
              particle.y += (dy / distance) * particle.speed;
              particle.speed *= 1.02;
            }
          } else if (particle.type === 'glow') {
            particle.currentSize +=
              (particle.maxSize - particle.currentSize) * 0.05;
          }

          particle.life -= particle.decay;

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = particle.life;

          if (particle.type === 'converge') {
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
          } else if (particle.type === 'glow') {
            const gradient = this.ctx.createRadialGradient(
              particle.x,
              particle.y,
              0,
              particle.x,
              particle.y,
              particle.currentSize
            );
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(1, 'transparent');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(
              particle.x,
              particle.y,
              particle.currentSize,
              0,
              Math.PI * 2
            );
            this.ctx.fill();
          }

          this.ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // 나선형 연기 소용돌이
  spiralSmoke(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;

    const effect = {
      id: `spiral_${Date.now()}`,
      particles: [],
      duration: 1500,
    };

    // 부드러운 갈색 톤의 연기
    const colors = ['#e6c2a6', '#d9b199', '#cc9f8c'];

    // 나선형으로 배치된 파티클들
    for (let i = 0; i < 12; i++) {
      const baseAngle = ((Math.PI * 2) / 12) * i;
      const spiralTurns = 2; // 2바퀴 돌기

      effect.particles.push({
        x,
        y,
        baseAngle,
        spiralProgress: 0,
        maxRadius: size * (2 + Math.random() * 1),
        baseSize: size * 0.2,
        maxSize: size * (0.8 + Math.random() * 0.4),
        color: colors[i % colors.length],
        startTime: performance.now(),
        delay: i * 40,
        spiralTurns,
      });
    }

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const easeInQuart = (t) => t * t * t * t;

    const animate = () => {
      let activeParticles = 0;
      const now = performance.now();

      effect.particles.forEach((p) => {
        const elapsed = now - (p.startTime + p.delay);
        if (elapsed < 0) return;

        const rawProgress = Math.min(elapsed / effect.duration, 1);
        const spiralProgress = easeOutExpo(rawProgress);
        const sizeProgress = easeInQuart(rawProgress);

        if (rawProgress < 1) {
          activeParticles++;

          // 나선형 위치 계산
          const currentRadius = p.maxRadius * spiralProgress;
          const currentAngle =
            p.baseAngle + spiralProgress * p.spiralTurns * Math.PI * 2;

          const currentX = x + Math.cos(currentAngle) * currentRadius;
          const currentY =
            y +
            Math.sin(currentAngle) * currentRadius -
            spiralProgress * size * 2; // 위로 올라감

          const currentSize =
            p.baseSize + (p.maxSize - p.baseSize) * sizeProgress;
          const alpha = Math.max(0, 0.9 - rawProgress * 0.9);

          // 부드러운 연기 입자 그리기
          this.ctx.save();
          this.ctx.globalAlpha = alpha;

          const gradient = this.ctx.createRadialGradient(
            currentX,
            currentY,
            0,
            currentX,
            currentY,
            currentSize
          );
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, 'transparent');

          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(currentX, currentY, currentSize, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // ========================================
  // 이미지가 필요하지 않은 버전들
  // ========================================

  // 1. 파편으로 흩어지는 효과
  fragmentDisappear(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const ballRadius = ball.circleRadius || 20;
    const fragments = [];

    // 파편 생성
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      fragments.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * (3 + Math.random() * 5),
        vy: Math.sin(angle) * (3 + Math.random() * 5),
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        size: ballRadius * 0.2 + Math.random() * ballRadius * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: '#ff6b6b',
      });
    }

    const animate = () => {
      let activeFragments = 0;

      fragments.forEach((fragment) => {
        if (fragment.life > 0) {
          activeFragments++;

          // 물리 업데이트
          fragment.x += fragment.vx;
          fragment.y += fragment.vy;
          fragment.vy += 0.3; // 중력
          fragment.vx *= 0.98; // 공기 저항
          fragment.rotation += fragment.rotationSpeed;
          fragment.life -= fragment.decay;

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = fragment.life;
          this.ctx.translate(fragment.x, fragment.y);
          this.ctx.rotate(fragment.rotation);
          this.ctx.fillStyle = fragment.color;
          this.ctx.fillRect(
            -fragment.size / 2,
            -fragment.size / 2,
            fragment.size,
            fragment.size
          );
          this.ctx.restore();
        }
      });

      if (activeFragments > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // 2. 먼지로 흩어지는 효과
  dustDisappear(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const ballRadius = ball.circleRadius || 20;
    const particles = [];

    // 먼지 파티클 생성
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * ballRadius;
      particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 1,
        decay: 0.01 + Math.random() * 0.02,
        size: 1 + Math.random() * 3,
        color: `rgba(${100 + Math.random() * 100}, ${80 + Math.random() * 80}, ${60 + Math.random() * 60}, ${0.5 + Math.random() * 0.5})`,
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
          particle.vy += 0.1; // 약한 중력
          particle.vx *= 0.995; // 공기 저항
          particle.life -= particle.decay;

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = particle.life * 0.7;
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // 3. 페이드 아웃 + 축소 효과
  fadeAndShrink(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const ballRadius = ball.circleRadius || 20;
    const ballColor = '#CBD5E1';

    let scale = 1;
    let alpha = 1;
    const duration = 60; // 프레임 수
    let frame = 0;

    const animate = () => {
      if (frame < duration) {
        frame++;
        const progress = frame / duration;

        // 이징 함수 적용 (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);

        scale = 1 - easeOut;
        alpha = 1 - progress;

        // 공 그리기
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = ballColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, ballRadius * scale, 0, Math.PI * 2);
        this.ctx.fill();

        // 외곽 링 효과
        this.ctx.strokeStyle = ballColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, ballRadius * (1 + progress * 0.5), 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();

        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // ========================================
  // 이미지가 필요한 버전들
  // ========================================

  // 4. 이미지 픽셀 분해 효과
  pixelDisappear(ball, ballImage) {
    const x = ball.position.x;
    const y = ball.position.y;
    const ballRadius = ball.circleRadius || 20;

    if (!ballImage) return this.fragmentDisappear(ball);

    // 임시 캔버스에 이미지 그리기
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const size = ballRadius * 2;
    tempCanvas.width = size;
    tempCanvas.height = size;

    tempCtx.drawImage(ballImage, 0, 0, size, size);
    const imageData = tempCtx.getImageData(0, 0, size, size);
    const pixels = [];

    // 픽셀 데이터 추출 (일부만)
    for (let px = 0; px < size; px += 3) {
      for (let py = 0; py < size; py += 3) {
        const i = (py * size + px) * 4;
        if (imageData.data[i + 3] > 50) {
          // 알파값이 있는 픽셀만
          pixels.push({
            x: x - ballRadius + px,
            y: y - ballRadius + py,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 2,
            life: 1,
            decay: 0.015 + Math.random() * 0.01,
            color: `rgba(${imageData.data[i]}, ${imageData.data[i + 1]}, ${imageData.data[i + 2]}, 1)`,
            size: 2 + Math.random() * 2,
          });
        }
      }
    }

    const animate = () => {
      let activePixels = 0;

      pixels.forEach((pixel) => {
        if (pixel.life > 0) {
          activePixels++;

          pixel.x += pixel.vx;
          pixel.y += pixel.vy;
          pixel.vy += 0.2;
          pixel.life -= pixel.decay;

          this.ctx.save();
          this.ctx.globalAlpha = pixel.life;
          this.ctx.fillStyle = pixel.color;
          this.ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
          this.ctx.restore();
        }
      });

      if (activePixels > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // 5. 이미지 조각 분해 효과
  imageFragmentDisappear(ball, ballImage) {
    const x = ball.position.x;
    const y = ball.position.y;
    const ballRadius = ball.circleRadius || 20;

    if (!ballImage) return this.fragmentDisappear(ball);

    const fragments = [];
    const pieces = 8; // 조각 개수

    for (let i = 0; i < pieces; i++) {
      for (let j = 0; j < pieces; j++) {
        fragments.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 2,
          life: 1,
          decay: 0.012 + Math.random() * 0.008,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          sourceX: ((ballRadius * 2) / pieces) * i,
          sourceY: ((ballRadius * 2) / pieces) * j,
          sourceW: (ballRadius * 2) / pieces,
          sourceH: (ballRadius * 2) / pieces,
          scale: 1,
        });
      }
    }

    const animate = () => {
      let activeFragments = 0;

      fragments.forEach((fragment) => {
        if (fragment.life > 0) {
          activeFragments++;

          fragment.x += fragment.vx;
          fragment.y += fragment.vy;
          fragment.vy += 0.3;
          fragment.rotation += fragment.rotationSpeed;
          fragment.scale = fragment.life; // 크기도 줄어듦
          fragment.life -= fragment.decay;

          this.ctx.save();
          this.ctx.globalAlpha = fragment.life;
          this.ctx.translate(fragment.x, fragment.y);
          this.ctx.rotate(fragment.rotation);
          this.ctx.scale(fragment.scale, fragment.scale);

          this.ctx.drawImage(
            ballImage,
            fragment.sourceX,
            fragment.sourceY,
            fragment.sourceW,
            fragment.sourceH,
            -fragment.sourceW / 2,
            -fragment.sourceH / 2,
            fragment.sourceW,
            fragment.sourceH
          );

          this.ctx.restore();
        }
      });

      if (activeFragments > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // 6. 이미지 디졸브 효과
  imageDissolve(ball, ballImage) {
    const x = ball.position.x;
    const y = ball.position.y;
    const ballRadius = ball.circleRadius || 20;

    if (!ballImage) return this.fadeAndShrink(ball);

    let dissolveProgress = 0;
    const duration = 80;
    const particles = [];

    // 랜덤 파티클 생성
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * ballRadius;
      particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2 - 1,
        life: 1,
        delay: Math.random() * 20, // 시차
        size: 3 + Math.random() * 4,
      });
    }

    const animate = () => {
      if (dissolveProgress < duration) {
        dissolveProgress++;
        const progress = dissolveProgress / duration;

        // 이징 함수 적용 (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);

        // 스케일과 알파 계산
        const scale = 1 - easeOut;
        const alpha = 1 - progress;
        const imageSize = ballRadius * 2 * scale;

        // 축소되는 이미지 그리기
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(
          ballImage,
          x - imageSize / 2,
          y - imageSize / 2,
          imageSize,
          imageSize
        );
        this.ctx.restore();

        // 외곽 링 효과 (fadeAndShrink와 유사)
        if (progress < 0.8) {
          // 80%까지만 링 표시
          this.ctx.save();
          this.ctx.globalAlpha = (1 - progress) * 0.5;
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.beginPath();
          this.ctx.arc(x, y, ballRadius * (1 + progress * 0.3), 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
        }

        // 파티클 효과
        particles.forEach((particle) => {
          if (dissolveProgress > particle.delay && particle.life > 0) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1;
            particle.life -= 0.02;

            this.ctx.save();
            this.ctx.globalAlpha = particle.life * 0.7;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
          }
        });

        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}

export default BallPoolEffects;
