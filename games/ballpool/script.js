import { BallGameEngine } from './modules/ballPoolEngine.js';

// 게임 인스턴스
let gameEngine;

// UI 업데이트 함수들
function updateUI() {
  const state = gameEngine.getGameState();
  document.getElementById('score').textContent = state.score.toLocaleString();
  document.getElementById('level').textContent = `Level ${state.level}`;
}

function updateDropZone(dropX) {
  const dropZone = document.getElementById('dropZone');
  dropZone.style.left = `${dropX}px`;
}

function updateNextBall(ballValue) {
  if (!ballValue) return;
  const nextBallEl = document.getElementById('nextBall');
  const bcfg = ballConfig[ballValue];
  nextBallEl.style.backgroundColor = bcfg.color;
  nextBallEl.textContent = ballValue;
  nextBallEl.style.fontSize = `${Math.min(bcfg.size * 0.4, 14)}px`;
}

function showGameOver(finalScore) {
  document.getElementById('finalScore').textContent =
    finalScore.toLocaleString();
  document.getElementById('gameOver').style.display = 'block';
}

function hideGameOver() {
  document.getElementById('gameOver').style.display = 'none';
}

function shake() {
  console.log('흔들기 버튼 클릭됨');
  if (gameEngine) {
    gameEngine.shakeAllBalls(50); // 강하게 흔들기
  }
}

function debugBodies(balls) {
  const bodiesDiv = document.getElementById('bodies');

  // 기존 내용 지우기
  bodiesDiv.innerHTML = '';

  // 헤더 추가
  const header = document.createElement('h3');
  header.textContent = `공 정보 (총 ${balls.length}개)`;
  header.style.cssText = 'color: #fff; margin-bottom: 10px; font-size: 14px;';
  bodiesDiv.appendChild(header);

  balls.forEach((ball, index) => {
    if (!ball) {
      const errorDiv = document.createElement('div');
      errorDiv.textContent = `공 ${index}: null 또는 undefined`;
      errorDiv.style.cssText =
        'color: #ff6b6b; margin: 2px 0; font-size: 12px;';
      bodiesDiv.appendChild(errorDiv);
      return;
    }

    const ballDiv = document.createElement('div');
    ballDiv.style.cssText = `
                    background: rgba(255,255,255,0.1);
                    margin: 5px 0;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    color: #fff;
                    border-left: 3px solid #4ecdc4;
                `;

    const inWorld =
      Matter.Composite.get(gameEngine.world, ball.id, 'body') !== null;
    const velocity = ball.velocity || { x: 0, y: 0 };
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const angle = (Math.atan2(velocity.y, velocity.x) * 180) / Math.PI;

    ballDiv.innerHTML = `
                    <div>ID: <strong>${ball.id}</strong></div>
                    <div>값: ${ball.ballValue || 'N/A'}</div>
                    <div>위치: (${Math.round(ball.position.x)}, ${Math.round(ball.position.y)})</div>
                    <div>반지름: ${ball.circleRadius}</div>
                    <div>속도: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)})</div>
                    <div>속력: ${speed.toFixed(2)}</div>
                    <div>각도: ${angle.toFixed(1)}°</div>                    
                    <div>월드 내: <span style="color: ${inWorld ? '#4ecdc4' : '#ff6b6b'}">${inWorld ? '✓' : '✗'}</span></div>
                `;

    bodiesDiv.appendChild(ballDiv);
  });
}

// 전역 함수들 (HTML에서 호출)
function resetGame() {
  if (gameEngine) {
    gameEngine.reset();
    hideGameOver();
  }
}

function toggleSettings() {
  const settings = document.getElementById('settings');
  settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
}

function toggleDebug() {
  if (gameEngine) {
    gameEngine.updateConfig({ debugMode: !gameEngine.config.debugMode });
  }
}

// 설정 이벤트 리스너들
function setupSettingListeners() {
  const allSliders = [
    'gravity',
    'restitution',
    'ballFriction',
    'wallFriction',
    'frictionAir',
    'frictionStatic',
    'density',
    'velocityIterations',
    'positionIterations',
    'constraintIterations',
    'timeScale',
    'sleepThreshold',
    'maxVelocity',
    'correctionFactor',
    'dampingFactor',
    'angularDamping',
    'linearDamping',
    'mergeDistance',
    'sizeMultiplier',
    'wallThickness',
    'gameOverLine',
  ];

  // 각 설정값을 HTML 슬라이더에 적용
  allSliders.forEach((setting) => {
    const slider = document.getElementById(setting + 'Slider');
    const valueSpan = document.getElementById(setting + 'Value');

    if (slider && valueSpan && defaultGameConfig[setting] !== undefined) {
      slider.value = defaultGameConfig[setting];
      valueSpan.textContent = defaultGameConfig[setting];
    }
  });

  allSliders.forEach((setting) => {
    const slider = document.getElementById(setting + 'Slider');
    const valueSpan = document.getElementById(setting + 'Value');

    if (slider && valueSpan) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        valueSpan.textContent = value;

        if (gameEngine) {
          gameEngine.updateConfig({ [setting]: value });
        }
      });
    }
  });

  // 슬립 모드 체크박스
  const sleepCheckbox = document.getElementById('enableSleepingCheckbox');
  if (sleepCheckbox) {
    sleepCheckbox.addEventListener('change', (e) => {
      if (gameEngine) {
        gameEngine.updateConfig({ enableSleeping: e.target.checked });
      }
    });
  }
}

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

// 게임 시작
window.onload = () => {
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document
    .getElementById('settingsBtn')
    .addEventListener('click', toggleSettings);
  document.getElementById('debugBtn').addEventListener('click', toggleDebug);
  document.getElementById('shakeBtn').addEventListener('click', shake);

  const canvas = document.getElementById('gameCanvas');
  gameEngine = new BallGameEngine(canvas, defaultGameConfig);

  // 이벤트 콜백 등록
  gameEngine.on('scoreUpdate', (score, level) => {
    updateUI();
  });

  gameEngine.on('dropZoneUpdate', (dropX) => {
    updateDropZone(dropX);
  });

  gameEngine.on('nextBallUpdate', (ballValues) => {
    updateNextBall(ballValues[0]);
  });

  gameEngine.on('gameOver', (finalScore) => {
    showGameOver(finalScore);
  });

  gameEngine.on('gameReset', () => {
    updateUI();
    updateNextBall(gameEngine.armingBalls[0]);
  });

  gameEngine.on('debugUpdate', (balls) => {
    debugBodies(balls);
  });

  // 초기 UI 업데이트
  updateUI();
  updateNextBall(gameEngine.armingBalls[0]);

  setupSettingListeners();
};
