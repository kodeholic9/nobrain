document.addEventListener('DOMContentLoaded', () => {
  const imageWrapper1 = document.getElementById('image1');
  const imageWrapper2 = document.getElementById('image2');
  const messageDisplay = document.getElementById('message');
  const resetButton = document.getElementById('resetButton');

  // 틀린 부분의 좌표를 정의합니다.
  // 각 diff 객체는 'circles' (클릭 인식용)와 'displayCircle' (하이라이트 표시용)을 가집니다.
  // 'displayCircle'은 'circles' 정보를 기반으로 자동으로 계산됩니다.
  const diffGames = [
    {
      gameId: 'game1',
      images: ['images/image3-1.PNG', 'images/image3-2.PNG'],
      diffAreas: [
        {
          id: 'diff1',
          found: false,
          // 클릭 인식을 위한 정확한 원들의 집합
          circles: [{ centerX: 72, centerY: 84, radius: 20 }],
        },
        {
          id: 'diff2',
          found: false,
          circles: [
            { centerX: 634, centerY: 320, radius: 30 },
            { centerX: 660, centerY: 280, radius: 30 },
            { centerX: 686, centerY: 265, radius: 20 },
          ],
        },
        {
          id: 'diff3',
          found: false,
          circles: [
            { centerX: 250, centerY: 200, radius: 10 },
            { centerX: 265, centerY: 215, radius: 10 },
            { centerX: 280, centerY: 205, radius: 10 },
          ],
        },
        {
          id: 'diff4',
          found: false,
          circles: [
            { centerX: 350, centerY: 50, radius: 25 }, // 네 번째 틀린 그림 예시
          ],
        },
      ],
    },
  ];
  const targetGame = diffGames[0];

  // 각 틀린 그림에 대해 displayCircle을 계산하여 추가합니다.
  // 이 부분은 diffAreas 정의 직후에 호출되어야 합니다.
  targetGame.diffAreas.forEach((diff) => {
    diff.displayCircle = calculateDisplayCircle(diff.circles);
  });

  let foundDifferences = 0;
  const totalDifferences = targetGame.diffAreas.length;

  // 게임 초기화 함수
  function initializeGame() {
    foundDifferences = 0;
    messageDisplay.textContent = `찾은 틀린 그림: ${foundDifferences} / ${totalDifferences}`;
    targetGame.diffAreas.forEach((diff) => (diff.found = false)); // 모든 틀린 부분 찾지 않은 상태로 초기화

    // 기존에 생성된 하이라이트 제거
    const existingHighlights = document.querySelectorAll('.highlight');
    existingHighlights.forEach((h) => h.remove());

    // 기존 이미지1 삭제 (새로운 이미지를 추가할 때마다 기존 이미지 제거)
    while (imageWrapper1.firstChild) {
      imageWrapper1.removeChild(imageWrapper1.firstChild);
    }
    const img1 = document.createElement('img');
    img1.src = targetGame.images[0];
    imageWrapper1.appendChild(img1);

    // 기존 이미지2 삭제 (새로운 이미지를 추가할 때마다 기존 이미지 제거)
    while (imageWrapper2.firstChild) {
      imageWrapper2.removeChild(imageWrapper2.firstChild);
    }
    const img2 = document.createElement('img');
    img2.src = targetGame.images[1];
    imageWrapper2.appendChild(img2);
  }

  // 클릭 이벤트 핸들러
  function handleClick(event) {
    if (foundDifferences === totalDifferences) {
      messageDisplay.textContent =
        '모든 틀린 그림을 찾았습니다! 다시 시작 버튼을 눌러주세요.';
      return;
    }

    const imgElement = event.currentTarget.querySelector('img');
    const imgRect = imgElement.getBoundingClientRect();

    // 클릭된 캔버스/이미지 내의 상대적 X, Y 좌표 (CSS 픽셀)
    const clickX_css = event.clientX - imgRect.left;
    const clickY_css = event.clientY - imgRect.top;

    // 실제 이미지 픽셀 비율로 조정
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    const displayedWidth = imgElement.width;
    const displayedHeight = imgElement.height;

    const ratioX = naturalWidth / displayedWidth;
    const ratioY = naturalHeight / displayedHeight;

    // 원본 이미지 픽셀 기준의 클릭 좌표
    const adjustedClickX = clickX_css * ratioX;
    const adjustedClickY = clickY_css * ratioY;

    let found = false;
    // diffAreas 배열을 순회하며 틀린 그림을 찾습니다.
    const foundDiffIndex = targetGame.diffAreas.findIndex((diff) => {
      if (diff.found) return false; // 이미 찾은 틀린 그림은 건너뜁니다.

      // 현재 틀린 그림(diff)에 포함된 모든 원(circle) 중 하나라도 클릭되었는지 확인합니다.
      return diff.circles.some((circle) => {
        const distance = Math.sqrt(
          Math.pow(adjustedClickX - circle.centerX, 2) +
            Math.pow(adjustedClickY - circle.centerY, 2)
        );
        return distance <= circle.radius;
      });
    });

    if (foundDiffIndex !== -1) {
      const foundDiff = targetGame.diffAreas[foundDiffIndex];
      foundDiff.found = true; // 해당 틀린 그림을 찾음으로 표시
      foundDifferences++; // 전체 찾은 틀린 그림 수 증가

      messageDisplay.textContent = `찾은 틀린 그림: ${foundDifferences} / ${totalDifferences}`;
      // 여기서 'displayCircle' 정보를 사용하여 하이라이트 함수 호출
      highlightDifference(
        foundDiff.displayCircle,
        displayedWidth,
        displayedHeight,
        naturalWidth,
        naturalHeight
      );
      found = true;
    } else {
      messageDisplay.textContent =
        '아쉽지만 틀린 부분이 아닙니다. 다시 시도해보세요!';
      // 잠시 메시지 표시 후 초기화
      setTimeout(() => {
        messageDisplay.textContent = `찾은 틀린 그림: ${foundDifferences} / ${totalDifferences}`;
      }, 1000);
    }

    if (foundDifferences === totalDifferences) {
      messageDisplay.textContent = '축하합니다! 모든 틀린 그림을 찾았습니다!';
    }
  }

  // 틀린 부분을 하이라이트하는 함수 (displayCircle 정보를 사용)
  function highlightDifference(
    circleInfo,
    displayedWidth,
    displayedHeight,
    naturalWidth,
    naturalHeight
  ) {
    const ratioX = displayedWidth / naturalWidth;
    const ratioY = displayedHeight / naturalHeight;

    const highlightDiv = document.createElement('div');
    highlightDiv.classList.add('highlight'); // 기존 highlight CSS 클래스 사용

    // displayCircle의 중심점과 반지름을 사용하여 위치와 크기 설정
    highlightDiv.style.left = `${circleInfo.centerX * ratioX}px`;
    highlightDiv.style.top = `${circleInfo.centerY * ratioY}px`;
    highlightDiv.style.width = `${circleInfo.radius * 2 * ratioX}px`;
    highlightDiv.style.height = `${circleInfo.radius * 2 * ratioY}px`;

    imageWrapper1.appendChild(highlightDiv.cloneNode(true)); // 원본 이미지에도 표시
    imageWrapper2.appendChild(highlightDiv); // 수정된 이미지에 표시
  }

  /**
   * 주어진 여러 개의 원(circles)을 모두 포괄하는 하나의 "러프한" 원(displayCircle)을 계산합니다.
   * @param {Array<Object>} circles - {centerX, centerY, radius} 형태의 원 객체 배열
   * @returns {Object} {centerX, centerY, radius} 형태의 displayCircle 객체
   */
  function calculateDisplayCircle(circles) {
    if (circles.length === 0) {
      return { centerX: 0, centerY: 0, radius: 0 };
    }

    // 1. 모든 원의 경계를 포함하는 최소/최대 X, Y 좌표를 찾습니다.
    let minOverallX = Infinity;
    let maxOverallX = -Infinity;
    let minOverallY = Infinity;
    let maxOverallY = -Infinity;

    circles.forEach((circle) => {
      minOverallX = Math.min(minOverallX, circle.centerX - circle.radius);
      maxOverallX = Math.max(maxOverallX, circle.centerX + circle.radius);
      minOverallY = Math.min(minOverallY, circle.centerY - circle.radius);
      maxOverallY = Math.max(maxOverallY, circle.centerY + circle.radius);
    });

    // 2. 이 직사각형의 중심을 displayCircle의 중심으로 설정합니다.
    const displayCenterX = (minOverallX + maxOverallX) / 2;
    const displayCenterY = (minOverallY + maxOverallY) / 2;

    // 3. displayCircle의 반지름을 계산합니다.
    let maxDistance = 0;
    circles.forEach((circle) => {
      // 현재 원의 중심과 displayCircle의 중심 간의 거리
      const distToCircleCenter = Math.sqrt(
        Math.pow(circle.centerX - displayCenterX, 2) +
          Math.pow(circle.centerY - displayCenterY, 2)
      );
      // 이 거리 + 현재 원의 반지름이 displayCircle이 커버해야 할 최소 거리입니다.
      maxDistance = Math.max(maxDistance, distToCircleCenter + circle.radius);
    });

    // 사용자에게 '러프하게' 보이도록 약간의 버퍼를 추가할 수 있습니다.
    const buffer = 5; // 픽셀 단위로 조정 가능
    const displayRadius = maxDistance + buffer;

    return {
      centerX: displayCenterX,
      centerY: displayCenterY,
      radius: displayRadius,
    };
  }

  // 이벤트 리스너 등록
  imageWrapper1.addEventListener('click', handleClick);
  imageWrapper2.addEventListener('click', handleClick);
  resetButton.addEventListener('click', initializeGame);

  // 페이지 로드 시 게임 초기화
  initializeGame();
});
