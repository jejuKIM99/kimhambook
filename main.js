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

  // Store all grid image URLs and slider image URLs for easy access
  const imageUrlsGrid = Array.from(gridItems).map(
    (item) => item.querySelector(".grid-item-img").style.backgroundImage
  );

  // slider image urls
  const imageUrlsSlider = Array.from(gridItems).map(
    (item) => `url(${item.getAttribute("data-slider-image")})`
  );

  // Function to get slide data from HTML data attributes
  const getSlideDataFromHTML = (index) => {
    const item = document.querySelector(`.grid-item[data-index="${index}"]`);
    return {
      title: item.getAttribute("data-title"),
      paragraph: item.getAttribute("data-paragraph").trim(),
      sliderImageUrl: item.getAttribute("data-slider-image")
    };
  };

  // Update content based on active index (set with data from HTML)
  const updateContent = (index) => {
    const data = getSlideDataFromHTML(index);
    contentTitleSpan.textContent = data.title;
    contentParagraph.textContent = data.paragraph;
  };

  // Toggle function
  const toggleView = (mode) => {
    if (isAnimating || currentMode === mode) return;
    isAnimating = true;

    // Update switch button styles
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

      // Set the current active slider image URL
      const activeSliderImageUrl = imageUrlsSlider[activeIndex];
      sliderImage.style.backgroundImage = activeSliderImageUrl;
      sliderImageBg.style.backgroundImage = activeSliderImageUrl;

      // Consistent styling
      sliderImage.style.backgroundSize = "cover";
      sliderImage.style.backgroundPosition = "center";
      sliderImageBg.style.backgroundSize = "cover";
      sliderImageBg.style.backgroundPosition = "center";
      sliderImageNext.style.backgroundSize = "cover";
      sliderImageNext.style.backgroundPosition = "center";

      // Update with text from HTML
      updateContent(activeIndex);

      // Pre-position sliderImage over the active grid item
      gsap.set(sliderImage, {
        width: activeItemRect.width,
        height: activeItemRect.height,
        x: activeItemRect.left,
        y: activeItemRect.top,
        opacity: 1,
        visibility: "visible"
      });

      // STEP 1: Expand height to 100vh (using FLIP)
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
          // STEP 2: Expand width to 100vw (using FLIP)
          const widthState = Flip.getState(sliderImage);
          gsap.set(sliderImage, {
            width: "100vw",
            x: 0
          });
          Flip.from(widthState, {
            duration: TIMING.BASE,
            ease: "mainEase",
            onComplete: () => {
              // Hide the grid
              gsap.to(grid, {
                opacity: 0,
                duration: TIMING.SHORTEST,
                ease: "power2.inOut"
              });
              // Show content (title, paragraph, thumbnails) animation
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

  // Show grid view with two-step shrink animation (width first, then height)
  const showGridView = () => {
    return new Promise((resolve) => {
      const activeItem = document.querySelector(
        `.grid-item[data-index="${activeIndex}"]`
      );
      const activeItemRect = activeItem.getBoundingClientRect();

      // Hide content first
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

          // STEP 1: Shrink width to original grid item width (FLIP)
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
              // STEP 2: Shrink height to original grid item height (FLIP)
              const heightState = Flip.getState(sliderImage);
              gsap.set(sliderImage, {
                height: activeItemRect.height,
                y: activeItemRect.top
              });
              Flip.from(heightState, {
                duration: TIMING.BASE,
                ease: "mainEase",
                onComplete: () => {
                  // Hide sliderImage at the end
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

      // Hide thumbnails
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
      // Hide paragraph
      contentTl.to(
        contentParagraph,
        {
          opacity: 0,
          duration: TIMING.SHORT,
          ease: "mainEase"
        },
        TIMING.STAGGER_TINY
      );
      // Hide title
      contentTl.to(
        contentTitleSpan,
        {
          y: "100%",
          duration: TIMING.SHORT,
          ease: "sideEase"
        },
        TIMING.STAGGER_SMALL
      );
      // Hide content container
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

  // Slide transition animation
  const transitionToSlide = (index) => {
    if (isAnimating || index === activeIndex) return;
    isAnimating = true;

    slideDirection = index > activeIndex ? "right" : "left";
    previousIndex = activeIndex;

    // Update thumbnail active state
    document.querySelector(".thumbnail.active").classList.remove("active");
    document
      .querySelector(`.thumbnail[data-index="${index}"]`)
      .classList.add("active");

    const newSliderImageUrl = imageUrlsSlider[index];

    // Set transition elements
    sliderImageNext.style.backgroundImage = newSliderImageUrl;
    sliderImageBg.style.backgroundImage = newSliderImageUrl;

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

    // Set initial position for the next image
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
        // Update main image
        sliderImage.style.backgroundImage = newSliderImageUrl;
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

        // Update with text from HTML
        updateContent(index);
        activeIndex = index;

        // Show content again
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

    // Hide current content
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
    // Flash effect
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
    // Push current image sideways
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
    // Move background layer
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
    // Slide in next image
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

  // Thumbnail click event
  thumbnailItems.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (currentMode !== "slider") return;
      const index = parseInt(thumb.getAttribute("data-index"));
      transitionToSlide(index);
    });
  });

  // Maintain slider size on window resize
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

  // Switch button hover effect
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

  // Connect switch click events
  switchGrid.onclick = () => toggleView("grid");
  switchSlider.onclick = () => toggleView("slider");

  // Keyboard navigation (slider mode assumed)
  document.addEventListener("keydown", (e) => {
    if (currentMode !== "slider" || isAnimating) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      const nextIndex = (activeIndex + 1) % imageUrlsSlider.length;
      transitionToSlide(nextIndex);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      const prevIndex = (activeIndex - 1 + imageUrlsSlider.length) % imageUrlsSlider.length;
      transitionToSlide(prevIndex);
    }
  });

  // Touch swipe support (slider mode assumed)
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
      const nextIndex = (activeIndex + 1) % imageUrlsSlider.length;
      transitionToSlide(nextIndex);
    } else if (touchEndX > touchStartX + swipeThreshold) {
      const prevIndex = (activeIndex - 1 + imageUrlsSlider.length) % imageUrlsSlider.length;
      transitionToSlide(prevIndex);
    }
  };
}
