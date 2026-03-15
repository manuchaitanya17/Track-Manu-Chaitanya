(function () {
  "use strict";

  var REVEAL_GROUPS = [
    "#section-portfolio .section-heading",
    "#section-portfolio .filters",
    "#section-portfolio .filters-content",
    "#section-resume .section-heading",
    "#section-resume .career-column-head",
    "#section-resume .resume-item",
    "#section-bravo .section-heading",
    "#section-bravo .bravo-carousel-shell",
    "#section-bravo .bravo-controls",
    "#section-services .section-heading",
    "#section-services .year-phase-card",
    "#section-routine .section-heading",
    "#section-routine .routine-shell",
    "#section-routine .routine-metric",
    "#section-routine .routine-stat-card",
    "#section-routine .routine-entry",
    "#section-ratings .section-heading",
    "#section-ratings .rating-card",
    "#section-ratings .ratings-submit-bar",
    "#section-ratings-history .resume-item",
    "#section-blog .section-heading",
    "#section-blog .blog-entry",
    "#section-contact .section-heading",
    "#section-contact .resume-item"
  ];

  var observer = null;

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
    scrollToIndex(1, "auto");
    refreshCurrentCard();
    startAutoplay();
  }

  function initHomeEffects() {
    registerRevealElements();
    initPortfolioCarousel();
    initBravoCarousel();
  }

  document.addEventListener("DOMContentLoaded", initHomeEffects);
  document.addEventListener("routine:rendered", registerRevealElements);
})();
