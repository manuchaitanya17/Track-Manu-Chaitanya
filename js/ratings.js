/*!
 * Daily Ratings Tracker (Client-side only)
 * - Stores ratings in localStorage per day (YYYY-MM-DD)
 * - Renders a history table
 * - Opens an email draft (mailto or Gmail) after you submit today's ratings
 *
 * NOTE: Client-side JavaScript cannot send emails silently/automatically.
 * This script opens a pre-filled draft; you still press "Send".
 */

(function () {
  'use strict';

  // =========================
  // CONFIG (EDIT THIS)
  // =========================
  var CONFIG = {
    // Who should receive the email draft?
    recipients: ['manuchaitanya21@gmail.com'],

    // Choose how to open the email draft:
    // - 'mailto' opens the default mail app
    // - 'gmail' opens Gmail compose in a new tab
    mailMode: 'mailto', // 'mailto' | 'gmail'

    // Email subject prefix
    subjectPrefix: 'Daily Work Ratings'
  };

  // =========================
  // CONSTANTS
  // =========================
  var STORAGE_KEY = 'dailyWorkRatings.v1';
  var DRAFT_KEY = 'dailyWorkRatings.draft.v1';
  var HARDCODED_RATING_RANGES = [
    {
      start: [2026, 1, 1],
      end: [2026, 1, 15],
      ratings: { consistency: 2, discipline: 2, determination: 2, interest: 2 }
    },
    {
      start: [2026, 1, 16],
      end: [2026, 1, 31],
      ratings: { consistency: 3, discipline: 3, determination: 3, interest: 4 }
    },
    {
      start: [2026, 2, 1],
      end: [2026, 2, 15],
      ratings: { consistency: 4, discipline: 4, determination: 4, interest: 4 }
    },
    {
      start: [2026, 2, 16],
      end: [2026, 2, 28],
      ratings: { consistency: 2, discipline: 3, determination: 5, interest: 4 }
    },
    {
      start: [2026, 3, 1],
      end: [2026, 3, 15],
      ratings: { consistency: 2, discipline: 3, determination: 2, interest: 3 }
    }
  ];

  var CATEGORIES = [
    { key: 'consistency',  label: 'Consistency',  inputName: 'rating_consistency' },
    { key: 'discipline',   label: 'Discipline',   inputName: 'rating_discipline' },
    { key: 'determination',label: 'Determination',inputName: 'rating_determination' },
    { key: 'interest',     label: 'Interest',     inputName: 'rating_interest' }
  ];

  // =========================
  // HELPERS
  // =========================
  function pad2(n) { return String(n).padStart(2, '0'); }

  function toISODate(d) {
    // Local date => YYYY-MM-DD
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function buildHardcodedEntries() {
    var seeded = {};
    for (var i = 0; i < HARDCODED_RATING_RANGES.length; i++) {
      var range = HARDCODED_RATING_RANGES[i];
      var current = new Date(range.start[0], range.start[1] - 1, range.start[2]);
      var end = new Date(range.end[0], range.end[1] - 1, range.end[2]);
      while (current.getTime() <= end.getTime()) {
        var key = toISODate(current);
        seeded[key] = {
          consistency: range.ratings.consistency,
          discipline: range.ratings.discipline,
          determination: range.ratings.determination,
          interest: range.ratings.interest
        };
        current.setDate(current.getDate() + 1);
      }
    }
    return seeded;
  }

  var HARDCODED_ENTRIES = buildHardcodedEntries();

  function fromISODate(iso) {
    // Force local midnight to avoid timezone shifting
    return new Date(iso + 'T00:00:00');
  }

  function clampRating(n) {
    n = Number(n);
    if (!Number.isFinite(n)) return null;
    n = Math.round(n);
    if (n < 1 || n > 5) return null;
    return n;
  }

  function safeParseJSON(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function loadStore() {
    var raw = localStorage.getItem(STORAGE_KEY);
    var store = safeParseJSON(raw, null);
    if (!store || typeof store !== 'object') store = {};
    if (!store.entries || typeof store.entries !== 'object') store.entries = {};
    store.entries = Object.assign({}, store.entries, HARDCODED_ENTRIES);
    return store;
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function loadDraft() {
    var raw = localStorage.getItem(DRAFT_KEY);
    var draft = safeParseJSON(raw, null);
    if (!draft || typeof draft !== 'object') return null;
    return draft;
  }

  function saveDraft(draft) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function mean(numbers) {
    var sum = 0;
    var count = 0;
    for (var i = 0; i < numbers.length; i++) {
      var n = Number(numbers[i]);
      if (!Number.isFinite(n)) continue;
      sum += n;
      count++;
    }
    return count ? (sum / count) : null;
  }

  function computeDailyAverage(ratingsObj) {
    var vals = [];
    for (var i = 0; i < CATEGORIES.length; i++) {
      vals.push(ratingsObj[CATEGORIES[i].key]);
    }
    return mean(vals);
  }

  function isSunday(d) {
    return d.getDay() === 0;
  }

  function isMonthEnd(d) {
    // Last day of this month (handles Feb 28/29)
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return d.getDate() === last;
  }

  function isYearEnd(d) {
    return d.getMonth() === 11 && d.getDate() === 31;
  }

  function getWeekRangeEndingOn(d) {
    // Week = Monday -> Sunday, ending on date d (expected to be Sunday for weekly report)
    var dayIndexMonday0 = (d.getDay() + 6) % 7; // Monday=0, Sunday=6
    var start = new Date(d);
    start.setDate(d.getDate() - dayIndexMonday0);
    var end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start, end: end };
  }

  function getMonthRange(d) {
    var start = new Date(d.getFullYear(), d.getMonth(), 1);
    var end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: start, end: end };
  }

  function getYearRange(d) {
    var start = new Date(d.getFullYear(), 0, 1);
    var end = new Date(d.getFullYear(), 11, 31);
    return { start: start, end: end };
  }

  function listEntriesInRange(store, startDate, endDate) {
    var startISO = toISODate(startDate);
    var endISO = toISODate(endDate);

    var rows = [];
    var keys = Object.keys(store.entries || {});
    for (var i = 0; i < keys.length; i++) {
      var iso = keys[i];
      if (iso >= startISO && iso <= endISO) {
        rows.push({ date: iso, data: store.entries[iso] });
      }
    }

    // Sort ascending by date
    rows.sort(function (a, b) { return a.date.localeCompare(b.date); });
    return rows;
  }

  function computeAveragesForEntries(entryRows) {
    // entryRows: [{date, data}]
    var sums = {};
    var count = 0;

    for (var c = 0; c < CATEGORIES.length; c++) {
      sums[CATEGORIES[c].key] = 0;
    }

    for (var i = 0; i < entryRows.length; i++) {
      var data = entryRows[i].data || {};
      var ok = true;

      // Require all 4 categories to be present (avoid partial days)
      for (var c2 = 0; c2 < CATEGORIES.length; c2++) {
        var key = CATEGORIES[c2].key;
        var v = clampRating(data[key]);
        if (v === null) { ok = false; break; }
      }

      if (!ok) continue;

      for (var c3 = 0; c3 < CATEGORIES.length; c3++) {
        var key2 = CATEGORIES[c3].key;
        sums[key2] += Number(data[key2]);
      }
      count++;
    }

    var avgs = {};
    for (var c4 = 0; c4 < CATEGORIES.length; c4++) {
      var key3 = CATEGORIES[c4].key;
      avgs[key3] = count ? (sums[key3] / count) : null;
    }

    var overall = mean(Object.keys(avgs).map(function (k) { return avgs[k]; }));

    return { daysCount: count, perCategory: avgs, overall: overall };
  }

  function buildEmailBody(opts) {
    // opts: { todayISO, todayRatings, store }
    var todayISO = opts.todayISO;
    var todayDate = fromISODate(todayISO);
    var store = opts.store;
    var todayRatings = opts.todayRatings;

    var lines = [];
    lines.push('Daily Work Ratings (' + todayISO + ')');
    lines.push('');
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i];
      lines.push(cat.label + ': ' + todayRatings[cat.key] + '/5');
    }
    var dailyAvg = computeDailyAverage(todayRatings);
    lines.push('Daily Average: ' + (dailyAvg !== null ? dailyAvg.toFixed(2) : '-') + '/5');

    // Weekly summary (only on Sunday)
    if (isSunday(todayDate)) {
      var week = getWeekRangeEndingOn(todayDate);
      var weekRows = listEntriesInRange(store, week.start, week.end);
      var weekAvg = computeAveragesForEntries(weekRows);

      lines.push('');
      lines.push('Weekly Summary (' + toISODate(week.start) + ' to ' + toISODate(week.end) + ')');
      lines.push('Days Recorded: ' + weekAvg.daysCount + '/7');
      for (var w = 0; w < CATEGORIES.length; w++) {
        var catW = CATEGORIES[w];
        var vW = weekAvg.perCategory[catW.key];
        lines.push('Average ' + catW.label + ': ' + (vW !== null ? vW.toFixed(2) : '-') + '/5');
      }
      lines.push('Overall Weekly Average: ' + (weekAvg.overall !== null ? weekAvg.overall.toFixed(2) : '-') + '/5');
    }

    // Monthly summary (only on last day of month)
    if (isMonthEnd(todayDate)) {
      var month = getMonthRange(todayDate);
      var monthRows = listEntriesInRange(store, month.start, month.end);
      var monthAvg = computeAveragesForEntries(monthRows);

      // number of days in month
      var daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();

      lines.push('');
      lines.push('Monthly Summary (' + toISODate(month.start) + ' to ' + toISODate(month.end) + ')');
      lines.push('Days Recorded: ' + monthAvg.daysCount + '/' + daysInMonth);
      for (var m = 0; m < CATEGORIES.length; m++) {
        var catM = CATEGORIES[m];
        var vM = monthAvg.perCategory[catM.key];
        lines.push('Averageg' + catM.label + ': ' + (vM !== null ? vM.toFixed(2) : '-') + '/5');
      }
      lines.push('Overall Monthly Average: ' + (monthAvg.overall !== null ? monthAvg.overall.toFixed(2) : '-') + '/5');
    }

    // Yearly summary (only on Dec 31)
    if (isYearEnd(todayDate)) {
      var year = getYearRange(todayDate);
      var yearRows = listEntriesInRange(store, year.start, year.end);
      var yearAvg = computeAveragesForEntries(yearRows);

      // days in year
      var startYear = new Date(todayDate.getFullYear(), 0, 1);
      var endYear = new Date(todayDate.getFullYear(), 11, 31);
      var daysInYear = Math.round((endYear - startYear) / (24 * 60 * 60 * 1000)) + 1;

      lines.push('');
      lines.push('Yearly Summary (' + toISODate(year.start) + ' to ' + toISODate(year.end) + ')');
      lines.push('Days recorded: ' + yearAvg.daysCount + '/' + daysInYear);
      for (var y = 0; y < CATEGORIES.length; y++) {
        var catY = CATEGORIES[y];
        var vY = yearAvg.perCategory[catY.key];
        lines.push('Average ' + catY.label + ': ' + (vY !== null ? vY.toFixed(2) : '-') + '/5');
      }
      lines.push('Overall Yearly Average: ' + (yearAvg.overall !== null ? yearAvg.overall.toFixed(2) : '-') + '/5');
    }

    lines.push('');
    lines.push('— Sent from PILLAAR');

    return lines.join('\n');
  }

  function openEmailDraft(subject, body) {
    if (!CONFIG.recipients || !CONFIG.recipients.length) {
      alert('Please set CONFIG.recipients in js/ratings.js');
      return;
    }

    var to = CONFIG.recipients.join(',');

    if (CONFIG.mailMode === 'gmail') {
      // Gmail compose
      var gmailUrl =
        'https://mail.google.com/mail/?view=cm&fs=1' +
        '&to=' + encodeURIComponent(to) +
        '&su=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Default: mailto
    var mailtoUrl =
      'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    window.location.href = mailtoUrl;
  }

  // =========================
  // UI RENDERING
  // =========================
  function $(id) { return document.getElementById(id); }

  function setStatus(msg, kind) {
    var el = $('ratingsStatus');
    if (!el) return;

    el.textContent = msg || '';

    el.classList.remove('text-success', 'text-warning', 'text-danger', 'text-info');
    if (kind === 'success') el.classList.add('text-success');
    else if (kind === 'warn') el.classList.add('text-warning');
    else if (kind === 'error') el.classList.add('text-danger');
    else el.classList.add('text-info');
  }

  function getSelectedRatings(formEl) {
    var out = {};
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i];
      var input = formEl.querySelector('input[name="' + cat.inputName + '"]:checked');
      if (!input) return null;
      var v = clampRating(input.value);
      if (v === null) return null;
      out[cat.key] = v;
    }
    return out;
  }

  function applyRatingsToForm(formEl, ratingsObj) {
    if (!ratingsObj) return;
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i];
      var v = clampRating(ratingsObj[cat.key]);
      if (v === null) continue;

      var selector = 'input[name="' + cat.inputName + '"][value="' + v + '"]';
      var input = formEl.querySelector(selector);
      if (input) input.checked = true;
    }
  }

  function buildHistoryTable() {
    var store = loadStore();
    var tbody = $('ratingsTableBody');
    var summaryEl = $('ratingsSummaryText');
    var rangeSelect = $('ratingsRange');

    if (!tbody) return;

    var keys = Object.keys(store.entries || {});
    if (!keys.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No ratings yet. Submit today’s ratings to start tracking.</td></tr>';
      if (summaryEl) summaryEl.textContent = 'No ratings yet. Submit today’s ratings to start tracking.';
      return;
    }

    // Determine range
    var range = rangeSelect ? rangeSelect.value : '30';
    var today = new Date();
    var todayISO = toISODate(today);

    var entries = [];
    keys.sort(); // ascending
    for (var i = 0; i < keys.length; i++) {
      var iso = keys[i];
      entries.push({ date: iso, data: store.entries[iso] });
    }

    // Filter by last N days (based on today)
    if (range !== 'all') {
      var days = Number(range);
      if (Number.isFinite(days) && days > 0) {
        var start = new Date(today);
        start.setDate(today.getDate() - (days - 1));
        var startISO = toISODate(start);
        entries = entries.filter(function (e) { return e.date >= startISO && e.date <= todayISO; });
      }
    }

    // Render newest first
    entries.sort(function (a, b) { return b.date.localeCompare(a.date); });

    var html = '';
    for (var r = 0; r < entries.length; r++) {
      var row = entries[r];
      var data = row.data || {};

      var ratings = {};
      var ok = true;
      for (var c = 0; c < CATEGORIES.length; c++) {
        var key = CATEGORIES[c].key;
        var v = clampRating(data[key]);
        if (v === null) { ok = false; break; }
        ratings[key] = v;
      }

      if (!ok) continue;

      var avg = computeDailyAverage(ratings);
      var isToday = row.date === todayISO;

      html += '<tr' + (isToday ? ' class="is-today"' : '') + '>';
      html += '<td>' + row.date + '</td>';
      html += '<td>' + ratings.consistency + '</td>';
      html += '<td>' + ratings.discipline + '</td>';
      html += '<td>' + ratings.determination + '</td>';
      html += '<td>' + ratings.interest + '</td>';
      html += '<td>' + (avg !== null ? avg.toFixed(2) : '-') + '</td>';
      html += '</tr>';
    }

    tbody.innerHTML = html || '<tr><td colspan="6" class="text-muted">No complete ratings found in the selected range.</td></tr>';

    // Summary (week/month/year relative to today)
    var week = getWeekRangeEndingOn(today);
    var weekAvg = computeAveragesForEntries(listEntriesInRange(store, week.start, week.end));

    var month = getMonthRange(today);
    var monthAvg = computeAveragesForEntries(listEntriesInRange(store, month.start, month.end));
    var dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    var year = getYearRange(today);
    var yearAvg = computeAveragesForEntries(listEntriesInRange(store, year.start, year.end));

    var summaryLines = [];
    summaryLines.push('Total Entries Stored: ' + Object.keys(store.entries || {}).length);

    summaryLines.push('This Week Average: ' + (weekAvg.overall !== null ? weekAvg.overall.toFixed(2) : '-') + '/5 (' + weekAvg.daysCount + '/7 days)');
    summaryLines.push('This Month Average: ' + (monthAvg.overall !== null ? monthAvg.overall.toFixed(2) : '-') + '/5 (' + monthAvg.daysCount + '/' + dim + ' days)');
    summaryLines.push('This Year Average: ' + (yearAvg.overall !== null ? yearAvg.overall.toFixed(2) : '-') + '/5 (' + yearAvg.daysCount + ' days)');

    if (summaryEl) summaryEl.textContent = summaryLines.join(' • ');
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function exportCSV() {
    var store = loadStore();
    var keys = Object.keys(store.entries || {}).sort(); // ascending

    var header = ['date'].concat(CATEGORIES.map(function (c) { return c.key; })).concat(['daily_avg']);
    var rows = [header.join(',')];

    for (var i = 0; i < keys.length; i++) {
      var iso = keys[i];
      var data = store.entries[iso] || {};
      var ratings = {};
      var ok = true;
      for (var c = 0; c < CATEGORIES.length; c++) {
        var key = CATEGORIES[c].key;
        var v = clampRating(data[key]);
        if (v === null) { ok = false; break; }
        ratings[key] = v;
      }
      if (!ok) continue;

      var avg = computeDailyAverage(ratings);
      var line = [iso, ratings.consistency, ratings.discipline, ratings.determination, ratings.interest, (avg !== null ? avg.toFixed(2) : '')];
      rows.push(line.join(','));
    }

    downloadFile('ratings.csv', rows.join('\n'), 'text/csv');
  }

  function exportJSON() {
    var store = loadStore();
    downloadFile('ratings.json', JSON.stringify(store, null, 2), 'application/json');
  }

  function clearAll() {
    if (!confirm('Clear all saved ratings from this browser?')) return;
    localStorage.removeItem(STORAGE_KEY);
    clearDraft();
    buildHistoryTable();
    setStatus('Cleared all saved ratings.', 'warn');
  }

  // =========================
  // INIT
  // =========================
  document.addEventListener('DOMContentLoaded', function () {
    var form = $('dailyRatingsForm');
    if (!form) return;

    // Re-apply today's saved ratings (if present) or today's draft (if present)
    var todayISO = toISODate(new Date());
    var store = loadStore();
    if (store.entries && store.entries[todayISO]) {
      applyRatingsToForm(form, store.entries[todayISO]);
      setStatus('Loaded Today’s Saved Ratings (' + todayISO + ').', 'info');
    } else {
      var draft = loadDraft();
      if (draft && draft.date === todayISO) {
        applyRatingsToForm(form, draft.ratings || {});
        setStatus('Loaded Your Draft For Today (' + todayISO + ').', 'info');
      }
    }

    // Save draft whenever a rating changes
    form.addEventListener('change', function () {
      var partial = {};
      for (var i = 0; i < CATEGORIES.length; i++) {
        var cat = CATEGORIES[i];
        var input = form.querySelector('input[name="' + cat.inputName + '"]:checked');
        if (input) {
          var v = clampRating(input.value);
          if (v !== null) partial[cat.key] = v;
        }
      }
      saveDraft({ date: todayISO, ratings: partial, updatedAt: new Date().toISOString() });
      // Keep status subtle (don’t override success messages immediately)
      if (!$('ratingsStatus').classList.contains('text-success')) {
        setStatus('Draft Saved for Today.');
      }
    });

    // Submit handler
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var selected = getSelectedRatings(form);
      if (!selected) {
        setStatus('Please select a rating (1–5) for all 4 categories, then submit.');
        return;
      }

      var now = new Date();
      var iso = toISODate(now);

      var storeNow = loadStore();
      storeNow.entries[iso] = {
        consistency: selected.consistency,
        discipline: selected.discipline,
        determination: selected.determination,
        interest: selected.interest,
        savedAt: new Date().toISOString()
      };
      saveStore(storeNow);
      clearDraft();

      buildHistoryTable();

      // Compose & open email draft (daily + any period summaries that end today)
      var subject = CONFIG.subjectPrefix + ' — ' + iso;
      var body = buildEmailBody({ todayISO: iso, todayRatings: selected, store: storeNow });

      setStatus('Saved! Opening Email Draft…', 'Success');
      openEmailDraft(subject, body);
    });

    // History controls
    var rangeSelect = $('ratingsRange');
    if (rangeSelect) {
      rangeSelect.addEventListener('change', buildHistoryTable);
    }

    var exportBtn = $('ratingsExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);

    var exportJsonBtn = $('ratingsExportJsonBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON);

    var clearBtn = $('ratingsClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAll);

    // Initial render
    buildHistoryTable();
  });
})();
