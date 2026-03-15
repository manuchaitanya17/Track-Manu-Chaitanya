(function () {
  "use strict";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var suffix = hours >= 12 ? "PM" : "AM";
    var hours12 = hours % 12 || 12;
    return hours12 + ":" + pad(minutes) + " " + suffix;
  }

  function formatLongDate(date) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }).format(date).replace(",", "");
  }

  function updateHeroMeta() {
    var now = new Date();
    var timeEl = document.getElementById("heroLocalTime");
    var longDateEl = document.getElementById("heroLocalDate");
    var badgeEl = document.getElementById("heroDateBadge");

    if (timeEl) {
      timeEl.textContent = formatTime(now);
    }

    if (longDateEl) {
      longDateEl.textContent = formatLongDate(now);
    }

    if (badgeEl) {
      badgeEl.textContent = formatShortDate(now);
    }
  }

  function initHeroMotion() {
    var hero = document.getElementById("section-home");
    if (!hero) return;

    window.requestAnimationFrame(function () {
      hero.classList.add("is-ready");
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    var motionItems = Array.prototype.slice.call(
      hero.querySelectorAll("[data-hero-depth]")
    );

    if (!motionItems.length || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    var frameId = null;
    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;
    var rect = hero.getBoundingClientRect();

    function renderMotion() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      motionItems.forEach(function (item) {
        var depth = parseFloat(item.getAttribute("data-hero-depth")) || 0;
        item.style.transform =
          "translate3d(" +
          (currentX * depth).toFixed(2) +
          "px, " +
          (currentY * depth).toFixed(2) +
          "px, 0)";
      });

      if (
        Math.abs(targetX - currentX) > 0.01 ||
        Math.abs(targetY - currentY) > 0.01
      ) {
        frameId = window.requestAnimationFrame(renderMotion);
      } else {
        frameId = null;
      }
    }

    function queueRender() {
      if (!frameId) {
        frameId = window.requestAnimationFrame(renderMotion);
      }
    }

    hero.addEventListener("pointermove", function (event) {
      rect = hero.getBoundingClientRect();
      targetX = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
      targetY = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
      queueRender();
    });

    hero.addEventListener("pointerleave", function () {
      targetX = 0;
      targetY = 0;
      queueRender();
    });

    window.addEventListener("resize", function () {
      rect = hero.getBoundingClientRect();
    });
  }

  function initHeroPanelVisibility() {
    var hero = document.getElementById("section-home");
    if (!hero) return;

    var panelWrap = hero.querySelector(".hero-panel-motion");
    if (!panelWrap) return;
    var compactView = window.matchMedia("(max-width: 991.98px)").matches;
    var showThreshold = compactView ? 0.08 : 0.38;
    var hideThreshold = compactView ? 0.02 : 0;

    function showPanel() {
      panelWrap.classList.add("is-visible");
    }

    function hidePanel() {
      panelWrap.classList.remove("is-visible");
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showPanel();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      showPanel();
      return;
    }

    if (compactView) {
      window.requestAnimationFrame(function () {
        showPanel();
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > showThreshold) {
            showPanel();
          } else if (!entry.isIntersecting || entry.intersectionRatio <= hideThreshold) {
            hidePanel();
          }
        });
      },
      {
        threshold: compactView ? [0, 0.02, 0.08, 0.18, 0.3] : [0, 0.22, 0.38, 0.55],
        rootMargin: compactView ? "-2% 0px -8% 0px" : "-6% 0px -18% 0px"
      }
    );

    observer.observe(hero);
  }

  function initHeroCopyVisibility() {
    var hero = document.getElementById("section-home");
    if (!hero) return;

    var copyWrap = hero.querySelector(".hero-copy-motion");
    if (!copyWrap) return;
    var compactView = window.matchMedia("(max-width: 991.98px)").matches;
    var showThreshold = compactView ? 0.06 : 0.34;
    var hideThreshold = compactView ? 0.02 : 0;

    function showCopy() {
      copyWrap.classList.add("is-visible");
    }

    function hideCopy() {
      copyWrap.classList.remove("is-visible");
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showCopy();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      showCopy();
      return;
    }

    if (compactView) {
      window.requestAnimationFrame(function () {
        showCopy();
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > showThreshold) {
            showCopy();
          } else if (!entry.isIntersecting || entry.intersectionRatio <= hideThreshold) {
            hideCopy();
          }
        });
      },
      {
        threshold: compactView ? [0, 0.02, 0.06, 0.16, 0.28] : [0, 0.18, 0.34, 0.52],
        rootMargin: compactView ? "-2% 0px -8% 0px" : "-5% 0px -18% 0px"
      }
    );

    observer.observe(hero);
  }

  function initHeroMain() {
    updateHeroMeta();
    initHeroMotion();
    initHeroCopyVisibility();
    initHeroPanelVisibility();

    var now = new Date();
    var msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    window.setTimeout(function () {
      updateHeroMeta();
      window.setInterval(updateHeroMeta, 60 * 1000);
    }, Math.max(msUntilNextMinute, 0));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroMain);
  } else {
    initHeroMain();
  }
})();
