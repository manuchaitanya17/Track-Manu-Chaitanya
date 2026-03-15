(function(){
  try {
    var theme = localStorage.getItem('site-theme');
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
