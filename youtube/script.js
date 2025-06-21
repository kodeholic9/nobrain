// script.js

// gapi 로드 완료 후 호출될 콜백 함수
let gapiInitialized = false;

// gapi.client 초기화 및 API 로드 과정을 나타내는 Promise
let _resolveGapiClientPromise;
const gapiClientPromise = new Promise((resolve) => {
  _resolveGapiClientPromise = resolve;
});

// 현재 페이지 번호를 저장할 전역 변수
let currentPage = 1;
// 페이지당 최대 결과 수를 동적으로 가져오기 위해 사용 (maxResultsInput.value에 따라 변경)
let resultsPerPage = 50; // 초기값 설정, maxResultsInput의 기본값과 일치

// gapi.js 스크립트 로드 완료 시 호출되는 함수 (index.html의 onload="gapiLoaded()"에 연결됨)
function gapiLoaded() {
  console.log('gapi library loaded.');
  // gapi.load('client', 콜백함수) 패턴을 사용하여 'client' 모듈을 비동기적으로 로드합니다.
  gapi.load('client', async () => {
    try {
      // 'client' 모듈이 로드되면 이제 gapi.client 객체를 사용할 수 있습니다.
      // gapi.client.init을 호출하여 API 키와 discoveryDocs를 설정합니다.
      await gapi.client.init({
        apiKey: 'AIzaSyCaSE1XDt8COCuIw3kEu0qTH-Az1hMSbvk', // 여기에 실제 YouTube Data API 키를 입력하세요!
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest',
        ],
      });

      // init이 성공하면, YouTube API 자체를 명시적으로 로드합니다.
      // (discoveryDocs에 포함되어 있어도 명시적 로드가 더 안전합니다.)
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
  // gapiClientPromise는 이 함수를 호출하기 전에 이미 대기했으므로 여기서는 다시 await 필요 없음
  // 다만, gapiClientPromise.then() 체인 안에서 호출되도록 해야 함

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
    console.log('YouTube Video Categories (KR):', categories); // 디버깅용

    const videoCategorySelect = document.getElementById('videoCategory');
    // 'any' 옵션은 유지하고, 나머지 옵션을 동적으로 추가
    videoCategorySelect.innerHTML = '<option value="any">모두</option>'; // 기본 '모두' 옵션 유지

    categories.forEach((category) => {
      if (category.snippet && category.snippet.assignable) {
        // assignable: 사용자가 할당할 수 있는 카테고리인지
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
  // ISO 3166-1 alpha-2 코드와 국가 이름 목록 (일부만 포함, 더 많은 국가를 추가할 수 있습니다)
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
    // 필요한 다른 국가들을 여기에 추가하세요
  ];

  const regionCodeSelect = document.getElementById('regionCode');
  // 'any' 옵션은 유지하고, 나머지 옵션을 동적으로 추가
  regionCodeSelect.innerHTML = '<option value="any">모두</option>'; // 기본 '모두' 옵션 유지

  regionCodes.forEach((region) => {
    const option = document.createElement('option');
    option.value = region.code;
    option.textContent = region.name;
    regionCodeSelect.appendChild(option);
  });

  // 대한민국을 기본 선택으로 설정 (선택 사항)
  regionCodeSelect.value = 'KR';
}

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  const searchTermInput = document.getElementById('searchTerm');
  const sortOrderSelect = document.getElementById('sortOrder');
  const maxResultsInput = document.getElementById('maxResults');
  const searchButton = document.getElementById('searchButton');
  const resultsTableBody = document.querySelector('#resultsTable tbody');
  const noResultsMessage = document.getElementById('noResults');
  const currentPageDisplay = document.getElementById('currentPageDisplay'); // 페이지 번호 표시 요소

  // 페이지네이션 버튼
  const prevPageButton = document.getElementById('prevPageButton');
  const nextPageButton = document.getElementById('nextPageButton');

  // 새로 추가: videoCategory 및 regionCode select 요소 참조
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
      updatePageDisplay(); // 페이지 번호 업데이트
      performSearch(); // 초기 검색 시 토큰 없이
    }
  });

  prevPageButton.addEventListener('click', () => {
    if (!gapiInitialized) {
      alert(
        'Google API 클라이언트가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.'
      );
      return;
    }
    if (currentPage > 1) {
      // 1페이지보다 커야만 이전 페이지로
      currentPage--;
      updatePageDisplay(); // 페이지 번호 업데이트
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
    // 다음 페이지 토큰이 있을 때만 다음 페이지로
    if (currentNextPageToken) {
      currentPage++;
      updatePageDisplay(); // 페이지 번호 업데이트
      performSearch(currentNextPageToken);
    }
  });

  /**
   * 검색 조건을 DOM에서 읽어와 객체 형태로 반환합니다.
   * YouTube Data API의 'search' 엔드포인트 파라미터와 일치하도록 키를 사용합니다.
   */
  function getSearchParams(pageToken = null) {
    const params = {};

    // 필수 검색어
    params.q = searchTermInput.value.trim();

    // 정렬 및 결과 수
    params.order = sortOrderSelect.value;
    params.maxResults = maxResultsInput.value; // 여기서 기본 50건이 반영됨

    // 기타 선택적 검색 조건들
    const optionalParams = {
      channelId: document.getElementById('channelId').value.trim(),
      eventType: document.getElementById('eventType').value,
      publishedAfter: document.getElementById('publishedAfter').value,
      publishedBefore: document.getElementById('publishedBefore').value,
      regionCode: regionCodeSelect.value, // select 요소에서 값을 가져옴
      relevanceLanguage: document
        .getElementById('relevanceLanguage')
        .value.trim(),
      topicId: document.getElementById('topicId').value.trim(),
      videoCaption: document.getElementById('videoCaption').value,
      videoCategory: videoCategorySelect.value, // select 요소에서 값을 가져옴
      videoDefinition: document.getElementById('videoDefinition').value,
      videoDimension: document.getElementById('videoDimension').value,
      videoDuration: document.getElementById('videoDuration').value,
      videoEmbeddable: document.getElementById('videoEmbeddable').value,
      videoLicense: document.getElementById('videoLicense').value,
      videoSyndicated: document.getElementById('videoSyndicated').value,
      videoType: document.getElementById('videoType').value,
    };

    // 값이 있는 선택적 파라미터만 추가
    for (const key in optionalParams) {
      const value = optionalParams[key];
      // 'any'가 아닌 값만 추가하고, 빈 문자열인 경우도 제외
      if (value && value !== 'any' && value !== '') {
        if (key === 'publishedAfter' || key === 'publishedBefore') {
          // 날짜/시간은 ISO 8601 형식으로 변환하여 추가
          params[key] = new Date(value).toISOString();
        } else {
          params[key] = value;
        }
      }
    }

    // 고정 파라미터 (gapi.client.init에서 API 키는 이미 설정됨)
    params.part = 'snippet';
    params.type = 'video';

    // 페이지 토큰 추가 (있을 경우)
    if (pageToken) {
      params.pageToken = pageToken;
    }

    return params;
  }

  /**
   * YouTube Data API를 호출하여 동영상을 검색하고 결과를 표시합니다.
   * @param {string|null} pageToken - 다음/이전 페이지 요청 시 사용할 토큰
   */
  async function performSearch(pageToken = null) {
    // gapiClientPromise가 완료될 때까지 기다립니다.
    await gapiClientPromise; // <-- 여기서 init 완료를 기다림

    // gapiClientPromise가 해결된 후 gapi.client.youtube가 정상적으로 로드되었는지 최종 확인
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
    resultsPerPage = parseInt(searchParams.maxResults) || 50; // 현재 설정된 maxResults를 반영

    if (!searchParams.q) {
      alert('검색어를 입력해주세요.');
      return;
    }

    // 검색 전 기존 결과 초기화 및 버튼 숨기기
    resultsTableBody.innerHTML = '';
    noResultsMessage.classList.add('hidden');
    prevPageButton.classList.add('hidden');
    nextPageButton.classList.add('hidden');

    try {
      // --- 1단계: gapi.client.Youtube.list() 호출로 동영상 기본 정보 및 ID 가져오기 ---
      console.log('Calling search.list with params:', searchParams);
      const searchResponse =
        await gapi.client.youtube.search.list(searchParams);
      const searchData = searchResponse.result;

      const videoItems = searchData.items.filter(
        (item) => item.id.kind === 'youtube#video'
      );

      // 페이지 토큰 업데이트
      currentNextPageToken = searchData.nextPageToken || null;
      currentPrevPageToken = searchData.prevPageToken || null;

      // 페이지네이션 버튼 가시성 업데이트
      updatePaginationButtons();

      if (videoItems.length === 0) {
        noResultsMessage.classList.remove('hidden');
        return;
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

      // search 결과와 videos 통계 결과 병합 후 표시
      displayResults(videoItems, videoStatistics);
    } catch (error) {
      console.error('검색 중 오류 발생:', error);
      const errorMessage =
        error.result?.error?.message || error.body || '알 수 없는 오류';
      alert(`검색 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  /**
   * API 응답으로 받은 동영상 목록과 통계 데이터를 테이블에 표시합니다.
   * @param {Array} items - YouTube API search 응답의 동영상 아이템 배열
   * @param {Object} statisticsMap - 각 videoId를 키로 하는 통계 데이터 객체
   */
  function displayResults(items, statisticsMap) {
    if (items.length === 0) {
      noResultsMessage.classList.remove('hidden');
      return;
    }

    resultsTableBody.innerHTML = ''; // 기존 결과 초기화

    // 순번 계산 시작 인덱스
    const startIndex = (currentPage - 1) * resultsPerPage + 1;

    items.forEach((item, index) => {
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
      const thumbnailUrl = item.snippet.thumbnails.default.url;
      const videoId = item.id.videoId;
      // 올바른 YouTube 동영상 URL 형식으로 수정
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // 통계 정보 가져오기 (없을 경우 'N/A'로 표시)
      const stats = statisticsMap[videoId] || {};
      const viewCount = stats.viewCount
        ? parseInt(stats.viewCount).toLocaleString('ko-KR')
        : 'N/A';
      const likeCount = stats.likeCount
        ? parseInt(stats.likeCount).toLocaleString('ko-KR')
        : 'N/A';
      const commentCount = stats.commentCount
        ? parseInt(stats.commentCount).toLocaleString('ko-KR')
        : 'N/A';

      tr.innerHTML = `
                <td>${sequentialNumber}</td>
                <td><img src="${thumbnailUrl}" alt="Video Thumbnail"></td>
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
   * 이전/다음 페이지 버튼의 가시성을 업데이트합니다.
   */
  function updatePaginationButtons() {
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

  // Google API 클라이언트 초기화가 완료된 후 카테고리와 지역 코드를 채웁니다.
  gapiClientPromise.then(() => {
    fetchVideoCategories(); // 동영상 카테고리 로드
    populateRegionCodes(); // 지역 코드 드롭다운 채우기
  });
});
