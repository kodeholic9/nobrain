/**
 * 재사용 가능한 팝업 매니저 클래스 (ES6 모듈)
 * @author YourName
 * @version 1.0.0
 */
export class PopupManager {
  constructor() {
    this.popups = new Map();
    this.currentId = 0;
  }

  /**
   * 팝업 생성
   * @param {Object} options - 팝업 설정 옵션
   * @param {string} options.title - 팝업 제목
   * @param {string} options.content - 팝업 내용 (HTML)
   * @param {Array} options.buttons - 버튼 배열
   * @param {boolean} options.showCloseButton - X 버튼 표시 여부
   * @param {boolean} options.closeOnOverlayClick - 오버레이 클릭시 닫기 여부
   * @param {Function} options.onClose - 팝업 닫힐 때 콜백
   * @returns {Object} 팝업 제어 객체
   */
  create(options = {}) {
    const id = `popup_${++this.currentId}`;
    const defaultOptions = {
      title: '알림',
      content: '',
      buttons: [],
      showCloseButton: true,
      closeOnOverlayClick: false,
      onClose: null,
    };

    const config = { ...defaultOptions, ...options };

    // HTML 생성
    const popupHtml = this.createPopupHTML(id, config);
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    const popupElement = document.getElementById(id);
    this.popups.set(id, { element: popupElement, config });

    // 이벤트 리스너 등록
    this.setupEventListeners(id, config);

    return {
      id,
      show: () => this.show(id),
      hide: () => this.hide(id),
      destroy: () => this.destroy(id),
      updateContent: (content) => this.updateContent(id, content),
      updateButtons: (buttons) => this.updateButtons(id, buttons),
      updateTitle: (title) => this.updateTitle(id, title),
    };
  }

  /**
   * HTML 템플릿 생성
   * @param {string} id - 팝업 ID
   * @param {Object} config - 팝업 설정
   * @returns {string} HTML 문자열
   */
  createPopupHTML(id, config) {
    const buttonsHtml = config.buttons
      .map(
        (btn) =>
          `<button class="popup-btn ${btn.class || 'primary'}" data-action="${btn.action || ''}">${btn.text}</button>`
      )
      .join('');

    return `
            <div class="popup-overlay" id="${id}">
                <div class="popup-container">
                    <div class="popup-header">
                        <h3 class="popup-title">${config.title}</h3>
                        ${config.showCloseButton ? '<button class="popup-close" data-action="close">×</button>' : ''}
                    </div>
                    <div class="popup-content">
                        ${config.content}
                    </div>
                    ${config.buttons.length > 0 ? `<div class="popup-buttons">${buttonsHtml}</div>` : ''}
                </div>
            </div>
        `;
  }

  /**
   * 이벤트 리스너 설정
   * @param {string} id - 팝업 ID
   * @param {Object} config - 팝업 설정
   */
  setupEventListeners(id, config) {
    const popup = this.popups.get(id);
    const overlay = popup.element;

    // 버튼 클릭 이벤트
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;

      if (action === 'close') {
        this.hide(id);
        return;
      }

      if (action) {
        const button = config.buttons.find((btn) => btn.action === action);
        if (button && button.handler) {
          const result = button.handler();
          // handler가 false를 반환하지 않으면 팝업을 닫음
          if (result !== false) {
            this.hide(id);
          }
        }
      }
    });

    // 오버레이 클릭으로 닫기
    if (config.closeOnOverlayClick) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hide(id);
        }
      });
    }

    // ESC 키로 닫기
    const escHandler = (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('show')) {
        this.hide(id);
      }
    };

    document.addEventListener('keydown', escHandler);

    // 팝업이 제거될 때 이벤트 리스너도 제거하기 위해 저장
    popup.escHandler = escHandler;
  }

  /**
   * 팝업 표시
   * @param {string} id - 팝업 ID
   */
  show(id) {
    const popup = this.popups.get(id);
    if (popup) {
      popup.element.classList.add('show');
    }
  }

  /**
   * 팝업 숨기기
   * @param {string} id - 팝업 ID
   */
  hide(id, autoDestroy = true) {
    const popup = this.popups.get(id);
    if (popup) {
      popup.element.classList.remove('show');
      if (popup.config.onClose) {
        popup.config.onClose();
      }

      // 자동 제거 옵션
      if (autoDestroy) {
        setTimeout(() => this.destroy(id), 300); // 애니메이션 후 제거
      }
    }
  }

  /**
   * 팝업 제거
   * @param {string} id - 팝업 ID
   */
  destroy(id) {
    const popup = this.popups.get(id);
    if (popup) {
      // 이벤트 리스너 제거
      if (popup.escHandler) {
        document.removeEventListener('keydown', popup.escHandler);
      }

      popup.element.remove();
      this.popups.delete(id);
    }
  }

  /**
   * 컨텐츠 업데이트
   * @param {string} id - 팝업 ID
   * @param {string} content - 새로운 컨텐츠 (HTML)
   */
  updateContent(id, content) {
    const popup = this.popups.get(id);
    if (popup) {
      popup.element.querySelector('.popup-content').innerHTML = content;
    }
  }

  /**
   * 버튼 업데이트
   * @param {string} id - 팝업 ID
   * @param {Array} buttons - 새로운 버튼 배열
   */
  updateButtons(id, buttons) {
    const popup = this.popups.get(id);
    if (popup) {
      popup.config.buttons = buttons;
      const buttonContainer = popup.element.querySelector('.popup-buttons');
      if (buttonContainer) {
        const buttonsHtml = buttons
          .map(
            (btn) =>
              `<button class="popup-btn ${btn.class || 'primary'}" data-action="${btn.action || ''}">${btn.text}</button>`
          )
          .join('');
        buttonContainer.innerHTML = buttonsHtml;
      } else if (buttons.length > 0) {
        // 버튼 컨테이너가 없는 경우 새로 생성
        const container = popup.element.querySelector('.popup-container');
        const buttonsHtml = buttons
          .map(
            (btn) =>
              `<button class="popup-btn ${btn.class || 'primary'}" data-action="${btn.action || ''}">${btn.text}</button>`
          )
          .join('');
        container.insertAdjacentHTML(
          'beforeend',
          `<div class="popup-buttons">${buttonsHtml}</div>`
        );
      }
    }
  }

  /**
   * 제목 업데이트
   * @param {string} id - 팝업 ID
   * @param {string} title - 새로운 제목
   */
  updateTitle(id, title) {
    const popup = this.popups.get(id);
    if (popup) {
      popup.element.querySelector('.popup-title').textContent = title;
      popup.config.title = title;
    }
  }

  /**
   * 모든 팝업 닫기
   */
  hideAll() {
    this.popups.forEach((popup, id) => {
      this.hide(id);
    });
  }

  /**
   * 모든 팝업 제거
   */
  destroyAll() {
    this.popups.forEach((popup, id) => {
      this.destroy(id);
    });
  }

  /**
   * 현재 표시된 팝업 개수 반환
   * @returns {number} 표시된 팝업 개수
   */
  getVisibleCount() {
    let count = 0;
    this.popups.forEach((popup) => {
      if (popup.element.classList.contains('show')) {
        count++;
      }
    });
    return count;
  }

  /**
   * 특정 팝업이 표시 중인지 확인
   * @param {string} id - 팝업 ID
   * @returns {boolean} 표시 여부
   */
  isVisible(id) {
    const popup = this.popups.get(id);
    return popup ? popup.element.classList.contains('show') : false;
  }
}

// 편의 함수들을 위한 전역 인스턴스
let globalPopupManager = null;

/**
 * 전역 팝업 매니저 인스턴스 가져오기
 * @returns {PopupManager} 팝업 매니저 인스턴스
 */
export function getPopupManager() {
  if (!globalPopupManager) {
    globalPopupManager = new PopupManager();
  }
  return globalPopupManager;
}

/**
 * 간단한 알림 팝업
 * @param {string} message - 메시지
 * @param {string} title - 제목 (기본값: '알림')
 * @param {Function} callback - 확인 버튼 클릭 시 콜백
 */
export function showAlert(message, title = '알림', callback = null) {
  const popup = getPopupManager().create({
    title: title,
    content: `<p>${message}</p>`,
    buttons: [
      {
        text: '확인',
        class: 'primary',
        action: 'confirm',
        handler: callback || (() => true), // callback이 없으면 기본 함수,
      },
    ],
  });
  popup.show();
  return popup;
}

/**
 * 확인/취소 팝업
 * @param {string} message - 메시지
 * @param {Function} onConfirm - 확인 버튼 클릭 시 콜백
 * @param {Function} onCancel - 취소 버튼 클릭 시 콜백
 * @param {string} title - 제목 (기본값: '확인')
 */
export function showConfirm(
  message,
  onConfirm = null,
  onCancel = null,
  title = '확인'
) {
  const popup = getPopupManager().create({
    title: title,
    content: `<p>${message}</p>`,
    buttons: [
      {
        text: '확인',
        class: 'primary',
        action: 'confirm',
        handler: onConfirm,
      },
      {
        text: '취소',
        class: 'secondary',
        action: 'cancel',
        handler: onCancel,
      },
    ],
  });
  popup.show();
  return popup;
}

// 기본 export
export default PopupManager;
