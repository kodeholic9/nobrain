// 코드 복사 기능
function initCodeBlocks() {
  const codeBlocks = document.querySelectorAll('.code-block');

  codeBlocks.forEach(block => {
    const copyBtn = block.querySelector('.copy-btn');
    const code = block.querySelector('code');

    if (copyBtn && code) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          showToast(block);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    }
  });
}

// 토스트 알림 표시
function showToast(codeBlock) {
  // 기존 토스트가 있으면 제거
  const existingToast = codeBlock.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = 'Copied';
  codeBlock.appendChild(toast);

  // 애니메이션 시작
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // 2초 후 제거
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2000);
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
  initCodeBlocks();
});
