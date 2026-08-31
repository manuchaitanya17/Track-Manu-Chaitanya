/**
 * Dynamic greeting for the hero section.
 * Updates the text to:
 *  - Good Morning (06:00 - 11:59)
 *  - Good Afternoon (12:00 - 17:59)
 *  - Good Evening (18:00 - 05:59)
 *
 * Uses the visitor's local browser time.
 */
(function () {
  "use strict";

  const FULL_NAME = "Manu Chaitanya!";

  function getGreeting(hour) {
    // hour is 0-23 (local time)
    if (hour >= 6 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 18) return "Good Afternoon";
    return "Good Evening";
  }

  function renderAnimatedName(nameEl) {
    let letterIndex = 0;
    nameEl.textContent = "";
    nameEl.setAttribute("aria-label", FULL_NAME);

    FULL_NAME.split(" ").forEach(function (word, wordIndex, words) {
      const wordEl = document.createElement("span");
      wordEl.className = "hero-name-word";
      wordEl.setAttribute("aria-hidden", "true");

      Array.from(word).forEach(function (letter) {
        const letterEl = document.createElement("span");
        letterEl.className = "hero-name-letter";
        letterEl.style.setProperty("--hero-letter-index", String(letterIndex));
        letterEl.style.setProperty("--hero-letter-delay", 220 + letterIndex * 55 + "ms");
        letterEl.textContent = letter;
        wordEl.appendChild(letterEl);
        letterIndex += 1;
      });

      nameEl.appendChild(wordEl);
      if (wordIndex < words.length - 1) {
        nameEl.appendChild(document.createTextNode(" "));
      }
    });
  }

  function updateHeroGreeting(animateName) {
    const greetingEl = document.getElementById("heroGreeting");
    const nameEl = document.getElementById("heroName");
    if (!greetingEl || !nameEl) return;

    const now = new Date();
    greetingEl.textContent = getGreeting(now.getHours());

    if (animateName) {
      const titleEl = nameEl.closest(".hero-title");
      renderAnimatedName(nameEl);
      window.setTimeout(function () {
        if (titleEl) titleEl.classList.add("is-title-ready");
      }, 180);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateHeroGreeting(false);

    function startGreetingEntrance() {
      updateHeroGreeting(true);
    }

    if (document.body.classList.contains("is-page-loading")) {
      window.addEventListener("manu:page-ready", startGreetingEntrance, { once: true });
    } else {
      startGreetingEntrance();
    }

    // Keep it correct if the user keeps the page open across time ranges.
    // Update at the next minute boundary, then every minute.
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    window.setTimeout(function () {
      updateHeroGreeting(false);
      window.setInterval(function () {
        updateHeroGreeting(false);
      }, 60 * 1000);
    }, Math.max(msUntilNextMinute, 0));
  });
})();
