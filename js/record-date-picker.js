(function(){
  "use strict";

  var ROOT_SELECTOR = "[data-record-date-picker]";
  var DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  var MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  var FULL_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  var instances = [];
  var uid = 0;

  function stripTime(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function parseDateKey(value){
    var parts = String(value || "").split("-").map(Number);
    if(parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]){
      return null;
    }
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function formatDateKey(date){
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function formatDateDisplay(date){
    return DISPLAY_FORMATTER.format(stripTime(date));
  }

  function addDays(date, amount){
    var next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function sameDay(a, b){
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function startOfMonthGrid(date){
    var first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    first.setDate(first.getDate() - first.getDay());
    return first;
  }

  function getMaxDate(instance){
    var raw = instance.input.getAttribute("data-max") || instance.input.getAttribute("max");
    return stripTime(parseDateKey(raw) || new Date());
  }

  function normalizeSelectedDate(instance){
    var maxDate = getMaxDate(instance);
    var selected = parseDateKey(instance.input.value) || maxDate;
    if(selected.getTime() > maxDate.getTime()){
      selected = maxDate;
    }
    return stripTime(selected);
  }

  function dispatchDateChange(input){
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function renderCalendar(instance){
    var monthAnchor = new Date(instance.monthAnchor);
    var selectedDate = normalizeSelectedDate(instance);
    var today = stripTime(new Date());
    var maxDate = getMaxDate(instance);
    var cursor = startOfMonthGrid(monthAnchor);

    instance.monthLabel.textContent = MONTH_FORMATTER.format(monthAnchor);
    instance.calendar.innerHTML = "";

    for(var index = 0; index < 42; index += 1){
      var day = addDays(cursor, index);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "record-date-day";

      if(day.getMonth() !== monthAnchor.getMonth()){
        button.classList.add("is-outside");
      }
      if(sameDay(day, today)){
        button.classList.add("is-today");
      }
      if(sameDay(day, selectedDate)){
        button.classList.add("is-selected");
      }
      if(day.getTime() > maxDate.getTime()){
        button.classList.add("is-disabled");
        button.disabled = true;
      }

      button.textContent = String(day.getDate());
      button.setAttribute("data-date", formatDateKey(day));
      button.setAttribute("aria-label", FULL_FORMATTER.format(day));
      instance.calendar.appendChild(button);
    }
  }

  function syncInstance(instance){
    var selected = normalizeSelectedDate(instance);
    instance.input.value = formatDateKey(selected);
    instance.valueEl.textContent = formatDateDisplay(selected);
    instance.monthAnchor = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
    if(instance.isOpen){
      renderCalendar(instance);
    }
  }

  function closeInstance(instance, restoreFocus){
    if(!instance || !instance.isOpen){
      return;
    }

    instance.isOpen = false;
    instance.trigger.setAttribute("aria-expanded", "false");
    instance.popover.hidden = true;

    if(restoreFocus){
      instance.trigger.focus();
    }
  }

  function closeAll(exceptRoot){
    instances.forEach(function(instance){
      if(exceptRoot && instance.root === exceptRoot){
        return;
      }
      closeInstance(instance, false);
    });
  }

  function openInstance(instance){
    closeAll(instance.root);
    instance.isOpen = true;
    instance.monthAnchor = new Date(normalizeSelectedDate(instance).getFullYear(), normalizeSelectedDate(instance).getMonth(), 1, 12);
    instance.trigger.setAttribute("aria-expanded", "true");
    instance.popover.hidden = false;
    renderCalendar(instance);
  }

  function selectDate(instance, date, dispatchEvents){
    var selected = stripTime(date);
    var maxDate = getMaxDate(instance);

    if(selected.getTime() > maxDate.getTime()){
      selected = maxDate;
    }

    instance.input.value = formatDateKey(selected);
    syncInstance(instance);
    closeInstance(instance, true);

    if(dispatchEvents !== false){
      dispatchDateChange(instance.input);
    }
  }

  function bindInstance(instance){
    instance.trigger.addEventListener("click", function(){
      if(instance.isOpen){
        closeInstance(instance, true);
        return;
      }
      openInstance(instance);
    });

    instance.prevBtn.addEventListener("click", function(){
      instance.monthAnchor = new Date(instance.monthAnchor.getFullYear(), instance.monthAnchor.getMonth() - 1, 1, 12);
      renderCalendar(instance);
    });

    instance.nextBtn.addEventListener("click", function(){
      instance.monthAnchor = new Date(instance.monthAnchor.getFullYear(), instance.monthAnchor.getMonth() + 1, 1, 12);
      renderCalendar(instance);
    });

    instance.todayBtn.addEventListener("click", function(){
      selectDate(instance, stripTime(new Date()), true);
    });

    instance.closeBtn.addEventListener("click", function(){
      closeInstance(instance, true);
    });

    instance.calendar.addEventListener("click", function(event){
      var button = event.target.closest("[data-date]");
      var selectedDate;
      if(!button){
        return;
      }

      selectedDate = parseDateKey(button.getAttribute("data-date"));
      if(selectedDate){
        selectDate(instance, selectedDate, true);
      }
    });
  }

  function createInstance(root){
    var instance;
    var labelId;

    if(root.__recordDatePicker){
      return root.__recordDatePicker;
    }

    instance = {
      root: root,
      input: root.querySelector('input[type="hidden"]'),
      trigger: root.querySelector(".record-date-trigger"),
      valueEl: root.querySelector(".record-date-value"),
      popover: root.querySelector(".record-date-popover"),
      monthLabel: root.querySelector(".record-date-month-label"),
      prevBtn: root.querySelector(".record-date-prev"),
      nextBtn: root.querySelector(".record-date-next"),
      calendar: root.querySelector(".record-date-calendar"),
      todayBtn: root.querySelector(".record-date-today"),
      closeBtn: root.querySelector(".record-date-close"),
      isOpen: false,
      monthAnchor: stripTime(new Date())
    };

    if(!instance.input || !instance.trigger || !instance.valueEl || !instance.popover || !instance.monthLabel || !instance.prevBtn || !instance.nextBtn || !instance.calendar || !instance.todayBtn || !instance.closeBtn){
      return null;
    }

    labelId = instance.monthLabel.id || ("record-date-label-" + (++uid));
    instance.monthLabel.id = labelId;
    instance.popover.setAttribute("aria-labelledby", labelId);
    root.__recordDatePicker = instance;

    if(!instance.input.value){
      instance.input.value = formatDateKey(getMaxDate(instance));
    }

    bindInstance(instance);
    syncInstance(instance);
    instances.push(instance);
    return instance;
  }

  function initAll(){
    var roots = document.querySelectorAll(ROOT_SELECTOR);
    Array.prototype.forEach.call(roots, function(root){
      createInstance(root);
    });
  }

  function sync(target){
    var instance = null;
    if(typeof target === "string"){
      instance = instances.find(function(item){
        return item.input && item.input.id === target;
      });
    } else if(target && target.nodeType === 1){
      instance = instances.find(function(item){
        return item.input === target || item.root === target;
      });
    }

    if(instance){
      syncInstance(instance);
    }
  }

  document.addEventListener("click", function(event){
    instances.forEach(function(instance){
      if(instance.isOpen && !instance.root.contains(event.target)){
        closeInstance(instance, false);
      }
    });
  });

  document.addEventListener("keydown", function(event){
    if(event.key !== "Escape"){
      return;
    }
    closeAll(false);
  });

  window.RecordDatePicker = {
    initAll: initAll,
    sync: sync
  };

  document.addEventListener("DOMContentLoaded", initAll);
})();
