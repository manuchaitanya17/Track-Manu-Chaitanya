(function(){
  var STORAGE_KEY = "site-tasks-v1";
  var NOTIFIED_KEY = "site-task-notified-v1";
  var DAY_TYPE_KEY = "site-day-types-v1";
  var START_HOUR = 0;
  var END_HOUR = 24;
  var HOUR_HEIGHT = 76;
  var REMINDER_GRACE_MS = 10 * 60 * 1000;
  var CHECK_INTERVAL_MS = 30 * 1000;

  var CATEGORY_META = {
    work: { label: "Work", className: "tasks-task-work" },
    personal: { label: "Personal", className: "tasks-task-personal" },
    deep: { label: "Deep Focus", className: "tasks-task-deep" },
    health: { label: "Health", className: "tasks-task-health" },
    admin: { label: "Admin", className: "tasks-task-admin" }
  };

  var DAY_TYPE_META = {
    easy: {
      label: "Easy",
      message: "Today is an easy day. Move with calm confidence and build clean momentum."
    },
    normal: {
      label: "Normal",
      message: "Today is a normal day. Stay balanced, stay focused, and keep your rhythm."
    },
    tough: {
      label: "Tough",
      message: "Today is a tough day, you need to be consistent throughout!"
    }
  };

  var DAY_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  var FULL_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  var MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  var WEEK_RANGE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  var FORM_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  var TIME_FORMATTER = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

  var state = {
    tasks: [],
    dayTypes: {},
    anchorDate: stripTime(new Date()),
    selectedDate: stripTime(new Date()),
    editingTaskId: null,
    query: "",
    reminderTicker: null,
    timePicker: {
      isOpen: false,
      field: null,
      mode: "hour",
      hour: 9,
      minute: 0,
      period: "AM",
      returnFocus: null
    },
    datePicker: {
      isOpen: false,
      monthAnchor: stripTime(new Date()),
      returnFocus: null
    },
    timelineScrollInitialized: false
  };

  var refs = {};

  function stripTime(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function startOfWeek(date){
    var current = stripTime(date);
    var offset = (current.getDay() + 6) % 7;
    current.setDate(current.getDate() - offset);
    return current;
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

  function dateKey(date){
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function parseDateKey(value){
    var parts = String(value || "").split("-").map(Number);
    if(parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]){
      return null;
    }
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function formatDateInput(date){
    return dateKey(stripTime(date));
  }

  function formatDateDisplay(date){
    return FORM_DATE_FORMATTER.format(stripTime(date));
  }

  function startOfMonthGrid(date){
    var first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    first.setDate(first.getDate() - first.getDay());
    return first;
  }

  function roundToNextHalfHour(date){
    var next = new Date(date.getTime());
    next.setSeconds(0, 0);
    var minutes = next.getMinutes();
    var rounded = minutes < 30 ? 30 : 60;
    if(rounded === 60){
      next.setHours(next.getHours() + 1, 0, 0, 0);
    } else {
      next.setMinutes(30, 0, 0);
    }
    if(next.getHours() < START_HOUR){
      next.setHours(START_HOUR, 0, 0, 0);
    }
    if(next.getHours() >= END_HOUR){
      next.setHours(END_HOUR - 2, 0, 0, 0);
    }
    return next;
  }

  function formatTimeInput(date){
    var hours = padNumber(date.getHours());
    var minutes = padNumber(date.getMinutes());
    return hours + ":" + minutes;
  }

  function padNumber(value){
    return String(value).padStart(2, "0");
  }

  function parseTimeValue(timeString){
    var parts = String(timeString || "").split(":").map(Number);
    if(parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])){
      return null;
    }

    var hour24 = parts[0];
    var minute = parts[1];
    var period = hour24 >= 12 ? "PM" : "AM";
    var hour12 = hour24 % 12 || 12;

    return {
      hour24: hour24,
      hour12: hour12,
      minute: minute,
      period: period
    };
  }

  function buildTimeValue(hour12, minute, period){
    var hour24 = hour12 % 12;
    if(period === "PM"){
      hour24 += 12;
    }
    return padNumber(hour24) + ":" + padNumber(minute);
  }

  function formatTimeDisplay(timeString){
    var parsed = parseTimeValue(timeString);
    if(!parsed){
      return "--:--";
    }
    return padNumber(parsed.hour12) + ":" + padNumber(parsed.minute) + " " + parsed.period;
  }

  function combineDateTime(dateString, timeString){
    var date = parseDateKey(dateString);
    if(!date){
      return null;
    }

    var parts = String(timeString || "").split(":").map(Number);
    if(parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])){
      return null;
    }

    date.setHours(parts[0], parts[1], 0, 0);
    return date;
  }

  function minutesFromTime(timeString){
    var parts = String(timeString || "").split(":").map(Number);
    if(parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])){
      return null;
    }
    return parts[0] * 60 + parts[1];
  }

  function getTaskStart(task){
    if(task.allDay){
      return combineDateTime(task.date, "06:00");
    }
    return combineDateTime(task.date, task.startTime);
  }

  function getTaskEnd(task){
    if(task.allDay){
      return combineDateTime(task.date, "23:59");
    }
    return combineDateTime(task.date, task.endTime);
  }

  function getReminderDate(task){
    return task.reminder ? getTaskStart(task) : null;
  }

  function getTaskClass(task){
    return CATEGORY_META[task.category] ? CATEGORY_META[task.category].className : CATEGORY_META.work.className;
  }

  function getTaskCategoryLabel(task){
    return CATEGORY_META[task.category] ? CATEGORY_META[task.category].label : CATEGORY_META.work.label;
  }

  function loadTasks(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        return [];
      }

      var parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)){
        return [];
      }

      return parsed.filter(function(task){
        return task &&
          typeof task.id === "string" &&
          typeof task.title === "string" &&
          typeof task.date === "string";
      }).map(function(task){
        return {
          id: task.id,
          title: task.title,
          date: task.date,
          allDay: Boolean(task.allDay),
          startTime: task.startTime || "",
          endTime: task.endTime || "",
          category: CATEGORY_META[task.category] ? task.category : "work",
          reminder: task.reminder !== false,
          notes: task.notes || "",
          done: Boolean(task.done),
          createdAt: typeof task.createdAt === "number" ? task.createdAt : Date.now()
        };
      });
    } catch (error) {
      return [];
    }
  }

  function saveTasks(){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (error) {}
  }

  function readNotifiedMap(){
    try {
      var raw = localStorage.getItem(NOTIFIED_KEY);
      if(!raw){
        return {};
      }
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveNotifiedMap(map){
    try {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
    } catch (error) {}
  }

  function getVisibleTasks(){
    var query = state.query.trim().toLowerCase();
    if(!query){
      return state.tasks.slice();
    }

    return state.tasks.filter(function(task){
      return task.title.toLowerCase().indexOf(query) !== -1 ||
        task.notes.toLowerCase().indexOf(query) !== -1 ||
        getTaskCategoryLabel(task).toLowerCase().indexOf(query) !== -1;
    });
  }

  function sortTasks(tasks){
    return tasks.slice().sort(function(a, b){
      if(a.date !== b.date){
        return a.date < b.date ? -1 : 1;
      }
      if(Boolean(a.allDay) !== Boolean(b.allDay)){
        return a.allDay ? -1 : 1;
      }
      var aStart = a.allDay ? 0 : minutesFromTime(a.startTime);
      var bStart = b.allDay ? 0 : minutesFromTime(b.startTime);
      if(aStart !== bStart){
        return aStart - bStart;
      }
      return a.title.localeCompare(b.title);
    });
  }

  function getWeekDays(){
    var start = startOfWeek(state.anchorDate);
    var days = [];
    for(var i = 0; i < 7; i += 1){
      days.push(addDays(start, i));
    }
    return days;
  }

  function getWeekRangeLabel(days){
    var first = days[0];
    var last = days[days.length - 1];
    var sameYear = first.getFullYear() === last.getFullYear();
    var sameMonth = first.getMonth() === last.getMonth() && sameYear;
    if(sameMonth){
      return WEEK_RANGE_FORMATTER.format(first) + " - " + last.getDate() + " " + last.getFullYear();
    }
    if(sameYear){
      return WEEK_RANGE_FORMATTER.format(first) + " - " + WEEK_RANGE_FORMATTER.format(last) + " " + last.getFullYear();
    }
    return WEEK_RANGE_FORMATTER.format(first) + " " + first.getFullYear() + " - " + WEEK_RANGE_FORMATTER.format(last) + " " + last.getFullYear();
  }

  function getTasksForDate(date, tasks){
    var targetKey = dateKey(date);
    return sortTasks((tasks || getVisibleTasks()).filter(function(task){
      return task.date === targetKey;
    }));
  }

  function getTaskById(taskId){
    return state.tasks.find(function(task){
      return task.id === taskId;
    }) || null;
  }

  function getUpcomingTasks(tasks){
    var now = new Date();
    return sortTasks((tasks || getVisibleTasks()).filter(function(task){
      if(task.done){
        return false;
      }
      var reminderDate = getTaskStart(task);
      return reminderDate && reminderDate.getTime() >= now.getTime() - REMINDER_GRACE_MS;
    })).slice(0, 8);
  }

  function createId(){
    return "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadDayTypes(){
    try {
      var raw = localStorage.getItem(DAY_TYPE_KEY);
      if(!raw){
        return {};
      }
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveDayTypes(){
    try {
      localStorage.setItem(DAY_TYPE_KEY, JSON.stringify(state.dayTypes));
    } catch (error) {}
  }

  function getTodayDayTypeKey(){
    return dateKey(stripTime(new Date()));
  }

  function renderDayType(){
    var todayKey = getTodayDayTypeKey();
    var selectedType = state.dayTypes[todayKey] || "";
    var meta = DAY_TYPE_META[selectedType];

    refs.dayTypeDateLabel.textContent = FULL_DAY_FORMATTER.format(stripTime(new Date()));
    refs.dayTypeMessage.textContent = meta ? meta.message : "Select a category for today to define the tone of the day.";

    Array.prototype.forEach.call(refs.dayTypeOptions.querySelectorAll("[data-day-type]"), function(button){
      var type = button.getAttribute("data-day-type");
      button.classList.toggle("is-active", type === selectedType);
      button.classList.toggle("is-easy", type === "easy");
      button.classList.toggle("is-normal", type === "normal");
      button.classList.toggle("is-tough", type === "tough");
      button.setAttribute("aria-pressed", String(type === selectedType));
    });
  }

  function getTimeFieldMeta(field){
    if(field === "start"){
      return {
        input: refs.taskStartTime,
        trigger: refs.taskStartTimeTrigger,
        value: refs.taskStartTimeValue,
        label: "start time"
      };
    }

    if(field === "end"){
      return {
        input: refs.taskEndTime,
        trigger: refs.taskEndTimeTrigger,
        value: refs.taskEndTimeValue,
        label: "end time"
      };
    }

    return null;
  }

  function syncTimeFieldDisplay(field){
    var meta = getTimeFieldMeta(field);
    if(!meta){
      return;
    }
    meta.value.textContent = formatTimeDisplay(meta.input.value);
  }

  function syncTimeFieldDisplays(){
    syncTimeFieldDisplay("start");
    syncTimeFieldDisplay("end");
  }

  function syncDateFieldDisplay(){
    var selectedDate = parseDateKey(refs.taskDate.value);
    refs.taskDateValue.textContent = selectedDate ? formatDateDisplay(selectedDate) : "Select date";
  }

  function renderTaskFormMode(){
    var isEditing = Boolean(state.editingTaskId);
    refs.taskFormEditing.hidden = !isEditing;
    refs.taskSubmitBtn.textContent = isEditing ? "Update Task" : "Save Task";
    refs.taskResetBtn.textContent = isEditing ? "Cancel Edit" : "Reset";
  }

  function setDefaultFormValues(baseDate){
    var now = new Date();
    var targetDate = stripTime(baseDate || state.selectedDate || now);
    var today = stripTime(now);
    var start;
    var end;

    if(targetDate.getTime() === today.getTime()){
      start = roundToNextHalfHour(now);
      end = new Date(start.getTime() + 60 * 60 * 1000);
      if(stripTime(start).getTime() !== targetDate.getTime()){
        start = new Date(targetDate.getTime());
        start.setHours(23, 0, 0, 0);
        end = new Date(targetDate.getTime());
        end.setHours(23, 59, 0, 0);
      } else if(stripTime(end).getTime() !== targetDate.getTime()){
        end = new Date(targetDate.getTime());
        end.setHours(23, 59, 0, 0);
      }
    } else {
      start = new Date(targetDate.getTime());
      start.setHours(9, 0, 0, 0);
      end = new Date(targetDate.getTime());
      end.setHours(10, 0, 0, 0);
    }

    refs.taskDate.value = formatDateInput(targetDate);
    syncDateFieldDisplay();
    refs.taskCategory.value = "work";
    refs.taskAllDay.checked = false;
    refs.taskReminder.checked = true;
    refs.taskStartTime.value = formatTimeInput(start);
    refs.taskEndTime.value = formatTimeInput(end);
    refs.taskNotes.value = "";
    syncTimeFieldDisplays();
    updateTimeFields();
  }

  function clearEditingState(){
    state.editingTaskId = null;
    renderTaskFormMode();
  }

  function populateFormForTask(task){
    if(!task){
      return;
    }

    var targetDate = parseDateKey(task.date) || state.selectedDate || stripTime(new Date());
    setDefaultFormValues(targetDate);
    refs.taskTitle.value = task.title;
    refs.taskDate.value = task.date;
    refs.taskCategory.value = task.category;
    refs.taskAllDay.checked = Boolean(task.allDay);
    refs.taskReminder.checked = task.reminder !== false;
    refs.taskNotes.value = task.notes || "";

    if(!task.allDay){
      refs.taskStartTime.value = task.startTime;
      refs.taskEndTime.value = task.endTime;
    }

    syncDateFieldDisplay();
    syncTimeFieldDisplays();
    updateTimeFields();
  }

  function enterEditMode(taskId){
    var task = getTaskById(taskId);
    if(!task){
      return;
    }

    state.editingTaskId = taskId;
    renderTaskFormMode();
    populateFormForTask(task);
    refs.taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
    refs.taskTitle.focus();
    showToast("Edit mode", "Update the task details and save the changes.");
  }

  function updateTimeFields(){
    var isAllDay = refs.taskAllDay.checked;
    refs.taskTimeGrid.hidden = isAllDay;
    refs.taskStartTime.required = !isAllDay;
    refs.taskEndTime.required = !isAllDay;
    refs.taskStartTimeTrigger.disabled = isAllDay;
    refs.taskEndTimeTrigger.disabled = isAllDay;
    if(isAllDay && state.timePicker.isOpen){
      closeTimePicker(false);
    }
  }

  function renderDatePicker(){
    if(!state.datePicker.isOpen){
      return;
    }

    var monthAnchor = new Date(state.datePicker.monthAnchor);
    var selectedDate = parseDateKey(refs.taskDate.value) || stripTime(new Date());
    var today = stripTime(new Date());
    var cursor = startOfMonthGrid(monthAnchor);

    refs.taskDateLabel.textContent = MONTH_FORMATTER.format(monthAnchor);
    refs.taskDateCalendar.innerHTML = "";

    for(var index = 0; index < 42; index += 1){
      var day = addDays(cursor, index);
      var dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "tasks-date-day";
      if(day.getMonth() !== monthAnchor.getMonth()){
        dayButton.classList.add("is-outside");
      }
      if(sameDay(day, today)){
        dayButton.classList.add("is-today");
      }
      if(sameDay(day, selectedDate)){
        dayButton.classList.add("is-selected");
      }
      dayButton.textContent = String(day.getDate());
      dayButton.setAttribute("data-date", dateKey(day));
      dayButton.setAttribute("aria-label", FULL_DAY_FORMATTER.format(day));
      refs.taskDateCalendar.appendChild(dayButton);
    }
  }

  function openDatePicker(){
    if(state.timePicker.isOpen){
      closeTimePicker(false);
    }

    state.datePicker.isOpen = true;
    state.datePicker.monthAnchor = parseDateKey(refs.taskDate.value) || state.selectedDate || stripTime(new Date());
    state.datePicker.returnFocus = refs.taskDateTrigger;
    refs.taskDateTrigger.setAttribute("aria-expanded", "true");
    refs.taskDatePopover.hidden = false;
    renderDatePicker();
  }

  function closeDatePicker(restoreFocus){
    var returnFocus = state.datePicker.returnFocus;
    refs.taskDateTrigger.setAttribute("aria-expanded", "false");
    refs.taskDatePopover.hidden = true;
    state.datePicker.isOpen = false;
    state.datePicker.returnFocus = null;

    if(restoreFocus && returnFocus && typeof returnFocus.focus === "function"){
      returnFocus.focus();
    }
  }

  function selectDate(date){
    refs.taskDate.value = formatDateInput(date);
    syncDateFieldDisplay();
    state.datePicker.monthAnchor = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    closeDatePicker(true);
  }

  function getDialCoordinates(index, total, radius){
    var angle = (index / total) * Math.PI * 2 - (Math.PI / 2);
    return {
      left: 50 + (Math.cos(angle) * radius),
      top: 50 + (Math.sin(angle) * radius)
    };
  }

  function getTimePickerAngle(){
    if(state.timePicker.mode === "hour"){
      return ((state.timePicker.hour % 12) * 30) - 90;
    }
    return (state.timePicker.minute * 6) - 90;
  }

  function renderTimePickerDial(){
    refs.timePickerDialRing.innerHTML = "";

    if(state.timePicker.mode === "hour"){
      for(var hourIndex = 0; hourIndex < 12; hourIndex += 1){
        var hourValue = hourIndex === 0 ? 12 : hourIndex;
        var hourCoords = getDialCoordinates(hourIndex, 12, 38);
        var hourButton = document.createElement("button");
        hourButton.type = "button";
        hourButton.className = "tasks-time-dial-node tasks-time-dial-node--hour" + (hourValue === state.timePicker.hour ? " is-active" : "");
        hourButton.textContent = String(hourValue);
        hourButton.setAttribute("aria-label", "Select hour " + hourValue);
        hourButton.setAttribute("data-dial-value", String(hourValue));
        hourButton.style.left = hourCoords.left + "%";
        hourButton.style.top = hourCoords.top + "%";
        refs.timePickerDialRing.appendChild(hourButton);
      }
      return;
    }

    for(var minuteIndex = 0; minuteIndex < 60; minuteIndex += 1){
      var isMajorMinute = minuteIndex % 5 === 0;
      var isActiveMinute = minuteIndex === state.timePicker.minute;
      var minuteCoords = getDialCoordinates(minuteIndex, 60, 42);
      var minuteButton = document.createElement("button");
      minuteButton.type = "button";
      minuteButton.className = "tasks-time-dial-node tasks-time-dial-node--minute" +
        (isMajorMinute ? " is-major" : " is-minor") +
        (isActiveMinute ? " is-active" : "");
      minuteButton.textContent = (isMajorMinute || isActiveMinute) ? padNumber(minuteIndex) : "";
      minuteButton.setAttribute("aria-label", "Select minute " + padNumber(minuteIndex));
      minuteButton.setAttribute("data-dial-value", String(minuteIndex));
      minuteButton.style.left = minuteCoords.left + "%";
      minuteButton.style.top = minuteCoords.top + "%";
      refs.timePickerDialRing.appendChild(minuteButton);
    }
  }

  function renderTimePicker(){
    if(!state.timePicker.isOpen){
      return;
    }

    refs.timePickerTitle.textContent = "Set " + getTimeFieldMeta(state.timePicker.field).label;
    refs.timePickerHourButton.textContent = padNumber(state.timePicker.hour);
    refs.timePickerMinuteButton.textContent = padNumber(state.timePicker.minute);
    refs.timePickerHourButton.classList.toggle("is-active", state.timePicker.mode === "hour");
    refs.timePickerMinuteButton.classList.toggle("is-active", state.timePicker.mode === "minute");
    refs.timePickerAmButton.classList.toggle("is-active", state.timePicker.period === "AM");
    refs.timePickerPmButton.classList.toggle("is-active", state.timePicker.period === "PM");
    refs.timePickerAmButton.setAttribute("aria-pressed", String(state.timePicker.period === "AM"));
    refs.timePickerPmButton.setAttribute("aria-pressed", String(state.timePicker.period === "PM"));
    refs.timePickerHint.textContent = state.timePicker.mode === "hour" ?
      "Select the hour on the dial, then refine the minutes." :
      "Select the minutes on the dial or use the quick picks below.";
    refs.timePickerDialHand.style.setProperty("--tasks-dial-angle", getTimePickerAngle() + "deg");
    refs.timePickerDialHand.style.setProperty("--tasks-dial-length", state.timePicker.mode === "hour" ? "38%" : "42%");
    renderTimePickerDial();
  }

  function openTimePicker(field){
    var meta = getTimeFieldMeta(field);
    var parsed = parseTimeValue(meta.input.value || "09:00");

    if(state.datePicker.isOpen){
      closeDatePicker(false);
    }

    if(state.timePicker.isOpen){
      closeTimePicker(false);
    }

    state.timePicker.isOpen = true;
    state.timePicker.field = field;
    state.timePicker.mode = "hour";
    state.timePicker.hour = parsed.hour12;
    state.timePicker.minute = parsed.minute;
    state.timePicker.period = parsed.period;
    state.timePicker.returnFocus = meta.trigger;

    meta.trigger.setAttribute("aria-expanded", "true");
    refs.timePickerModal.hidden = false;
    document.body.classList.add("tasks-time-modal-open");
    renderTimePicker();
    refs.timePickerDialog.focus();
  }

  function closeTimePicker(restoreFocus){
    var meta = getTimeFieldMeta(state.timePicker.field);
    var returnFocus = state.timePicker.returnFocus;

    if(meta){
      meta.trigger.setAttribute("aria-expanded", "false");
    }

    refs.timePickerModal.hidden = true;
    document.body.classList.remove("tasks-time-modal-open");
    state.timePicker.isOpen = false;
    state.timePicker.field = null;
    state.timePicker.returnFocus = null;

    if(restoreFocus && returnFocus && typeof returnFocus.focus === "function"){
      returnFocus.focus();
    }
  }

  function applyTimePicker(){
    var meta = getTimeFieldMeta(state.timePicker.field);
    if(!meta){
      return;
    }

    meta.input.value = buildTimeValue(state.timePicker.hour, state.timePicker.minute, state.timePicker.period);
    syncTimeFieldDisplay(state.timePicker.field);
    closeTimePicker(true);
  }

  function handleDialSelection(event){
    var dialNode = event.target.closest("[data-dial-value]");
    if(!dialNode){
      return;
    }

    var selectedValue = Number(dialNode.getAttribute("data-dial-value"));
    if(isNaN(selectedValue)){
      return;
    }

    if(state.timePicker.mode === "hour"){
      state.timePicker.hour = selectedValue || 12;
      state.timePicker.mode = "minute";
      renderTimePicker();
      refs.timePickerMinuteButton.focus();
      return;
    }

    state.timePicker.minute = selectedValue;
    renderTimePicker();
  }

  function showToast(title, message){
    var toast = document.createElement("article");
    toast.className = "tasks-toast";
    toast.innerHTML = "<strong></strong><p></p>";
    toast.querySelector("strong").textContent = title;
    toast.querySelector("p").textContent = message;
    refs.toastStack.appendChild(toast);

    window.setTimeout(function(){
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
    }, 3800);

    window.setTimeout(function(){
      if(toast.parentNode){
        toast.parentNode.removeChild(toast);
      }
    }, 4300);
  }

  function getNotificationStatusText(permission){
    if(!("Notification" in window)){
      return "This browser does not support system notifications. Task reminders still appear as in-page alerts.";
    }

    if(permission === "granted"){
      return "Notifications are enabled. Timed tasks alert at their start time and all-day tasks alert at 6:00 AM.";
    }

    if(permission === "denied"){
      return "Notifications are blocked in this browser. You can still keep the page open for in-page reminder toasts.";
    }

    return "Notifications are available but not enabled yet. Allow them to get system-level task alerts.";
  }

  function syncNotificationUI(){
    var permission = "Notification" in window ? Notification.permission : "unsupported";
    refs.notificationStatus.textContent = getNotificationStatusText(permission);
    if(permission === "granted"){
      refs.notificationPermissionBtn.textContent = "Notifications Ready";
      refs.notificationPermissionBtn.disabled = true;
      return;
    }
    if(permission === "denied"){
      refs.notificationPermissionBtn.textContent = "Notifications Blocked";
      refs.notificationPermissionBtn.disabled = true;
      return;
    }
    refs.notificationPermissionBtn.textContent = "Allow Notifications";
    refs.notificationPermissionBtn.disabled = !("Notification" in window);
  }

  function requestNotificationPermission(){
    if(!("Notification" in window)){
      syncNotificationUI();
      return;
    }

    Notification.requestPermission().then(function(){
      syncNotificationUI();
    });
  }

  function sendReminder(task){
    var start = getTaskStart(task);
    var timeCopy = task.allDay ? "All-day task for " + FULL_DAY_FORMATTER.format(start) : TIME_FORMATTER.format(start) + " on " + FULL_DAY_FORMATTER.format(start);
    var message = task.title + " is starting now.";

    showToast(task.title, timeCopy);

    if("Notification" in window && Notification.permission === "granted"){
      var notification = new Notification(task.title, {
        body: message + " " + timeCopy,
        tag: task.id,
        renotify: false
      });

      notification.onclick = function(){
        window.focus();
      };
    }
  }

  function checkTaskReminders(){
    var now = Date.now();
    var notified = readNotifiedMap();
    var nextNotified = {};

    Object.keys(notified).forEach(function(key){
      if(now - notified[key] < 5 * 24 * 60 * 60 * 1000){
        nextNotified[key] = notified[key];
      }
    });

    state.tasks.forEach(function(task){
      if(task.done || !task.reminder){
        return;
      }

      var reminderDate = getReminderDate(task);
      if(!reminderDate){
        return;
      }

      var reminderKey = task.id + ":" + reminderDate.getTime();
      var delta = now - reminderDate.getTime();

      if(delta >= 0 && delta <= REMINDER_GRACE_MS && !nextNotified[reminderKey]){
        sendReminder(task);
        nextNotified[reminderKey] = now;
      }
    });

    saveNotifiedMap(nextNotified);
  }

  function updateSummary(){
    var tasks = state.tasks.slice();
    var todayTasks = getTasksForDate(stripTime(new Date()), tasks);
    var allDayCount = tasks.filter(function(task){
      return task.allDay && !task.done;
    }).length;
    var nextReminderTask = getUpcomingTasks(tasks)[0];

    refs.summaryTotalTasks.textContent = tasks.length;
    refs.summaryTodayTasks.textContent = todayTasks.filter(function(task){ return !task.done; }).length;
    refs.summaryAllDayTasks.textContent = allDayCount;

    if(nextReminderTask){
      var nextStart = getTaskStart(nextReminderTask);
      refs.summaryNextAlert.textContent = nextReminderTask.allDay ? "6:00 AM" : TIME_FORMATTER.format(nextStart);
      refs.summaryNextAlertCopy.textContent = nextReminderTask.title + " on " + FULL_DAY_FORMATTER.format(nextStart) + ".";
    } else {
      refs.summaryNextAlert.textContent = "None";
      refs.summaryNextAlertCopy.textContent = "Add a task with reminders to start the live alert loop.";
    }
  }

  function renderMiniMonth(){
    var monthStart = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1, 12);
    var offset = (monthStart.getDay() + 6) % 7;
    var gridStart = addDays(monthStart, -offset);
    var currentWeek = getWeekDays().map(dateKey);

    refs.miniMonthLabel.textContent = MONTH_FORMATTER.format(monthStart);
    refs.miniMonthGrid.innerHTML = "";

    for(var i = 0; i < 42; i += 1){
      var cellDate = addDays(gridStart, i);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tasks-mini-day";
      button.textContent = cellDate.getDate();
      button.setAttribute("data-date", dateKey(cellDate));

      if(cellDate.getMonth() !== monthStart.getMonth()){
        button.classList.add("is-outside");
      }
      if(sameDay(cellDate, stripTime(new Date()))){
        button.classList.add("is-today");
      }
      if(sameDay(cellDate, state.selectedDate)){
        button.classList.add("is-selected");
      }
      if(currentWeek.indexOf(dateKey(cellDate)) !== -1){
        button.classList.add("is-in-week");
      }

      refs.miniMonthGrid.appendChild(button);
    }
  }

  function renderWeekHeader(days){
    refs.tasksWeekdays.innerHTML = "";

    var spacer = document.createElement("div");
    spacer.className = "tasks-weekday-spacer";
    refs.tasksWeekdays.appendChild(spacer);

    days.forEach(function(day){
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tasks-day-head";
      button.setAttribute("data-date", dateKey(day));
      button.innerHTML = "<small></small><strong></strong><span></span>";
      button.querySelector("small").textContent = DAY_NAME_FORMATTER.format(day);
      button.querySelector("strong").textContent = String(day.getDate()).padStart(2, "0");
      button.querySelector("span").textContent = day.toLocaleDateString("en-US", { month: "short" });

      if(sameDay(day, state.selectedDate)){
        button.classList.add("is-selected");
      }
      if(sameDay(day, stripTime(new Date()))){
        button.classList.add("is-today");
      }

      refs.tasksWeekdays.appendChild(button);
    });
  }

  function renderAllDayRow(days, visibleTasks){
    refs.tasksAllDayGrid.innerHTML = "";

    days.forEach(function(day){
      var cell = document.createElement("div");
      cell.className = "tasks-all-day-cell";
      if(sameDay(day, state.selectedDate)){
        cell.classList.add("is-selected");
      }

      getTasksForDate(day, visibleTasks).filter(function(task){
        return task.allDay;
      }).forEach(function(task){
        var taskButton = document.createElement("button");
        taskButton.type = "button";
        taskButton.className = "tasks-all-day-task " + getTaskClass(task);
        if(task.done){
          taskButton.classList.add("is-done");
        }
        taskButton.setAttribute("data-task-id", task.id);
        taskButton.textContent = task.title;
        taskButton.title = task.notes || task.title;
        cell.appendChild(taskButton);
      });

      if(!cell.children.length){
        cell.innerHTML = "";
      }

      refs.tasksAllDayGrid.appendChild(cell);
    });
  }

  function renderTimeAxis(){
    refs.tasksTimeAxis.innerHTML = "";

    for(var hour = START_HOUR; hour < END_HOUR; hour += 1){
      var label = document.createElement("div");
      var date = new Date(2026, 0, 1, hour, 0, 0, 0);
      label.className = "tasks-axis-label";
      label.textContent = date.toLocaleTimeString("en-US", { hour: "numeric" });
      refs.tasksTimeAxis.appendChild(label);
    }
  }

  function buildOverlapLayout(tasks){
    if(!tasks.length){
      return [];
    }

    var sorted = tasks.slice().sort(function(a, b){
      if(a.startMinutes !== b.startMinutes){
        return a.startMinutes - b.startMinutes;
      }
      return a.endMinutes - b.endMinutes;
    });
    var groups = [];
    var group = [];
    var currentEnd = -1;

    sorted.forEach(function(task){
      if(!group.length || task.startMinutes < currentEnd){
        group.push(task);
        currentEnd = Math.max(currentEnd, task.endMinutes);
        return;
      }
      groups.push(group);
      group = [task];
      currentEnd = task.endMinutes;
    });

    if(group.length){
      groups.push(group);
    }

    groups.forEach(function(cluster){
      var active = [];
      var maxColumns = 1;

      cluster.forEach(function(task){
        active = active.filter(function(activeTask){
          return activeTask.endMinutes > task.startMinutes;
        });

        var used = active.map(function(activeTask){
          return activeTask.column;
        });
        var column = 0;
        while(used.indexOf(column) !== -1){
          column += 1;
        }
        task.column = column;
        active.push(task);
        maxColumns = Math.max(maxColumns, active.length, column + 1);
      });

      cluster.forEach(function(task){
        task.columns = maxColumns;
      });
    });

    return sorted;
  }

  function renderTimeline(days, visibleTasks){
    var gridWidth = refs.tasksGridArea.clientWidth || 1;
    var dayWidth = gridWidth / 7;
    var innerGap = 8;
    var totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

    refs.tasksGridArea.style.height = totalHeight + "px";
    refs.tasksGridColumns.innerHTML = "";
    refs.tasksGridEvents.innerHTML = "";

    days.forEach(function(day){
      var column = document.createElement("div");
      column.className = "tasks-grid-column";
      if(sameDay(day, state.selectedDate)){
        column.classList.add("is-selected");
      }
      if(sameDay(day, stripTime(new Date()))){
        column.classList.add("is-today");
      }
      refs.tasksGridColumns.appendChild(column);
    });

    days.forEach(function(day, dayIndex){
      var timedTasks = getTasksForDate(day, visibleTasks).filter(function(task){
        return !task.allDay;
      }).map(function(task){
        return {
          task: task,
          startMinutes: minutesFromTime(task.startTime),
          endMinutes: minutesFromTime(task.endTime)
        };
      }).filter(function(item){
        return item.startMinutes !== null && item.endMinutes !== null && item.endMinutes > item.startMinutes;
      });

      buildOverlapLayout(timedTasks).forEach(function(item){
        var startOffset = Math.max(item.startMinutes, START_HOUR * 60) - START_HOUR * 60;
        var endOffset = Math.min(item.endMinutes, END_HOUR * 60) - START_HOUR * 60;
        var top = (startOffset / 60) * HOUR_HEIGHT;
        var height = Math.max(((endOffset - startOffset) / 60) * HOUR_HEIGHT, 20);
        var usableDayWidth = dayWidth - 8;
        var columnWidth = (usableDayWidth - innerGap * (item.columns - 1)) / item.columns;
        var left = dayIndex * dayWidth + item.column * (columnWidth + innerGap) + 4;
        var event = document.createElement("button");
        event.type = "button";
        event.className = "tasks-timed-task " + getTaskClass(item.task);
        if(item.task.done){
          event.classList.add("is-done");
        }
        event.setAttribute("data-task-id", item.task.id);
        event.style.left = left + "px";
        event.style.width = Math.max(columnWidth, 34) + "px";
        event.style.top = top + "px";
        event.style.height = height + "px";
        if(height < 54){
          event.classList.add("is-compact");
        }
        if(height < 42){
          event.classList.add("is-tight");
        }
        if(height < 28){
          event.classList.add("is-micro");
        }
        event.innerHTML = "<small></small><strong></strong><span></span>";
        event.querySelector("small").textContent = getTaskCategoryLabel(item.task);
        event.querySelector("strong").textContent = item.task.title;
        event.querySelector("span").textContent = TIME_FORMATTER.format(getTaskStart(item.task)) + " - " + TIME_FORMATTER.format(getTaskEnd(item.task));
        event.title = item.task.title + " — " + TIME_FORMATTER.format(getTaskStart(item.task)) + " - " + TIME_FORMATTER.format(getTaskEnd(item.task));
        refs.tasksGridEvents.appendChild(event);
      });
    });

    renderNowLine(days);
  }

  function getRecommendedTimelineScrollTop(){
    var today = new Date();
    var todayInWeek = getWeekDays().some(function(day){
      return sameDay(day, stripTime(today));
    });
    var anchorHour = todayInWeek ? Math.max(today.getHours() - 1, 0) : 6;
    return Math.max((anchorHour - START_HOUR) * HOUR_HEIGHT, 0);
  }

  function autoScrollTimeline(force){
    if(!refs.tasksTimelineScroll){
      return;
    }
    if(!force && state.timelineScrollInitialized){
      return;
    }
    refs.tasksTimelineScroll.scrollTop = getRecommendedTimelineScrollTop();
    state.timelineScrollInitialized = true;
  }

  function renderNowLine(days){
    var today = new Date();
    var nowMinutes = today.getHours() * 60 + today.getMinutes();
    var dayIndex = days.findIndex(function(day){
      return sameDay(day, stripTime(today));
    });

    if(dayIndex === -1 || nowMinutes < START_HOUR * 60 || nowMinutes > END_HOUR * 60){
      refs.tasksNowLine.hidden = true;
      return;
    }

    refs.tasksNowLine.hidden = false;
    refs.tasksNowLine.style.top = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT + "px";
  }

  function createTaskListItem(task, options){
    options = options || {};
    var item = document.createElement("article");
    var start = getTaskStart(task);
    var timeMeta = task.allDay ? "All day" : TIME_FORMATTER.format(start) + " - " + TIME_FORMATTER.format(getTaskEnd(task));
    item.className = "tasks-list-item " + getTaskClass(task);
    if(task.done){
      item.classList.add("is-done");
    }

    item.innerHTML = [
      '<button type="button" class="tasks-list-check" data-action="toggle"></button>',
      '<div class="tasks-list-copy">',
      '<strong></strong>',
      '<div class="tasks-list-meta"></div>',
      '<p></p>',
      '</div>',
      '<div class="tasks-list-actions">',
      options.allowEdit ? '<button type="button" class="tasks-edit-btn" data-action="edit" aria-label="Edit task"><span class="icon-edit2"></span></button>' : '',
      '<button type="button" class="tasks-delete-btn" data-action="delete" aria-label="Delete task"><span class="icon-bin"></span></button>',
      '</div>'
    ].join("");

    item.setAttribute("data-task-id", task.id);
    item.querySelector("strong").textContent = task.title;
    if(task.notes){
      item.querySelector("p").textContent = task.notes;
    } else {
      item.querySelector("p").remove();
    }

    var check = item.querySelector(".tasks-list-check");
    check.innerHTML = task.done ? '<span class="icon-checkbox-checked"></span>' : '<span class="icon-checkbox-unchecked"></span>';
    if(task.done){
      check.classList.add("is-active");
    }

    var meta = item.querySelector(".tasks-list-meta");
    meta.appendChild(createPill(timeMeta, task));
    meta.appendChild(createPill(getTaskCategoryLabel(task), task));
    if(options.showDate !== false){
      meta.appendChild(createPill(FULL_DAY_FORMATTER.format(parseDateKey(task.date)), task));
    }

    return item;
  }

  function createPill(text, task){
    var pill = document.createElement("span");
    pill.className = "tasks-list-pill " + getTaskClass(task);
    pill.textContent = text;
    return pill;
  }

  function renderLists(visibleTasks){
    var selectedTasks = getTasksForDate(state.selectedDate, visibleTasks);
    var upcomingTasks = getUpcomingTasks(visibleTasks);

    refs.selectedDayTitle.textContent = FULL_DAY_FORMATTER.format(state.selectedDate);
    refs.selectedDayList.innerHTML = "";
    refs.upcomingTaskList.innerHTML = "";

    if(!selectedTasks.length){
      refs.selectedDayList.innerHTML = '<div class="tasks-empty">No tasks are scheduled for the selected day yet. Use the form to add a timed block or an all-day task.</div>';
    } else {
      selectedTasks.forEach(function(task){
        refs.selectedDayList.appendChild(createTaskListItem(task, { showDate: false, allowEdit: true }));
      });
    }

    if(!upcomingTasks.length){
      refs.upcomingTaskList.innerHTML = '<div class="tasks-empty">No upcoming reminders are queued. Add a task with reminders enabled to populate this queue.</div>';
    } else {
      upcomingTasks.forEach(function(task){
        refs.upcomingTaskList.appendChild(createTaskListItem(task));
      });
    }
  }

  function renderPlanner(){
    var days = getWeekDays();
    var visibleTasks = getVisibleTasks();
    refs.weekRangeLabel.textContent = getWeekRangeLabel(days);
    renderWeekHeader(days);
    renderAllDayRow(days, visibleTasks);
    renderTimeAxis();
    renderTimeline(days, visibleTasks);
    renderMiniMonth();
    renderLists(visibleTasks);
    updateSummary();
    syncNotificationUI();
  }

  function scrollPlannerIntoView(){
    document.getElementById("section-planner").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCreateTask(event){
    event.preventDefault();

    var title = refs.taskTitle.value.trim();
    var date = refs.taskDate.value;
    var allDay = refs.taskAllDay.checked;
    var startTime = refs.taskStartTime.value;
    var endTime = refs.taskEndTime.value;

    if(!title || !date){
      showToast("Task not saved", "A task title and date are required.");
      return;
    }

    if(!allDay){
      if(!startTime || !endTime){
        showToast("Task not saved", "Timed tasks need both a start time and an end time.");
        return;
      }
      if(minutesFromTime(endTime) <= minutesFromTime(startTime)){
        showToast("Task not saved", "The end time must be later than the start time.");
        return;
      }
    }

    var existingTask = state.editingTaskId ? getTaskById(state.editingTaskId) : null;
    var isEditing = Boolean(existingTask);
    var task = {
      id: existingTask ? existingTask.id : createId(),
      title: title,
      date: date,
      allDay: allDay,
      startTime: allDay ? "" : startTime,
      endTime: allDay ? "" : endTime,
      category: refs.taskCategory.value,
      reminder: refs.taskReminder.checked,
      notes: refs.taskNotes.value.trim(),
      done: existingTask ? existingTask.done : false,
      createdAt: existingTask ? existingTask.createdAt : Date.now()
    };

    if(existingTask){
      state.tasks = state.tasks.map(function(entry){
        return entry.id === existingTask.id ? task : entry;
      });
    } else {
      state.tasks.push(task);
    }
    saveTasks();
    state.anchorDate = parseDateKey(task.date);
    state.selectedDate = parseDateKey(task.date);
    clearEditingState();
    refs.taskForm.reset();
    setDefaultFormValues(state.selectedDate);
    renderPlanner();
    checkTaskReminders();
    showToast(isEditing ? "Task updated" : "Task saved", isEditing ? task.title + " has been updated." : task.title + " has been added to the planner.");
    scrollPlannerIntoView();
  }

  function updateTask(taskId, updater){
    state.tasks = state.tasks.map(function(task){
      return task.id === taskId ? updater(task) : task;
    });
    saveTasks();
    renderPlanner();
  }

  function deleteTask(taskId){
    state.tasks = state.tasks.filter(function(task){
      return task.id !== taskId;
    });
    if(state.editingTaskId === taskId){
      clearEditingState();
      refs.taskForm.reset();
      setDefaultFormValues(state.selectedDate);
    }
    saveTasks();
    renderPlanner();
    showToast("Task deleted", "The task has been removed from the planner.");
  }

  function handleListAction(event){
    var actionButton = event.target.closest("[data-action]");
    if(!actionButton){
      return;
    }

    var item = event.target.closest("[data-task-id]");
    if(!item){
      return;
    }

    var taskId = item.getAttribute("data-task-id");
    var action = actionButton.getAttribute("data-action");

    if(action === "toggle"){
      updateTask(taskId, function(task){
        return Object.assign({}, task, { done: !task.done });
      });
      return;
    }

    if(action === "edit"){
      enterEditMode(taskId);
      return;
    }

    if(action === "delete"){
      deleteTask(taskId);
    }
  }

  function handleWeekdaySelection(event){
    var button = event.target.closest("[data-date]");
    if(!button){
      return;
    }

    var nextDate = parseDateKey(button.getAttribute("data-date"));
    if(!nextDate){
      return;
    }

    state.selectedDate = nextDate;
    state.anchorDate = nextDate;
    renderPlanner();
  }

  function handleTaskSelect(event){
    var taskButton = event.target.closest("[data-task-id]");
    if(!taskButton){
      return;
    }

    var task = state.tasks.find(function(entry){
      return entry.id === taskButton.getAttribute("data-task-id");
    });
    if(!task){
      return;
    }

    state.selectedDate = parseDateKey(task.date);
    state.anchorDate = parseDateKey(task.date);
    renderPlanner();
  }

  function attachEvents(){
    refs.taskForm.addEventListener("submit", handleCreateTask);
    refs.taskForm.addEventListener("reset", function(){
      window.setTimeout(function(){
        clearEditingState();
        setDefaultFormValues(state.selectedDate);
      }, 0);
    });

    refs.taskDateTrigger.addEventListener("click", function(){
      if(state.datePicker.isOpen){
        closeDatePicker(true);
        return;
      }
      openDatePicker();
    });
    refs.dayTypeOptions.addEventListener("click", function(event){
      var button = event.target.closest("[data-day-type]");
      var selectedType;
      if(!button){
        return;
      }

      selectedType = button.getAttribute("data-day-type");
      if(!DAY_TYPE_META[selectedType]){
        return;
      }

      state.dayTypes[getTodayDayTypeKey()] = selectedType;
      saveDayTypes();
      renderDayType();
      showToast("Day category saved", DAY_TYPE_META[selectedType].message);
    });
    refs.taskAllDay.addEventListener("change", updateTimeFields);
    refs.taskStartTimeTrigger.addEventListener("click", function(){
      openTimePicker("start");
    });
    refs.taskEndTimeTrigger.addEventListener("click", function(){
      openTimePicker("end");
    });
    refs.taskSearch.addEventListener("input", function(event){
      state.query = event.target.value.trim().toLowerCase();
      renderPlanner();
    });

    refs.prevWeekBtn.addEventListener("click", function(){
      state.anchorDate = addDays(state.anchorDate, -7);
      state.selectedDate = state.anchorDate;
      renderPlanner();
    });

    refs.nextWeekBtn.addEventListener("click", function(){
      state.anchorDate = addDays(state.anchorDate, 7);
      state.selectedDate = state.anchorDate;
      renderPlanner();
    });

    refs.todayWeekBtn.addEventListener("click", function(){
      state.anchorDate = stripTime(new Date());
      state.selectedDate = stripTime(new Date());
      renderPlanner();
      autoScrollTimeline(true);
    });

    refs.notificationPermissionBtn.addEventListener("click", requestNotificationPermission);
    refs.taskDatePrev.addEventListener("click", function(){
      state.datePicker.monthAnchor = new Date(state.datePicker.monthAnchor.getFullYear(), state.datePicker.monthAnchor.getMonth() - 1, 1, 12);
      renderDatePicker();
    });
    refs.taskDateNext.addEventListener("click", function(){
      state.datePicker.monthAnchor = new Date(state.datePicker.monthAnchor.getFullYear(), state.datePicker.monthAnchor.getMonth() + 1, 1, 12);
      renderDatePicker();
    });
    refs.taskDateToday.addEventListener("click", function(){
      selectDate(stripTime(new Date()));
    });
    refs.taskDateClose.addEventListener("click", function(){
      closeDatePicker(true);
    });
    refs.taskDateCalendar.addEventListener("click", function(event){
      var dayButton = event.target.closest("[data-date]");
      if(!dayButton){
        return;
      }
      var selectedDate = parseDateKey(dayButton.getAttribute("data-date"));
      if(selectedDate){
        selectDate(selectedDate);
      }
    });
    refs.timePickerHourButton.addEventListener("click", function(){
      state.timePicker.mode = "hour";
      renderTimePicker();
    });
    refs.timePickerMinuteButton.addEventListener("click", function(){
      state.timePicker.mode = "minute";
      renderTimePicker();
    });
    refs.timePickerAmButton.addEventListener("click", function(){
      state.timePicker.period = "AM";
      renderTimePicker();
    });
    refs.timePickerPmButton.addEventListener("click", function(){
      state.timePicker.period = "PM";
      renderTimePicker();
    });
    refs.timePickerClose.addEventListener("click", function(){
      closeTimePicker(true);
    });
    refs.timePickerCancel.addEventListener("click", function(){
      closeTimePicker(true);
    });
    refs.timePickerApply.addEventListener("click", applyTimePicker);
    refs.timePickerDialRing.addEventListener("click", handleDialSelection);
    refs.timePickerModal.addEventListener("click", function(event){
      var quickMinute = event.target.closest("[data-quick-minute]");
      if(quickMinute){
        state.timePicker.mode = "minute";
        state.timePicker.minute = Number(quickMinute.getAttribute("data-quick-minute"));
        renderTimePicker();
        return;
      }

      if(event.target === refs.timePickerModal){
        closeTimePicker(true);
      }
    });
    refs.miniMonthGrid.addEventListener("click", handleWeekdaySelection);
    refs.tasksWeekdays.addEventListener("click", handleWeekdaySelection);
    refs.tasksAllDayGrid.addEventListener("click", handleTaskSelect);
    refs.tasksGridEvents.addEventListener("click", handleTaskSelect);
    refs.selectedDayList.addEventListener("click", handleListAction);
    refs.upcomingTaskList.addEventListener("click", handleListAction);

    window.addEventListener("resize", function(){
      renderPlanner();
      renderDatePicker();
    });
    document.addEventListener("click", function(event){
      if(state.datePicker.isOpen && !refs.taskDateField.contains(event.target)){
        closeDatePicker(false);
      }
    });
    document.addEventListener("visibilitychange", function(){
      if(document.visibilityState === "visible"){
        renderPlanner();
        checkTaskReminders();
      }
    });
    document.addEventListener("keydown", function(event){
      if(event.key === "Escape"){
        if(state.timePicker.isOpen){
          event.preventDefault();
          closeTimePicker(true);
        } else if(state.datePicker.isOpen){
          event.preventDefault();
          closeDatePicker(true);
        }
      }
    });
  }

  function cacheRefs(){
    refs.taskForm = document.getElementById("taskForm");
    refs.taskFormEditing = document.getElementById("taskFormEditing");
    refs.taskSubmitBtn = document.getElementById("taskSubmitBtn");
    refs.taskResetBtn = document.getElementById("taskResetBtn");
    refs.dayTypeDateLabel = document.getElementById("dayTypeDateLabel");
    refs.dayTypeOptions = document.getElementById("dayTypeOptions");
    refs.dayTypeMessage = document.getElementById("dayTypeMessage");
    refs.taskTitle = document.getElementById("taskTitle");
    refs.taskDateField = document.getElementById("taskDateField");
    refs.taskDate = document.getElementById("taskDate");
    refs.taskDateTrigger = document.getElementById("taskDateTrigger");
    refs.taskDateValue = document.getElementById("taskDateValue");
    refs.taskDatePopover = document.getElementById("taskDatePopover");
    refs.taskDateLabel = document.getElementById("taskDateLabel");
    refs.taskDatePrev = document.getElementById("taskDatePrev");
    refs.taskDateNext = document.getElementById("taskDateNext");
    refs.taskDateCalendar = document.getElementById("taskDateCalendar");
    refs.taskDateToday = document.getElementById("taskDateToday");
    refs.taskDateClose = document.getElementById("taskDateClose");
    refs.taskCategory = document.getElementById("taskCategory");
    refs.taskAllDay = document.getElementById("taskAllDay");
    refs.taskStartTime = document.getElementById("taskStartTime");
    refs.taskEndTime = document.getElementById("taskEndTime");
    refs.taskStartTimeTrigger = document.getElementById("taskStartTimeTrigger");
    refs.taskEndTimeTrigger = document.getElementById("taskEndTimeTrigger");
    refs.taskStartTimeValue = document.getElementById("taskStartTimeValue");
    refs.taskEndTimeValue = document.getElementById("taskEndTimeValue");
    refs.taskReminder = document.getElementById("taskReminder");
    refs.taskNotes = document.getElementById("taskNotes");
    refs.taskTimeGrid = document.getElementById("taskTimeGrid");
    refs.taskSearch = document.getElementById("taskSearch");
    refs.prevWeekBtn = document.getElementById("prevWeekBtn");
    refs.nextWeekBtn = document.getElementById("nextWeekBtn");
    refs.todayWeekBtn = document.getElementById("todayWeekBtn");
    refs.weekRangeLabel = document.getElementById("weekRangeLabel");
    refs.tasksWeekdays = document.getElementById("tasksWeekdays");
    refs.tasksAllDayGrid = document.getElementById("tasksAllDayGrid");
    refs.tasksTimelineScroll = document.getElementById("tasksTimelineScroll");
    refs.tasksTimeAxis = document.getElementById("tasksTimeAxis");
    refs.tasksGridArea = document.getElementById("tasksGridArea");
    refs.tasksGridColumns = document.getElementById("tasksGridColumns");
    refs.tasksGridEvents = document.getElementById("tasksGridEvents");
    refs.tasksNowLine = document.getElementById("tasksNowLine");
    refs.selectedDayTitle = document.getElementById("selectedDayTitle");
    refs.selectedDayList = document.getElementById("selectedDayList");
    refs.upcomingTaskList = document.getElementById("upcomingTaskList");
    refs.notificationPermissionBtn = document.getElementById("notificationPermissionBtn");
    refs.notificationStatus = document.getElementById("notificationStatus");
    refs.timePickerModal = document.getElementById("timePickerModal");
    refs.timePickerDialog = refs.timePickerModal.querySelector(".tasks-time-dialog");
    refs.timePickerTitle = document.getElementById("timePickerTitle");
    refs.timePickerClose = document.getElementById("timePickerClose");
    refs.timePickerHourButton = document.getElementById("timePickerHourButton");
    refs.timePickerMinuteButton = document.getElementById("timePickerMinuteButton");
    refs.timePickerAmButton = document.getElementById("timePickerAmButton");
    refs.timePickerPmButton = document.getElementById("timePickerPmButton");
    refs.timePickerHint = document.getElementById("timePickerHint");
    refs.timePickerDialRing = document.getElementById("timePickerDialRing");
    refs.timePickerDialHand = document.getElementById("timePickerDialHand");
    refs.timePickerCancel = document.getElementById("timePickerCancel");
    refs.timePickerApply = document.getElementById("timePickerApply");
    refs.toastStack = document.getElementById("tasksToastStack");
    refs.miniMonthLabel = document.getElementById("miniMonthLabel");
    refs.miniMonthGrid = document.getElementById("miniMonthGrid");
    refs.summaryTotalTasks = document.getElementById("summaryTotalTasks");
    refs.summaryTodayTasks = document.getElementById("summaryTodayTasks");
    refs.summaryAllDayTasks = document.getElementById("summaryAllDayTasks");
    refs.summaryNextAlert = document.getElementById("summaryNextAlert");
    refs.summaryNextAlertCopy = document.getElementById("summaryNextAlertCopy");
  }

  function init(){
    cacheRefs();
    state.tasks = loadTasks();
    state.dayTypes = loadDayTypes();
    state.anchorDate = stripTime(new Date());
    state.selectedDate = stripTime(new Date());
    renderTaskFormMode();
    setDefaultFormValues(state.selectedDate);
    attachEvents();
    renderDayType();
    renderPlanner();
    window.requestAnimationFrame(function(){
      autoScrollTimeline(true);
    });
    checkTaskReminders();
    state.reminderTicker = window.setInterval(checkTaskReminders, CHECK_INTERVAL_MS);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
