// DOM 요소 가져오기 (기존 요소 + 새로운 요소)
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const contentWrapper = document.querySelector('.content-wrapper');

const maxResultsInput = document.getElementById('maxResultsInput');
const commonRegionCodeSelect = document.getElementById(
  'commonRegionCodeSelect'
);
const commonLanguageCodeSelect = document.getElementById(
  'commonLanguageCodeSelect'
);

const channelIdInput = document.getElementById('channelIdInput');
const searchChannelBtn = document.getElementById('searchChannelBtn');
const channelResults = document.getElementById('channelResults');
const channelPartOptions = document.querySelector(
  '.part-options[data-target="channel"]'
);

const videoSearchInput = document.getElementById('videoSearchInput');
const searchVideosBtn = document.getElementById('searchVideosBtn');
const videoSearchResults = document.getElementById('videoSearchResults');
const videoSearchPartOptions = document.querySelector(
  '.part-options[data-target="videoSearch"]'
);
const videoSearchOrder = document.getElementById('videoSearchOrder');
const videoDuration = document.getElementById('videoDuration');

const searchPopularVideosBtn = document.getElementById(
  'searchPopularVideosBtn'
);
const popularVideoResults = document.getElementById('popularVideoResults');
const popularVideoPartOptions = document.querySelector(
  '.part-options[data-target="popularVideo"]'
);

const channelPlaylistIdInput = document.getElementById(
  'channelPlaylistIdInput'
);
const searchChannelPlaylistsBtn = document.getElementById(
  'searchChannelPlaylistsBtn'
);
const channelPlaylistResults = document.getElementById(
  'channelPlaylistResults'
);
const playlistPartOptions = document.querySelector(
  '.part-options[data-target="playlist"]'
);

const playlistItemsIdInput = document.getElementById('playlistItemsIdInput');
const searchPlaylistItemsBtn = document.getElementById(
  'searchPlaylistItemsBtn'
);
const playlistItemsResults = document.getElementById('playlistItemsResults');
const playlistItemPartOptions = document.querySelector(
  '.part-options[data-target="playlistItem"]'
);

const videoCommentIdInput = document.getElementById('videoCommentIdInput');
const searchVideoCommentsBtn = document.getElementById(
  'searchVideoCommentsBtn'
);
const videoCommentResults = document.getElementById('videoCommentResults');
const commentPartOptions = document.querySelector(
  '.part-options[data-target="comment"]'
);

const specificVideoIdInput = document.getElementById('specificVideoIdInput');
const searchSpecificVideoBtn = document.getElementById(
  'searchSpecificVideoBtn'
);
const specificVideoResults = document.getElementById('specificVideoResults');
const specificVideoPartOptions = document.querySelector(
  '.part-options[data-target="specificVideo"]'
);

const activityChannelIdInput = document.getElementById(
  'activityChannelIdInput'
);
const searchActivitiesBtn = document.getElementById('searchActivitiesBtn');
const activityResults = document.getElementById('activityResults');
const activityPartOptions = document.querySelector(
  '.part-options[data-target="activity"]'
);

// --- 새로 추가된 채널 섹션 관련 DOM 요소 ---
const channelSectionChannelIdInput = document.getElementById(
  'channelSectionChannelIdInput'
);
const listChannelSectionsBtn = document.getElementById(
  'listChannelSectionsBtn'
);
const channelSectionResults = document.getElementById('channelSectionResults');
const channelSectionPartOptions = document.querySelector(
  '.part-options[data-target="channelSection"]'
);

const listVideoCategoriesBtn = document.getElementById(
  'listVideoCategoriesBtn'
);
const videoCategoryResults = document.getElementById('videoCategoryResults');

// --- 새로 추가된 가이드 카테고리 관련 DOM 요소 ---
const listGuideCategoriesBtn = document.getElementById(
  'listGuideCategoriesBtn'
);
const guideCategoryResults = document.getElementById('guideCategoryResults');

const listRegionsBtn = document.getElementById('listRegionsBtn');
const listLanguagesBtn = document.getElementById('listLanguagesBtn');
const metadataResults = document.getElementById('metadataResults');

// --- gapi 초기화 및 API 로드 (기존과 동일) ---
let YOUTUBE_API_KEY = '';

function loadApiKeyAndInitGapi() {
  const storedKey = localStorage.getItem('youtube_api_key');
  if (storedKey) {
    apiKeyInput.value = storedKey;
    YOUTUBE_API_KEY = storedKey;
    initGapiClient(storedKey);
  } else {
    apiKeyStatus.textContent = 'API 키를 입력하고 등록해주세요.';
    apiKeyStatus.className = 'status-message';
    contentWrapper.classList.add('hidden');
  }
}

function initGapiClient(key) {
  if (!key) {
    apiKeyStatus.textContent = 'API 키를 입력해주세요.';
    apiKeyStatus.className = 'status-message error';
    contentWrapper.classList.add('hidden');
    return;
  }

  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: key,
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest',
        ],
      });
      console.log('gapi.client 초기화 및 YouTube API 로드 완료.');
      apiKeyStatus.textContent = 'API 키가 성공적으로 등록되었습니다!';
      apiKeyStatus.className = 'status-message success';
      YOUTUBE_API_KEY = key;
      localStorage.setItem('youtube_api_key', key);
      contentWrapper.classList.remove('hidden');
      loadCommonMetaData();
    } catch (error) {
      console.error('gapi.client 초기화 또는 YouTube API 로드 실패:', error);
      let errorMessage = 'API 키가 유효하지 않거나 API 로드에 실패했습니다.';
      if (error.result && error.result.error && error.result.error.message) {
        errorMessage += ` (${error.result.error.message})`;
      }
      apiKeyStatus.textContent = errorMessage;
      apiKeyStatus.className = 'status-message error';
      contentWrapper.classList.add('hidden');
    }
  });
}

saveApiKeyBtn.addEventListener('click', () => {
  initGapiClient(apiKeyInput.value.trim());
});

document.addEventListener('DOMContentLoaded', loadApiKeyAndInitGapi);

// --- part 선택 값 가져오는 헬퍼 함수 (기존과 동일) ---
function getSelectedParts(containerElement) {
  const checkboxes = containerElement.querySelectorAll(
    'input[type="checkbox"]:checked'
  );
  const parts = Array.from(checkboxes).map((cb) => cb.value);
  return parts.join(',');
}

// --- gapi.client 호출 및 에러 처리 함수 (기존과 동일) ---
async function executeGapiCall(
  apiCallFunction,
  params,
  resultsArea,
  loadingMessage = '데이터를 불러오는 중입니다...',
  showRawJson = true
) {
  if (!YOUTUBE_API_KEY || !gapi.client.youtube) {
    resultsArea.innerHTML =
      '<p class="error">API 키가 등록되지 않았거나 Google API 클라이언트가 초기화되지 않았습니다.</p>';
    return null;
  }

  resultsArea.innerHTML = `<p>${loadingMessage}</p>`;
  try {
    const response = await apiCallFunction(params);
    const data = response.result;

    if (response.status === 200) {
      if (showRawJson) {
        resultsArea.innerHTML = `<h3>Raw JSON Data:</h3><pre>${JSON.stringify(data, null, 2)}</pre><hr>`;
      } else {
        resultsArea.innerHTML = '';
      }
      if (data.items && data.items.length > 0) {
        return data.items;
      } else {
        resultsArea.insertAdjacentHTML(
          'beforeend',
          '<p>결과를 찾을 수 없습니다.</p>'
        );
        return null;
      }
    } else {
      let errorMessage = 'API 호출 중 오류가 발생했습니다.';
      if (data.error && data.error.errors && data.error.errors.length > 0) {
        errorMessage += ` (${data.error.errors[0].message})`;
      } else if (data.error && data.error.message) {
        errorMessage += ` (${data.error.message})`;
      }
      resultsArea.innerHTML = `<p class="error">${errorMessage}</p>`;
      return null;
    }
  } catch (error) {
    console.error('gapi.client 호출 오류:', error);
    let errorMessage = '네트워크 오류 또는 API 호출 실패.';
    if (error.result && error.result.error && error.result.error.message) {
      errorMessage += ` (${error.result.error.message})`;
    } else if (error.message) {
      errorMessage += ` (${error.message})`;
    }
    resultsArea.innerHTML = `<p class="error">${errorMessage}</p>`;
    return null;
  }
}

// --- 공통 메타데이터 (국가, 언어) 로드 함수 (기존과 동일) ---
async function loadCommonMetaData() {
  if (!gapi.client.youtube) {
    console.warn(
      'gapi.client.youtube이 준비되지 않아 메타데이터 로드를 건너뜝니다.'
    );
    return;
  }

  // 국가 코드 로드
  try {
    const response = await gapi.client.youtube.i18nRegions.list({
      part: 'snippet',
    });
    const data = response.result;
    if (response.status === 200 && data.items) {
      commonRegionCodeSelect.innerHTML =
        '<option value="">-- 국가 선택 --</option>';
      data.items.sort((a, b) => a.snippet.name.localeCompare(b.snippet.name));
      data.items.forEach((region) => {
        const option = document.createElement('option');
        option.value = region.id;
        option.textContent = region.snippet.name;
        commonRegionCodeSelect.appendChild(option);
      });
      const krOption =
        commonRegionCodeSelect.querySelector('option[value="KR"]');
      if (krOption) {
        krOption.selected = true;
      }
    }
  } catch (error) {
    console.error('국가 코드 로드 실패:', error);
  }

  // 언어 코드 로드
  try {
    const response = await gapi.client.youtube.i18nLanguages.list({
      part: 'snippet',
    });
    const data = response.result;
    if (response.status === 200 && data.items) {
      commonLanguageCodeSelect.innerHTML =
        '<option value="">-- 언어 선택 (선택 사항) --</option>';
      data.items.sort((a, b) => a.snippet.name.localeCompare(b.snippet.name));
      data.items.forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang.id;
        option.textContent = lang.snippet.name;
        commonLanguageCodeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('언어 코드 로드 실패:', error);
  }
}

// --- API 호출 로직 (gapi.client) ---

// 채널 정보 탐색 (channels.list) - 기존과 동일
searchChannelBtn.addEventListener('click', async () => {
  const channelIdentifier = channelIdInput.value.trim();
  if (!channelIdentifier) {
    channelResults.innerHTML =
      '<p class="error">채널 ID 또는 사용자 이름을 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(channelPartOptions);
  if (!selectedParts) {
    channelResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }
  const maxResults = maxResultsInput.value;

  const params = {
    part: selectedParts,
    maxResults: maxResults,
  };
  if (channelIdentifier.startsWith('UC') && channelIdentifier.length === 24) {
    params.id = channelIdentifier;
  } else {
    params.forUsername = channelIdentifier;
  }

  const items = await executeGapiCall(
    gapi.client.youtube.channels.list,
    params,
    channelResults,
    '채널 정보를 검색 중입니다...'
  );

  if (items) {
    const channel = items[0];
    let htmlContent = `<h3>채널 정보 (${channel.id}):</h3>`;
    if (selectedParts.includes('snippet') && channel.snippet) {
      htmlContent += `
                <div class="item-card">
                    <img src="${channel.snippet.thumbnails.default.url}" alt="${channel.snippet.title} 썸네일">
                    <div>
                        <h4><a href="https://www.youtube.com/channel/${channel.id}" target="_blank">${channel.snippet.title}</a></h4>
                        <p><strong>설명:</strong> ${channel.snippet.description ? channel.snippet.description.substring(0, 200) + (channel.snippet.description.length > 200 ? '...' : '') : '없음'}</p>
                        <p>게시일: ${new Date(channel.snippet.publishedAt).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
    }
    if (selectedParts.includes('statistics') && channel.statistics) {
      htmlContent += `
                <p><strong>구독자:</strong> ${channel.statistics.subscriberCount ? parseInt(channel.statistics.subscriberCount).toLocaleString() : '비공개'}</p>
                <p><strong>총 동영상 수:</strong> ${channel.statistics.videoCount ? parseInt(channel.statistics.videoCount).toLocaleString() : 'N/A'}</p>
                <p><strong>총 조회수:</strong> ${channel.statistics.viewCount ? parseInt(channel.statistics.viewCount).toLocaleString() : 'N/A'}</p>
            `;
    }
    channelResults.insertAdjacentHTML('beforeend', htmlContent);
  }
});

// 동영상 검색 (search.list) - 기존과 동일
searchVideosBtn.addEventListener('click', async () => {
  const query = videoSearchInput.value.trim();
  if (!query) {
    videoSearchResults.innerHTML =
      '<p class="error">검색할 키워드를 입력해주세요.</p>';
    return;
  }

  const maxResults = maxResultsInput.value;
  const order = videoSearchOrder.value;
  const duration = videoDuration.value;

  const params = {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults,
    order: order,
  };

  if (duration !== 'any') {
    params.videoDuration = duration;
  }

  const items = await executeGapiCall(
    gapi.client.youtube.search.list,
    params,
    videoSearchResults,
    '동영상을 검색 중입니다...'
  );

  if (items) {
    let html = '<h3>검색 결과:</h3>';
    items.forEach((item) => {
      const videoId = item.id.videoId;
      const title = item.snippet.title;
      const description = item.snippet.description;
      const thumbnailUrl = item.snippet.thumbnails.medium.url;
      const channelTitle = item.snippet.channelTitle;
      const publishedAt = new Date(
        item.snippet.publishedAt
      ).toLocaleDateString();

      html += `
                <div class="item-card">
                    <img src="${thumbnailUrl}" alt="${title} 썸네일">
                    <div>
                        <h4><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${title}</a></h4>
                        <p style="font-size: 0.9em; color: #555;">채널: ${channelTitle} | 게시일: ${publishedAt}</p>
                        <p style="font-size: 0.85em; color: #777;">${description.substring(0, 100) + (description.length > 100 ? '...' : '')}</p>
                    </div>
                </div>
            `;
    });
    videoSearchResults.insertAdjacentHTML('beforeend', html);
  }
});

// 인기 동영상 조회 (videos.list - chart=mostPopular) - 기존과 동일
searchPopularVideosBtn.addEventListener('click', async () => {
  const regionCode = commonRegionCodeSelect.value;
  if (!regionCode) {
    popularVideoResults.innerHTML =
      '<p class="error">공통 설정에서 국가 코드를 선택해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(popularVideoPartOptions);
  if (!selectedParts) {
    popularVideoResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }
  const maxResults = maxResultsInput.value;

  const params = {
    part: selectedParts,
    chart: 'mostPopular',
    regionCode: regionCode,
    maxResults: maxResults,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.videos.list,
    params,
    popularVideoResults,
    `${regionCode} 지역의 인기 동영상을 불러오는 중입니다...`
  );

  if (items) {
    let html = `<h3>${regionCode} 지역 인기 동영상:</h3>`;
    items.forEach((item) => {
      const videoId = item.id;
      const title = item.snippet ? item.snippet.title : '제목 없음';
      const channelTitle = item.snippet
        ? item.snippet.channelTitle
        : '채널 정보 없음';
      const thumbnailUrl =
        item.snippet && item.snippet.thumbnails
          ? item.snippet.thumbnails.medium.url
          : '';
      const viewCount = item.statistics
        ? item.statistics.viewCount
          ? parseInt(item.statistics.viewCount).toLocaleString()
          : 'N/A'
        : 'N/A';
      const duration = item.contentDetails
        ? item.contentDetails.duration
        : 'N/A';

      html += `
                <div class="item-card">
                    ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${title} 썸네일">` : ''}
                    <div>
                        <h4><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${title}</a></h4>
                        <p style="font-size: 0.9em; color: #555;">채널: ${channelTitle} | 조회수: ${viewCount} ${duration !== 'N/A' ? `| 길이: ${duration}` : ''}</p>
                    </div>
                </div>
            `;
    });
    popularVideoResults.insertAdjacentHTML('beforeend', html);
  }
});

// 채널 플레이리스트 조회 (playlists.list) - 기존과 동일
searchChannelPlaylistsBtn.addEventListener('click', async () => {
  const channelId = channelPlaylistIdInput.value.trim();
  if (!channelId) {
    channelPlaylistResults.innerHTML =
      '<p class="error">채널 ID를 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(playlistPartOptions);
  if (!selectedParts) {
    channelPlaylistResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }
  const maxResults = maxResultsInput.value;

  const params = {
    part: selectedParts,
    channelId: channelId,
    maxResults: maxResults,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.playlists.list,
    params,
    channelPlaylistResults,
    '채널의 플레이리스트를 검색 중입니다...'
  );

  if (items) {
    let html = '<h3>채널 플레이리스트:</h3>';
    items.forEach((item) => {
      const playlistId = item.id;
      const title = item.snippet ? item.snippet.title : '제목 없음';
      const description = item.snippet ? item.snippet.description : '설명 없음';
      const thumbnailUrl =
        item.snippet && item.snippet.thumbnails
          ? item.snippet.thumbnails.medium.url
          : '';
      const itemCount = item.contentDetails
        ? item.contentDetails.itemCount
        : 'N/A';

      html += `
                <div class="item-card">
                    ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${title} 썸네일">` : ''}
                    <div>
                        <h4><a href="https://www.youtube.com/playlist?list=${playlistId}" target="_blank">${title}</a></h4>
                        <p style="font-size: 0.9em; color: #555;">동영상 ${itemCount}개</p>
                        <p style="font-size: 0.85em; color: #777;">${description.substring(0, 100) + (description.length > 100 ? '...' : '')}</p>
                    </div>
                </div>
            `;
    });
    channelPlaylistResults.insertAdjacentHTML('beforeend', html);
  }
});

// 플레이리스트 내 동영상 조회 (playlistItems.list) - 기존과 동일
searchPlaylistItemsBtn.addEventListener('click', async () => {
  const playlistId = playlistItemsIdInput.value.trim();
  if (!playlistId) {
    playlistItemsResults.innerHTML =
      '<p class="error">플레이리스트 ID를 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(playlistItemPartOptions);
  if (!selectedParts) {
    playlistItemsResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }
  const maxResults = maxResultsInput.value;

  const params = {
    part: selectedParts,
    playlistId: playlistId,
    maxResults: maxResults,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.playlistItems.list,
    params,
    playlistItemsResults,
    '플레이리스트 내 동영상을 불러오는 중입니다...'
  );

  if (items) {
    let html = `<h3>플레이리스트 내 동영상 (${playlistId}):</h3>`;
    items.forEach((item) => {
      const videoId = item.contentDetails ? item.contentDetails.videoId : 'N/A';
      const title = item.snippet ? item.snippet.title : '제목 없음';
      const channelTitle = item.snippet
        ? item.snippet.channelTitle
        : '채널 정보 없음';
      const thumbnailUrl =
        item.snippet && item.snippet.thumbnails
          ? item.snippet.thumbnails.medium.url
          : '';

      html += `
                <div class="item-card">
                    ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${title} 썸네일">` : ''}
                    <div>
                        <h4><a href="https://www.youtube.com/watch?v=${videoId}&list=${playlistId}" target="_blank">${title}</a></h4>
                        <p style="font-size: 0.9em; color: #555;">채널: ${channelTitle}</p>
                    </div>
                </div>
            `;
    });
    playlistItemsResults.insertAdjacentHTML('beforeend', html);
  }
});

// 동영상 댓글 조회 (commentThreads.list) - 기존과 동일
searchVideoCommentsBtn.addEventListener('click', async () => {
  const videoId = videoCommentIdInput.value.trim();
  if (!videoId) {
    videoCommentResults.innerHTML =
      '<p class="error">동영상 ID를 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(commentPartOptions);
  if (!selectedParts) {
    videoCommentResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }
  const maxResults = maxResultsInput.value;

  const params = {
    part: selectedParts,
    videoId: videoId,
    maxResults: maxResults,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.commentThreads.list,
    params,
    videoCommentResults,
    '동영상 댓글을 불러오는 중입니다...'
  );

  if (items) {
    let html = '<h3>최신 댓글:</h3>';
    items.forEach((item) => {
      const topLevelComment =
        item.snippet && item.snippet.topLevelComment
          ? item.snippet.topLevelComment.snippet
          : null;

      if (topLevelComment) {
        const authorDisplayName = topLevelComment.authorDisplayName;
        const authorProfileImageUrl = topLevelComment.authorProfileImageUrl;
        const textDisplay = topLevelComment.textDisplay;
        const likeCount = topLevelComment.likeCount;
        const publishedAt = new Date(
          topLevelComment.publishedAt
        ).toLocaleDateString();

        html += `
                    <div class="item-card" style="align-items: center; border-bottom: 1px dashed #eee;">
                        <img src="${authorProfileImageUrl}" alt="${authorDisplayName} 프로필" style="width: 40px; height: 40px; border-radius: 50%;">
                        <div>
                            <h4>${authorDisplayName}</h4>
                            <p style="font-size: 0.9em; color: #555;">게시일: ${publishedAt} | 좋아요: ${likeCount}</p>
                            <p style="font-size: 0.85em; color: #333;">${textDisplay}</p>
                            ${
                              item.replies &&
                              item.replies.comments &&
                              item.replies.comments.length > 0 &&
                              selectedParts.includes('replies')
                                ? `<p style="font-size: 0.8em; color: #888;">답글 ${item.replies.comments.length}개 (replies part 선택 시)</p>`
                                : ''
                            }
                        </div>
                    </div>
                `;
      }
    });
    videoCommentResults.insertAdjacentHTML('beforeend', html);
  }
});

// 특정 동영상 상세 정보 조회 (videos.list - ID) - 기존과 동일
searchSpecificVideoBtn.addEventListener('click', async () => {
  const videoId = specificVideoIdInput.value.trim();
  if (!videoId) {
    specificVideoResults.innerHTML =
      '<p class="error">동영상 ID를 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(specificVideoPartOptions);
  if (!selectedParts) {
    specificVideoResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }

  const params = {
    part: selectedParts,
    id: videoId,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.videos.list,
    params,
    specificVideoResults,
    '동영상 상세 정보를 불러오는 중입니다...'
  );

  if (items) {
    const video = items[0];
    let htmlContent = `<h3>동영상 상세 정보 (${video.id}):</h3>`;

    if (selectedParts.includes('snippet') && video.snippet) {
      htmlContent += `
                <div class="item-card">
                    <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title} 썸네일">
                    <div>
                        <h4><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">${video.snippet.title}</a></h4>
                        <p style="font-size: 0.9em; color: #555;">채널: ${video.snippet.channelTitle} | 게시일: ${new Date(video.snippet.publishedAt).toLocaleDateString()}</p>
                        <p style="font-size: 0.85em; color: #777;">${video.snippet.description ? video.snippet.description.substring(0, 200) + (video.snippet.description.length > 200 ? '...' : '') : '없음'}</p>
                    </div>
                </div>
            `;
    }
    if (selectedParts.includes('statistics') && video.statistics) {
      htmlContent += `
                <p><strong>조회수:</strong> ${video.statistics.viewCount ? parseInt(video.statistics.viewCount).toLocaleString() : 'N/A'}</p>
                <p><strong>좋아요:</strong> ${video.statistics.likeCount ? parseInt(video.statistics.likeCount).toLocaleString() : 'N/A'}</p>
                <p><strong>댓글 수:</strong> ${video.statistics.commentCount ? parseInt(video.statistics.commentCount).toLocaleString() : 'N/A'}</p>
            `;
    }
    if (selectedParts.includes('contentDetails') && video.contentDetails) {
      htmlContent += `<p><strong>길이:</strong> ${video.contentDetails.duration}</p>`;
      htmlContent += `<p><strong>HD 여부:</strong> ${video.contentDetails.definition}</p>`;
      htmlContent += `<p><strong>캡션 여부:</strong> ${video.contentDetails.caption === 'true' ? '있음' : '없음'}</p>`;
    }
    if (selectedParts.includes('player') && video.player) {
      htmlContent += `<h4>임베드 플레이어:</h4><div style="width: 100%; max-width: 560px;">${video.player.embedHtml}</div>`;
    }

    specificVideoResults.insertAdjacentHTML('beforeend', htmlContent);
  }
});

// 채널 활동 피드 조회 (activities.list) - 기존과 동일
searchActivitiesBtn.addEventListener('click', async () => {
  const channelId = activityChannelIdInput.value.trim();
  if (!channelId) {
    activityResults.innerHTML = '<p class="error">채널 ID를 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(activityPartOptions);
  if (!selectedParts) {
    activityResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }
  const maxResults = maxResultsInput.value;

  const params = {
    part: selectedParts,
    channelId: channelId,
    maxResults: maxResults,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.activities.list,
    params,
    activityResults,
    '채널 활동을 불러오는 중입니다...'
  );

  if (items) {
    let html = '<h3>채널 활동:</h3>';
    items.forEach((item) => {
      const snippet = item.snippet;
      const contentDetails = item.contentDetails;
      let activityType = snippet.type;
      let title = '';
      let thumbnailUrl = '';
      let link = '#'; // 기본값

      if (activityType === 'upload' && contentDetails.upload) {
        title = snippet.title || '새 동영상 업로드';
        thumbnailUrl = snippet.thumbnails.default.url;
        link = `https://www.youtube.com/watch?v=${contentDetails.upload.videoId}`;
      } else if (activityType === 'like' && contentDetails.like) {
        title = snippet.title || '동영상 좋아요';
        thumbnailUrl = snippet.thumbnails.default.url;
        link = `https://www.youtube.com/watch?v=${contentDetails.like.videoId}`;
      } else if (
        activityType === 'playlistItem' &&
        contentDetails.playlistItem
      ) {
        title = snippet.title || '플레이리스트에 동영상 추가';
        thumbnailUrl = snippet.thumbnails.default.url;
        link = `https://www.youtube.com/watch?v=${contentDetails.playlistItem.resourceId.videoId}&list=${contentDetails.playlistItem.playlistId}`;
      } else if (snippet.title) {
        title = snippet.title;
        thumbnailUrl = snippet.thumbnails ? snippet.thumbnails.default.url : '';
      } else {
        title = `알 수 없는 활동 (${activityType})`;
        thumbnailUrl = '';
      }

      html += `
                <div class="item-card">
                    ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="활동 썸네일">` : ''}
                    <div>
                        <h4><a href="${link}" target="_blank">${title}</a></h4>
                        <p style="font-size: 0.9em; color: #555;">활동 유형: ${activityType}</p>
                        <p style="font-size: 0.85em; color: #777;">게시일: ${new Date(snippet.publishedAt).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
    });
    activityResults.insertAdjacentHTML('beforeend', html);
  }
});

// --- 채널 섹션 조회 로직 (channelSections.list) (새로 추가) ---
listChannelSectionsBtn.addEventListener('click', async () => {
  const channelId = channelSectionChannelIdInput.value.trim();
  if (!channelId) {
    channelSectionResults.innerHTML =
      '<p class="error">채널 ID를 입력해주세요.</p>';
    return;
  }

  const selectedParts = getSelectedParts(channelSectionPartOptions);
  if (!selectedParts) {
    channelSectionResults.innerHTML =
      '<p class="error">조회할 part를 최소 하나 이상 선택해주세요.</p>';
    return;
  }

  const params = {
    part: selectedParts,
    channelId: channelId,
  };

  const items = await executeGapiCall(
    gapi.client.youtube.channelSections.list,
    params,
    channelSectionResults,
    `채널 ID ${channelId}의 섹션을 불러오는 중입니다...`
  );

  if (items) {
    let html = `<h3>채널 섹션 (${channelId}):</h3><ul>`;
    items.forEach((section) => {
      const title = section.snippet ? section.snippet.title : '제목 없음';
      const type = section.snippet ? section.snippet.type : '유형 없음';
      const position = section.snippet ? section.snippet.position : 'N/A';
      const contentDetails = section.contentDetails;

      html += `<li><strong>제목:</strong> ${title} (${type}, 위치: ${position})`;

      if (contentDetails) {
        if (contentDetails.playlists && contentDetails.playlists.length > 0) {
          html += `<p style="margin-left: 20px;">포함된 플레이리스트: <ul>`;
          contentDetails.playlists.forEach((playlistId) => {
            html += `<li><a href="https://www.youtube.com/playlist?list=${playlistId}" target="_blank">${playlistId}</a></li>`;
          });
          html += `</ul></p>`;
        }
        if (contentDetails.channels && contentDetails.channels.length > 0) {
          html += `<p style="margin-left: 20px;">포함된 채널: <ul>`;
          contentDetails.channels.forEach((chId) => {
            html += `<li><a href="https://www.youtube.com/channel/${chId}" target="_blank">${chId}</a></li>`;
          });
          html += `</ul></p>`;
        }
        if (
          contentDetails.channels === undefined &&
          contentDetails.playlists === undefined
        ) {
          // 예: popularUploads, latestUploads 등은 contentDetails에 특정 ID를 포함하지 않음
          html += `<p style="margin-left: 20px;">(특정 콘텐츠 ID 없음)</p>`;
        }
      }
      html += `</li>`;
    });
    html += `</ul>`;
    channelSectionResults.insertAdjacentHTML('beforeend', html);
  }
});

// 메타데이터 조회 공통 함수 (gapi.client 사용, Raw JSON 숨김) - 기존과 동일
async function fetchAndDisplayMetadataGapi(
  apiCallFunction,
  params,
  resultsArea,
  loadingMessage
) {
  if (!YOUTUBE_API_KEY || !gapi.client.youtube) {
    resultsArea.innerHTML =
      '<p class="error">API 키가 등록되지 않았거나 Google API 클라이언트가 초기화되지 않았습니다.</p>';
    return;
  }
  resultsArea.innerHTML = `<p>${loadingMessage}</p>`;
  try {
    const response = await apiCallFunction(params);
    const data = response.result;

    if (response.status === 200 && data.items) {
      resultsArea.innerHTML = '';
      let html = `<h3>${loadingMessage.replace('를 불러오는 중입니다...', '')} 목록:</h3><ul>`;
      data.items.sort((a, b) =>
        (a.snippet.name || a.snippet.title).localeCompare(
          b.snippet.name || b.snippet.title
        )
      );
      data.items.forEach((item) => {
        html += `<li><strong>ID:</strong> ${item.id} - <strong>이름:</strong> ${item.snippet.name || item.snippet.title}</li>`;
      });
      html += `</ul>`;
      resultsArea.insertAdjacentHTML('beforeend', html);
    } else {
      let errorMessage = 'API 호출 중 오류가 발생했습니다.';
      if (data.error && data.error.errors && data.error.errors.length > 0) {
        errorMessage += ` (${data.error.errors[0].message})`;
      } else if (data.error && data.error.message) {
        errorMessage += ` (${data.error.message})`;
      }
      resultsArea.innerHTML = `<p class="error">${errorMessage}</p>`;
    }
  } catch (error) {
    console.error('gapi.client 호출 오류:', error);
    let errorMessage = '네트워크 오류 또는 API 호출 실패.';
    if (error.result && error.result.error && error.result.error.message) {
      errorMessage += ` (${error.result.error.message})`;
    } else if (error.message) {
      errorMessage += ` (${error.message})`;
    }
    resultsArea.innerHTML = `<p class="error">${errorMessage}</p>`;
  }
}

// --- 이벤트 리스너 업데이트 (gapi.client 함수로 연결) ---

// 동영상 카테고리 목록 조회 - 기존과 동일
listVideoCategoriesBtn.addEventListener('click', () => {
  const regionCode = commonRegionCodeSelect.value;
  if (!regionCode) {
    videoCategoryResults.innerHTML =
      '<p class="error">동영상 카테고리 조회 시 공통 설정에서 국가 코드를 선택해주세요.</p>';
    return;
  }
  fetchAndDisplayMetadataGapi(
    gapi.client.youtube.videoCategories.list,
    { part: 'snippet', regionCode: regionCode },
    videoCategoryResults,
    '동영상 카테고리'
  );
});

// 가이드 카테고리 목록 조회 (새로 추가)
listGuideCategoriesBtn.addEventListener('click', () => {
  const regionCode = commonRegionCodeSelect.value;
  if (!regionCode) {
    guideCategoryResults.innerHTML =
      '<p class="error">가이드 카테고리 조회 시 공통 설정에서 국가 코드를 선택해주세요.</p>';
    return;
  }
  fetchAndDisplayMetadataGapi(
    gapi.client.youtube.guideCategories.list,
    { part: 'snippet', regionCode: regionCode },
    guideCategoryResults,
    '가이드 카테고리'
  );
});

// 국가 코드 목록 조회 - 기존과 동일
listRegionsBtn.addEventListener('click', () => {
  fetchAndDisplayMetadataGapi(
    gapi.client.youtube.i18nRegions.list,
    { part: 'snippet' },
    metadataResults,
    '국가 코드'
  );
});

// 언어 코드 목록 조회 - 기존과 동일
listLanguagesBtn.addEventListener('click', () => {
  const languageCode = commonLanguageCodeSelect.value;
  const params = { part: 'snippet' };
  if (languageCode) {
    params.hl = languageCode;
  }
  fetchAndDisplayMetadataGapi(
    gapi.client.youtube.i18nLanguages.list,
    params,
    metadataResults,
    '언어 코드'
  );
});
