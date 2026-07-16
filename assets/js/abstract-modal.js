/**
 * Abstract Modal — click any publication to see its abstract.
 */
(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Find the JSON data block
    var dataEl = document.getElementById('abstract-data');
    if (!dataEl) return;
    var abstracts = {};
    try { abstracts = JSON.parse(dataEl.textContent); } catch (e) { return; }

    // Find all publication list items in the archive area
    var archive = document.querySelector('.archive');
    if (!archive) return;
    var items = archive.querySelectorAll('li');

    // Build keyword index from abstract data
    var keys = Object.keys(abstracts);

    items.forEach(function (li) {
      var text = li.textContent || '';
      var textLower = text.toLowerCase();
      // Find the BEST matching key (highest keyword overlap), not just the first
      var bestKey = null;
      var bestScore = 0;
      for (var i = 0; i < keys.length; i++) {
        var phrases = keys[i].toLowerCase().split(/\s+/).filter(function (w) { return w.length > 4; });
        var matchCount = 0;
        for (var j = 0; j < phrases.length; j++) {
          if (textLower.indexOf(phrases[j]) !== -1) matchCount++;
        }
        // Score = matches / total phrases (ratio), prefer higher match count
        var score = matchCount >= 3 ? matchCount : 0; // need at least 3 keyword matches
        if (score > bestScore) { bestScore = score; bestKey = keys[i]; }
      }

      if (bestKey && abstracts[bestKey]) {
        // Make this item clickable
        li.style.cursor = 'pointer';
        li.title = 'Click to view abstract';

        // Add a subtle abstract indicator
        var badge = document.createElement('span');
        badge.textContent = ' 📄';
        badge.style.cssText = 'font-size:0.75em;opacity:0.4;cursor:pointer;';
        badge.title = 'View abstract';
        li.appendChild(badge);

        (function (key) {
          li.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') return;
            e.stopPropagation();
            showAbstract(abstracts[key]);
          });
        })(bestKey);
      }
    });

    function showAbstract(data) {
      // Remove existing modal
      var existing = document.querySelector('.abstract-overlay');
      if (existing) existing.parentNode.removeChild(existing);

      var overlay = document.createElement('div');
      overlay.className = 'abstract-overlay';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
      });

      var modal = document.createElement('div');
      modal.className = 'abstract-modal';
      modal.addEventListener('click', function (e) { e.stopPropagation(); });

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.className = 'abstract-modal__close';
      closeBtn.innerHTML = '&#10005;';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', closeModal);
      modal.appendChild(closeBtn);

      // Title
      var title = document.createElement('div');
      title.className = 'abstract-modal__title';
      title.textContent = data.title;
      modal.appendChild(title);

      // Meta
      var meta = document.createElement('div');
      meta.className = 'abstract-modal__meta';
      var metaParts = [];
      if (data.authors) metaParts.push('<strong>' + data.authors + '</strong>');
      if (data.journal) metaParts.push(data.journal);
      if (data.year) metaParts.push(data.year);
      meta.innerHTML = metaParts.join(' · ');
      modal.appendChild(meta);

      // Badges
      if (data.badges && data.badges.length) {
        var badgeRow = document.createElement('div');
        badgeRow.style.marginBottom = '0.8em';
        data.badges.forEach(function (b) {
          var span = document.createElement('span');
          span.className = 'abstract-modal__badge abstract-modal__badge--' + b.type;
          span.textContent = b.label;
          badgeRow.appendChild(span);
        });
        modal.appendChild(badgeRow);
      }

      // Abstract
      var abs = document.createElement('div');
      abs.className = 'abstract-modal__abstract';
      abs.textContent = data.abstract;
      modal.appendChild(abs);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      var overlay = document.querySelector('.abstract-overlay');
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }
})();
