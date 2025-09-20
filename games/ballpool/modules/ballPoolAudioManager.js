class SoundPool {
  constructor(audioContext, buffer, poolSize = 5) {
    this.audioContext = audioContext;
    this.buffer = buffer;
    this.poolSize = poolSize;
    this.currentIndex = 0;
    this.instances = [];

    // 풀 초기화
    for (let i = 0; i < poolSize; i++) {
      this.instances.push({
        source: null,
        gainNode: null,
        playing: false,
      });
    }
  }

  createNewSource() {
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = this.buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    return { source, gainNode };
  }

  play(options = {}) {
    const { volume = 1, pitch = 1, delay = 0 } = options;

    const instance = this.instances[this.currentIndex];

    // 이전 사운드가 재생 중이면 정지
    if (instance.playing && instance.source) {
      try {
        instance.source.stop();
      } catch (e) {
        // 이미 정지된 경우 무시
      }
    }

    // 새로운 소스 생성
    const { source, gainNode } = this.createNewSource();
    instance.source = source;
    instance.gainNode = gainNode;
    instance.playing = true;

    // 옵션 적용
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
    source.playbackRate.value = Math.max(0.25, Math.min(4, pitch));

    // 종료 시 상태 업데이트
    source.onended = () => {
      instance.playing = false;
      instance.source = null;
      instance.gainNode = null;
    };

    // 재생 (지연 옵션 지원)
    const startTime = this.audioContext.currentTime + delay;
    source.start(startTime);

    // 다음 인덱스로 이동
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;

    return source; // 필요시 제어를 위해 반환
  }

  stopAll() {
    this.instances.forEach((instance) => {
      if (instance.playing && instance.source) {
        try {
          instance.source.stop();
        } catch (e) {
          // 이미 정지된 경우 무시
        }
        instance.playing = false;
        instance.source = null;
        instance.gainNode = null;
      }
    });
  }
}

class BallPoolAudioManager {
  constructor() {
    this.audioContext = null;
    this.soundPools = new Map(); // name -> SoundPool
    this.soundConfigs = new Map(); // name -> { path, poolSize, volume }
    this.masterVolume = 1.0;
    this.muted = false;
    this.initialized = false;
  }

  /**
   * 오디오 시스템 초기화 (사용자 상호작용 후 호출)
   */
  async init() {
    if (this.initialized) {
      console.warn('오디오 시스템이 이미 초기화되었습니다.');
      return;
    }

    try {
      // AudioContext 생성
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // 컨텍스트가 suspended 상태면 resume
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.initialized = true;
      console.log('GameAudioManager 초기화 완료');
    } catch (error) {
      console.error('오디오 시스템 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 사운드 설정 및 로드
   * @param {string} name - 사운드 식별자
   * @param {string} path - 파일 경로
   * @param {Object} options - 옵션 { poolSize, volume }
   */
  async load(name, path, options = {}) {
    if (!this.initialized) {
      throw new Error('먼저 init()을 호출해주세요.');
    }

    const config = {
      path,
      poolSize: options.poolSize || 3,
      volume: options.volume || 1.0,
    };

    this.soundConfigs.set(name, config);

    try {
      // 오디오 파일 로드
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(
          `파일 로드 실패: ${response.status} ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // 사운드 풀 생성
      const soundPool = new SoundPool(
        this.audioContext,
        audioBuffer,
        config.poolSize
      );
      this.soundPools.set(name, soundPool);

      console.log(`사운드 로드 완료: ${name} (풀 크기: ${config.poolSize})`);
    } catch (error) {
      console.error(`사운드 로드 실패 [${name}]:`, error);
      throw error;
    }
  }

  /**
   * 여러 사운드를 한번에 로드
   * @param {Object} soundMap - { name: { path, poolSize?, volume? } }
   */
  async loadMultiple(soundMap) {
    const loadPromises = Object.entries(soundMap).map(([name, config]) => {
      const { path, ...options } = config;
      return this.load(name, path, options);
    });

    try {
      await Promise.all(loadPromises);
      console.log(`${loadPromises.length}개 사운드 로드 완료`);
    } catch (error) {
      console.error('일부 사운드 로드 실패:', error);
      throw error;
    }
  }

  /**
   * 사운드 재생
   * @param {string} name - 사운드 식별자
   * @param {Object} options - 재생 옵션 { volume, pitch, delay }
   */
  play(name, options = {}) {
    if (!this.initialized) {
      console.warn('오디오 시스템이 초기화되지 않았습니다.');
      return null;
    }

    if (this.muted) {
      return null;
    }

    const soundPool = this.soundPools.get(name);
    if (!soundPool) {
      console.warn(`사운드를 찾을 수 없습니다: ${name}`);
      return null;
    }

    const config = this.soundConfigs.get(name);
    const finalVolume =
      this.masterVolume * config.volume * (options.volume || 1);

    try {
      return soundPool.play({
        ...options,
        volume: finalVolume,
      });
    } catch (error) {
      console.error(`사운드 재생 실패 [${name}]:`, error);
      return null;
    }
  }

  /**
   * 특정 사운드의 모든 인스턴스 정지
   */
  stop(name) {
    const soundPool = this.soundPools.get(name);
    if (soundPool) {
      soundPool.stopAll();
    }
  }

  /**
   * 모든 사운드 정지
   */
  stopAll() {
    this.soundPools.forEach((pool) => pool.stopAll());
  }

  /**
   * 마스터 볼륨 설정 (0.0 ~ 1.0)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 음소거 토글
   */
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAll();
    }
    return this.muted;
  }

  /**
   * 음소거 상태 설정
   */
  setMuted(muted) {
    this.muted = muted;
    if (this.muted) {
      this.stopAll();
    }
  }

  /**
   * 사운드가 로드되었는지 확인
   */
  isLoaded(name) {
    return this.soundPools.has(name);
  }

  /**
   * 로드된 모든 사운드 이름 반환
   */
  getLoadedSounds() {
    return Array.from(this.soundPools.keys());
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    // 모든 사운드 정지
    this.stopAll();

    // 사운드 풀 정리
    this.soundPools.clear();
    this.soundConfigs.clear();

    // AudioContext 정리
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.initialized = false;
    console.log('GameAudioManager 정리 완료');
  }

  /**
   * 현재 상태 정보 반환
   */
  getStatus() {
    return {
      initialized: this.initialized,
      audioContextState: this.audioContext?.state,
      loadedSounds: this.getLoadedSounds(),
      masterVolume: this.masterVolume,
      muted: this.muted,
    };
  }
}

export default BallPoolAudioManager;

// 사용 예시
/*
const audioManager = new GameAudioManager();

// 게임 시작시 초기화 (첫 터치 후)
await audioManager.init();

// 사운드 로드
await audioManager.loadMultiple({
  'merge': { 
    path: '/sounds/merge.wav', 
    poolSize: 5, 
    volume: 0.8 
  },
  'pop': { 
    path: '/sounds/pop.wav', 
    poolSize: 3, 
    volume: 0.6 
  },
  'bgm': { 
    path: '/sounds/background.mp3', 
    poolSize: 1, 
    volume: 0.3 
  }
});

// 사운드 재생
audioManager.play('merge', { volume: 1.0, pitch: 1.2 });
audioManager.play('pop', { delay: 0.5 }); // 0.5초 후 재생

// 볼륨 조절
audioManager.setMasterVolume(0.7);

// 정리
audioManager.cleanup();
*/
