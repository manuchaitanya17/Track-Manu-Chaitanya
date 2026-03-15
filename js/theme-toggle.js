(function(){
  var STORAGE_KEY = 'site-theme';

  function getTheme(){
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch (error) {
      return 'dark';
    }
  }

  function setTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {}
    syncButtons(theme);
  }

  function nextTheme(){
    return getTheme() === 'light' ? 'dark' : 'light';
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
      setTheme(nextTheme());
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    Array.prototype.forEach.call(document.querySelectorAll('#pb-navbar .container'), buildButton);
    syncButtons(getTheme());
  });
})();
