(function(){
  var HOLIDAYS = [
    { date: "2026-01-26", title: "Republic Day" },
    { date: "2026-03-04", title: "Holi" },
    { date: "2026-03-20", title: "Day before Idu'l Fitr" },
    { date: "2026-10-02", title: "Gandhi Jayanti" },
    { date: "2026-10-20", title: "Dussehra" },
    { date: "2026-11-09", title: "Day after Diwali" },
    { date: "2026-11-24", title: "Gurupurab" },
    { date: "2026-12-25", title: "Christmas Day" },
    { date: "2026-12-31", title: "New Year's Eve" },
    { date: "2027-01-01", title: "New Year's Day" }
  ];

  var PTO_ENTRIES = [
    { date: "2026-03-27", title: "Casual Leave", leaveType: "casual" },
    { date: "2026-03-30", title: "Casual Leave", leaveType: "casual" },
    { date: "2026-03-31", title: "Casual Leave", leaveType: "casual" }
  ];

  var PTO_META = {
    casual: {
      label: "Casual Leave",
      copy: "Short planned leave used for personal days and flexible time away."
    },
    sick: {
      label: "Sick Leave",
      copy: "Medical recovery or health-related time away from office delivery."
    },
    earned: {
      label: "Earned Leave",
      copy: "Longer leave bank for larger breaks, travel, or planned resets."
    }
  };

  var RANGE_START = new Date(2026, 0, 1);
  var RANGE_END = new Date(2027, 0, 1);
  var INITIAL_FALLBACK = new Date(2026, 2, 1);
  var MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  var SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
  var DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  var LIST_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  var DAY_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short" });

  var state = {
    month: null,
    query: ""
  };

  var calendarEventMap = Object.create(null);
  var monthGroups = Object.create(null);
  var ptoGroups = Object.create(null);

  function toDate(isoDate){
    var parts = isoDate.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function stripTime(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function startOfMonth(date){
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function dateKey(date){
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function monthKey(date){
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function sameDay(a, b){
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function sameMonth(a, b){
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function addDays(date, amount){
    var next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function clampMonth(date){
    var month = startOfMonth(date);
    if(month < RANGE_START){
      return new Date(RANGE_START);
    }
    if(month > RANGE_END){
      return new Date(RANGE_END);
    }
    return month;
  }

  function getToday(){
    return stripTime(new Date());
  }

  function getInitialMonth(){
    var todayMonth = startOfMonth(getToday());
    if(todayMonth >= RANGE_START && todayMonth <= RANGE_END){
      return todayMonth;
    }
    return new Date(INITIAL_FALLBACK);
  }

  function getFilteredHolidayList(){
    var query = state.query.trim().toLowerCase();
    return HOLIDAYS.filter(function(holiday){
      return !query || holiday.title.toLowerCase().indexOf(query) !== -1;
    });
  }

  function getFilteredCalendarEntries(){
    var query = state.query.trim().toLowerCase();
    return HOLIDAYS.concat(PTO_ENTRIES).filter(function(entry){
      return !query || entry.title.toLowerCase().indexOf(query) !== -1;
    });
  }

  function getMonthHolidayCount(monthDate){
    return getFilteredHolidayList().filter(function(holiday){
      return holiday.dateValue.getFullYear() === monthDate.getFullYear() && holiday.dateValue.getMonth() === monthDate.getMonth();
    }).length;
  }

  function getNextHoliday(){
    var today = getToday();
    var upcoming = HOLIDAYS.find(function(holiday){
      return holiday.dateValue >= today;
    });
    return upcoming || HOLIDAYS[HOLIDAYS.length - 1];
  }

  function getDaysAway(target){
    var diff = stripTime(target).getTime() - getToday().getTime();
    return Math.round(diff / 86400000);
  }

  function buildCalendarGrid(){
    var grid = document.getElementById("calendarGrid");
    var label = document.getElementById("calendarMonthLabel");
    var meta = document.getElementById("calendarMonthMeta");
    var visibleEntries = getFilteredCalendarEntries();
    var firstDay = startOfMonth(state.month);
    var offset = firstDay.getDay();
    var gridStart = addDays(firstDay, -offset);
    var nextHoliday = getNextHoliday();

    label.textContent = MONTH_FORMATTER.format(firstDay);
    grid.innerHTML = "";

    for(var i = 0; i < 42; i += 1){
      var cellDate = addDays(gridStart, i);
      var cellKey = dateKey(cellDate);
      var dayEvents = (calendarEventMap[cellKey] || []).filter(function(entry){
        return !state.query || entry.title.toLowerCase().indexOf(state.query) !== -1;
      });
      var cell = document.createElement("article");
      var head = document.createElement("div");
      var badge = document.createElement("span");
      var eventStack = document.createElement("div");

      cell.className = "calendar-cell";
      if(!sameMonth(cellDate, firstDay)){
        cell.classList.add("is-outside");
      }
      if(sameDay(cellDate, getToday())){
        cell.classList.add("is-today");
      }

      head.className = "calendar-cell-head";
      badge.className = "calendar-day-badge";
      badge.textContent = !sameMonth(cellDate, firstDay) && cellDate.getDate() === 1
        ? cellDate.getDate() + " " + DAY_NAME_FORMATTER.format(cellDate)
        : cellDate.getDate();
      head.appendChild(badge);
      cell.appendChild(head);

      eventStack.className = "calendar-event-stack";
      dayEvents.forEach(function(entry){
        var pill = document.createElement("span");
        pill.className = "calendar-event";
        if(entry.kind === "pto"){
          pill.classList.add("calendar-event--pto");
        }
        if(entry.kind === "holiday" && sameDay(entry.dateValue, nextHoliday.dateValue)){
          pill.classList.add("is-next-up");
        }
        pill.textContent = entry.title;
        pill.title = entry.title + " - " + DATE_FORMATTER.format(entry.dateValue);
        eventStack.appendChild(pill);
      });

      cell.appendChild(eventStack);
      grid.appendChild(cell);
    }

    var currentMonthMatches = visibleEntries.filter(function(entry){
      return sameMonth(entry.dateValue, firstDay);
    });

    if(state.query && currentMonthMatches.length === 0){
      meta.textContent = "No matching holidays or PTO appear in " + MONTH_FORMATTER.format(firstDay) + ".";
    } else if(currentMonthMatches.length === 0){
      meta.textContent = "No office holidays or PTO fall inside " + MONTH_FORMATTER.format(firstDay) + ".";
    } else if(currentMonthMatches.length === 1){
      meta.textContent = "1 holiday or PTO entry appears in " + MONTH_FORMATTER.format(firstDay) + ".";
    } else {
      meta.textContent = currentMonthMatches.length + " holiday or PTO entries appear in " + MONTH_FORMATTER.format(firstDay) + ".";
    }

    updateJumpButtons();
  }

  function buildHolidayList(){
    var list = document.getElementById("holidayList");
    var filtered = getFilteredHolidayList();

    list.innerHTML = "";

    if(filtered.length === 0){
      var empty = document.createElement("div");
      empty.className = "calendar-empty";
      empty.textContent = "No holidays match the current search.";
      list.appendChild(empty);
      return;
    }

    filtered.forEach(function(holiday){
      var item = document.createElement("button");
      var head = document.createElement("div");
      var datePill = document.createElement("span");
      var title = document.createElement("strong");
      var meta = document.createElement("span");

      item.type = "button";
      item.className = "holiday-list-item";
      item.setAttribute("data-date", holiday.isoDate);

      head.className = "holiday-list-item-head";
      datePill.className = "holiday-date-pill";
      datePill.textContent = SHORT_MONTH_FORMATTER.format(holiday.dateValue);
      title.textContent = holiday.title;
      meta.textContent = LIST_DATE_FORMATTER.format(holiday.dateValue) + " - Click to open this month in the calendar.";

      head.appendChild(datePill);
      head.appendChild(title);
      item.appendChild(head);
      item.appendChild(meta);
      list.appendChild(item);
    });
  }

  function buildPtoGroups(){
    var container = document.getElementById("ptoGroupGrid");
    var order = ["casual", "sick", "earned"];

    container.innerHTML = "";

    order.forEach(function(type){
      var meta = PTO_META[type];
      var entries = (ptoGroups[type] || []).slice().sort(function(a, b){
        return a.dateValue - b.dateValue;
      });
      var group = document.createElement("article");
      var head = document.createElement("div");
      var copyBlock = document.createElement("div");
      var title = document.createElement("h3");
      var copy = document.createElement("p");
      var count = document.createElement("span");
      var list = document.createElement("div");

      group.className = "pto-group";
      head.className = "pto-group-head";
      count.className = "pto-group-count";
      list.className = "pto-list";

      title.textContent = meta.label;
      copy.textContent = meta.copy;
      count.textContent = entries.length;

      copyBlock.appendChild(title);
      copyBlock.appendChild(copy);
      head.appendChild(copyBlock);
      head.appendChild(count);
      group.appendChild(head);

      if(entries.length === 0){
        var empty = document.createElement("div");
        empty.className = "pto-empty";
        empty.textContent = "No " + meta.label.toLowerCase() + " entries are stored yet.";
        list.appendChild(empty);
      } else {
        entries.forEach(function(entry){
          var button = document.createElement("button");
          var name = document.createElement("strong");
          var date = document.createElement("span");

          button.type = "button";
          button.className = "pto-list-item";
          button.setAttribute("data-pto-date", entry.isoDate);

          name.textContent = entry.title;
          date.textContent = LIST_DATE_FORMATTER.format(entry.dateValue) + " - Click to open this month in the calendar.";

          button.appendChild(name);
          button.appendChild(date);
          list.appendChild(button);
        });
      }

      group.appendChild(list);
      container.appendChild(group);
    });
  }

  function buildMonthJumps(){
    var container = document.getElementById("calendarMonthJumps");
    var keys = Object.keys(monthGroups).sort();
    container.innerHTML = "";

    keys.forEach(function(key){
      var monthDate = monthGroups[key][0].monthDate;
      var button = document.createElement("button");
      var meta = document.createElement("span");

      button.type = "button";
      button.className = "calendar-jump-btn";
      button.setAttribute("data-month", key);
      button.textContent = SHORT_MONTH_FORMATTER.format(monthDate);
      meta.textContent = monthGroups[key].length + " day" + (monthGroups[key].length > 1 ? "s" : "");
      button.appendChild(meta);
      container.appendChild(button);
    });
  }

  function updateJumpButtons(){
    Array.prototype.forEach.call(document.querySelectorAll(".calendar-jump-btn"), function(button){
      button.classList.toggle("is-active", button.getAttribute("data-month") === monthKey(state.month));
    });
  }

  function updateSummary(){
    var nextHoliday = getNextHoliday();
    var daysAway = getDaysAway(nextHoliday.dateValue);
    var total = HOLIDAYS.length;
    var yearly = HOLIDAYS.filter(function(holiday){
      return holiday.dateValue.getFullYear() === 2026;
    }).length;
    var activeMonths = Object.keys(monthGroups).length;
    var totalPto = PTO_ENTRIES.length;
    var casualPto = (ptoGroups.casual || []).length;
    var sickPto = (ptoGroups.sick || []).length;
    var earnedPto = (ptoGroups.earned || []).length;

    document.getElementById("summaryTotalHolidays").textContent = total;
    document.getElementById("summaryCurrentYear").textContent = yearly;
    document.getElementById("summaryActiveMonths").textContent = activeMonths;
    document.getElementById("summaryNextCountdown").textContent = daysAway >= 0 ? daysAway + "d" : "Done";
    document.getElementById("summaryNextCopy").textContent = nextHoliday.title + " - " + DATE_FORMATTER.format(nextHoliday.dateValue) + ".";
    document.getElementById("summaryTotalPto").textContent = totalPto;
    document.getElementById("summaryCasualPto").textContent = casualPto;
    document.getElementById("summarySickPto").textContent = sickPto;
    document.getElementById("summaryEarnedPto").textContent = earnedPto;

    document.getElementById("nextHolidayTitle").textContent = nextHoliday.title;
    document.getElementById("nextHolidayText").textContent = DATE_FORMATTER.format(nextHoliday.dateValue);
    document.getElementById("nextHolidayCountdown").textContent = daysAway >= 0
      ? daysAway + " day" + (daysAway === 1 ? "" : "s") + " away"
      : "Latest listed holiday";
    document.getElementById("searchStatus").textContent = state.query
      ? "Filtered by \"" + state.query + "\""
      : "Showing all holidays and PTO";
  }

  function renderAll(){
    updateSummary();
    buildCalendarGrid();
    buildHolidayList();
    buildPtoGroups();
  }

  function goToMonth(monthDate){
    state.month = clampMonth(monthDate);
    buildCalendarGrid();
  }

  function handleClicks(){
    document.getElementById("prevMonthBtn").addEventListener("click", function(){
      goToMonth(new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1, 12));
    });

    document.getElementById("nextMonthBtn").addEventListener("click", function(){
      goToMonth(new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1, 12));
    });

    document.getElementById("todayMonthBtn").addEventListener("click", function(){
      goToMonth(getInitialMonth());
    });

    document.getElementById("holidaySearch").addEventListener("input", function(event){
      state.query = event.target.value.trim().toLowerCase();
      renderAll();
    });

    document.getElementById("calendarMonthJumps").addEventListener("click", function(event){
      var button = event.target.closest(".calendar-jump-btn");
      if(!button) return;
      var parts = button.getAttribute("data-month").split("-").map(Number);
      goToMonth(new Date(parts[0], parts[1] - 1, 1, 12));
      document.getElementById("section-calendar").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("holidayList").addEventListener("click", function(event){
      var button = event.target.closest(".holiday-list-item");
      if(!button) return;
      var selected = HOLIDAYS.find(function(holiday){
        return holiday.isoDate === button.getAttribute("data-date");
      });
      if(!selected) return;
      goToMonth(startOfMonth(selected.dateValue));
      document.getElementById("section-calendar").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("ptoGroupGrid").addEventListener("click", function(event){
      var button = event.target.closest(".pto-list-item");
      if(!button) return;
      var selected = PTO_ENTRIES.find(function(entry){
        return entry.isoDate === button.getAttribute("data-pto-date");
      });
      if(!selected) return;
      goToMonth(startOfMonth(selected.dateValue));
      document.getElementById("section-calendar").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initSectionNav(){
    var sectionLinks = Array.prototype.slice.call(document.querySelectorAll('#pb-navbar a[href^="#"]'));
    var trackedSections = sectionLinks
      .map(function(link){
        return document.querySelector(link.getAttribute("href"));
      })
      .filter(Boolean);

    if(!trackedSections.length){
      return;
    }

    function setActive(id){
      Array.prototype.forEach.call(sectionLinks, function(link){
        var isActive = link.getAttribute("href") === "#" + id;
        link.parentNode.classList.toggle("active", isActive);
      });
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          setActive(entry.target.id);
        }
      });
    }, {
      rootMargin: "-35% 0px -45% 0px",
      threshold: 0.02
    });

    trackedSections.forEach(function(section){
      observer.observe(section);
    });
  }

  function hydrateData(){
    HOLIDAYS.forEach(function(holiday){
      holiday.kind = "holiday";
      holiday.isoDate = holiday.date;
      holiday.dateValue = toDate(holiday.date);
      holiday.monthDate = startOfMonth(holiday.dateValue);

      var key = dateKey(holiday.dateValue);
      var groupKey = monthKey(holiday.dateValue);

      if(!calendarEventMap[key]){
        calendarEventMap[key] = [];
      }
      calendarEventMap[key].push(holiday);

      if(!monthGroups[groupKey]){
        monthGroups[groupKey] = [];
      }
      monthGroups[groupKey].push(holiday);
    });

    PTO_ENTRIES.forEach(function(entry){
      entry.kind = "pto";
      entry.isoDate = entry.date;
      entry.dateValue = toDate(entry.date);
      entry.monthDate = startOfMonth(entry.dateValue);

      var key = dateKey(entry.dateValue);
      if(!calendarEventMap[key]){
        calendarEventMap[key] = [];
      }
      calendarEventMap[key].push(entry);

      if(!ptoGroups[entry.leaveType]){
        ptoGroups[entry.leaveType] = [];
      }
      ptoGroups[entry.leaveType].push(entry);
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    hydrateData();
    state.month = getInitialMonth();
    buildMonthJumps();
    renderAll();
    handleClicks();
    initSectionNav();
  });
})();
