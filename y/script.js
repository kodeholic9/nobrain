// script.js

// gapi 로드 완료 후 호출될 콜백 함수
let gapiInitialized = false;

// gapi.client 초기화 및 API 로드 과정을 나타내는 Promise
let _resolveGapiClientPromise;
const gapiClientPromise = new Promise((resolve) => {
  _resolveGapiClientPromise = resolve;
});

// 현재 페이지 번호를 저장할 전역 변수 (UI 표시용)
let currentPage = 1;
// 페이지당 최대 결과 수를 동적으로 가져오기 위해 사용 (maxResultsInput.value에 따라 변경)
let resultsPerPage = 50; // 초기값 설정, maxResultsInput의 기본값과 일치

// API 할당량 관련 변수 (최소 조회수 검색 시 활용)
const MAX_SEARCH_PAGES = 5; // 최소 조회수 검색 시 최대 탐색할 페이지 수 (과도한 할당량 소모 방지)

// 현재 검색 세션의 할당량 사용량 추적 (minViewCount 검색 시 사용)
let _currentQuotaUsage = 0;
// 현재 검색 세션의 탐색 페이지 수 (minViewCount 검색 시 사용)
let _searchPageCount = 0;

// gapi.js 스크립트 로드 완료 시 호출되는 함수 (index.html의 onload="gapiLoaded()"에 연결됨)
function gapiLoaded() {
  console.log('gapi library loaded.');
  // 'client' 모듈이 로드되면 이제 gapi.client 객체를 사용할 수 있습니다.
  gapi.load('client', async () => {
    try {
      // gapi.client.init을 호출하여 API 키와 discoveryDocs를 설정합니다.
      await gapi.client.init({
        apiKey: 'AIzaSyCaSE1XDt8COCuIw3kEu0qTH-Az1hMSbvk', // 여기에 실제 YouTube Data API 키를 입력하세요!
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest',
        ],
      });

      // init이 성공하면, YouTube API 자체를 명시적으로 로드합니다.
      await gapi.client.load('youtube', 'v3');

      gapiInitialized = true;
      console.log(
        'Google API client initialized successfully and YouTube API loaded.'
      );
      document.getElementById('searchButton').disabled = false;

      // 모든 초기화가 완료되었음을 gapiClientPromise에 알립니다.
      _resolveGapiClientPromise();
    } catch (error) {
      console.error('Error initializing or loading Google API client:', error);
      alert(
        'Google API 클라이언트 초기화 또는 로드에 실패했습니다. API 키를 확인하거나 네트워크 연결을 점검해주세요. 콘솔을 확인해주세요.'
      );
      document.getElementById('searchButton').disabled = true;
    }
  });
}

// YouTube 동영상 카테고리 목록을 가져와 드롭다운 채우기
async function fetchVideoCategories() {
  if (!gapi.client.youtube || !gapi.client.youtube.videoCategories) {
    console.error('YouTube videoCategories service is not ready!');
    return;
  }

  try {
    const response = await gapi.client.youtube.videoCategories.list({
      part: 'snippet',
      regionCode: 'KR', // 한국 카테고리 목록을 가져옵니다. 필요에 따라 'US', 'GB' 등으로 변경
    });

    const categories = response.result.items;
    const videoCategorySelect = document.getElementById('videoCategory');
    videoCategorySelect.innerHTML = '<option value="any">모두</option>';

    categories.forEach((category) => {
      if (category.snippet && category.snippet.assignable) {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.snippet.title;
        videoCategorySelect.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error fetching video categories:', error);
  }
}

// 지역 코드(국가) 목록을 드롭다운에 채우기
function populateRegionCodes() {
  const regionCodes = [
    { code: 'US', name: '미국 (United States)' },
    { code: 'KR', name: '대한민국 (South Korea)' },
    { code: 'JP', name: '일본 (Japan)' },
    { code: 'CA', name: '캐나다 (Canada)' },
    { code: 'GB', name: '영국 (United Kingdom)' },
    { code: 'DE', name: '독일 (Germany)' },
    { code: 'FR', name: '프랑스 (France)' },
    { code: 'AU', name: '호주 (Australia)' },
    { code: 'IN', name: '인도 (India)' },
    { code: 'BR', name: '브라질 (Brazil)' },
    { code: 'RU', name: '러시아 (Russia)' },
    { code: 'CN', name: '중국 (China)' },
    { code: 'MX', name: '멕시코 (Mexico)' },
    { code: 'ES', name: '스페인 (Spain)' },
    { code: 'IT', name: '이탈리아 (Italy)' },
    { code: 'NL', name: '네덜란드 (Netherlands)' },
    { code: 'SE', name: '스웨덴 (Sweden)' },
    { code: 'CH', name: '스위스 (Switzerland)' },
  ];

  const regionCodeSelect = document.getElementById('regionCode');
  regionCodeSelect.innerHTML = '<option value="any">모두</option>';

  regionCodes.forEach((region) => {
    const option = document.createElement('option');
    option.value = region.code;
    option.textContent = region.name;
    regionCodeSelect.appendChild(option);
  });
  regionCodeSelect.value = 'KR'; // 대한민국 기본 선택
}

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  const searchTermInput = document.getElementById('searchTerm');
  const sortOrderSelect = document.getElementById('sortOrder');
  const minViewCountInput = document.getElementById('minViewCount');
  const maxResultsInput = document.getElementById('maxResults');
  const searchButton = document.getElementById('searchButton');
  const resultsTableBody = document.querySelector('#resultsTable tbody');
  const noResultsMessage = document.getElementById('noResults');
  const currentPageDisplay = document.getElementById('currentPageDisplay');

  // 페이지네이션 버튼
  const prevPageButton = document.getElementById('prevPageButton');
  const nextPageButton = document.getElementById('nextPageButton');

  // 기타 select 요소
  const videoCategorySelect = document.getElementById('videoCategory');
  const regionCodeSelect = document.getElementById('regionCode');

  // 초기에는 검색 버튼을 비활성화
  searchButton.disabled = true;

  // 현재 페이지 토큰을 저장할 변수
  let currentNextPageToken = null;
  let currentPrevPageToken = null;

  // --- 이벤트 리스너 설정 ---
  searchButton.addEventListener('click', () => {
    if (!gapiInitialized) {
      alert(
        'Google API 클라이언트가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.'
      );
      return;
    }
    currentPage = 1; // 새 검색 시 첫 페이지로 초기화
    _currentQuotaUsage = 0; // 새 검색 세션 시작 시 할당량 초기화
    _searchPageCount = 0; // 새 검색 세션 시작 시 탐색 페이지 수 초기화
    updatePageDisplay(); // 페이지 번호 업데이트
    performSearch(); // 초기 검색 시 토큰 없이
  });

  searchTermInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      if (!gapiInitialized) {
        alert(
          'Google API 클라이언트가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.'
        );
        return;
      }
      currentPage = 1; // 새 검색 시 첫 페이지로 초기화
      _currentQuotaUsage = 0; // 새 검색 세션 시작 시 할당량 초기화
      _searchPageCount = 0; // 새 검색 세션 시작 시 탐색 페이지 수 초기화
      updatePageDisplay(); // 페이지 번호 업데이트
      performSearch(); // 초기 검색 시 토큰 없이
    }
  });

  // sortOrder 변경 시 minViewCount 활성화/비활성화
  sortOrderSelect.addEventListener('change', () => {
    console.log(
      'sortOrder change event triggered. Value:',
      sortOrderSelect.value
    );
    if (sortOrderSelect.value === 'viewCount') {
      minViewCountInput.disabled = false;
      minViewCountInput.focus();
    } else {
      minViewCountInput.disabled = true;
      minViewCountInput.value = ''; // 값 초기화
    }
  });

  prevPageButton.addEventListener('click', () => {
    if (!gapiInitialized) {
      alert(
        'Google API 클라이언트가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.'
      );
      return;
    }
    // minViewCount 활성화 시에는 이전/다음 버튼 비활성화 되므로 이 조건에 들어오지 않음
    if (currentPage > 1 && currentPrevPageToken) {
      // prevPageToken이 있을 때만 동작
      currentPage--;
      updatePageDisplay();
      performSearch(currentPrevPageToken);
    }
  });

  nextPageButton.addEventListener('click', () => {
    if (!gapiInitialized) {
      alert(
        'Google API 클라이언트가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.'
      );
      return;
    }
    // minViewCount 활성화 시에는 이전/다음 버튼 비활성화 되므로 이 조건에 들어오지 않음
    if (currentNextPageToken) {
      currentPage++;
      updatePageDisplay();
      performSearch(currentNextPageToken);
    }
  });

  /**
   * 검색 조건을 DOM에서 읽어와 객체 형태로 반환합니다.
   * YouTube Data API의 'search' 엔드포인트 파라미터와 일치하도록 키를 사용합니다.
   */
  function getSearchParams(pageToken = null) {
    const params = {};

    params.q = searchTermInput.value.trim();
    params.order = sortOrderSelect.value; // 여기서 order 파라미터를 설정

    // maxResults는 검색 시마다 동적으로 반영
    params.maxResults = parseInt(maxResultsInput.value) || 50;
    if (params.maxResults < 1 || params.maxResults > 50) {
      params.maxResults = 50; // 유효 범위 강제
    }
    resultsPerPage = params.maxResults; // 전역 변수 업데이트

    const optionalParams = {
      channelId: document.getElementById('channelId').value.trim(),
      eventType: document.getElementById('eventType').value,
      publishedAfter: document.getElementById('publishedAfter').value,
      publishedBefore: document.getElementById('publishedBefore').value,
      regionCode: regionCodeSelect.value,
      relevanceLanguage: document
        .getElementById('relevanceLanguage')
        .value.trim(),
      topicId: document.getElementById('topicId').value.trim(),
      videoCaption: document.getElementById('videoCaption').value,
      videoCategory: videoCategorySelect.value,
      videoDefinition: document.getElementById('videoDefinition').value,
      videoDimension: document.getElementById('videoDimension').value,
      videoDuration: document.getElementById('videoDuration').value,
      videoEmbeddable: document.getElementById('videoEmbeddable').value,
      videoLicense: document.getElementById('videoLicense').value,
      videoSyndicated: document.getElementById('videoSyndicated').value,
      videoType: document.getElementById('videoType').value,
    };

    for (const key in optionalParams) {
      const value = optionalParams[key];
      if (value && value !== 'any' && value !== '') {
        if (key === 'publishedAfter' || key === 'publishedBefore') {
          params[key] = new Date(value).toISOString();
        } else {
          params[key] = value;
        }
      }
    }

    params.part = 'snippet';
    params.type = 'video';

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return params;
  }

  /**
   * YouTube Data API를 호출하여 동영상을 검색하고 결과를 표시합니다.
   * @param {string|null} pageToken - 다음/이전 페이지 요청 시 사용할 토큰
   * @param {Array} accumulatedItems - 최소 조회수 검색 시 축적된 동영상 아이템 목록
   */
  async function performSearch(pageToken = null, accumulatedItems = []) {
    await gapiClientPromise; // gapi 클라이언트 초기화 대기

    if (!gapi.client.youtube || !gapi.client.youtube.videos) {
      console.error(
        'gapi.client.youtube or its services (search/videos) are not ready!'
      );
      alert(
        'Google API 클라이언트가 YouTube 서비스를 로드하지 못했습니다. 콘솔을 확인해주세요. (API 키, 네트워크, API 활성화 여부 재확인)'
      );
      return;
    }

    const searchParams = getSearchParams(pageToken);
    const currentMinViewCount = parseInt(minViewCountInput.value);

    // 최소 조회수 필터링 활성화 여부 (정렬이 viewCount이고 유효한 minViewCount 값이 있을 때)
    const isMinViewCountActive =
      sortOrderSelect.value === 'viewCount' &&
      !isNaN(currentMinViewCount) &&
      currentMinViewCount >= 0;

    if (!searchParams.q) {
      alert('검색어를 입력해주세요.');
      return;
    }

    // 새 검색 시작 시에만 테이블 초기화 및 메시지 숨김
    if (!pageToken) {
      resultsTableBody.innerHTML = '';
      noResultsMessage.classList.add('hidden');
    }

    // 최소 조회수 검색이 활성화되어 있을 때는 페이지네이션 버튼 숨김
    if (isMinViewCountActive) {
      prevPageButton.classList.add('hidden');
      nextPageButton.classList.add('hidden');
    } else {
      // 일반 검색 시에는 버튼 가시성 업데이트 (performSearch 완료 후 호출)
    }

    // 할당량 및 페이지 탐색 제한 확인 (최소 조회수 검색 시에만 적용)
    if (isMinViewCountActive) {
      if (_searchPageCount >= MAX_SEARCH_PAGES) {
        alert(
          `최소 조회수 검색을 위해 최대 ${MAX_SEARCH_PAGES}페이지까지 탐색했습니다. 더 이상 검색하지 않습니다. 현재까지 ${accumulatedItems.length}개 동영상을 찾았습니다.`
        );
        displayResults(accumulatedItems); // 현재까지 모은 결과라도 표시
        return;
      }
      _searchPageCount++;
      // 실제 할당량 초과는 API 응답에서 확인 (여기는 예상치 증가)
      // search.list는 100, videos.list는 비디오 1개당 1, 50개면 50
      // 정확한 할당량 계산은 어렵지만 대략적으로 매 호출당 약 150 유닛 소모로 예상 가능
    }

    try {
      // --- 1단계: gapi.client.Youtube.list() 호출로 동영상 기본 정보 및 ID 가져오기 ---
      console.log(
        `Calling search.list (page: ${currentPage}) with params:`,
        searchParams
      );
      const searchResponse =
        await gapi.client.youtube.search.list(searchParams);
      const searchData = searchResponse.result;

      const videoItems = searchData.items.filter(
        (item) => item.id.kind === 'youtube#video'
      );

      // 페이지 토큰 업데이트 (일반 검색용)
      currentNextPageToken = searchData.nextPageToken || null;
      currentPrevPageToken = searchData.prevPageToken || null;

      if (videoItems.length === 0) {
        // 현재 페이지에 동영상 결과가 없거나, 더 이상 다음 페이지가 없는 경우
        if (isMinViewCountActive && currentNextPageToken) {
          // 최소 조회수 검색 중이고 다음 페이지가 있다면 계속 탐색
          currentPage++; // UI용 페이지 번호 증가
          updatePageDisplay();
          performSearch(currentNextPageToken, accumulatedItems);
        } else {
          // 더 이상 검색 결과 없거나 탐색 종료 시 표시
          if (accumulatedItems.length === 0) {
            noResultsMessage.classList.remove('hidden');
          } else {
            displayResults(accumulatedItems); // 현재까지 모은 결과라도 표시
          }
          // 일반 검색 시에만 버튼 가시성 업데이트
          if (!isMinViewCountActive) {
            updatePaginationButtons();
          }
        }
        return; // 이 경우 함수 종료
      }

      // 동영상 ID 목록 추출
      const videoIds = videoItems.map((item) => item.id.videoId).join(',');

      // --- 2단계: gapi.client.youtube.videos.list() 호출로 통계 데이터 가져오기 ---
      const videoStatsResponse = await gapi.client.youtube.videos.list({
        part: 'statistics',
        id: videoIds,
      });
      const videoStatsData = videoStatsResponse.result;

      const videoStatistics = {};
      if (videoStatsData.items) {
        videoStatsData.items.forEach((item) => {
          videoStatistics[item.id] = item.statistics;
        });
      }

      // search 결과와 videos 통계 결과 병합
      const combinedVideoItems = videoItems.map((item) => ({
        ...item,
        statistics: videoStatistics[item.id.videoId] || {}, // 통계 데이터 추가
      }));

      if (isMinViewCountActive) {
        // 최소 조회수 필터링
        const filteredCurrentPageItems = combinedVideoItems.filter((item) => {
          const viewCount = parseInt(item.statistics.viewCount);
          return !isNaN(viewCount) && viewCount >= currentMinViewCount;
        });

        // 현재 페이지의 필터링된 항목들을 축적
        accumulatedItems = accumulatedItems.concat(filteredCurrentPageItems);

        if (!currentNextPageToken) {
          displayResults(accumulatedItems);
        } else {
          // 충분한 결과가 없으면 다음 페이지 탐색
          currentPage++; // UI용 페이지 번호 증가
          updatePageDisplay();
          performSearch(currentNextPageToken, accumulatedItems);
        }
      } else {
        displayResults(combinedVideoItems); // 기존처럼 현재 페이지 결과만 표시
        updatePaginationButtons(); // 일반 검색 시에는 페이지네이션 버튼 업데이트
      }
    } catch (error) {
      console.error('검색 중 오류 발생:', error);

      if (error.result && error.result.error && error.result.error.errors) {
        const apiErrors = error.result.error.errors;
        const isQuotaExceeded = apiErrors.some(
          (err) =>
            err.domain === 'usageLimits' &&
            (err.reason === 'quotaExceeded' ||
              err.reason === 'dailyLimitExceeded')
        );

        if (isQuotaExceeded) {
          alert(
            'YouTube API 할당량이 초과되었습니다. 오늘 더 이상 검색할 수 없습니다. 내일 다시 시도해주세요.'
          );
          searchButton.disabled = true; // 검색 버튼 비활성화
          return;
        }
      }

      const errorMessage =
        error.result?.error?.message || error.body || '알 수 없는 오류';
      alert(`검색 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  /**
   * API 응답으로 받은 동영상 목록과 통계 데이터를 테이블에 표시합니다.
   * @param {Array} items - 표시할 동영상 아이템 배열 (이미 통계가 병합된 상태)
   */
  function displayResults(items) {
    if (items.length === 0) {
      noResultsMessage.classList.remove('hidden');
      resultsTableBody.innerHTML = ''; // 혹시 남아있을 수 있는 결과 초기화
      return;
    }

    resultsTableBody.innerHTML = ''; // 기존 결과 초기화

    // 순번 계산 시작 인덱스 (최소 조회수 검색 시에는 누적된 결과이므로 1부터 시작)
    const startIndex = 1;

    items.forEach((item, index) => {
      console.log('displayResults() - item: ', item);
      const tr = document.createElement('tr');

      const sequentialNumber = startIndex + index; // 순번 계산

      const title = item.snippet.title;
      const channelTitle = item.snippet.channelTitle;
      const description = item.snippet.description || '설명 없음';
      const publishedAt = new Date(item.snippet.publishedAt).toLocaleDateString(
        'ko-KR',
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      );
      const videoId = item.id.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`; // 올바른 YouTube 동영상 URL

      // 통계 정보 가져오기 (이미 item.statistics에 병합되어 있음)
      const stats = item.statistics || {};
      const viewCount = stats.viewCount
        ? parseInt(stats.viewCount).toLocaleString('ko-KR')
        : 'N/A';
      const likeCount = stats.likeCount
        ? parseInt(stats.likeCount).toLocaleString('ko-KR')
        : 'N/A';
      const commentCount = stats.commentCount
        ? parseInt(stats.commentCount).toLocaleString('ko-KR')
        : 'N/A';

      // 썸네일 URL들
      const thumbnailUrlDefault = item.snippet.thumbnails.default?.url || '';
      const thumbnailUrlMedium = item.snippet.thumbnails.medium?.url || '';
      const thumbnailUrlHigh = item.snippet.thumbnails.high?.url || '';

      tr.innerHTML = `
                <td>${sequentialNumber}</td>
                <td>
                  <div class="thumbnail-container">
                    ${thumbnailUrlDefault ? `<a href="${thumbnailUrlDefault}" target="_blank"><img src="${thumbnailUrlDefault}" alt="Default Thumbnail"></a>` : ''}
                    ${thumbnailUrlMedium ? `<a href="${thumbnailUrlMedium}" target="_blank"><img src="${thumbnailUrlMedium}" alt="Medium Thumbnail"></a>` : ''}
                    ${thumbnailUrlHigh ? `<a href="${thumbnailUrlHigh}" target="_blank"><img src="${thumbnailUrlHigh}" alt="High Thumbnail"></a>` : ''}
                  </div>
                </td>
                <td>${title}</td>
                <td>${channelTitle}</td>
                <td>${publishedAt}</td>
                <td>${
                  description.length > 100
                    ? description.substring(0, 100) + '...'
                    : description
                }</td>
                <td>${viewCount}</td>
                <td>${likeCount}</td>
                <td>${commentCount}</td>
                <td><a href="${videoUrl}" target="_blank">${videoId}</a></td>
            `;
      resultsTableBody.appendChild(tr);
    });

    if (resultsTableBody.children.length === 0) {
      noResultsMessage.classList.remove('hidden');
    }
  }

  /**
   * 이전/다음 페이지 버튼의 가시성을 업데이트합니다. (일반 검색 시에만 사용)
   */
  function updatePaginationButtons() {
    const isMinViewCountActive =
      sortOrderSelect.value === 'viewCount' &&
      !isNaN(parseInt(minViewCountInput.value)) &&
      parseInt(minViewCountInput.value) >= 0;

    if (isMinViewCountActive) {
      // 최소 조회수 검색이 활성화되면 페이지네이션 버튼 숨김
      prevPageButton.classList.add('hidden');
      nextPageButton.classList.add('hidden');
    } else {
      // 일반 검색 시에는 토큰 존재 여부에 따라 버튼 표시
      if (currentPrevPageToken) {
        prevPageButton.classList.remove('hidden');
      } else {
        prevPageButton.classList.add('hidden');
      }

      if (currentNextPageToken) {
        nextPageButton.classList.remove('hidden');
      } else {
        nextPageButton.classList.add('hidden');
      }
    }
  }

  /**
   * 현재 페이지 번호 표시를 업데이트합니다.
   */
  function updatePageDisplay() {
    currentPageDisplay.textContent = currentPage;
  }

  // 초기 로드 시 페이지 번호 표시
  updatePageDisplay();

  // 초기 로드 시 정렬 기준 '조회수순'을 기본으로 설정
  sortOrderSelect.value = 'viewCount';
  // sortOrderSelect의 'change' 이벤트를 수동으로 트리거하여 minViewCountInput의 초기 상태를 설정합니다.
  sortOrderSelect.dispatchEvent(new Event('change'));

  // Google API 클라이언트 초기화가 완료된 후 카테고리와 지역 코드를 채웁니다.
  gapiClientPromise.then(() => {
    fetchVideoCategories(); // 동영상 카테고리 로드
    populateRegionCodes(); // 지역 코드 드롭다운 채우기
  });
});
