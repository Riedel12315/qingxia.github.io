/**
 * Simulation 3D DNA Helix v7 — unified image+text cards, always face viewer
 */
(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var archive = document.querySelector('.archive');
    if (!archive) return;

    var loadingEl = document.querySelector('.spiral-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    // ── Parse content ──
    var allChildren = [];
    var childNodes = archive.childNodes;
    for (var i = 0; i < childNodes.length; i++) {
      var node = childNodes[i];
      if (node.nodeType !== 1) continue;
      var tag = node.tagName;
      if (tag === 'H1' || tag === 'H2') {
        if (tag === 'H1' && node.classList.contains('page__title')) continue;
        allChildren.push({ type: 'heading', tag: tag, el: node, text: node.textContent.trim() });
      } else if (tag === 'IMG') {
        allChildren.push({ type: 'img', el: node, src: node.src || node.getAttribute('src') });
      } else if (tag === 'P') {
        var imgs = node.querySelectorAll('img');
        for (var j = 0; j < imgs.length; j++) {
          allChildren.push({ type: 'img', el: imgs[j], src: imgs[j].src || imgs[j].getAttribute('src') });
        }
        var a = node.querySelector('a[href*=".pdf"]');
        if (a) allChildren.push({ type: 'pdflink', href: a.href });
      }
    }

    var sections = [];
    var curSec = null, curItem = null;
    for (var k = 0; k < allChildren.length; k++) {
      var c = allChildren[k];
      if (c.type === 'heading' && c.tag === 'H1') {
        curSec = { title: c.text, items: [] }; sections.push(curSec); curItem = null;
      } else if (c.type === 'heading' && c.tag === 'H2') {
        if (!curSec) { curSec = { title: 'Results', items: [] }; sections.push(curSec); }
        var pdf = null;
        var anchor = c.el.querySelector('a[href*=".pdf"]');
        if (anchor) pdf = anchor.href;
        var title = c.text.replace(/\s*\[\(PDF\)\].*$/, '').replace(/\s*\(PDF\).*$/, '').trim();
        curItem = { title: title, section: curSec.title, images: [], pdfLink: pdf };
        curSec.items.push(curItem);
      } else if (c.type === 'img' && curItem) {
        curItem.images.push(c.src);
      } else if (c.type === 'pdflink' && curItem && !curItem.pdfLink) {
        curItem.pdfLink = c.href;
      }
    }

    var allItems = [];
    for (var si = 0; si < sections.length; si++) {
      for (var ii = 0; ii < sections[si].items.length; ii++) {
        allItems.push(sections[si].items[ii]);
      }
    }
    if (allItems.length === 0) return;

    // ── Build DOM ──
    var gallery = document.createElement('div');
    gallery.className = 'spiral-gallery';

    var hint = document.createElement('div');
    hint.className = 'spiral-hint';
    hint.textContent = '⟳  Continuously rotating  ·  Hover to pause  ·  Click to expand  ⟳';
    gallery.appendChild(hint);

    var axis = document.createElement('div');
    axis.className = 'helix-axis';
    gallery.appendChild(axis);

    // ── Create wrappers + items ──
    var wrappers = [];
    var itemEls = [];

    for (var idx = 0; idx < allItems.length; idx++) {
      (function (item, i) {
        var wrapper = document.createElement('div');
        wrapper.className = 'spiral-item-wrapper';

        var el = document.createElement('div');
        el.className = 'spiral-item';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', item.title);
        el.style.transformStyle = 'preserve-3d';

        // Image — bare, no wrapper
        var img = document.createElement('img');
        img.className = 'spiral-item__img';
        img.src = item.images[0] || '';
        img.alt = item.title;
        img.loading = 'lazy';

        var labelEl = document.createElement('div');
        labelEl.className = 'spiral-item__label';
        labelEl.textContent = item.title;
        labelEl.title = item.title;

        el.appendChild(img);
        el.appendChild(labelEl);

        el.addEventListener('click', function (e) { e.stopPropagation(); openModal(item, i); });
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(item, i); }
        });

        wrapper.appendChild(el);
        gallery.appendChild(wrapper);
        wrappers.push({ el: wrapper, idx: i });
        itemEls.push({ el: el, item: item, idx: i });
      })(allItems[idx], idx);
    }

    // ── Hide original content ──
    var toHide = archive.querySelectorAll('h1:not(.page__title), h2, img');
    for (var h = 0; h < toHide.length; h++) {
      if (!toHide[h].closest('.spiral-gallery')) toHide[h].style.display = 'none';
    }
    var paragraphs = archive.querySelectorAll('p');
    for (var p = 0; p < paragraphs.length; p++) {
      if (paragraphs[p].closest('.spiral-gallery')) continue;
      var has = false;
      for (var cn = 0; cn < paragraphs[p].childNodes.length; cn++) {
        var n = paragraphs[p].childNodes[cn];
        if ((n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && n.style.display !== 'none')) { has = true; break; }
      }
      if (!has) paragraphs[p].style.display = 'none';
    }
    archive.appendChild(gallery);

    // ── 3D Helix parameters ──
    var totalItems = allItems.length;
    var turns = 3.2;
    var totalAngle = turns * 2 * Math.PI;
    var radius = 260, itemW = 300, itemH = 200, totalHeight, perspectiveVal = 1000;
    var vw = window.innerWidth;

    if (vw < 480) { radius = 100; itemW = 120; itemH = 80; perspectiveVal = 600; }
    else if (vw < 768) { radius = 160; itemW = 180; itemH = 120; perspectiveVal = 800; }

    // On portrait, use more vertical space; on landscape, cap at reasonable height
    var isPortrait = window.innerHeight > window.innerWidth;
    totalHeight = isPortrait ? Math.min(window.innerHeight * 1.4, 2000) : Math.min(window.innerHeight * 1.3, 1600);

    gallery.style.perspective = perspectiveVal + 'px';
    // Fill the viewport on all screen ratios
    var availH = window.innerHeight - gallery.getBoundingClientRect().top - 40;
    gallery.style.minHeight = Math.max(totalHeight + itemH + 120, availH) + 'px';

    // ── Animation loop (30fps for performance) ──
    var angle = 0;
    var speed = 0.012; // doubled since we run at half rate
    var paused = false;
    var lastTime = 0;
    var FRAME_INTERVAL = 33; // ~30fps

    gallery.addEventListener('mouseenter', function () { paused = true; });
    gallery.addEventListener('mouseleave', function () { paused = false; });

    function frame(ts) {
      if (!lastTime) lastTime = ts;
      var elapsed = ts - lastTime;

      if (elapsed >= FRAME_INTERVAL) {
        lastTime = ts - (elapsed % FRAME_INTERVAL);

        if (!paused) {
          angle += speed;
          if (angle > 2 * Math.PI) angle -= 2 * Math.PI;
        }

        for (var i = 0; i < wrappers.length; i++) {
          var frac = totalItems > 1 ? i / (totalItems - 1) : 0;
          var itemAngle = frac * totalAngle + angle;
          var y = (frac - 0.5) * totalHeight;
          var x = radius * Math.cos(itemAngle);
          var z = radius * Math.sin(itemAngle);

          wrappers[i].el.style.transform = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, ' + z.toFixed(1) + 'px)';
          itemEls[i].el.style.transform = 'translate(-50%, -50%) rotateY(' + (-itemAngle).toFixed(4) + 'rad)';
        }
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    // ── Resize ──
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var nvw = window.innerWidth;
        if (nvw < 480) { radius = 100; itemW = 120; itemH = 80; perspectiveVal = 600; }
        else if (nvw < 768) { radius = 160; itemW = 180; itemH = 120; perspectiveVal = 800; }
        else { radius = 260; itemW = 300; itemH = 200; perspectiveVal = 1000; }
        var isPortrait2 = window.innerHeight > window.innerWidth;
        totalHeight = isPortrait2 ? Math.min(window.innerHeight * 1.4, 2000) : Math.min(window.innerHeight * 1.3, 1600);
        gallery.style.perspective = perspectiveVal + 'px';
        var availH2 = window.innerHeight - gallery.getBoundingClientRect().top - 40;
        gallery.style.minHeight = Math.max(totalHeight + itemH + 120, availH2) + 'px';
      }, 200);
    });

    // ── Modal ──
    var currentModal = null;

    function openModal(item, idx) {
      closeModal();
      var overlay = document.createElement('div');
      overlay.className = 'spiral-modal-overlay';
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

      var modal = document.createElement('div');
      modal.className = 'spiral-modal';
      modal.addEventListener('click', function (e) { e.stopPropagation(); });

      var closeBtn = document.createElement('button');
      closeBtn.className = 'spiral-modal__close';
      closeBtn.innerHTML = '&#10005;';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', closeModal);
      modal.appendChild(closeBtn);

      var modalImg = document.createElement('img');
      modalImg.className = 'spiral-modal__image';
      modalImg.src = item.images[0] || '';
      modalImg.alt = item.title;
      modal.appendChild(modalImg);

      var info = document.createElement('div');
      info.className = 'spiral-modal__info';
      var titleEl = document.createElement('div');
      titleEl.className = 'spiral-modal__title';
      titleEl.textContent = item.title;
      info.appendChild(titleEl);

      var actions = document.createElement('div');
      actions.className = 'spiral-modal__actions';
      if (item.pdfLink) {
        var pdfBtn = document.createElement('a');
        pdfBtn.className = 'spiral-modal__btn spiral-modal__btn--pdf';
        pdfBtn.href = item.pdfLink;
        pdfBtn.target = '_blank';
        pdfBtn.rel = 'noopener';
        pdfBtn.textContent = '↑ PDF';
        actions.appendChild(pdfBtn);
      }
      var closeBtn2 = document.createElement('button');
      closeBtn2.className = 'spiral-modal__btn spiral-modal__btn--close';
      closeBtn2.textContent = 'Close';
      closeBtn2.addEventListener('click', closeModal);
      actions.appendChild(closeBtn2);
      info.appendChild(actions);
      modal.appendChild(info);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      currentModal = overlay;
      if (itemEls[idx]) itemEls[idx].el.classList.add('spiral-item--active');
    }

    function closeModal() {
      if (!currentModal) return;
      document.body.style.overflow = '';
      if (currentModal.parentNode) currentModal.parentNode.removeChild(currentModal);
      currentModal = null;
      var actives = document.querySelectorAll('.spiral-item--active');
      for (var a = 0; a < actives.length; a++) actives[a].classList.remove('spiral-item--active');
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }
})();
