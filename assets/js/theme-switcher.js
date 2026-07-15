/**
 * Day/Night Theme Switcher
 * Auto: light 6:00–18:00, dark 18:00–6:00
 * Manual toggle button in bottom-left corner overrides auto.
 */
(function () {
  'use strict';

  var LIGHT_START = 6;
  var LIGHT_END = 18;
  var STORAGE_KEY = 'theme-preference';

  function getAutoTheme() {
    var h = new Date().getHours();
    return (h >= LIGHT_START && h < LIGHT_END) ? 'light' : 'dark';
  }

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStoredTheme(t) {
    try { localStorage.setItem(STORAGE_KEY, t); } catch (e) {}
  }

  function applyTheme(t) {
    if (t === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }

  // ── Init ──
  var stored = getStoredTheme();
  var currentTheme;

  if (stored === 'light' || stored === 'dark') {
    currentTheme = stored;
  } else {
    currentTheme = getAutoTheme();
  }

  applyTheme(currentTheme);

  // ── Toggle button ──
  var btn = document.createElement('button');
  btn.id = 'theme-toggle';
  btn.setAttribute('aria-label', 'Toggle day/night mode');
  btn.innerHTML = currentTheme === 'light' ? '☀' : '☽';
  btn.style.cssText =
    'position:fixed;bottom:20px;left:20px;z-index:9998;' +
    'width:38px;height:38px;border-radius:50%;border:1px solid rgba(128,128,128,0.2);' +
    'background:rgba(128,128,128,0.08);color:rgba(128,128,128,0.7);' +
    'font-size:1.1em;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
    'transition:all 0.3s ease;outline:none;';

  btn.addEventListener('mouseenter', function () {
    btn.style.background = 'rgba(128,128,128,0.18)';
    btn.style.color = 'rgba(128,128,128,0.9)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.background = 'rgba(128,128,128,0.08)';
    btn.style.color = 'rgba(128,128,128,0.7)';
  });

  btn.addEventListener('click', function () {
    currentTheme = (currentTheme === 'light') ? 'dark' : 'light';
    setStoredTheme(currentTheme);
    applyTheme(currentTheme);
    btn.innerHTML = currentTheme === 'light' ? '☀' : '☽';
  });

  document.body.appendChild(btn);

  // ── Re-check auto theme on the hour (only if no manual override) ──
  function scheduleCheck() {
    var now = new Date();
    var minsToNextHour = 60 - now.getMinutes();
    var msToNextHour = minsToNextHour * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();

    setTimeout(function () {
      var s = getStoredTheme();
      // Only auto-switch if user hasn't manually set a preference
      if (!s || (s !== 'light' && s !== 'dark')) {
        var auto = getAutoTheme();
        if (auto !== currentTheme) {
          currentTheme = auto;
          applyTheme(auto);
          btn.innerHTML = auto === 'light' ? '☀' : '☽';
        }
      }
      scheduleCheck();
    }, msToNextHour + 1000);
  }

  scheduleCheck();
})();
