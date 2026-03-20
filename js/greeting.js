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

  const FULL_NAME = "Manu Chaitanya";

  function getGreeting(hour) {
    // hour is 0-23 (local time)
    if (hour >= 6 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 18) return "Good Afternoon";
    return "Good Evening";
  }

  function updateHeroGreeting() {
    const greetingEl = document.getElementById("heroGreeting");
    const nameEl = document.getElementById("heroName");
    if (!greetingEl || !nameEl) return;

    const now = new Date();
    greetingEl.textContent = getGreeting(now.getHours());
    nameEl.textContent = FULL_NAME + "!";
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateHeroGreeting();

    // Keep it correct if the user keeps the page open across time ranges.
    // Update at the next minute boundary, then every minute.
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    window.setTimeout(function () {
      updateHeroGreeting();
      window.setInterval(updateHeroGreeting, 60 * 1000);
    }, Math.max(msUntilNextMinute, 0));
  });
})();
