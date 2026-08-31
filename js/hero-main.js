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

  function updateHeroMeta() {
    var now = new Date();
    var timeEl = document.getElementById("heroLocalTime");
    var longDateEl = document.getElementById("heroLocalDate");

    if (timeEl) {
      timeEl.textContent = formatTime(now);
    }

    if (longDateEl) {
      longDateEl.textContent = formatLongDate(now);
    }

  }

  function getSemesterProgress(now) {
    var start = new Date(2026, 7, 24);
    var end = new Date(2027, 1, 23);
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
    var totalWeeks = 26;
    var currentWeek = 0;

    if (today > end) {
      currentWeek = totalWeeks;
    } else if (today >= start) {
      currentWeek = Math.min(
        totalWeeks,
        Math.floor((today.getTime() - start.getTime()) / weekInMilliseconds) + 1
      );
    }

    return {
      currentWeek: currentWeek,
      totalWeeks: totalWeeks
    };
  }

  function millisecondsUntilNextMonday(now) {
    var nextMonday = new Date(now.getTime());
    var daysUntilMonday = (8 - now.getDay()) % 7;

    if (daysUntilMonday === 0) {
      daysUntilMonday = 7;
    }

    nextMonday.setHours(0, 0, 0, 0);
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    return Math.max(nextMonday.getTime() - now.getTime(), 0);
  }

  function animateNumber(element, target, duration) {
    if (!element) return;

    var startedAt = null;

    function draw(timestamp) {
      if (startedAt === null) startedAt = timestamp;
      var progress = Math.min((timestamp - startedAt) / duration, 1);
      var easedProgress = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * easedProgress));

      if (progress < 1) {
        window.requestAnimationFrame(draw);
      } else {
        element.textContent = String(target);
      }
    }

    window.requestAnimationFrame(draw);
  }

  function initSemesterProgress() {
    var card = document.getElementById("heroSemesterCard");
    var currentWeekEl = document.getElementById("heroCurrentWeek");
    var totalWeeksEl = document.getElementById("heroTotalWeeks");
    var countEl = document.getElementById("heroSemesterCount");

    if (!card || !currentWeekEl || !totalWeeksEl) return;

    var semester = getSemesterProgress(new Date());
    var progress = semester.totalWeeks
      ? semester.currentWeek / semester.totalWeeks
      : 0;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function renderSemester(nextSemester) {
      var nextProgress = nextSemester.totalWeeks
        ? nextSemester.currentWeek / nextSemester.totalWeeks
        : 0;

      currentWeekEl.textContent = String(nextSemester.currentWeek);
      totalWeeksEl.textContent = String(nextSemester.totalWeeks);
      card.style.setProperty("--semester-progress", nextProgress.toFixed(4));

      if (countEl) {
        countEl.setAttribute(
          "aria-label",
          "Current week " + nextSemester.currentWeek + " of " + nextSemester.totalWeeks + " total weeks"
        );
      }
    }

    function scheduleMondayUpdate() {
      window.setTimeout(function () {
        renderSemester(getSemesterProgress(new Date()));
        scheduleMondayUpdate();
      }, millisecondsUntilNextMonday(new Date()));
    }

    currentWeekEl.textContent = "0";
    totalWeeksEl.textContent = "0";
    card.style.setProperty("--semester-progress", progress.toFixed(4));

    if (countEl) {
      countEl.setAttribute(
        "aria-label",
        "Current week " + semester.currentWeek + " of " + semester.totalWeeks + " total weeks"
      );
    }

    function startCount() {
      if (reducedMotion) {
        currentWeekEl.textContent = String(semester.currentWeek);
        totalWeeksEl.textContent = String(semester.totalWeeks);
      } else {
        animateNumber(currentWeekEl, semester.currentWeek, 1050);
        animateNumber(totalWeeksEl, semester.totalWeeks, 1450);
      }

      window.requestAnimationFrame(function () {
        card.classList.add("is-counted");
      });
    }

    window.setTimeout(startCount, reducedMotion ? 0 : 420);
    scheduleMondayUpdate();

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        renderSemester(getSemesterProgress(new Date()));
      }
    });
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

  function initHeroBackgroundVideo() {
    var video = document.querySelector("[data-hero-background-video]");
    if (!video) return;

    var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var videoPools = {
      light: [
        "videos/home/light/12146777_3840_2160_30fps.mp4",
        "videos/home/light/3752416-hd_1920_1080_24fps.mp4",
        "videos/home/light/5849612-hd_1920_1080_30fps.mp4",
        "videos/home/light/5849627-hd_1920_1080_30fps.mp4"
      ],
      dark: [
        "videos/home/dark/11895738-hd_1920_1080_25fps.mp4",
        "videos/home/dark/13002923-hd_1920_1080_30fps.mp4",
        "videos/home/dark/15292805_3840_2160_50fps.mp4",
        "videos/home/dark/2750156-uhd_3840_2160_24fps.mp4",
        "videos/home/dark/3752416-hd_1920_1080_24fps.mp4",
        "videos/home/dark/3755079-uhd_4096_2160_25fps.mp4",
        "videos/home/dark/3945446-uhd_4096_2160_25fps.mp4",
        "videos/home/dark/4409226-hd_1920_1080_18fps.mp4",
        "videos/home/dark/8428319-uhd_3840_2160_25fps.mp4"
      ]
    };
    var selectedVideos = {};

    function getTheme() {
      return document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    }

    function chooseVideo(theme) {
      var pool = videoPools[theme];
      var storageKey = "home-background-video-" + theme;
      var previousIndex = -1;

      try {
        previousIndex = parseInt(window.sessionStorage.getItem(storageKey), 10);
      } catch (error) {}

      var nextIndex;
      if (pool.length > 1 && previousIndex >= 0 && previousIndex < pool.length) {
        nextIndex = Math.floor(Math.random() * (pool.length - 1));
        if (nextIndex >= previousIndex) {
          nextIndex += 1;
        }
      } else {
        nextIndex = Math.floor(Math.random() * pool.length);
      }

      try {
        window.sessionStorage.setItem(storageKey, String(nextIndex));
      } catch (error) {}

      return pool[nextIndex];
    }

    function getSelectedVideo(theme) {
      if (!selectedVideos[theme]) {
        selectedVideos[theme] = chooseVideo(theme);
      }
      return selectedVideos[theme];
    }

    function deactivateVideo() {
      video.classList.remove("is-active");
      video.pause();
    }

    function activateVideo() {
      if (reducedMotionQuery.matches || document.hidden) {
        deactivateVideo();
        return;
      }

      var theme = getTheme();
      var nextSource = getSelectedVideo(theme);

      if (video.getAttribute("src") !== nextSource) {
        video.classList.remove("is-active");
        video.pause();
        video.setAttribute("src", nextSource);
        video.setAttribute("data-video-theme", theme);
        video.load();
      }

      var playAttempt = video.play();
      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt.then(function () {
          if (
            getTheme() === theme &&
            video.getAttribute("src") === nextSource &&
            !reducedMotionQuery.matches &&
            !document.hidden
          ) {
            video.classList.add("is-active");
          }
        }).catch(function () {
          deactivateVideo();
        });
      } else {
        video.classList.add("is-active");
      }
    }

    video.addEventListener("canplay", activateVideo);

    var themeObserver = new MutationObserver(function (mutations) {
      var themeChanged = mutations.some(function (mutation) {
        return mutation.attributeName === "data-theme";
      });

      if (themeChanged) {
        activateVideo();
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    if (typeof reducedMotionQuery.addEventListener === "function") {
      reducedMotionQuery.addEventListener("change", activateVideo);
    } else if (typeof reducedMotionQuery.addListener === "function") {
      reducedMotionQuery.addListener(activateVideo);
    }

    document.addEventListener("visibilitychange", activateVideo);
    activateVideo();
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

    // The hero is the initial viewport, so its entrance should never wait for
    // an observer threshold before beginning on a fresh page load.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(showCopy);
    });

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

    var heroUiStarted = false;
    function startHeroUi() {
      if (heroUiStarted) return;
      heroUiStarted = true;
      initHeroMotion();
      initHeroCopyVisibility();
      initHeroPanelVisibility();
      initSemesterProgress();
    }

    if (document.body.classList.contains("is-page-loading")) {
      window.addEventListener("manu:page-ready", startHeroUi, { once: true });
    } else {
      startHeroUi();
    }

    // Media playback can be delayed or rejected by the browser. Keep it last
    // so it can never block the greeting, cards, clock, or semester counter.
    try {
      initHeroBackgroundVideo();
    } catch (error) {
      window.setTimeout(initHeroBackgroundVideo, 250);
    }

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
