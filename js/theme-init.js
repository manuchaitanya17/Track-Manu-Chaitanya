(function(){
  function getScheduledTheme(now){
    var current = now instanceof Date ? now : new Date();
    var hours = current.getHours();
    return hours >= 6 && hours < 18 ? 'light' : 'dark';
  }

  function readOverride(){
    var raw = localStorage.getItem('site-theme-override');
    if(!raw) return null;

    var parsed = JSON.parse(raw);
    var isThemeValid = parsed && (parsed.theme === 'light' || parsed.theme === 'dark');
    var isExpiryValid = parsed && typeof parsed.expiresAt === 'number';

    if(!isThemeValid || !isExpiryValid){
      localStorage.removeItem('site-theme-override');
      return null;
    }

    if(parsed.expiresAt <= Date.now()){
      localStorage.removeItem('site-theme-override');
      return null;
    }

    return parsed;
  }

  try {
    var override = readOverride();
    var theme = override ? override.theme : getScheduledTheme();
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('site-theme', theme);
  } catch (error) {
    document.documentElement.setAttribute('data-theme', getScheduledTheme());
  }
})();
