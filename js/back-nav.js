document.addEventListener("DOMContentLoaded", function () {
  function normalizeHref(link) {
    var href = (link.getAttribute("href") || "").trim();
    if (!href || href === "#") return null;
    return href;
  }

  function navigate(link) {
    var href = normalizeHref(link);
    if (!href) return;

    if (href.charAt(0) === "#") {
      var target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", href);
      } else {
        window.location.hash = href;
      }
      return;
    }

    window.location.assign(href);
  }

  Array.prototype.forEach.call(document.querySelectorAll("a.nav-link"), function (link) {
    var label = link.textContent.trim();
    if (label !== "Back" && label !== "Home") return;

    link.addEventListener("click", function (event) {
      event.preventDefault();
      navigate(link);
    });
  });
});
