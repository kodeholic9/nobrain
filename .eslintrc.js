// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended", // ESLint에서 권장하는 기본 규칙 세트
    "plugin:prettier/recommended", // Prettier 관련 규칙을 ESLint에 통합 (가장 마지막에 와야 함)
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    // 여기에 개별 ESLint 규칙을 추가할 수 있습니다.
    // 'indent': ['error', 2], // 들여쓰기를 2칸으로 강제
    // 'linebreak-style': ['error', 'unix'], // 개행 스타일을 unix로 강제
    // 'quotes': ['error', 'single'], // 작은 따옴표 강제
    // 'semi': ['error', 'always'], // 세미콜론 강제
  },
};
