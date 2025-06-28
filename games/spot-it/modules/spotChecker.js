// modules/spotChecker.js

// SpotChecker는 더 이상 캔버스나 ImageViewer 인스턴스를 직접 다루지 않습니다.
// 오직 스팟 판별과 발견 상태 관리만 담당합니다.

class SpotChecker {
  /**
   * SpotChecker를 초기화합니다.
   * @param {Object} ruleData - 현재 라운드의 스팟 정보가 포함된 ruleData 객체 { ruleId, originImage, variantImage, spots }
   */
  constructor(ruleData) {
    this.ruleData = ruleData;
    this.foundSpotsStatus = []; // [true, false, false, ...] 각 스팟의 발견 상태 (이곳에서 관리)

    if (this.ruleData && this.ruleData.spots) {
      this.foundSpotsStatus = new Array(this.ruleData.spots.length).fill(false);
    } else {
      console.warn('SpotChecker initialized without valid ruleData or spots.');
      this.ruleData = { spots: [] }; // 안전을 위해 빈 배열로 초기화
    }
  }

  /**
   * 클릭된 좌표가 현재 라운드의 스팟 중 하나에 해당하는지 판별합니다.
   * @param {number} originalX - 클릭된 원본 이미지 X 좌표
   * @param {number} originalY - 클릭된 원본 이미지 Y 좌표
   * @returns {object|null} 맞은 스팟의 정보 (index, isCorrect) 또는 null
   */
  checkSpot(originalX, originalY) {
    if (!this.ruleData || !this.ruleData.spots.length) {
      console.warn('SpotChecker: No rule data or spots to check.');
      return { isCorrect: false, index: -1 };
    }

    let foundSpotIndex = -1;

    // 아직 찾지 않은 스팟들만 검사합니다.
    for (let i = 0; i < this.ruleData.spots.length; i++) {
      if (this.foundSpotsStatus[i] === false) {
        // 아직 찾지 않은 스팟만 확인
        const spot = this.ruleData.spots[i];
        const circles = spot.circles;

        for (const circle of circles) {
          const centerX = circle.centerX;
          const centerY = circle.centerY;
          const radiusX =
            circle.radiusX !== undefined ? circle.radiusX : circle.radius;
          const radiusY =
            circle.radiusY !== undefined ? circle.radiusY : circle.radius;

          // 클릭 좌표가 원/타원 내부에 있는지 판별 (타원 공식)
          const normalizedX = (originalX - centerX) / radiusX;
          const normalizedY = (originalY - centerY) / radiusY;

          if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
            foundSpotIndex = i;
            break; // 이 스팟 내의 어떤 circle이라도 맞으면 다음 스팟으로 넘어감
          }
        }
      }
      if (foundSpotIndex !== -1) {
        break; // 스팟을 찾았으므로 더 이상 검사할 필요 없음
      }
    }

    if (foundSpotIndex !== -1) {
      this.foundSpotsStatus[foundSpotIndex] = true; // 스팟 발견 상태 업데이트
      return { isCorrect: true, index: foundSpotIndex };
    } else {
      return { isCorrect: false, index: -1 }; // 틀린 클릭
    }
  }

  /**
   * 현재 SpotChecker의 상태(ruleData, foundSpotsStatus)를 재설정합니다.
   * 새로운 ruleData로 SpotChecker를 초기화할 때 사용됩니다.
   * @param {Object} newRuleData - 새롭게 로드할 ruleData 객체
   */
  reset(newRuleData) {
    this.ruleData = newRuleData;
    if (this.ruleData && this.ruleData.spots) {
      this.foundSpotsStatus = new Array(this.ruleData.spots.length).fill(false);
    } else {
      this.foundSpotsStatus = [];
      this.ruleData = { spots: [] }; // 안전을 위해 빈 배열로 초기화
    }
  }

  /**
   * 모든 스팟을 찾았는지 여부를 반환합니다.
   * @returns {boolean} 모든 스팟을 찾았으면 true, 아니면 false
   */
  areAllSpotsFound() {
    if (!this.ruleData || !this.ruleData.spots.length) return false;
    return this.foundSpotsStatus.every((status) => status === true);
  }

  /**
   * 현재 찾은 스팟의 개수를 반환합니다.
   * @returns {number} 찾은 스팟의 개수
   */
  getFoundSpotCount() {
    return this.foundSpotsStatus.filter((status) => status === true).length;
  }

  /**
   * 주어진 스팟 인덱스가 이미 발견되었는지 여부를 반환합니다.
   * @param {number} index - 확인할 스팟 인덱스
   * @returns {boolean} 스팟이 발견되었으면 true, 아니면 false
   */
  isSpotFound(index) {
    return this.foundSpotsStatus[index] === true;
  }
}

export default SpotChecker; // 클래스 자체를 내보냅니다.
