/**
 * Daily Routine
 * - Generated from the DAILY_ROUTINE array below.
 * - The section renders a summary board plus a timeline view.
 */
(function () {
  "use strict";

  const DAILY_ROUTINE = [
    { start: "04:45AM", end: "05:00AM", activity: "Wakeup -> Brush -> Green Tea & Check Tasks" },
    { start: "05:00AM", end: "07:00AM", activity: "ECSE743- L2 Capstone" },
    { start: "07:00AM", end: "09:00AM", activity: "Workout -> Skin Care & Shower -> Breakfast" },
    { start: "09:00AM", end: "11:00AM", activity: "ECSE743- L2 Capstone" },
    { start: "11:00AM", end: "02:00PM", activity: "CRW-II" },
    { start: "02:00PM", end: "03:00PM", activity: "Lunch -> Rest" },
    { start: "03:00PM", end: "06:00PM", activity: "CRW-II" },
    { start: "06:00PM", end: "07:00PM", activity: "Friends and Gupshup" },
    { start: "07:00PM", end: "09:00PM", activity: "CRW-II -> ECSE743- L2 Capstone" },
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
    if (has743) return "L2 Capstone";
    if (has848) return "Internship Program-I";
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
      { label: "Deep work", value: formatDuration(insights.totals.focus), note: "L2 Capstone and CRW-II." },
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

  function pointOnCircle(centerX, centerY, radius, angle) {
    const radians = angle * Math.PI / 180;

    return {
      x: centerX + (radius * Math.cos(radians)),
      y: centerY + (radius * Math.sin(radians))
    };
  }

  function renderRoutineFlow(entry) {
    const count = entry.steps.length;
    const centerX = 160;
    const centerY = 120;
    const radius = 82;
    const firstAngle = count === 2 ? -135 : -90;
    const angleStep = count === 2 ? 180 : 360 / count;
    const nodeTrim = 26;
    const markerId = "routine-flow-arrow-" + entry.index;
    const angles = entry.steps.map(function (_, index) {
      return firstAngle + (index * angleStep);
    });

    if (count < 2) return "";

    const paths = angles.slice(0, -1).map(function (angle, index) {
      const nextAngle = angles[index + 1];
      const start = pointOnCircle(centerX, centerY, radius, angle + nodeTrim);
      const end = pointOnCircle(centerX, centerY, radius, nextAngle - nodeTrim);
      const sweep = nextAngle - angle - (nodeTrim * 2);
      const largeArc = sweep > 180 ? 1 : 0;

      return [
        '<path class="routine-flow-path" style="--flow-path-delay:', index * 180, 'ms" ',
          'd="M ', start.x.toFixed(2), ' ', start.y.toFixed(2),
          ' A ', radius, ' ', radius, ' 0 ', largeArc, ' 1 ', end.x.toFixed(2), ' ', end.y.toFixed(2), '" ',
          'marker-end="url(#', markerId, ')"></path>'
      ].join("");
    }).join("");

    const nodes = entry.steps.map(function (step, index) {
      const point = pointOnCircle(centerX, centerY, radius, angles[index]);
      const left = (point.x / 320) * 100;
      const top = (point.y / 240) * 100;

      return [
        '<span class="routine-flow-node" style="left:', left.toFixed(2), '%; top:', top.toFixed(2), '%;">',
          '<span>', escapeHtml(step), '</span>',
        '</span>'
      ].join("");
    }).join("");

    return [
      '<div class="routine-flow" role="img" aria-label="Task order: ', escapeHtml(entry.steps.join(", then ")), '">',
        '<div class="routine-flow-orbit">',
          '<svg class="routine-flow-svg" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">',
            '<defs>',
              '<marker id="', markerId, '" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="strokeWidth">',
                '<path class="routine-flow-arrow" d="M 0 0 L 8 4 L 0 8 z"></path>',
              '</marker>',
            '</defs>',
            '<circle class="routine-flow-guide" cx="160" cy="120" r="82"></circle>',
            paths,
          '</svg>',
          nodes,
        '</div>',
      '</div>'
    ].join("");
  }

  function renderTimeline(entries) {
    return entries.map(function (entry) {
      const hasFlow = entry.steps.length > 1;
      const steps = entry.steps.map(function (step) {
        return '<span class="routine-step">' + escapeHtml(step) + '</span>';
      }).join("");
      const flow = renderRoutineFlow(entry);

      const stackOffset = (entry.index - 1) * 14;
      const mobileStackOffset = (entry.index - 1) * 8;

      return [
        '<article class="routine-entry routine-entry--', escapeHtml(entry.badgeClass), hasFlow ? ' routine-entry--has-flow' : '', '" style="--routine-stack-offset:', stackOffset, 'px; --routine-stack-offset-mobile:', mobileStackOffset, 'px; --routine-stack-order:', entry.index, ';">',
          '<div class="routine-time-block">',
            '<small>Block ', escapeHtml(pad(entry.index)), '</small>',
            '<span class="routine-window">', escapeHtml(entry.startLabel), '</span>',
            '<span class="routine-time-end">to ', escapeHtml(entry.endLabel), '</span>',
          '</div>',
          '<div class="routine-entry-body">',
            '<div class="routine-entry-copy">',
              '<div class="routine-entry-head">',
                '<span class="routine-badge routine-badge--', escapeHtml(entry.badgeClass), '">', escapeHtml(entry.categoryLabel), '</span>',
                '<span class="routine-duration">', escapeHtml(entry.durationLabel), '</span>',
              '</div>',
              '<h3 class="routine-track">', escapeHtml(entry.track), '</h3>',
              '<span class="routine-track-note">', escapeHtml(entry.activity.replace(/\s*->\s*/g, ' -> ')), '</span>',
              hasFlow ? '' : '<div class="routine-steps">' + steps + '</div>',
            '</div>',
            flow,
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

    list.innerHTML = [
      '<div class="routine-shell">',
        '<div class="routine-hero">',
          '<div>',
            '<span class="routine-kicker">Operating Rhythm</span>',
            '<h3 class="routine-title">Are you ready to kickoff the day?</h3>',
            '<p class="routine-copy">For the next six months, you will consistently follow this routine as part of the CRW-II program. The routine is designed to ensure steady progress, maintain discipline, and help you develop the required skills and performance standards expected from the program.</p>',
          '</div>',
          '<div class="routine-hero-metrics">', renderMetrics(insights), '</div>',
        '</div>',
        '<div class="routine-main">',
          '<aside class="routine-insights">',
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
