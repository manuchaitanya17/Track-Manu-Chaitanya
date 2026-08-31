(function () {
  "use strict";

  function initBlogCarousel() {
    var root = document.querySelector("[data-blog-carousel]");
    if (!root) return;

    var viewport = root.querySelector("[data-blog-carousel-viewport]");
    var cards = Array.prototype.slice.call(root.querySelectorAll("[data-blog-card]"));
    var previousButton = root.querySelector("[data-blog-previous]");
    var nextButton = root.querySelector("[data-blog-next]");
    var status = root.querySelector("[data-blog-status]");
    var preview = root.querySelector("[data-blog-preview]");
    var previewImage = root.querySelector("[data-blog-preview-image]");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var currentIndex = 0;
    var scrollFrame = 0;
    var resizeFrame = 0;
    var dragState = null;

    if (!viewport || !cards.length) return;

    function clampIndex(index) {
      return Math.max(0, Math.min(cards.length - 1, index));
    }

    function formatIndex(index) {
      return String(index + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
    }

    function updateActiveCard() {
      var viewportRect = viewport.getBoundingClientRect();
      var viewportCenter = viewportRect.left + viewportRect.width / 2;
      var closestIndex = 0;
      var closestDistance = Infinity;

      cards.forEach(function (card, index) {
        var rect = card.getBoundingClientRect();
        var distance = Math.abs(rect.left + rect.width / 2 - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      currentIndex = closestIndex;
      cards.forEach(function (card, index) {
        card.classList.toggle("is-active", index === currentIndex);
        card.classList.toggle("is-near", Math.abs(index - currentIndex) === 1);
        card.setAttribute("aria-current", index === currentIndex ? "true" : "false");
      });

      if (status) status.textContent = formatIndex(currentIndex);
    }

    function requestActiveUpdate() {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(function () {
        scrollFrame = 0;
        updateActiveCard();
      });
    }

    function scrollToCard(index, behavior) {
      var targetIndex = clampIndex(index);
      var card = cards[targetIndex];
      var viewportRect = viewport.getBoundingClientRect();
      var cardRect = card.getBoundingClientRect();
      var left = viewport.scrollLeft +
        (cardRect.left + cardRect.width / 2) -
        (viewportRect.left + viewportRect.width / 2);
      var maxLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

      viewport.scrollTo({
        left: Math.max(0, Math.min(maxLeft, left)),
        behavior: reducedMotion ? "auto" : (behavior || "smooth")
      });
    }

    function showPreview(card) {
      if (!preview || !previewImage || !card) return;

      var source = card.getAttribute("data-preview");
      if (!source) return;

      if (previewImage.getAttribute("src") !== source) {
        previewImage.setAttribute("src", source);
      }
      previewImage.setAttribute("alt", card.getAttribute("data-preview-alt") || "Medium article preview");
      preview.setAttribute("aria-hidden", "false");
      preview.classList.add("is-visible");
    }

    function hidePreview() {
      if (!preview) return;
      preview.classList.remove("is-visible");
      preview.setAttribute("aria-hidden", "true");
    }

    cards.forEach(function (card) {
      var previewSource = card.getAttribute("data-preview");
      if (previewSource) {
        var image = new Image();
        image.src = previewSource;
      }

      if (canHover) {
        card.addEventListener("mouseenter", function () {
          showPreview(card);
        });
        card.addEventListener("mouseleave", hidePreview);
      }

      card.addEventListener("focusin", function () {
        showPreview(card);
      });
      card.addEventListener("focusout", function (event) {
        if (!card.contains(event.relatedTarget)) hidePreview();
      });
    });

    viewport.addEventListener("scroll", requestActiveUpdate, { passive: true });

    viewport.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      scrollToCard(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
    });

    viewport.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest("a, button")) return;

      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: viewport.scrollLeft,
        moved: false
      };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      var distance = event.clientX - dragState.startX;
      if (Math.abs(distance) > 5) dragState.moved = true;
      viewport.scrollLeft = dragState.startScrollLeft - distance;
    });

    function finishDrag(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      viewport.classList.remove("is-dragging");
      var shouldSnap = dragState.moved;
      dragState = null;
      updateActiveCard();
      if (shouldSnap) scrollToCard(currentIndex);
    }

    viewport.addEventListener("pointerup", finishDrag);
    viewport.addEventListener("pointercancel", finishDrag);

    if (previousButton) {
      previousButton.addEventListener("click", function () {
        scrollToCard(currentIndex - 1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        scrollToCard(currentIndex + 1);
      });
    }

    window.addEventListener("resize", function () {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = 0;
        scrollToCard(currentIndex, "auto");
        updateActiveCard();
      });
    });

    window.addEventListener("scroll", hidePreview, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) hidePreview();
    });

    window.requestAnimationFrame(function () {
      scrollToCard(0, "auto");
      updateActiveCard();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBlogCarousel);
  } else {
    initBlogCarousel();
  }
})();
