(function(){
  function ensureFavicon(){
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
      '<rect width="64" height="64" rx="16" fill="#050505"/>',
      '<path d="M17 49V29.5l4 4V49Z" fill="#fff"/>',
      '<path d="M47 49V33.5l4-4V49Z" fill="#fff"/>',
      '<path d="M17 18l15 15v7.3L17 25.3Z" fill="#fff"/>',
      '<path d="M47 18v7.3L32 40.3V33Z" fill="#fff"/>',
      '<path d="M24 27.5l8 8v7l-8-8Z" fill="#fff"/>',
      '<path d="M40 27.5v7l-8 8v-7Z" fill="#fff"/>',
      '<path d="M30.8 33h2.4v11.3h-2.4Z" fill="#fff"/>',
      '</svg>'
    ].join('');
    var href = 'data:image/svg+xml,' + encodeURIComponent(svg);
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
