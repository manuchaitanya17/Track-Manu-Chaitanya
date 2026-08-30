(function(){
  function ensureFavicon(){
    var href = 'images/manu-mark.svg?v=2';
    var icon = document.querySelector('link[rel="icon"]') || document.createElement('link');
    icon.setAttribute('rel', 'icon');
    icon.setAttribute('type', 'image/svg+xml');
    icon.setAttribute('href', href);
    if(!icon.parentNode){
      document.head.appendChild(icon);
    }

    var shortcut = document.querySelector('link[rel="shortcut icon"]') || document.createElement('link');
    shortcut.setAttribute('rel', 'shortcut icon');
    shortcut.setAttribute('type', 'image/svg+xml');
    shortcut.setAttribute('href', href);
    if(!shortcut.parentNode){
      document.head.appendChild(shortcut);
    }
  }

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
    ensureFavicon();
    var override = readOverride();
    var theme = override ? override.theme : getScheduledTheme();
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('site-theme', theme);
  } catch (error) {
    ensureFavicon();
    document.documentElement.setAttribute('data-theme', getScheduledTheme());
  }
})();
