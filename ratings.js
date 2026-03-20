/**
 * ratings.js
 * ----------
 * Daily ratings tracking + report reminders for:
 *   - Weekly (Sunday)
 *   - Month end (last day of month)
 *   - Year end (Dec 31)
 *
 * Storage:
 *   - Uses localStorage (client-side) by default.
 *
 * Email sending:
 *   - "mailto": opens user's mail app (requires user click)
 *   - "api": POST to your backend endpoint that sends email (can be fully automatic once page is open)
 *
 * IMPORTANT LIMITATION:
 *   Client-side code cannot reliably send emails on a schedule if the site/tab is closed.
 *   For true "always-send-even-when-you're-offline" automation you need a backend/cron or an automation service.
 */

(function () {
  "use strict";

  // =========================
  // 1) CONFIG (edit this)
  // =========================
  var CONFIG = {
    // Where to send the report
    recipients: ["your@email.com"],

    // How to send:
    //   - "mailto" => opens an email draft (user must hit Send)
    //   - "api"    => calls your backend endpoint which sends the email
    mailMode: "mailto",

    // Used only if mailMode === "api"
    apiEndpoint: "/api/send-rating-report",

    // If true and mailMode === "api", we will try to send automatically
    // when the report is due (still requires the page to be open that day).
    autoSendIfPossible: false,

    // What time to consider "today" (uses browser local time). Leave as is.
    timezone: "local"
  };

  // Your 4 rating groups (must match your HTML radio input name attributes)
  var CATEGORIES = [
    { key: "consistency",  name: "rating_consistency",  label: "Consistency" },
    { key: "discipline",   name: "rating_discipline",   label: "Discipline" },
    { key: "determination",name: "rating_determination",label: "Determination" },
    { key: "interest",     name: "rating_interest",     label: "Interest" }
  ];

  // localStorage keys
  var STORAGE_KEY = "myportfolio.dailyRatings.v1";
  var SENT_KEY    = "myportfolio.reportsSent.v1";

  // =========================
  // 2) Utilities
  // =========================
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // YYYY-MM-DD using *local* date (NOT UTC)
  function isoLocal(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function fromIsoLocal(iso) {
    var parts = iso.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function cloneDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function isSunday(d) {
    return d.getDay() === 0; // 0 = Sunday
  }

  function lastDayOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  function isMonthEnd(d) {
    return d.getDate() === lastDayOfMonth(d);
  }

  function isYearEnd(d) {
    return d.getMonth() === 11 && d.getDate() === 31; // Dec 31
  }

  function weekStartMonday(d) {
    // Monday-based week start
    var day = d.getDay(); // Sun=0 Mon=1 ... Sat=6
    var diff = (day + 6) % 7; // Mon => 0, Sun => 6
    var start = cloneDate(d);
    start.setDate(start.getDate() - diff);
    return start;
  }

  function weekEndSunday(d) {
    // If d is Sunday already, end = d; else next Sunday.
    var end = cloneDate(d);
    var day = d.getDay();
    var add = (7 - day) % 7;
    end.setDate(end.getDate() + add);
    return end;
  }

  function monthStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function monthEnd(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function yearStart(d) {
    return new Date(d.getFullYear(), 0, 1);
  }

  function yearEnd(d) {
    return new Date(d.getFullYear(), 11, 31);
  }

  function alreadySent(type, periodId) {
    var sent = readJson(SENT_KEY, {});
    return !!(sent[type] && sent[type][periodId]);
  }

  function markSent(type, periodId) {
    var sent = readJson(SENT_KEY, {});
    if (!sent[type]) sent[type] = {};
    sent[type][periodId] = new Date().toISOString();
    writeJson(SENT_KEY, sent);
  }

  // =========================
  // 3) Daily Storage
  // =========================
  function saveRatingForToday(categoryKey, value) {
    var today = isoLocal(new Date());
    var store = readJson(STORAGE_KEY, {});
    if (!store[today]) store[today] = {};
    store[today][categoryKey] = value;
    store[today]._updatedAt = new Date().toISOString();
    writeJson(STORAGE_KEY, store);

    // (Optional) you can show a toast/alert here.
  }

  function getRatingsInRange(startDate, endDate) {
    var store = readJson(STORAGE_KEY, {});
    var rows = [];

    var cur = cloneDate(startDate);
    var end = cloneDate(endDate);

    while (cur.getTime() <= end.getTime()) {
      var dayKey = isoLocal(cur);
      var dayObj = store[dayKey] || {};
      rows.push({
        date: dayKey,
        values: dayObj
      });
      cur.setDate(cur.getDate() + 1);
    }

    return rows;
  }

  function calcAverages(rows) {
    // averages per category, ignoring missing days
    var sums = {};
    var counts = {};
    CATEGORIES.forEach(function (c) {
      sums[c.key] = 0;
      counts[c.key] = 0;
    });

    rows.forEach(function (r) {
      CATEGORIES.forEach(function (c) {
        var v = r.values[c.key];
        if (typeof v === "number" && v >= 1 && v <= 5) {
          sums[c.key] += v;
          counts[c.key] += 1;
        }
      });
    });

    var avg = {};
    CATEGORIES.forEach(function (c) {
      avg[c.key] = counts[c.key] ? (sums[c.key] / counts[c.key]) : null;
    });

    return { avg: avg, counts: counts };
  }

  function buildPlainTextReport(title, startDate, endDate) {
    var rows = getRatingsInRange(startDate, endDate);
    var stats = calcAverages(rows);

    var lines = [];
    lines.push(title);
    lines.push("Period: " + isoLocal(startDate) + " to " + isoLocal(endDate));
    lines.push("");

    // Averages
    lines.push("Averages (1-5):");
    CATEGORIES.forEach(function (c) {
      var a = stats.avg[c.key];
      var cnt = stats.counts[c.key];
      lines.push(
        "- " + c.label + ": " + (a === null ? "N/A" : a.toFixed(2)) + " (days rated: " + cnt + ")"
      );
    });
    lines.push("");

    // Daily table
    lines.push("Daily entries:");
    lines.push("Date       | " + CATEGORIES.map(function (c) { return c.label.padEnd(13, " "); }).join(" | "));
    lines.push("-----------|-" + CATEGORIES.map(function () { return "-------------"; }).join("-|-"));

    rows.forEach(function (r) {
      var row = r.date + " | " + CATEGORIES.map(function (c) {
        var v = r.values[c.key];
        return (typeof v === "number" ? String(v) : "-").padEnd(13, " ");
      }).join(" | ");
      lines.push(row);
    });

    lines.push("");
    lines.push("Generated from your Rezume portfolio ratings page.");

    return lines.join("\n");
  }

  // =========================
  // 4) Report Scheduling
  // =========================
  function buildWeeklyReport(now) {
    var end = cloneDate(now); // if it's Sunday, this is Sunday
    var start = weekStartMonday(end);
    var periodId = isoLocal(start) + "_" + isoLocal(end);
    return {
      type: "weekly",
      periodId: periodId,
      subject: "Weekly Work Ratings (" + isoLocal(start) + " to " + isoLocal(end) + ")",
      body: buildPlainTextReport("WEEKLY WORK RATINGS REPORT", start, end)
    };
  }

  function buildMonthlyReport(now) {
    var start = monthStart(now);
    var end = monthEnd(now);
    var periodId = isoLocal(start).slice(0, 7); // YYYY-MM
    return {
      type: "monthly",
      periodId: periodId,
      subject: "Monthly Work Ratings (" + periodId + ")",
      body: buildPlainTextReport("MONTHLY WORK RATINGS REPORT", start, end)
    };
  }

  function buildYearlyReport(now) {
    var start = yearStart(now);
    var end = yearEnd(now);
    var periodId = String(now.getFullYear());
    return {
      type: "yearly",
      periodId: periodId,
      subject: "Yearly Work Ratings (" + periodId + ")",
      body: buildPlainTextReport("YEARLY WORK RATINGS REPORT", start, end)
    };
  }

  function getDueReports(now) {
    var due = [];

    // Weekly: only on Sunday
    if (isSunday(now)) {
      due.push(buildWeeklyReport(now));
    }

    // Month end: on last day of month (handles Feb 28/29 too)
    if (isMonthEnd(now)) {
      due.push(buildMonthlyReport(now));
    }

    // Year end: Dec 31
    if (isYearEnd(now)) {
      due.push(buildYearlyReport(now));
    }

    // Remove anything already sent
    due = due.filter(function (r) { return !alreadySent(r.type, r.periodId); });

    return due;
  }

  // =========================
  // 5) Sending (mailto or backend API)
  // =========================
  function openMailtoDraft(toList, subject, body) {
    var to = (toList || []).join(",");
    // mailto body length can be limited in some clients; keep it reasonable
    var url =
      "mailto:" + encodeURIComponent(to) +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    window.location.href = url;
  }

  function sendViaApi(report) {
    return fetch(CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: CONFIG.recipients,
        subject: report.subject,
        text: report.body
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error("API failed: " + res.status + " " + t);
        });
      }
      return res.json().catch(function () { return {}; });
    });
  }

  function sendReport(report) {
    if (!report) return Promise.resolve();

    if (CONFIG.mailMode === "api") {
      return sendViaApi(report).then(function () {
        markSent(report.type, report.periodId);
      });
    }

    // mailto mode (requires user click)
    openMailtoDraft(CONFIG.recipients, report.subject, report.body);
    // We can't know if the user actually sent it, but we mark as "sent" to prevent repeated prompts.
    markSent(report.type, report.periodId);
    return Promise.resolve();
  }

  // =========================
  // 6) UI Reminder (client-safe)
  // =========================
  function ensureReminderHost() {
    var host = document.getElementById("rating-report-reminders");
    if (host) return host;

    host = document.createElement("div");
    host.id = "rating-report-reminders";
    host.style.position = "fixed";
    host.style.right = "16px";
    host.style.bottom = "16px";
    host.style.zIndex = "9999";
    host.style.maxWidth = "420px";
    document.body.appendChild(host);
    return host;
  }

  function renderReminder(report) {
    var host = ensureReminderHost();

    var card = document.createElement("div");
    card.className = "alert alert-info";
    card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
    card.style.marginTop = "12px";

    var title = document.createElement("div");
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    title.textContent = "Report due: " + report.type.toUpperCase();

    var small = document.createElement("div");
    small.style.fontSize = "13px";
    small.style.opacity = "0.9";
    small.style.marginBottom = "12px";
    small.textContent = report.subject;

    var btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "10px";
    btnRow.style.flexWrap = "wrap";

    var sendBtn = document.createElement("button");
    sendBtn.className = "btn btn-primary btn-sm";
    sendBtn.type = "button";
    sendBtn.textContent = (CONFIG.mailMode === "api" ? "Send now" : "Open email draft");

    var dismissBtn = document.createElement("button");
    dismissBtn.className = "btn btn-secondary btn-sm";
    dismissBtn.type = "button";
    dismissBtn.textContent = "Dismiss";

    sendBtn.addEventListener("click", function () {
      sendBtn.disabled = true;
      dismissBtn.disabled = true;

      sendReport(report)
        .then(function () {
          card.parentNode && card.parentNode.removeChild(card);
        })
        .catch(function (err) {
          sendBtn.disabled = false;
          dismissBtn.disabled = false;
          alert("Could not send report: " + (err && err.message ? err.message : err));
        });
    });

    dismissBtn.addEventListener("click", function () {
      // Don't mark as sent; just hide the reminder for now.
      card.parentNode && card.parentNode.removeChild(card);
    });

    btnRow.appendChild(sendBtn);
    btnRow.appendChild(dismissBtn);

    card.appendChild(title);
    card.appendChild(small);
    card.appendChild(btnRow);

    host.appendChild(card);
  }

  // =========================
  // 7) Wire inputs + run checks
  // =========================
  function wireRatingInputs() {
    CATEGORIES.forEach(function (cat) {
      var inputs = document.querySelectorAll('input[name="' + cat.name + '"]');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener("change", function (e) {
          var input = e.target;
          var v = Number(input.value);
          if (!isFinite(v)) return;

          // Save immediately when user clicks a rating circle.
          saveRatingForToday(cat.key, v);

          // Optional: if it's due day, we can re-check.
          checkDueReports();
        });
      }
    });
  }

  function restoreTodaySelections() {
    var today = isoLocal(new Date());
    var store = readJson(STORAGE_KEY, {});
    var dayObj = store[today];
    if (!dayObj) return;

    CATEGORIES.forEach(function (cat) {
      var v = dayObj[cat.key];
      if (typeof v !== "number") return;
      var el = document.querySelector('input[name="' + cat.name + '"][value="' + String(v) + '"]');
      if (el) el.checked = true;
    });
  }

  function checkDueReports() {
    var now = new Date();
    var due = getDueReports(now);

    if (!due.length) return;

    // If api+autoSend, try sending automatically (still only works when page is open)
    if (CONFIG.mailMode === "api" && CONFIG.autoSendIfPossible) {
      due.forEach(function (r) {
        sendReport(r).catch(function () {
          // If it fails, show reminder so user can try again.
          renderReminder(r);
        });
      });
      return;
    }

    // Otherwise, show reminders with a button
    due.forEach(renderReminder);
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", function () {
    wireRatingInputs();
    restoreTodaySelections();
    checkDueReports();
  });

})();
