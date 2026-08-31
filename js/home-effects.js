(function () {
  "use strict";

  var DAY_TYPE_KEY = "site-day-types-v1";
  var DAY_TYPE_META = {
    easy: {
      label: "Easy Day",
      message: "Today is an easy day. Move with calm confidence and build clean momentum."
    },
    normal: {
      label: "Normal Day",
      message: "Today is a normal day. Stay balanced, stay focused, and keep your rhythm."
    },
    tough: {
      label: "Tough Day",
      message: "Today is a tough day, you need to be consistent throughout!"
    }
  };

  var REVEAL_GROUPS = [
    "#section-presence .section-heading",
    "#section-presence .presence-stat-chip",
    "#section-presence .presence-shell",
    "#section-resume .section-heading",
    "#section-resume .career-column-head",
    "#section-resume .resume-item",
    "#section-bravo .section-heading",
    "#section-bravo .bravo-carousel-shell",
    "#section-bravo .bravo-controls",
    "#section-services .section-heading",
    "#section-routine .section-heading",
    "#section-routine .routine-metric",
    "#section-routine .routine-stat-card",
    "#section-ratings .rating-card",
    "#section-ratings .ratings-submit-bar",
    "#section-ratings-history .resume-item",
    "#section-blog .section-heading",
    "#section-blog .blog-entry",
    "#section-contact .section-heading",
    "#section-contact .resume-item"
  ];

  var observer = null;

  function dateKey(date) {
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function readDayTypes() {
    try {
      var raw = localStorage.getItem(DAY_TYPE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function renderHomeDayMessage() {
    var banner = document.getElementById("heroDayBanner");
    var badge = document.getElementById("heroDayTypeBadge");
    var message = document.getElementById("heroDayTypeMessage");
    var todayType;
    var meta;

    if (!banner || !badge || !message) return;

    todayType = readDayTypes()[dateKey(new Date())] || "";
    meta = DAY_TYPE_META[todayType];

    banner.classList.remove("is-easy", "is-normal", "is-tough");

    if (meta) {
      badge.textContent = meta.label;
      message.textContent = meta.message;
      banner.classList.add("is-" + todayType);
      return;
    }

    badge.textContent = "No Day Type";
    message.textContent = "Set today’s category from Tasks to define how the day should be treated.";
  }

  function ensureObserver() {
    if (observer) return observer;

    if (!("IntersectionObserver" in window)) {
      return null;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });

    return observer;
  }

  function registerRevealElements() {
    var io = ensureObserver();

    REVEAL_GROUPS.forEach(function (selector) {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function (element, index) {
        if (element.dataset.homeRevealReady === "1") return;

        element.dataset.homeRevealReady = "1";
        element.classList.add("home-reveal");
        element.style.setProperty("--reveal-delay", Math.min(index * 90, 360) + "ms");

        if (io) {
          io.observe(element);
        } else {
          element.classList.add("is-visible");
        }
      });
    });
  }

  function initYearTimelinePullback() {
    var section = document.getElementById("section-services");
    var grid;
    var cards;
    var reducedMotion;
    var observer;
    var fallbackTrigger;
    var lastScrollY;
    var movingDown = true;
    var approachedFromAbove;
    var hasPlayed = false;
    var cleanupTimer;
    var totalDuration = 3600;

    if (!section || section.dataset.yearPullbackReady === "1") return;

    grid = section.querySelector(".year-phase-grid");
    cards = Array.prototype.slice.call(section.querySelectorAll(".year-phase-card"));
    reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!grid || !cards.length || reducedMotion) return;

    section.dataset.yearPullbackReady = "1";
    cards.forEach(function (card, index) {
      card.style.setProperty("--year-card-index", index);
    });

    lastScrollY = window.scrollY || window.pageYOffset || 0;
    approachedFromAbove = section.getBoundingClientRect().top > (window.innerHeight || 0) * 0.72;

    function updateDirection() {
      var currentScrollY = window.scrollY || window.pageYOffset || 0;
      var sectionTop = section.getBoundingClientRect().top;

      if (Math.abs(currentScrollY - lastScrollY) > 2) {
        movingDown = currentScrollY > lastScrollY;
      }

      if (sectionTop > (window.innerHeight || 0) * 0.72) {
        approachedFromAbove = true;
      }

      lastScrollY = currentScrollY;
    }

    function stopWatching() {
      if (observer) observer.disconnect();
      if (fallbackTrigger) window.removeEventListener("scroll", fallbackTrigger);
      window.removeEventListener("scroll", updateDirection);
    }

    function playSequence() {
      if (hasPlayed || !movingDown || !approachedFromAbove) return;

      hasPlayed = true;
      section.dataset.yearPullbackPlayed = "1";
      stopWatching();
      section.classList.add("is-year-pullback-playing");

      cleanupTimer = window.setTimeout(function () {
        section.classList.remove("is-year-pullback-playing");
        section.classList.add("is-year-pullback-complete");
        section.dataset.yearPullbackComplete = "1";
        cards.forEach(function (card) {
          card.style.removeProperty("--year-card-index");
        });
      }, totalDuration);
    }

    window.addEventListener("scroll", updateDirection, { passive: true });

    if (!("IntersectionObserver" in window)) {
      fallbackTrigger = function () {
        var gridTop = grid.getBoundingClientRect().top;
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (gridTop >= viewportHeight * 0.16 && gridTop <= viewportHeight * 0.82) {
          playSequence();
        }
      };
      window.addEventListener("scroll", fallbackTrigger, { passive: true });
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) playSequence();
      });
    }, {
      threshold: 0,
      rootMargin: "-18% 0px -18% 0px"
    });

    observer.observe(grid);
  }

  function initRatingsDayTitle() {
    var section = document.getElementById("section-ratings");
    var title;
    var word;
    var reducedMotion;
    var observer;
    var fallbackTrigger;
    var lastScrollY;
    var movingDown = true;
    var approachedFromAbove;
    var hasPlayed = false;

    if (!section || section.dataset.ratingsDayTitleReady === "1") return;

    title = section.querySelector("[data-ratings-day-title]");
    word = section.querySelector("[data-ratings-day-word]");
    reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!title || !word || reducedMotion) return;

    section.dataset.ratingsDayTitleReady = "1";
    lastScrollY = window.scrollY || window.pageYOffset || 0;
    approachedFromAbove = section.getBoundingClientRect().top > (window.innerHeight || 0) * 0.72;

    function updateDirection() {
      var currentScrollY = window.scrollY || window.pageYOffset || 0;
      var sectionTop = section.getBoundingClientRect().top;

      if (Math.abs(currentScrollY - lastScrollY) > 2) {
        movingDown = currentScrollY > lastScrollY;
      }

      if (sectionTop > (window.innerHeight || 0) * 0.72) {
        approachedFromAbove = true;
      }

      lastScrollY = currentScrollY;
    }

    function stopWatching() {
      if (observer) observer.disconnect();
      if (fallbackTrigger) window.removeEventListener("scroll", fallbackTrigger);
      window.removeEventListener("scroll", updateDirection);
    }

    function finishSequence() {
      word.textContent = "Day";
      word.classList.remove("is-best", "is-leaving", "is-day");
      title.classList.remove("is-playing");
      section.dataset.ratingsDayTitleComplete = "1";
    }

    function playSequence() {
      if (hasPlayed || !movingDown || !approachedFromAbove) return;

      hasPlayed = true;
      section.dataset.ratingsDayTitlePlayed = "1";
      stopWatching();

      word.textContent = "Best";
      title.classList.add("is-playing");
      word.classList.add("is-best");

      window.setTimeout(function () {
        word.classList.remove("is-best");
        word.classList.add("is-leaving");
      }, 1050);

      window.setTimeout(function () {
        word.textContent = "Day";
        word.classList.remove("is-leaving");
        void word.offsetWidth;
        word.classList.add("is-day");
      }, 1370);

      window.setTimeout(finishSequence, 2150);
    }

    window.addEventListener("scroll", updateDirection, { passive: true });

    if (!("IntersectionObserver" in window)) {
      fallbackTrigger = function () {
        var titleTop = title.getBoundingClientRect().top;
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (titleTop >= viewportHeight * 0.18 && titleTop <= viewportHeight * 0.78) {
          playSequence();
        }
      };
      window.addEventListener("scroll", fallbackTrigger, { passive: true });
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) playSequence();
      });
    }, {
      threshold: 0,
      rootMargin: "-22% 0px -22% 0px"
    });

    observer.observe(title);
  }

  function initCareerAffirmation() {
    var section = document.getElementById("section-resume");
    var overlay;
    var letter;
    var marker;
    var letters;
    var reducedMotion;
    var observer;
    var lastScrollY;
    var movingDown = true;
    var approachedFromAbove;
    var hasPlayed = false;
    var totalDuration = 2000;

    if (!section || section.dataset.careerAffirmationReady === "1") return;

    overlay = section.querySelector("[data-career-affirmation]");
    letter = section.querySelector("[data-career-affirmation-letter]");
    marker = section.querySelector("[data-career-affirmation-marker]");
    reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!overlay || !letter || !marker || reducedMotion) return;

    letters = (overlay.getAttribute("data-sentence") || "I M THE BEST")
      .replace(/\s+/g, "")
      .split("");

    if (!letters.length) return;

    section.dataset.careerAffirmationReady = "1";
    lastScrollY = window.scrollY || window.pageYOffset || 0;
    approachedFromAbove = section.getBoundingClientRect().top > (window.innerHeight || 0) * 0.7;

    function updateDirection() {
      var currentScrollY = window.scrollY || window.pageYOffset || 0;
      var sectionTop = section.getBoundingClientRect().top;

      if (Math.abs(currentScrollY - lastScrollY) > 2) {
        movingDown = currentScrollY > lastScrollY;
      }

      if (sectionTop > (window.innerHeight || 0) * 0.7) {
        approachedFromAbove = true;
      }

      lastScrollY = currentScrollY;
    }

    function updateLetterSize() {
      var card = section.querySelector(".career-panel");
      var cardHeight = card ? card.getBoundingClientRect().height : 560;
      var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var size = Math.min(cardHeight * 0.5, viewportWidth * 0.42, viewportHeight * 0.48);

      section.style.setProperty("--career-affirmation-size", Math.max(size, 116).toFixed(1) + "px");
    }

    function playSequence() {
      var stepDuration;
      var flashDuration;

      if (hasPlayed || !movingDown || !approachedFromAbove) return;

      hasPlayed = true;
      section.dataset.careerAffirmationPlayed = "1";
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", updateDirection);
      window.removeEventListener("resize", updateLetterSize);

      updateLetterSize();
      stepDuration = totalDuration / letters.length;
      flashDuration = Math.min(200, stepDuration * 0.9);
      section.style.setProperty("--career-letter-duration", flashDuration.toFixed(0) + "ms");
      section.classList.add("is-affirming");

      letters.forEach(function (character, index) {
        window.setTimeout(function () {
          letter.classList.remove("is-flashing");
          letter.textContent = character;
          void letter.offsetWidth;
          letter.classList.add("is-flashing");
        }, index * stepDuration);
      });

      window.setTimeout(function () {
        letter.classList.remove("is-flashing");
        letter.textContent = "";
        section.classList.remove("is-affirming");
      }, totalDuration);
    }

    window.addEventListener("scroll", updateDirection, { passive: true });
    window.addEventListener("resize", updateLetterSize);

    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", function fallbackCareerTrigger() {
        var markerTop = marker.getBoundingClientRect().top;
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (markerTop >= viewportHeight * 0.28 && markerTop <= viewportHeight * 0.72) {
          playSequence();
          if (hasPlayed) {
            window.removeEventListener("scroll", fallbackCareerTrigger);
          }
        }
      }, { passive: true });
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          playSequence();
        }
      });
    }, {
      threshold: 0,
      rootMargin: "-28% 0px -28% 0px"
    });

    observer.observe(marker);
  }

  function initPresenceMarquee() {
    var marquee = document.querySelector("[data-presence-marquee]");
    var track;
    var group;
    var clone;

    if (!marquee || marquee.dataset.presenceMarqueeReady === "1") return;

    track = marquee.querySelector("[data-presence-marquee-track]");
    group = marquee.querySelector("[data-presence-marquee-group]");
    if (!track || !group) return;

    clone = group.cloneNode(true);
    clone.removeAttribute("data-presence-marquee-group");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a, button, input, select, textarea").forEach(function (element) {
      element.setAttribute("tabindex", "-1");
    });
    track.appendChild(clone);
    marquee.dataset.presenceMarqueeReady = "1";
  }

  function initPortfolioScrollReveal() {
    var section = document.querySelector("[data-portfolio-scroll-reveal]");
    var frame;
    var reducedMotion;
    var frameRequest = 0;

    if (!section || section.dataset.portfolioScrollReady === "1") return;

    frame = section.querySelector(":scope > .container");
    if (!frame) return;

    reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    section.dataset.portfolioScrollReady = "1";

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function render() {
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var sectionTop = section.getBoundingClientRect().top;
      var start = viewportHeight * 0.98;
      var end = viewportHeight * 0.18;
      var progress = clamp((start - sectionTop) / Math.max(1, start - end), 0, 1);
      var eased = progress * progress * (3 - (2 * progress));
      var isCompact = window.innerWidth < 768;
      var minimumScale = isCompact ? 0.9 : 0.78;
      var rise = isCompact ? 28 : 68;
      var scale;

      frameRequest = 0;

      if (reducedMotion && reducedMotion.matches) {
        eased = 1;
      }

      scale = minimumScale + ((1 - minimumScale) * eased);
      section.style.setProperty("--portfolio-scroll-scale", scale.toFixed(4));
      section.style.setProperty("--portfolio-scroll-y", ((1 - eased) * rise).toFixed(2) + "px");
      section.style.setProperty("--portfolio-scroll-progress", eased.toFixed(4));
    }

    function queueRender() {
      if (frameRequest) return;
      frameRequest = window.requestAnimationFrame(render);
    }

    window.addEventListener("scroll", queueRender, { passive: true });
    window.addEventListener("resize", queueRender);

    if (reducedMotion && reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", queueRender);
    }

    render();
  }

  function initPortfolioCarousel() {
    var section = document.getElementById("section-portfolio");
    if (!section || section.dataset.portfolioMode !== "carousel") return;
    if (section.dataset.portfolioCarouselReady === "1") return;

    var viewport = section.querySelector(".portfolio-carousel-viewport");
    var track = section.querySelector(".portfolio-carousel-track");
    var cards = Array.prototype.slice.call(section.querySelectorAll(".single-portfolio"));
    var filters = Array.prototype.slice.call(section.querySelectorAll(".filters ul li"));
    var prevButton = section.querySelector('[data-portfolio-nav="prev"]');
    var nextButton = section.querySelector('[data-portfolio-nav="next"]');
    var drag = null;
    var scrollTicking = false;
    var suppressClickUntil = 0;

    if (!viewport || !track || !cards.length) return;

    section.dataset.portfolioCarouselReady = "1";

    function getVisibleCards() {
      return cards.filter(function (card) {
        return !card.classList.contains("is-filtered-out");
      });
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function updateSidePadding() {
      var visibleCards = getVisibleCards();
      if (!visibleCards.length) return;

      var cardWidth = visibleCards[0].offsetWidth || visibleCards[0].getBoundingClientRect().width;
      var sidePad = Math.max(20, (viewport.clientWidth - cardWidth) / 2);
      track.style.setProperty("--portfolio-side-pad", sidePad + "px");
    }

    function getCardTarget(card) {
      return Math.max(0, card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2);
    }

    function getActiveIndex() {
      var visibleCards = getVisibleCards();
      if (!visibleCards.length) return -1;

      var viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
      var activeIndex = 0;
      var bestDistance = Infinity;

      visibleCards.forEach(function (card, index) {
        var cardCenter = card.offsetLeft + card.offsetWidth / 2;
        var distance = Math.abs(cardCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          activeIndex = index;
        }
      });

      return activeIndex;
    }

    function refreshCurrentCard() {
      var visibleCards = getVisibleCards();
      var activeIndex = getActiveIndex();

      cards.forEach(function (card) {
        card.classList.remove("is-current");
      });

      if (activeIndex > -1 && visibleCards[activeIndex]) {
        visibleCards[activeIndex].classList.add("is-current");
      }

      if (prevButton) {
        prevButton.disabled = activeIndex <= 0;
      }

      if (nextButton) {
        nextButton.disabled = activeIndex === -1 || activeIndex >= visibleCards.length - 1;
      }
    }

    function scrollToVisibleIndex(index, behavior) {
      var visibleCards = getVisibleCards();
      if (!visibleCards.length) return;

      var safeIndex = clamp(index, 0, visibleCards.length - 1);
      viewport.scrollTo({
        left: getCardTarget(visibleCards[safeIndex]),
        behavior: behavior || "smooth"
      });
    }

    function queueRefreshCurrentCard() {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        scrollTicking = false;
        refreshCurrentCard();
      });
    }

    function applyFilter(filterValue) {
      cards.forEach(function (card) {
        var isVisible = filterValue === "*" || card.matches(filterValue);
        card.classList.toggle("is-filtered-out", !isVisible);
        card.setAttribute("aria-hidden", isVisible ? "false" : "true");
      });

      filters.forEach(function (filter) {
        filter.classList.toggle("active", filter.getAttribute("data-filter") === filterValue);
      });

      updateSidePadding();

      window.requestAnimationFrame(function () {
        var visibleCards = getVisibleCards();
        var initialIndex = visibleCards.length > 2 ? 1 : 0;
        scrollToVisibleIndex(initialIndex, "auto");
        refreshCurrentCard();
      });
    }

    filters.forEach(function (filter) {
      filter.addEventListener("click", function () {
        applyFilter(filter.getAttribute("data-filter") || "*");
      });
    });

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        scrollToVisibleIndex(getActiveIndex() - 1, "smooth");
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        scrollToVisibleIndex(getActiveIndex() + 1, "smooth");
      });
    }

    viewport.addEventListener("scroll", queueRefreshCurrentCard, { passive: true });

    viewport.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToVisibleIndex(getActiveIndex() - 1, "smooth");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToVisibleIndex(getActiveIndex() + 1, "smooth");
      }
    });

    viewport.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: viewport.scrollLeft,
        moved: false
      };

      viewport.classList.add("is-dragging");
      if (viewport.setPointerCapture) {
        viewport.setPointerCapture(event.pointerId);
      }
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;

      var deltaX = event.clientX - drag.startX;
      if (Math.abs(deltaX) > 3) {
        drag.moved = true;
      }

      viewport.scrollLeft = drag.startScrollLeft - deltaX;
    });

    function finishDrag(event) {
      if (!drag) return;
      if (event && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;

      if (drag.moved) {
        suppressClickUntil = Date.now() + 280;
      }

      viewport.classList.remove("is-dragging");
      drag = null;
      scrollToVisibleIndex(getActiveIndex(), "smooth");
    }

    viewport.addEventListener("pointerup", finishDrag);
    viewport.addEventListener("pointercancel", finishDrag);
    viewport.addEventListener("lostpointercapture", finishDrag);

    Array.prototype.forEach.call(viewport.querySelectorAll("a"), function (link) {
      link.addEventListener("click", function (event) {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
        }
      });
    });

    window.addEventListener("resize", function () {
      var activeIndex = getActiveIndex();
      updateSidePadding();
      scrollToVisibleIndex(activeIndex < 0 ? 0 : activeIndex, "auto");
      refreshCurrentCard();
    });

    applyFilter("*");
  }

  function initBravoCarousel() {
    var section = document.getElementById("section-bravo");
    if (!section || section.dataset.bravoMode !== "carousel") return;
    if (section.dataset.bravoCarouselReady === "1") return;

    var viewport = section.querySelector(".bravo-carousel-viewport");
    var track = section.querySelector(".bravo-carousel-track");
    var cards = Array.prototype.slice.call(section.querySelectorAll(".bravo-card"));
    var prevButton = section.querySelector('[data-bravo-nav="prev"]');
    var nextButton = section.querySelector('[data-bravo-nav="next"]');
    var dots = Array.prototype.slice.call(section.querySelectorAll("[data-bravo-dot]"));
    var status = document.getElementById("bravoStatus");
    var drag = null;
    var scrollTicking = false;
    var suppressClickUntil = 0;
    var autoplayTimer = null;

    if (!viewport || !track || !cards.length) return;

    section.dataset.bravoCarouselReady = "1";

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function updateSidePadding() {
      var cardWidth = cards[0].offsetWidth || cards[0].getBoundingClientRect().width;
      var sidePad = Math.max(20, (viewport.clientWidth - cardWidth) / 2);
      track.style.setProperty("--bravo-side-pad", sidePad + "px");
    }

    function getCardTarget(card) {
      return Math.max(0, card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2);
    }

    function getActiveIndex() {
      var viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
      var activeIndex = 0;
      var bestDistance = Infinity;

      cards.forEach(function (card, index) {
        var cardCenter = card.offsetLeft + card.offsetWidth / 2;
        var distance = Math.abs(cardCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          activeIndex = index;
        }
      });

      return activeIndex;
    }

    function refreshCurrentCard() {
      var activeIndex = getActiveIndex();

      cards.forEach(function (card, index) {
        card.classList.toggle("is-current", index === activeIndex);
      });

      dots.forEach(function (dot, index) {
        dot.classList.toggle("is-active", index === activeIndex);
      });

      if (status) {
        status.textContent = String(activeIndex + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
      }

      if (prevButton) prevButton.disabled = activeIndex <= 0;
      if (nextButton) nextButton.disabled = activeIndex >= cards.length - 1;
    }

    function scrollToIndex(index, behavior) {
      var safeIndex = clamp(index, 0, cards.length - 1);
      viewport.scrollTo({
        left: getCardTarget(cards[safeIndex]),
        behavior: behavior || "smooth"
      });
    }

    function queueRefresh() {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        scrollTicking = false;
        refreshCurrentCard();
      });
    }

    function stopAutoplay() {
      if (!autoplayTimer) return;
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }

    function startAutoplay() {
      stopAutoplay();

      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      autoplayTimer = window.setInterval(function () {
        var activeIndex = getActiveIndex();
        scrollToIndex(activeIndex >= cards.length - 1 ? 0 : activeIndex + 1, "smooth");
      }, 5200);
    }

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        scrollToIndex(getActiveIndex() - 1, "smooth");
        startAutoplay();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        scrollToIndex(getActiveIndex() + 1, "smooth");
        startAutoplay();
      });
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        scrollToIndex(Number(dot.getAttribute("data-bravo-dot")) || 0, "smooth");
        startAutoplay();
      });
    });

    viewport.addEventListener("scroll", queueRefresh, { passive: true });

    viewport.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToIndex(getActiveIndex() - 1, "smooth");
        startAutoplay();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToIndex(getActiveIndex() + 1, "smooth");
        startAutoplay();
      }
    });

    viewport.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: viewport.scrollLeft,
        moved: false
      };

      stopAutoplay();
      viewport.classList.add("is-dragging");

      if (viewport.setPointerCapture) {
        viewport.setPointerCapture(event.pointerId);
      }
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;

      var deltaX = event.clientX - drag.startX;
      if (Math.abs(deltaX) > 3) {
        drag.moved = true;
      }

      viewport.scrollLeft = drag.startScrollLeft - deltaX;
    });

    function finishDrag(event) {
      if (!drag) return;
      if (event && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;

      if (drag.moved) {
        suppressClickUntil = Date.now() + 280;
      }

      viewport.classList.remove("is-dragging");
      drag = null;
      scrollToIndex(getActiveIndex(), "smooth");
      startAutoplay();
    }

    viewport.addEventListener("pointerup", finishDrag);
    viewport.addEventListener("pointercancel", finishDrag);
    viewport.addEventListener("lostpointercapture", finishDrag);

    section.addEventListener("mouseenter", stopAutoplay);
    section.addEventListener("mouseleave", startAutoplay);
    section.addEventListener("focusin", stopAutoplay);
    section.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!section.contains(document.activeElement)) {
          startAutoplay();
        }
      }, 0);
    });

    Array.prototype.forEach.call(viewport.querySelectorAll("a"), function (link) {
      link.addEventListener("click", function (event) {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
        }
      });
    });

    window.addEventListener("resize", function () {
      var activeIndex = getActiveIndex();
      updateSidePadding();
      scrollToIndex(activeIndex, "auto");
      refreshCurrentCard();
    });

    updateSidePadding();
    scrollToIndex(0, "auto");
    refreshCurrentCard();
    startAutoplay();
  }

  function initHomeEffects() {
    renderHomeDayMessage();
    initPresenceMarquee();
    initCareerAffirmation();
    initYearTimelinePullback();
    initRatingsDayTitle();
    registerRevealElements();
    initPortfolioScrollReveal();
    initPortfolioCarousel();
    initBravoCarousel();
  }

  document.addEventListener("DOMContentLoaded", initHomeEffects);
  document.addEventListener("routine:rendered", registerRevealElements);
  window.addEventListener("storage", renderHomeDayMessage);
})();
