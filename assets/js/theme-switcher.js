/**
 * Day/Night Theme Switcher
 * Auto: light 6:00–18:00, dark 18:00–6:00
 * Manual toggle in bottom-left corner overrides auto.
 */
(function () {
  'use strict';

  var LIGHT_START = 6;
  var LIGHT_END = 18;
  var STORAGE_KEY = 'theme-preference';
  var currentTheme = null;
  var btn = null;

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
    // Apply to both html and body for robust CSS matching
    if (t === 'light') {
      document.documentElement.classList.add('light-mode');
      if (document.body) document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      if (document.body) document.body.classList.remove('light-mode');
    }
  }

  function updateButton() {
    if (btn) btn.innerHTML = currentTheme === 'light' ? '☀' : '☽';
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') {
      currentTheme = stored;
    } else {
      currentTheme = getAutoTheme();
    }
    applyTheme(currentTheme);
  }

  function createButton() {
    if (document.getElementById('theme-toggle')) return;
    btn = document.createElement('button');
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
      updateButton();
    });
    document.body.appendChild(btn);
  }

  function scheduleCheck() {
    var now = new Date();
    var ms = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
    setTimeout(function () {
      var s = getStoredTheme();
      if (!s || (s !== 'light' && s !== 'dark')) {
        var auto = getAutoTheme();
        if (auto !== currentTheme) {
          currentTheme = auto;
          applyTheme(auto);
          updateButton();
        }
      }
      scheduleCheck();
    }, ms + 1000);
  }

  // ── Run ──
  if (document.body) {
    initTheme();
    createButton();
    scheduleCheck();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      createButton();
      scheduleCheck();
    });
  }
})();
