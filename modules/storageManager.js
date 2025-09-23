/**
 * localStorage 관리 모듈
 * @author YourName
 * @version 1.0.0
 */

// 스토리지 키 상수
export const STORAGE_KEYS = {
  PROFILE: 'profileStore',
  BALL_POOL_GAME: 'ballPoolGameStore',
};

// 기본값 정의
const DEFAULT_VALUES = {
  profileStore: {
    nickName: '',
    accessCount: 0,
    lastAccessAt: null,
  },
  ballPoolGameStore: {
    bestScore: 0,
    bestLevel: 1,
    lastPlayTime: null,
  },
};

/**
 * 스토리지 매니저 클래스
 */
export class StorageManager {
  constructor(storageKey) {
    // 유효한 키 검증
    const validKeys = [STORAGE_KEYS.PROFILE, STORAGE_KEYS.BALL_POOL_GAME];
    if (!validKeys.includes(storageKey)) {
      throw new Error(
        `Invalid storageKey: ${storageKey}. Must be one of: ${validKeys.join(', ')}`
      );
    }
    this.isLocalStorageAvailable = this.checkLocalStorage();
    this.storageKey = storageKey;
    this.defaultValue = DEFAULT_VALUES[storageKey] || {};
  }

  /**
   * localStorage 사용 가능 여부 확인
   * @returns {boolean} 사용 가능 여부
   */
  checkLocalStorage() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      return false;
    }
  }

  /**
   * 데이터 저장
   * @param {string} key - 저장할 키
   * @param {Object} data - 저장할 데이터
   * @returns {boolean} 저장 성공 여부
   */
  setItem(data) {
    if (!this.isLocalStorageAvailable) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const jsonString = JSON.stringify(data);
      localStorage.setItem(this.storageKey, jsonString);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  /**
   * 데이터 읽기
   * @returns {Object} 읽은 데이터 또는 기본값
   */
  getItem() {
    if (!this.isLocalStorageAvailable) {
      return this.defaultValue;
    }

    try {
      const jsonString = localStorage.getItem(this.storageKey);
      if (jsonString === null) {
        return this.defaultValue;
      }
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to load data:', error);
      return this.defaultValue;
    }
  }

  /**
   * 데이터 제거
   * @returns {boolean} 제거 성공 여부
   */
  removeItem() {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to remove data:', error);
      return false;
    }
  }

  /**
   * 모든 데이터 제거
   * @returns {boolean} 제거 성공 여부
   */
  clear() {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      // 앱 관련 키만 제거 (다른 앱의 데이터 보호)
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  /**
   * 개별 데이터 저장
   * @param {Object} value - 저장할 데이터 객체
   * @returns {boolean} 저장 성공 여부
   */
  saveValue(value) {
    if (typeof value !== 'object' || value === null) {
      console.error('saveValue: value must be an object');
      return false;
    }

    const currentValue = this.getItem();
    const mergedValue = { ...currentValue, ...value };
    return this.setItem(mergedValue);
  }
}
