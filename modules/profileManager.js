/**
 * 프로필 관리 모듈
 * @author kodeholic (powered by Claude)
 * @version 1.0.0
 */

import { PopupManager, showAlert } from './popupManager.js';
import { StorageManager, STORAGE_KEYS } from './storageManager.js';

/**
 * 프로필 매니저 클래스
 */
export class ProfileManager {
  constructor() {
    this.storage = new StorageManager(STORAGE_KEYS.PROFILE);
    this.popupManager = new PopupManager();
    this.currentPopup = null;
  }

  /**
   * 프로필 데이터 가져오기
   * @returns {Object} 프로필 데이터
   */
  getProfile() {
    return this.storage.getItem();
  }

  /**
   * 프로필 데이터 저장
   * @param {Object} profileData - 프로필 데이터
   * @returns {boolean} 저장 성공 여부
   */
  saveProfile(profileData) {
    return this.storage.saveValue(profileData);
  }

  /**
   * 닉네임 유효성 검사
   * @param {string} nickName - 닉네임
   * @returns {Object} { valid: boolean, message: string }
   */
  validateNickName(nickName) {
    if (!nickName || nickName.trim() === '') {
      return { valid: false, message: '닉네임을 입력해주세요.' };
    }

    if (nickName.length > 15) {
      return { valid: false, message: '닉네임은 15자 이하로 입력해주세요.' };
    }

    // 특수문자 제한 (선택사항)
    const invalidChars = /[<>\"'&]/;
    if (invalidChars.test(nickName)) {
      return {
        valid: false,
        message: '사용할 수 없는 문자가 포함되어 있습니다.',
      };
    }

    return { valid: true, message: '' };
  }

  /**
   * 접속 횟수 증가
   * @returns {boolean} 저장 성공 여부
   */
  incrementAccessCount() {
    const profile = this.getProfile();
    return this.saveProfile({
      accessCount: profile.accessCount + 1,
      lastAccessAt: new Date().toISOString(),
    });
  }

  /**
   * 마지막 접속 시간 업데이트
   * @returns {boolean} 저장 성공 여부
   */
  updateLastAccess() {
    return this.saveProfile({
      lastAccessAt: new Date().toISOString(),
    });
  }

  /**
   * 시간을 읽기 쉬운 형태로 변환
   * @param {string} isoString - ISO 형식 시간 문자열
   * @returns {string} 변환된 시간 문자열
   */
  formatDateTime(isoString) {
    if (!isoString) return '없음';

    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    // 1분 미만
    if (diff < 60000) {
      return '방금 전';
    }

    // 1시간 미만
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}분 전`;
    }

    // 24시간 미만
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }

    // 그 외는 날짜 표시
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 프로필 팝업 HTML 생성
   * @param {Object} profile - 프로필 데이터
   * @returns {string} HTML 문자열
   */
  createProfilePopupContent(profile) {
    const lastAccessFormatted = this.formatDateTime(profile.lastAccessAt);

    return `
            <div class="profile-container" style="padding: 10px;">
                <div class="profile-field" style="margin-bottom: 20px;">
                    <label for="nickNameInput" style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">
                        닉네임 <span style="color: #666; font-size: 12px;">(최대 15자)</span>
                    </label>
                    <input 
                        type="text" 
                        id="nickNameInput" 
                        value="${profile.nickName || ''}" 
                        maxlength="15"
                        placeholder="닉네임을 입력하세요"
                        style="
                            width: 100%; 
                            padding: 10px; 
                            border: 2px solid #ddd; 
                            border-radius: 4px; 
                            font-size: 14px;
                            box-sizing: border-box;
                        "
                    />
                    <div id="nickNameCounter" style="text-align: right; font-size: 12px; color: #666; margin-top: 4px;">
                        ${(profile.nickName || '').length}/15
                    </div>
                </div>
                
                <div class="profile-info" style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                    <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: #495057;">접속 횟수:</span>
                        <span style="color: #007bff; font-weight: bold;">${profile.accessCount}회</span>
                    </div>
                    <div class="info-row" style="display: flex; justify-content: space-between;">
                        <span style="font-weight: bold; color: #495057;">마지막 접속:</span>
                        <span style="color: #28a745;">${lastAccessFormatted}</span>
                    </div>
                </div>
                
                <div class="profile-tips" style="font-size: 12px; color: #6c757d; line-height: 1.4;">
                    💡 닉네임을 변경하신 후 '저장' 버튼을 클릭하세요.
                </div>
            </div>
        `;
  }

  /**
   * 닉네임 입력 이벤트 설정
   */
  setupNickNameInputEvents() {
    const input = document.getElementById('nickNameInput');
    const counter = document.getElementById('nickNameCounter');

    if (input && counter) {
      input.addEventListener('input', (e) => {
        const length = e.target.value.length;
        counter.textContent = `${length}/15`;

        // 글자 수에 따른 색상 변경
        if (length > 12) {
          counter.style.color = '#dc3545'; // 빨강
        } else if (length > 8) {
          counter.style.color = '#ffc107'; // 노랑
        } else {
          counter.style.color = '#666'; // 기본
        }
      });
    }
  }

  /**
   * 프로필 팝업 표시
   */
  showProfilePopup() {
    const profile = this.getProfile();

    this.currentPopup = this.popupManager.create({
      title: '프로필 정보',
      content: this.createProfilePopupContent(profile),
      buttons: [
        {
          text: '저장',
          class: 'primary',
          action: 'save',
          handler: () => this.handleSaveProfile(),
        },
        {
          text: '닫기',
          class: 'secondary',
          action: 'close',
        },
      ],
      closeOnOverlayClick: false,
      onClose: () => {
        this.currentPopup.hide();
        this.currentPopup = null;
      },
    });

    this.currentPopup.show();

    // 팝업이 표시된 후 이벤트 설정
    setTimeout(() => {
      this.setupNickNameInputEvents();
    }, 100);
  }

  /**
   * 프로필 저장 처리
   * @returns {boolean} 팝업을 닫을지 여부
   */
  handleSaveProfile() {
    const input = document.getElementById('nickNameInput');
    if (!input) {
      showAlert('입력 필드를 찾을 수 없습니다.', '오류');
      return false;
    }

    const newNickName = input.value.trim();
    const currentProfile = this.getProfile();

    // 닉네임이 변경되지 않은 경우
    if (newNickName === currentProfile.nickName) {
      return true; // 팝업 닫기
    }

    // 닉네임 유효성 검사
    const validation = this.validateNickName(newNickName);
    if (!validation.valid) {
      showAlert(validation.message, '입력 오류');
      return false; // 팝업 유지
    }

    // 닉네임 저장
    const saveResult = this.saveProfile({ nickName: newNickName });

    if (saveResult) {
      showAlert(`닉네임이 '${newNickName}'로 변경되었습니다!`, '저장 완료');
      return true; // 팝업 닫기
    } else {
      showAlert('저장 중 오류가 발생했습니다.', '저장 실패');
      return false; // 팝업 유지
    }
  }

  /**
   * 닉네임 설정 (외부에서 호출용)
   * @param {string} nickName - 닉네임
   * @returns {boolean} 저장 성공 여부
   */
  setNickName(nickName) {
    const validation = this.validateNickName(nickName);
    if (!validation.valid) {
      console.error('Invalid nickname:', validation.message);
      return false;
    }

    return this.saveProfile({ nickName });
  }

  /**
   * 프로필 초기화
   * @returns {boolean} 초기화 성공 여부
   */
  resetProfile() {
    return this.storage.setItem(this.storage.defaultValue);
  }

  /**
   * 현재 닉네임 가져오기
   * @returns {string} 닉네임
   */
  getNickName() {
    const profile = this.getProfile();
    return profile.nickName || '';
  }

  /**
   * 프로필 요약 정보 가져오기
   * @returns {Object} 요약 정보
   */
  getProfileSummary() {
    const profile = this.getProfile();
    return {
      nickName: profile.nickName || '게스트',
      accessCount: profile.accessCount,
      lastAccess: this.formatDateTime(profile.lastAccessAt),
      hasNickName: !!(profile.nickName && profile.nickName.trim()),
    };
  }
}

// 전역 인스턴스
let globalProfileManager = null;

/**
 * 전역 프로필 매니저 인스턴스 가져오기
 * @returns {ProfileManager} 프로필 매니저 인스턴스
 */
export function getProfileManager() {
  if (!globalProfileManager) {
    globalProfileManager = new ProfileManager();
  }
  return globalProfileManager;
}

// 기본 export
export default ProfileManager;
