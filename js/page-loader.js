(function () {
  "use strict";

  var DURATION = 3000;
  var EXIT_DURATION = 620;
  var loader = document.getElementById("pageLoader");
  var valueEl = document.getElementById("pageLoaderValue");

  if (!loader || !valueEl) return;

  var startedAt = performance.now();
  var previousValue = -1;
  var finished = false;

  function setValue(value) {
    if (value === previousValue) return;
    previousValue = value;
    valueEl.textContent = String(value);
    loader.setAttribute("aria-valuenow", String(value));
  }

  function finish() {
    if (finished) return;
    finished = true;
    setValue(100);
    loader.classList.add("is-complete");
    document.body.classList.remove("is-page-loading");
    document.body.setAttribute("aria-busy", "false");

    window.dispatchEvent(new CustomEvent("manu:page-ready"));

    window.setTimeout(function () {
      loader.hidden = true;
    }, EXIT_DURATION);
  }

  function update(now) {
    var progress = Math.min((now - startedAt) / DURATION, 1);
    setValue(Math.floor(progress * 100));

    if (progress < 1) {
      window.requestAnimationFrame(update);
    } else {
      finish();
    }
  }

  setValue(0);
  window.requestAnimationFrame(update);
})();
