/**
 * Abstract modal — precise binding via data-abstract-key, no keyword matching.
 * Trigger: <button type="button" data-abstract-key="…" aria-haspopup="dialog">
 * Panel: role="dialog" aria-modal="true", focus trap, Esc, focus restored.
 */
(function () {
  'use strict';

  function init() {
    var dataEl = document.getElementById('abstract-data');
    if (!dataEl) return;
    var abstracts;
    try { abstracts = JSON.parse(dataEl.textContent); } catch (e) { return; }

    var triggers = document.querySelectorAll('.abstract-trigger[data-abstract-key]');
    if (!triggers.length) return;

    var overlay = null;
    var lastTrigger = null;
    var focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      return node;
    }

    function build(data) {
      var modal = el('div', 'abstract-modal');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'abstract-modal-title');
      modal.addEventListener('mousedown', function (e) { e.stopPropagation(); });

      var closeBtn = el('button', 'abstract-modal__close', '\u00D7');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', close);
      modal.appendChild(closeBtn);

      var title = el('div', 'abstract-modal__title', data.title || 'Abstract');
      title.id = 'abstract-modal-title';
      modal.appendChild(title);

      var meta = el('div', 'abstract-modal__meta');
      if (data.authors) {
        var a = el('strong', null, data.authors);
        meta.appendChild(a);
      }
      [data.journal, data.year].forEach(function (part) {
        if (part) meta.appendChild(document.createTextNode('  \u00B7  ' + part));
      });
      modal.appendChild(meta);

      if (data.badges && data.badges.length) {
        var row = el('div', 'abstract-modal__badges');
        data.badges.forEach(function (b) {
          row.appendChild(el('span', 'abstract-modal__badge abstract-modal__badge--' + b.type, b.label));
        });
        modal.appendChild(row);
      }

      modal.appendChild(el('div', 'abstract-modal__abstract', data.abstract || ''));
      return modal;
    }

    function show(data, trigger) {
      close();                       // single, well-defined close path
      lastTrigger = trigger;

      var backdrop = el('div', 'abstract-overlay');
      backdrop.addEventListener('mousedown', function (e) {
        if (e.target === backdrop) close();
      });
      backdrop.appendChild(build(data));
      document.body.appendChild(backdrop);
      document.body.classList.add('overflow--hidden');
      overlay = backdrop;

      var btn = backdrop.querySelector('.abstract-modal__close');
      if (btn) btn.focus();
    }

    function close() {
      if (!overlay) return;
      var node = overlay;
      overlay = null;
      if (node.parentNode) node.parentNode.removeChild(node);
      document.body.classList.remove('overflow--hidden');
      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
      lastTrigger = null;
    }

    function onKeydown(e) {
      if (!overlay) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;

      var items = Array.prototype.slice.call(overlay.querySelectorAll(focusable))
        .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    Array.prototype.forEach.call(triggers, function (btn) {
      btn.addEventListener('click', function () {
        var data = abstracts[btn.getAttribute('data-abstract-key')];
        if (data) show(data, btn);
      });
    });

    document.addEventListener('keydown', onKeydown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
