/**
 * Daily Routine
 * - Generated from the DAILY_ROUTINE array below.
 * - The section renders a summary board plus a timeline view.
 */
(function () {
  "use strict";

  const DAILY_ROUTINE = [
    { start: "04:45AM", end: "05:00AM", activity: "Wakeup -> Brush -> Green Tea & Check Tasks" },
    { start: "05:00AM", end: "07:00AM", activity: "ECSE743- FTE Capstone" },
    { start: "07:00AM", end: "09:00AM", activity: "Workout -> Skin Care & Shower -> Breakfast" },
    { start: "09:00AM", end: "11:00AM", activity: "ECSE743- FTE Capstone" },
    { start: "11:00AM", end: "02:00PM", activity: "CRW-I" },
    { start: "02:00PM", end: "03:00PM", activity: "Lunch -> Rest" },
    { start: "03:00PM", end: "06:00PM", activity: "CRW-I" },
    { start: "06:00PM", end: "07:00PM", activity: "Friends and Gupshup" },
    { start: "07:00PM", end: "09:00PM", activity: "CRW-I -> ECSE743- FTE Capstone" },
    { start: "09:00PM", end: "10:00PM", activity: "Dinner & Web Series" },
    { start: "10:00PM", end: "04:45AM", activity: "Rest" }
  ];

  const CATEGORY_META = {
    focus: { label: "Deep Work", badgeClass: "focus", barColor: "var(--routine-focus)" },
    health: { label: "Health", badgeClass: "health", barColor: "var(--routine-health)" },
    reset: { label: "Reset", badgeClass: "reset", barColor: "var(--routine-reset)" },
    sleep: { label: "Sleep", badgeClass: "sleep", barColor: "var(--routine-sleep)" }
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatClockLabel(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
    if (!match) return value;
    return pad(match[1]) + ":" + match[2] + " " + match[3].toUpperCase();
  }

  function parseTime(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
    if (!match) return 0;

    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (meridiem === "PM") {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours && minutes) return hours + "h " + minutes + "m";
    if (hours) return hours + "h";
    return minutes + "m";
  }

  function getDurationMinutes(start, end) {
    const startMinutes = parseTime(start);
    let endMinutes = parseTime(end);

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    return endMinutes - startMinutes;
  }

  function splitActivity(activity) {
    return String(activity || "")
      .split(/\s*->\s*|\s*&\s*/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function classifyActivity(activity) {
    const clean = String(activity || "").trim().toLowerCase();

    if (clean === "rest") return "sleep";
    if (/workout|skin care|shower|breakfast|green tea|brush|wakeup|arrange bed/.test(clean)) return "health";
    if (/news|family|lunch|dinner|web series|calls|smoke|friends|gupshup/.test(clean)) return "reset";
    return "focus";
  }

  function deriveTrack(activity, categoryKey) {
    const text = String(activity || "").toLowerCase();
    const has743 = /ecse743/.test(text);
    const has848 = /ecse848/.test(text);

    if (has743 && has848) return "Dual-capstone focus block";
    if (has743) return "FTE Capstone";
    if (has848) return "Internship Capstone-II";
    if (categoryKey === "sleep") return "Night recovery window";
    if (categoryKey === "health") return "Body and Readiness";
    if (categoryKey === "reset") return "Break";
    return "Crowe Horwath";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function enrichRoutine() {
    return DAILY_ROUTINE.map(function (item, index) {
      const durationMinutes = getDurationMinutes(item.start, item.end);
      const categoryKey = classifyActivity(item.activity);
      const category = CATEGORY_META[categoryKey];
      const steps = splitActivity(item.activity);

      return {
        index: index + 1,
        start: item.start,
        end: item.end,
        startLabel: formatClockLabel(item.start),
        endLabel: formatClockLabel(item.end),
        activity: item.activity,
        durationMinutes: durationMinutes,
        durationLabel: formatDuration(durationMinutes),
        categoryKey: categoryKey,
        categoryLabel: category.label,
        badgeClass: category.badgeClass,
        track: deriveTrack(item.activity, categoryKey),
        steps: steps
      };
    });
  }

  function buildInsights(entries) {
    const totals = { focus: 0, health: 0, reset: 0, sleep: 0 };
    let longestFocus = null;

    entries.forEach(function (entry) {
      totals[entry.categoryKey] += entry.durationMinutes;

      if (entry.categoryKey === "focus" && (!longestFocus || entry.durationMinutes > longestFocus.durationMinutes)) {
        longestFocus = entry;
      }
    });

    return {
      totals: totals,
      blocks: entries.length,
      startLabel: entries.length ? entries[0].startLabel : "",
      endLabel: entries.length ? entries[entries.length - 1].endLabel : "",
      totalLabel: formatDuration(24 * 60),
      longestFocus: longestFocus
    };
  }

  function renderMetrics(insights) {
    return [
      { label: "Wake-up", value: insights.startLabel, note: "First active window of the day." },
      { label: "Deep work", value: formatDuration(insights.totals.focus), note: "FTE Capstone and CRW-I." },
      { label: "Health", value: formatDuration(insights.totals.health), note: "Training, Hygiene, and Readiness." },
      { label: "Sleep", value: formatDuration(insights.totals.sleep), note: "A required sound sleep." }
    ].map(function (item) {
      return [
        '<div class="routine-metric">',
          '<small>', escapeHtml(item.label), '</small>',
          '<strong>', escapeHtml(item.value), '</strong>',
          '<span>', escapeHtml(item.note), '</span>',
        '</div>'
      ].join("");
    }).join("");
  }

  function renderBreakdown(insights) {
    return [
      { key: "focus", label: "Deep Work", minutes: insights.totals.focus, color: CATEGORY_META.focus.barColor },
      { key: "health", label: "Health", minutes: insights.totals.health, color: CATEGORY_META.health.barColor },
      { key: "reset", label: "Reset", minutes: insights.totals.reset, color: CATEGORY_META.reset.barColor },
      { key: "sleep", label: "Sleep", minutes: insights.totals.sleep, color: CATEGORY_META.sleep.barColor }
    ].map(function (item) {
      const width = Math.max(4, Math.round((item.minutes / (24 * 60)) * 100));
      return [
        '<div class="routine-bar-row">',
          '<div class="routine-bar-top">',
            '<span class="routine-bar-label">', escapeHtml(item.label), '</span>',
            '<span class="routine-bar-value">', escapeHtml(formatDuration(item.minutes)), '</span>',
          '</div>',
          '<div class="routine-bar">',
            '<div class="routine-bar-fill" style="--routine-width:', width, '%; --routine-fill:', escapeHtml(item.color), ';"></div>',
          '</div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function renderTimeline(entries) {
    return entries.map(function (entry) {
      const steps = entry.steps.map(function (step) {
        return '<span class="routine-step">' + escapeHtml(step) + '</span>';
      }).join("");

      return [
        '<article class="routine-entry routine-entry--', escapeHtml(entry.badgeClass), '">',
          '<div class="routine-time-block">',
            '<small>Block ', escapeHtml(pad(entry.index)), '</small>',
            '<span class="routine-window">', escapeHtml(entry.startLabel), '</span>',
            '<span class="routine-time-end">to ', escapeHtml(entry.endLabel), '</span>',
          '</div>',
          '<div class="routine-entry-body">',
            '<div class="routine-entry-head">',
              '<span class="routine-badge routine-badge--', escapeHtml(entry.badgeClass), '">', escapeHtml(entry.categoryLabel), '</span>',
              '<span class="routine-duration">', escapeHtml(entry.durationLabel), '</span>',
            '</div>',
            '<h3 class="routine-track">', escapeHtml(entry.track), '</h3>',
            '<span class="routine-track-note">', escapeHtml(entry.activity.replace(/\s*->\s*/g, ' -> ')), '</span>',
            '<div class="routine-steps">', steps, '</div>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderRoutine() {
    const list = document.getElementById("dailyRoutineList");
    if (!list) return;

    const entries = enrichRoutine();
    const insights = buildInsights(entries);
    const longestFocusLabel = insights.longestFocus
      ? insights.longestFocus.durationLabel + " in " + insights.longestFocus.track
      : "Not available";

    list.innerHTML = [
      '<div class="routine-shell">',
        '<div class="routine-hero">',
          '<div>',
            '<span class="routine-kicker">Operating Rhythm</span>',
            '<h3 class="routine-title">Are you ready to kickoff the day?</h3>',
            '<p class="routine-copy">For the next six months, you will consistently follow this routine as part of the CRW-I program. The routine is designed to ensure steady progress, maintain discipline, and help you develop the required skills and performance standards expected from the program.</p>',
          '</div>',
          '<div class="routine-hero-metrics">', renderMetrics(insights), '</div>',
        '</div>',
        '<div class="routine-main">',
          '<aside class="routine-insights">',
            '<div class="routine-stat-card">',
              '<small>Longest focus block</small>',
              '<strong>', escapeHtml(longestFocusLabel), '</strong>',
              '<span>Deep-work windows stay concentrated around the capstone blocks instead of being scattered across the day.</span>',
            '</div>',
            '<div class="routine-stat-card">',
              '<small>Day shape</small>',
              '<strong>', escapeHtml(insights.blocks + ' Blocks') , '</strong>',
              '<span>', escapeHtml(insights.startLabel + ' Wake-Up -> ' + insights.endLabel + ' Next-Day Close'), '</span>',
            '</div>',
            '<div class="routine-breakdown">',
              '<h4 class="mb-0">Time Split across the day!</h4>',
              '<div class="mt-4">', renderBreakdown(insights), '</div>',
            '</div>',
          '</aside>',
          '<div class="routine-timeline">', renderTimeline(entries), '</div>',
        '</div>',
      '</div>'
    ].join("");

    document.dispatchEvent(new CustomEvent("routine:rendered"));
  }

  document.addEventListener("DOMContentLoaded", renderRoutine);

  window.DAILY_ROUTINE = DAILY_ROUTINE;
  window.renderRoutine = renderRoutine;
})();
