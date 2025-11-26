class ThemeManager {
  constructor() {
    this.themes = [
      'zinc',
      'slate',
      'stone',
      'gray',
      'neutral',
      'red',
      'rose',
      'orange',
      'green',
      'blue',
      'yellow',
      'violet',
    ];
    this.currentTheme = this.getStoredTheme() || 'zinc';
    this.currentMode = this.getStoredMode() || 'light';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.applyMode(this.currentMode);
  }

  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  getStoredMode() {
    return localStorage.getItem('mode');
  }

  applyTheme(themeName) {
    if (!this.themes.includes(themeName)) return;

    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
    this.currentTheme = themeName;

    // 테마 변경 이벤트 발생
    window.dispatchEvent(
      new CustomEvent('themechange', { detail: { theme: themeName } })
    );
  }

  applyMode(mode) {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mode', mode);
    this.currentMode = mode;

    // 모드 변경 이벤트 발생
    window.dispatchEvent(
      new CustomEvent('modechange', { detail: { mode: mode } })
    );
  }

  toggleMode() {
    const newMode = this.currentMode === 'light' ? 'dark' : 'light';
    this.applyMode(newMode);
  }

  setTheme(themeName) {
    this.applyTheme(themeName);
  }

  getTheme() {
    return this.currentTheme;
  }

  getMode() {
    return this.currentMode;
  }
}

// 전역 인스턴스
const themeManager = new ThemeManager();
