(function(){
  var STORAGE_KEY = 'site-theme';
  var OVERRIDE_KEY = 'site-theme-override';
  var scheduleTimer = null;

  function getScheduledTheme(now){
    var current = now instanceof Date ? now : new Date();
    var hours = current.getHours();
    return hours >= 6 && hours < 18 ? 'light' : 'dark';
  }

  function getNextBoundaryTime(now){
    var current = now instanceof Date ? new Date(now.getTime()) : new Date();
    var next = new Date(current.getTime());
    var hours = current.getHours();

    if (hours < 6) {
      next.setHours(6, 0, 0, 0);
      return next;
    }

    if (hours < 18) {
      next.setHours(18, 0, 0, 0);
      return next;
    }

    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
    return next;
  }

  function readOverride(){
    try {
      var raw = localStorage.getItem(OVERRIDE_KEY);
      if(!raw) return null;

      var parsed = JSON.parse(raw);
      var isThemeValid = parsed && (parsed.theme === 'light' || parsed.theme === 'dark');
      var isExpiryValid = parsed && typeof parsed.expiresAt === 'number';

      if(!isThemeValid || !isExpiryValid){
        localStorage.removeItem(OVERRIDE_KEY);
        return null;
      }

      if(parsed.expiresAt <= Date.now()){
        localStorage.removeItem(OVERRIDE_KEY);
        return null;
      }

      return parsed;
    } catch (error) {
      return null;
    }
  }

  function clearOverride(){
    try {
      localStorage.removeItem(OVERRIDE_KEY);
    } catch (error) {}
  }

  function getResolvedTheme(){
    var override = readOverride();
    return override ? override.theme : getScheduledTheme();
  }

  function getAppliedTheme(){
    var current = document.documentElement.getAttribute('data-theme');
    return current === 'light' || current === 'dark' ? current : null;
  }

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {}
    syncButtons(theme);
  }

  function setManualOverride(theme){
    var nextBoundary = getNextBoundaryTime();
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify({
        theme: theme,
        expiresAt: nextBoundary.getTime()
      }));
    } catch (error) {}
  }

  function syncThemeToClock(){
    var theme = getResolvedTheme();
    if(theme !== getAppliedTheme()){
      applyTheme(theme);
      return;
    }
    syncButtons(theme);
  }

  function scheduleThemeSync(){
    var nextBoundary = getNextBoundaryTime();
    var delay = Math.max(1000, nextBoundary.getTime() - Date.now() + 200);

    if(scheduleTimer){
      window.clearTimeout(scheduleTimer);
    }

    scheduleTimer = window.setTimeout(function(){
      clearOverride();
      syncThemeToClock();
      scheduleThemeSync();
    }, delay);
  }

  function syncButtons(theme){
    var targetLabel = theme === 'light' ? 'Night' : 'Day';
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle-btn'), function(button){
      var label = button.querySelector('.theme-toggle-label');
      if(label){
        label.textContent = targetLabel;
      }
      button.setAttribute('aria-label', 'Switch to ' + targetLabel.toLowerCase() + ' mode');
      button.setAttribute('title', 'Switch to ' + targetLabel.toLowerCase() + ' mode');
      button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    });
  }

  function buildButton(container){
    if(!container || container.querySelector('.theme-toggle-shell')) return;
    var shell = document.createElement('div');
    shell.className = 'theme-toggle-shell';
    shell.innerHTML = [
      '<button type="button" class="theme-toggle-btn">',
      '<span class="theme-toggle-dot" aria-hidden="true"></span>',
      '<span class="theme-toggle-label">Day</span>',
      '</button>'
    ].join('');
    container.appendChild(shell);
    var button = shell.querySelector('.theme-toggle-btn');
    button.addEventListener('click', function(){
      var nextTheme = getAppliedTheme() === 'light' ? 'dark' : 'light';
      setManualOverride(nextTheme);
      applyTheme(nextTheme);
    });
  }

  function init(){
    Array.prototype.forEach.call(document.querySelectorAll('#pb-navbar .container'), buildButton);
    syncThemeToClock();
    scheduleThemeSync();

    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState !== 'visible') return;
      syncThemeToClock();
      scheduleThemeSync();
    });
  }

  syncThemeToClock();

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
