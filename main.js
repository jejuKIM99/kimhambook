document.addEventListener("DOMContentLoaded", () => {
  const preloader = document.querySelector(".preloader");
  const preloaderCounter = document.querySelector(".preloader-counter");

  // Simplified preloader that works reliably
  let count = 0;
  const duration = 2048; // 2048ms (2^11) - power of 2
  const increment = 5; // Increment by 5 each time
  const interval = 128; // Update every 128ms (2^7) - power of 2

  // Simple interval-based counter
  const counterInterval = setInterval(() => {
    count += increment;

    if (count <= 100) {
      preloaderCounter.textContent = count;
    } else {
      // Ensure we reach exactly 100 at the end
      preloaderCounter.textContent = "100";
      clearInterval(counterInterval);

      // Hide preloader after a short delay
      setTimeout(() => {
        preloader.classList.add("preloader-hidden");

        // Initialize the main application
        setTimeout(() => {
          initApp();
        }, 256); // 256ms (2^8) - power of 2
      }, 256); // 256ms (2^8) - power of 2
    }
  }, interval);
});

function initApp() {
  // Check if GSAP and Flip are loaded
  if (typeof gsap === "undefined" || typeof Flip === "undefined") {
    console.error("GSAP or Flip plugin not loaded");
    return;
  }
  gsap.registerPlugin(Flip);

  // Create the custom eases
  if (typeof CustomEase !== "undefined") {
    CustomEase.create("mainEase", "M0,0 C0.65,0.05 0.36,1 1,1"); // cubic-bezier(0.65,0.05,0.36,1)
    CustomEase.create("sideEase", "M0,0 C0.86,0 0.07,1 1,1");    // cubic-bezier(0.86,0,0.07,1)
    CustomEase.create("natural", "M0,0 C0.34,0.01 0.2,1 1,1");
    CustomEase.create("naturalOut", "M0,0 C0.43,0.13 0.23,0.96 1,1");
    CustomEase.create("cinematic", "M0,0 C0.645,0.045 0.355,1 1,1");
  }

  // Power of 2 timing constants (in seconds)
  const TIMING = {
    BASE: 0.512,       // 512ms
    SHORTEST: 0.256,   // 256ms
    SHORT: 0.384,      // 384ms
    LONG: 0.768,       // 768ms
    LONGEST: 1.024,    // 1024ms
    STAGGER_TINY: 0.032, // 32ms
    STAGGER_SMALL: 0.064, // 64ms
    STAGGER_MED: 0.128,   // 128ms
    PAUSE: 1.536       // 1536ms
  };

  // Elements
  const grid = document.getElementById("grid");
  const gridContainer = document.querySelector(".grid-container");
  const gridItems = document.querySelectorAll(".grid-item");
  const sliderImage = document.getElementById("slider-image");
  const sliderImageNext = document.getElementById("slider-image-next");
  const sliderImageBg = document.getElementById("slider-image-bg");
  const transitionOverlay = document.getElementById("transition-overlay");
  const content = document.getElementById("content");
  const contentTitle = document.querySelector(".content-title");
  const contentTitleSpan = contentTitle.querySelector("span");
  const contentParagraph = document.getElementById("content-paragraph");
  const thumbnailItems = document.querySelectorAll(".thumbnail");
  const switchContainer = document.getElementById("switch");

  // Switch buttons
  const switchGrid = document.querySelector(".switch-button-grid");
  const switchSlider = document.querySelector(".switch-button-slider");

  // State
  let currentMode = "grid";
  let isAnimating = false;
  let activeIndex = 4;      // Default to 5th image (index 4)
  let previousIndex = 4;    // Track previous index for transitions
  let slideDirection = "right"; // Default slide direction

  // Store all image URLs for easy access
  const imageUrls = Array.from(gridItems).map(
    (item) => item.querySelector(".grid-item-img").style.backgroundImage
  );

  // HTML에 작성한 data-* 속성에서 제목과 문단을 가져오는 함수
  const getSlideDataFromHTML = (index) => {
    const item = document.querySelector(`.grid-item[data-index="${index}"]`);
    return {
      title: item.getAttribute("data-title"),
      paragraph: item.getAttribute("data-paragraph").trim()
    };
  };

  // Update content based on active index (HTML에서 가져온 데이터로 세팅)
  const updateContent = (index) => {
    const data = getSlideDataFromHTML(index);
    contentTitleSpan.textContent = data.title;
    contentParagraph.textContent = data.paragraph;
  };

  // Toggle function
  const toggleView = (mode) => {
    if (isAnimating || currentMode === mode) return;
    isAnimating = true;

    // Update switch 버튼 스타일
    document
      .querySelector(".switch-button-current")
      .classList.remove("switch-button-current");
    document
      .querySelector(`.switch-button-${mode}`)
      .classList.add("switch-button-current");

    currentMode = mode;

    if (mode === "slider") {
      showSliderView().then(() => (isAnimating = false));
    } else {
      showGridView().then(() => (isAnimating = false));
    }
  };

  // Show slider view with two-step animation (height first, then width)
  const showSliderView = () => {
    return new Promise((resolve) => {
      const activeItem = document.querySelector(
        `.grid-item[data-index="${activeIndex}"]`
      );
      const activeItemRect = activeItem.getBoundingClientRect();

      // 현재 active 이미지 URL 세팅
      const activeImageUrl = imageUrls[activeIndex];
      sliderImage.style.backgroundImage = activeImageUrl;
      sliderImageBg.style.backgroundImage = activeImageUrl;

      // 일관된 스타일링
      sliderImage.style.backgroundSize = "cover";
      sliderImage.style.backgroundPosition = "center";
      sliderImageBg.style.backgroundSize = "cover";
      sliderImageBg.style.backgroundPosition = "center";
      sliderImageNext.style.backgroundSize = "cover";
      sliderImageNext.style.backgroundPosition = "center";

      // HTML에 작성된 텍스트로 업데이트
      updateContent(activeIndex);

      // sliderImage를 그리드 상의 active 아이템 위치 위에 미리 위치시킴
      gsap.set(sliderImage, {
        width: activeItemRect.width,
        height: activeItemRect.height,
        x: activeItemRect.left,
        y: activeItemRect.top,
        opacity: 1,
        visibility: "visible"
      });

      // STEP 1: 높이를 100vh로 확장 (FLIP 사용)
      const heightState = Flip.getState(sliderImage);
      gsap.set(sliderImage, {
        height: "100vh",
        y: 0,
        width: activeItemRect.width,
        x: activeItemRect.left
      });
      Flip.from(heightState, {
        duration: TIMING.BASE,
        ease: "mainEase",
        onComplete: () => {
          // STEP 2: 너비를 100vw로 확장 (FLIP 사용)
          const widthState = Flip.getState(sliderImage);
          gsap.set(sliderImage, {
            width: "100vw",
            x: 0
          });
          Flip.from(widthState, {
            duration: TIMING.BASE,
            ease: "mainEase",
            onComplete: () => {
              // 그리드를 숨김
              gsap.to(grid, {
                opacity: 0,
                duration: TIMING.SHORTEST,
                ease: "power2.inOut"
              });
              // 콘텐츠(타이틀, 문단, 썸네일) 보여주기 애니메이션
              const contentTl = gsap.timeline({
                onComplete: resolve
              });
              contentTl.to(
                content,
                {
                  opacity: 1,
                  duration: TIMING.SHORT,
                  ease: "mainEase"
                },
                0
              );
              contentTl.to(
                contentTitleSpan,
                {
                  y: 0,
                  duration: TIMING.BASE,
                  ease: "sideEase"
                },
                TIMING.STAGGER_TINY
              );
              contentTl.to(
                contentParagraph,
                {
                  opacity: 1,
                  duration: TIMING.BASE,
                  ease: "mainEase"
                },
                TIMING.STAGGER_SMALL
              );
              contentTl.to(
                thumbnailItems,
                {
                  opacity: 1,
                  y: 0,
                  duration: TIMING.SHORT,
                  stagger: TIMING.STAGGER_TINY,
                  ease: "sideEase"
                },
                TIMING.STAGGER_MED
              );
            }
          });
        }
      });
    });
  };

  // Show grid view with 두 단계 축소 애니메이션 (너비 먼저, 그 다음 높이)
  const showGridView = () => {
    return new Promise((resolve) => {
      const activeItem = document.querySelector(
        `.grid-item[data-index="${activeIndex}"]`
      );
      const activeItemRect = activeItem.getBoundingClientRect();

      // 콘텐츠를 먼저 숨김
      const contentTl = gsap.timeline({
        onComplete: () => {
          gsap.to(grid, {
            opacity: 1,
            duration: TIMING.SHORTEST,
            ease: "power2.inOut"
          });
          gsap.set([sliderImageNext, sliderImageBg, transitionOverlay], {
            opacity: 0,
            visibility: "hidden"
          });

          // STEP 1: 너비를 원래 그리드 아이템 너비로 축소 (FLIP)
          const widthState = Flip.getState(sliderImage);
          gsap.set(sliderImage, {
            width: activeItemRect.width,
            x: activeItemRect.left,
            height: "100vh",
            y: 0
          });
          Flip.from(widthState, {
            duration: TIMING.BASE,
            ease: "mainEase",
            onComplete: () => {
              // STEP 2: 높이를 원래 그리드 아이템 높이로 축소 (FLIP)
              const heightState = Flip.getState(sliderImage);
              gsap.set(sliderImage, {
                height: activeItemRect.height,
                y: activeItemRect.top
              });
              Flip.from(heightState, {
                duration: TIMING.BASE,
                ease: "mainEase",
                onComplete: () => {
                  // 마지막에 sliderImage 숨김
                  gsap.to(sliderImage, {
                    opacity: 0,
                    duration: TIMING.SHORTEST,
                    ease: "power2.inOut",
                    onComplete: () => {
                      sliderImage.style.visibility = "hidden";
                      resolve();
                    }
                  });
                }
              });
            }
          });
        }
      });

      // 썸네일 숨기기
      contentTl.to(
        thumbnailItems,
        {
          opacity: 0,
          y: 20,
          duration: TIMING.SHORT,
          stagger: -TIMING.STAGGER_TINY,
          ease: "sideEase"
        },
        0
      );
      // 문단 숨기기
      contentTl.to(
        contentParagraph,
        {
          opacity: 0,
          duration: TIMING.SHORT,
          ease: "mainEase"
        },
        TIMING.STAGGER_TINY
      );
      // 타이틀 숨기기
      contentTl.to(
        contentTitleSpan,
        {
          y: "100%",
          duration: TIMING.SHORT,
          ease: "sideEase"
        },
        TIMING.STAGGER_SMALL
      );
      // 컨텐츠 컨테이너 숨기기
      contentTl.to(
        content,
        {
          opacity: 0,
          duration: TIMING.SHORT,
          ease: "mainEase"
        },
        TIMING.STAGGER_MED
      );
    });
  };

  // 슬라이드 전환 애니메이션
  const transitionToSlide = (index) => {
    if (isAnimating || index === activeIndex) return;
    isAnimating = true;

    slideDirection = index > activeIndex ? "right" : "left";
    previousIndex = activeIndex;

    // 썸네일 active 업데이트
    document.querySelector(".thumbnail.active").classList.remove("active");
    document
      .querySelector(`.thumbnail[data-index="${index}"]`)
      .classList.add("active");

    const newImageUrl = imageUrls[index];

    // transition 요소들 세팅
    sliderImageNext.style.backgroundImage = newImageUrl;
    sliderImageBg.style.backgroundImage = newImageUrl;

    sliderImage.style.backgroundSize = "cover";
    sliderImage.style.backgroundPosition = "center";
    sliderImageBg.style.backgroundSize = "cover";
    sliderImageBg.style.backgroundPosition = "center";
    sliderImageNext.style.backgroundSize = "cover";
    sliderImageNext.style.backgroundPosition = "center";

    gsap.set([sliderImageNext, sliderImageBg], {
      visibility: "visible"
    });

    const xOffset = slideDirection === "right" ? "100%" : "-100%";

    // 다음 이미지 초기 위치 설정
    gsap.set(sliderImageNext, {
      x: xOffset,
      y: 0,
      opacity: 1,
      width: "100vw",
      height: "100vh"
    });
    gsap.set(sliderImageBg, {
      x: xOffset,
      y: 0,
      opacity: 0.9,
      width: "100vw",
      height: "100vh",
      scale: 1
    });

    const masterTl = gsap.timeline({
      onComplete: () => {
        // 메인 이미지 업데이트
        sliderImage.style.backgroundImage = newImageUrl;
        gsap.set([sliderImageNext, sliderImageBg, transitionOverlay], {
          opacity: 0,
          x: 0,
          y: 0,
          visibility: "hidden"
        });
        gsap.set(sliderImage, {
          x: 0,
          opacity: 1
        });

        // HTML에서 가져온 텍스트로 업데이트
        updateContent(index);
        activeIndex = index;

        // 콘텐츠 다시 보여주기
        const showTl = gsap.timeline({
          onComplete: () => {
            isAnimating = false;
          }
        });
        showTl.to(
          contentTitleSpan,
          {
            y: 0,
            duration: TIMING.BASE,
            ease: "sideEase"
          },
          0
        );
        showTl.to(
          contentParagraph,
          {
            opacity: 1,
            duration: TIMING.BASE,
            ease: "mainEase"
          },
          TIMING.STAGGER_SMALL
        );
      }
    });

    // 현재 콘텐츠 숨기기
    masterTl.to(
      contentParagraph,
      {
        opacity: 0,
        duration: TIMING.SHORT,
        ease: "mainEase"
      },
      0
    );
    masterTl.to(
      contentTitleSpan,
      {
        y: "100%",
        duration: TIMING.SHORT,
        ease: "sideEase"
      },
      TIMING.STAGGER_TINY
    );
    // 플래시 효과
    masterTl.to(
      transitionOverlay,
      {
        opacity: 0.15,
        duration: TIMING.SHORTEST,
        ease: "power1.in"
      },
      TIMING.STAGGER_SMALL
    );
    masterTl.to(
      transitionOverlay,
      {
        opacity: 0,
        duration: TIMING.SHORT,
        ease: "power1.out"
      },
      TIMING.STAGGER_MED
    );
    // 현재 이미지 옆으로 밀어내기
    masterTl.to(
      sliderImage,
      {
        x: slideDirection === "right" ? "-35%" : "35%",
        opacity: 1,
        duration: TIMING.LONG,
        ease: "mainEase"
      },
      0
    );
    // 백그라운드 레이어 이동
    masterTl.to(
      sliderImageBg,
      {
        x: slideDirection === "right" ? "-10%" : "10%",
        y: 0,
        opacity: 0.95,
        scale: 1,
        duration: TIMING.LONG,
        ease: "sideEase"
      },
      TIMING.STAGGER_TINY
    );
    // 다음 이미지 슬라이드 인
    masterTl.to(
      sliderImageNext,
      {
        x: 0,
        opacity: 1,
        duration: TIMING.LONG,
        ease: "sideEase"
      },
      TIMING.STAGGER_SMALL
    );
  };

  // 썸네일 클릭 이벤트
  thumbnailItems.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (currentMode !== "slider") return;
      const index = parseInt(thumb.getAttribute("data-index"));
      transitionToSlide(index);
    });
  });

  // 윈도우 리사이즈 시 슬라이더 크기 유지
  window.addEventListener("resize", () => {
    if (currentMode === "slider") {
      gsap.set(sliderImage, {
        width: "100vw",
        height: "100vh",
        x: 0,
        y: 0
      });
      sliderImage.style.backgroundSize = "cover";
      sliderImage.style.backgroundPosition = "center";
    }
  });

  // 스위치 버튼 호버 효과
  const switchButtons = document.querySelectorAll(".switch-button");
  switchButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      if (button.classList.contains("switch-button-grid")) {
        switchContainer.style.paddingLeft = "30px";
      } else {
        switchContainer.style.paddingRight = "30px";
      }
    });
    button.addEventListener("mouseleave", () => {
      switchContainer.style.paddingLeft = "20px";
      switchContainer.style.paddingRight = "20px";
    });
  });

  // 스위치 클릭 이벤트 연결
  switchGrid.onclick = () => toggleView("grid");
  switchSlider.onclick = () => toggleView("slider");

  // 키보드 내비게이션 (슬라이더 모드 전제)
  document.addEventListener("keydown", (e) => {
    if (currentMode !== "slider" || isAnimating) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      const nextIndex = (activeIndex + 1) % imageUrls.length;
      transitionToSlide(nextIndex);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      const prevIndex = (activeIndex - 1 + imageUrls.length) % imageUrls.length;
      transitionToSlide(prevIndex);
    }
  });

  // 터치 스와이프 지원 (슬라이더 모드 전제)
  let touchStartX = 0;
  let touchEndX = 0;
  document.addEventListener("touchstart", (e) => {
    if (currentMode !== "slider" || isAnimating) return;
    touchStartX = e.changedTouches[0].screenX;
  });
  document.addEventListener("touchend", (e) => {
    if (currentMode !== "slider" || isAnimating) return;
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  const handleSwipe = () => {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      const nextIndex = (activeIndex + 1) % imageUrls.length;
      transitionToSlide(nextIndex);
    } else if (touchEndX > touchStartX + swipeThreshold) {
      const prevIndex = (activeIndex - 1 + imageUrls.length) % imageUrls.length;
      transitionToSlide(prevIndex);
    }
  };
}
