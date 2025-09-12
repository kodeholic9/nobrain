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
      duration: 800,
    };

    //const colors = ['#e2e8f0', '#f1f5f9', '#f8fafc']
    //const colors = ['#A7F3D0', '#BFDBFE', '#DDD6FE']
    //const colors = ['#FBCFE8', '#FDE68A', '#FCA5A5']
    const colors = ['#93C5FD', '#60A5FA', '#818CF8'];

    for (let i = 0; i < 3; i++) {
      effect.particles.push({
        x,
        y,
        baseSize: size * 0.5,
        maxSize: size * (3 + i * 1.5),
        delay: i * 120, // 시작 간격도 살짝 줄임
        color: colors[i],
        lineWidth: 4 - i,
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
   * 폭발 파편 효과
   */
  explosion(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;
    const effect = {
      id: `explosion_${Date.now()}`,
      particles: [],
      duration: 2000,
    };

    const fragmentCount = Math.min(20, Math.floor(size / 2));
    const colors = [
      '#e2e8f0',
      '#f1f5f9',
      '#ede9fe',
      '#fef7cd',
      '#ecfdf5',
      '#fef2f2',
      '#f8fafc',
    ];

    for (let i = 0; i < fragmentCount; i++) {
      const angle =
        (Math.PI * 2 * i) / fragmentCount + (Math.random() - 0.5) * 0.8;
      const speed = 8 + Math.random() * 12;

      effect.particles.push({
        x: x + (Math.random() - 0.5) * size * 0.3,
        y: y + (Math.random() - 0.5) * size * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        size: Math.max(3, size * 0.1 + Math.random() * 5),
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'fragment',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
      });
    }

    const animate = () => {
      let activeParticles = 0;

      effect.particles.forEach((particle) => {
        if (particle.life > 0) {
          activeParticles++;

          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.3; // 중력
          particle.vx *= 0.98; // 공기저항
          particle.rotation += particle.rotationSpeed;
          particle.life -= particle.decay;

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = particle.life;
          this.ctx.translate(particle.x, particle.y);
          this.ctx.rotate(particle.rotation);

          this.ctx.fillStyle = particle.color;
          this.ctx.strokeStyle = '#999999';
          this.ctx.lineWidth = 1;
          this.ctx.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size
          );
          this.ctx.strokeRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size
          );
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
   * 스파크 버스트 효과
   */
  sparkBurst(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;
    const effect = {
      id: `spark_${Date.now()}`,
      particles: [],
      duration: 1200,
    };

    const sparkCount = Math.floor(size / 3) + 8;
    // const colors = ['#e2e8f0', '#f1f5f9', '#ede9fe', '#fef7cd', '#ecfdf5', '#fef2f2', '#f8fafc'];
    // const colors = ['#00F5D4', '#9B5DE5', '#F15BB5', '#FEE440', '#00BBF9', '#FF006E']
    const colors = ['#FF4D6D', '#4D96FF', '#6BCB77', '#FFD93D', '#845EC2'];

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 15;

      effect.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'spark',
      });
    }

    const animate = () => {
      let activeParticles = 0;

      effect.particles.forEach((particle) => {
        if (particle.life > 0) {
          activeParticles++;

          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.2;
          particle.vx *= 0.96;
          particle.life -= particle.decay;

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = particle.life;
          this.ctx.fillStyle = particle.color;
          this.ctx.shadowColor = particle.color;
          this.ctx.shadowBlur = 6;
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
   * 에너지 수렴 효과
   */
  energyConverge(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;
    const effect = {
      id: `energy_${Date.now()}`,
      particles: [],
      duration: 1800,
    };

    const particleCount = Math.floor(size / 2) + 15;
    const colors = ['#e2e8f0', '#f1f5f9', '#ede9fe', '#ecfdf5'];
    const glowColor = '#fff';

    //const colors = ['#60A5FA', '#A78BFA', '#F472B6', '#34D399'] // 블루, 보라, 핑크, 민트
    //const glowColor = '#A78BFA'

    // const colors = ['#FACC15', '#FB923C', '#F43F5E', '#3B82F6'] // 노랑, 오렌지, 레드, 블루
    // const glowColor = '#FACC15'
    //
    // const colors = ['#34D399', '#10B981', '#6EE7B7', '#A7F3D0'] // 그린·민트 계열
    // const glowColor ='#6EE7B7'

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
        decay: 0.012,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'converge',
        speed: 6 + Math.random() * 4,
      });
    }

    // 중심 발광
    effect.particles.push({
      x,
      y,
      life: 1,
      decay: 0.015,
      currentSize: 5,
      maxSize: size * 1.5,
      color: glowColor,
      type: 'glow',
    });

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

  /**
   * 회전 나선 효과
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @param {number} size - 볼 크기
   */
  spiralSpin(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;
    const effect = {
      id: `spiral_${Date.now()}`,
      particles: [],
      duration: 2000,
    };

    const spiralCount = 8;

    for (let i = 0; i < spiralCount; i++) {
      effect.particles.push({
        x,
        y,
        radius: 20 + i * 10,
        angle: (Math.PI * 2 * i) / spiralCount,
        angularSpeed: 0.2 + Math.random() * 0.1,
        life: 1,
        decay: 0.01,
        size: 3 + Math.random() * 2,
        color: ['#e2e8f0', '#f1f5f9', '#ede9fe'][i % 3],
        type: 'spiral',
      });
    }

    const animate = () => {
      if (!this.activeEffects.has(effect.id)) return;

      let activeParticles = 0;

      effect.particles.forEach((particle) => {
        if (particle.life > 0) {
          activeParticles++;

          particle.angle += particle.angularSpeed;
          particle.radius += 1;

          const renderX =
            particle.x + Math.cos(particle.angle) * particle.radius;
          const renderY =
            particle.y + Math.sin(particle.angle) * particle.radius;

          particle.life -= particle.decay;

          this.ctx.save();
          this.ctx.globalAlpha = particle.life;
          this.ctx.fillStyle = particle.color;
          this.ctx.shadowColor = particle.color;
          this.ctx.shadowBlur = 4;
          this.ctx.beginPath();
          this.ctx.arc(renderX, renderY, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      });

      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      } else {
        this.activeEffects.delete(effect.id);
      }
    };

    animate();
  }

  /**
   * 떠오르는 기포 효과
   */
  bubbleRise(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const size = ball.circleRadius;
    const effect = {
      id: `bubble_${Date.now()}`,
      particles: [],
      duration: 3000,
    };

    const bubbleCount = Math.floor(size / 4) + 5;

    for (let i = 0; i < bubbleCount; i++) {
      effect.particles.push({
        x: x + (Math.random() - 0.5) * size,
        y: y,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 3,
        life: 1,
        decay: 0.005 + Math.random() * 0.005,
        size: 4 + Math.random() * 8,
        color: ['#FACC15', '#FB923C', '#F43F5E'][Math.floor(Math.random() * 3)],
        type: 'bubble',
        wobble: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      let activeParticles = 0;

      effect.particles.forEach((particle) => {
        if (particle.life > 0) {
          activeParticles++;

          particle.x += particle.vx + Math.sin(particle.wobble) * 0.5;
          particle.y += particle.vy;
          particle.wobble += 0.1;
          particle.life -= particle.decay;

          // 그리기
          this.ctx.save();
          this.ctx.globalAlpha = particle.life * 0.7;
          this.ctx.strokeStyle = particle.color;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.stroke();

          // 버블 하이라이트
          this.ctx.fillStyle = particle.color;
          this.ctx.globalAlpha = particle.life * 0.3;
          this.ctx.beginPath();
          this.ctx.arc(
            particle.x - particle.size * 0.3,
            particle.y - particle.size * 0.3,
            particle.size * 0.2,
            0,
            Math.PI * 2
          );
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
}

export default BallPoolEffects;
