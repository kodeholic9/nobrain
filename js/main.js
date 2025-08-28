document.addEventListener('DOMContentLoaded', function () {
  // 게임 데이터를 JavaScript 배열로 정의
  const games = [
    {
      name: '2048키우기',
      description: '걍 게임!',
      icon: '🔍', // 돋보기 이모티콘 추가
      link: './games/ballpool', // 실제 게임 페이지 링크로 변경 예정
    },
    {
      name: '틀린그림찾기',
      description: '두뇌를 자극하는 시각 인지 게임!',
      icon: '🔍', // 돋보기 이모티콘 추가
      link: './games/spot-it', // 실제 게임 페이지 링크로 변경 예정
    },
    {
      name: '메모리 게임',
      description: '기억력 향상을 위한 최고의 선택!',
      icon: '🧠', // 뇌 이모티콘 추가
      link: '#', // 실제 게임 페이지 링크로 변경 예정
    },
  ];

  const swiperWrapper = document.querySelector('.swiper-wrapper');

  // 게임 데이터를 이용하여 Swiper 슬라이드 동적으로 생성
  games.forEach((game) => {
    const swiperSlide = document.createElement('div');
    swiperSlide.classList.add('swiper-slide');

    swiperSlide.innerHTML = `
            <div class="game-icon">${game.icon}</div> <h3>${game.name}</h3>
            <p>${game.description}</p>
            <a href="${game.link}" class="btn">게임 시작</a>
        `;
    swiperWrapper.appendChild(swiperSlide);
  });

  // Swiper 초기화 (이전과 동일)
  const swiper = new Swiper('.mySwiper', {
    slidesPerView: 1,
    spaceBetween: 30,
    // loop: true, // 이 줄은 이전 단계에서 제거했으므로 그대로 둡니다.
    centeredSlides: true,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
        spaceBetween: 40,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 50,
        centeredSlides: false,
      },
    },
  });
});
