#!/bin/bash

# --- 설정 변수 ---
BACKUP_BASE_DIR="$HOME/nobrain/backup" # 백업 파일을 저장할 기본 디렉토리
GIT_SRC_DIR="$HOME/nobrain/src"       # Git 리포지토리를 클론할 디렉토리
WEB_ROOT_DIR="/var/www/html"          # 웹 서버 루트 디렉토리 (백업 및 배포 대상)
GIT_REPO_URL="https://github.com/kodeholic9/nobrain.git"
GIT_BRANCH="r1.0.0"

# --- 스크립트 시작 ---
echo "========================================"
echo " 웹 서버 백업 및 Git 배포 스크립트 시작"
echo "========================================"

# 1. 백업 디렉토리 생성 (없을 경우)
echo "백업 디렉토리 확인 및 생성: $BACKUP_BASE_DIR"
mkdir -p "$BACKUP_BASE_DIR"

# 2. /var/www/html 백업
CURRENT_DATETIME=$(date +"%Y%m%d_%H%M")
BACKUP_FILENAME="nobrain_${CURRENT_DATETIME}.tar.gz"
BACKUP_FULL_PATH="${BACKUP_BASE_DIR}/${BACKUP_FILENAME}"

echo "웹 루트 디렉토리 백업 중: ${WEB_ROOT_DIR} -> ${BACKUP_FULL_PATH}"
# tar 명령은 -C 옵션을 사용하여 지정된 디렉토리로 이동 후 그 안의 내용을 묶습니다.
# /var/www/html 자체를 묶기 위해, /var/www 로 이동하여 html 디렉토리를 묶습니다.
tar -czf "$BACKUP_FULL_PATH" -C "$(dirname "$WEB_ROOT_DIR")" "$(basename "$WEB_ROOT_DIR")"
if [ $? -eq 0 ]; then
    echo "웹 루트 백업 성공: ${BACKUP_FULL_PATH}"
else
    echo "오류: 웹 루트 백업에 실패했습니다. (권한 문제일 수 있습니다)"
    exit 1
fi

# 3. 기존 Git 소스 디렉토리 정리 및 Git 클론
echo "기존 Git 소스 디렉토리 삭제: ${GIT_SRC_DIR}"
rm -rf "$GIT_SRC_DIR"

echo "Git 리포지토리 클론 중: ${GIT_REPO_URL} (${GIT_BRANCH} 브랜치) -> ${GIT_SRC_DIR}"
mkdir -p "$GIT_SRC_DIR" # 클론할 디렉토리 생성
git clone --single-branch --branch "$GIT_BRANCH" "$GIT_REPO_URL" "$GIT_SRC_DIR"
if [ $? -eq 0 ]; then
    echo "Git 클론 성공."
else
    echo "오류: Git 클론에 실패했습니다."
    exit 1
fi

# 4. 클론된 파일들을 웹 루트 디렉토리로 이동 (root 권한 필요)
echo "기존 웹 루트 디렉토리 내용 삭제 중: ${WEB_ROOT_DIR}/*"
# rm -rf 명령도 root 권한이 필요할 수 있습니다.
sudo rm -rf "${WEB_ROOT_DIR}/*"

echo "클론된 파일들을 웹 루트 디렉토리로 복사 중: ${GIT_SRC_DIR}/* -> ${WEB_ROOT_DIR}/"
# cp -R 명령도 root 권한이 필요할 수 있습니다.
sudo cp -R "${GIT_SRC_DIR}/." "$WEB_ROOT_DIR/"
if [ $? -eq 0 ]; then
    echo "파일 복사 성공."
    echo "권한 설정 (선택 사항): /var/www/html 에 대한 웹 서버 사용자 권한을 설정할 수 있습니다."
    # 예시: chown -R www-data:www-data "$WEB_ROOT_DIR"
    # 예시: chmod -R 755 "$WEB_ROOT_DIR"
else
    echo "오류: 파일 복사에 실패했습니다. (권한 문제일 수 있습니다)"
    exit 1
fi

echo "========================================"
echo " 스크립트 실행 완료!"
echo "========================================"
