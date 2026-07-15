/**
 * Simulation 3D DNA Helix v6
 * JS-driven rotation with items always facing the viewer.
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

    // Central axis
    var axis = document.createElement('div');
    axis.className = 'helix-axis';
    gallery.appendChild(axis);

    // Section labels
    var sectionLabels = [];
    var flatIdx = 0;
    for (var si2 = 0; si2 < sections.length; si2++) {
      if (sections[si2].items.length === 0) continue;
      flatIdx += sections[si2].items.length;
      var lbl = document.createElement('div');
      lbl.className = 'spiral-section-label';
      lbl.textContent = sections[si2].title;
      gallery.appendChild(lbl);
      sectionLabels.push({ el: lbl, idx: si2 });
    }

    // Create item wrappers + items
    var wrappers = [];
    var itemEls = [];

    for (var idx = 0; idx < allItems.length; idx++) {
      (function (item, i) {
        // Wrapper — positioned on helix
        var wrapper = document.createElement('div');
        wrapper.className = 'spiral-item-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '50%';
        wrapper.style.top = '50%';
        wrapper.style.width = '0';
        wrapper.style.height = '0';
        wrapper.style.transformStyle = 'preserve-3d';

        // Item — always faces viewer
        var el = document.createElement('div');
        el.className = 'spiral-item';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', item.title);
        el.style.transformStyle = 'preserve-3d';

        var thumb = document.createElement('div');
        thumb.className = 'spiral-item__thumb';
        var img = document.createElement('img');
        img.src = item.images[0] || '';
        img.alt = item.title;
        img.loading = 'lazy';
        img.onerror = function () {
          img.style.display = 'none';
          thumb.style.background = 'rgba(255,99,99,0.1)';
        };
        thumb.appendChild(img);

        var labelEl = document.createElement('div');
        labelEl.className = 'spiral-item__label';
        labelEl.textContent = item.title;
        labelEl.title = item.title;

        el.appendChild(thumb);
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
    var radius, itemSize, totalHeight, perspectiveVal;
    var vw = window.innerWidth;

    if (vw < 480) {
      // CSS grid fallback — no 3D
      return;
    } else if (vw < 768) {
      radius = 130;
      itemSize = 80;
      totalHeight = Math.min(window.innerHeight * 0.5, 380);
      perspectiveVal = 700;
    } else {
      radius = 180;
      itemSize = 130;
      totalHeight = Math.min(window.innerHeight * 0.6, 540);
      perspectiveVal = 800;
    }

    gallery.style.perspective = perspectiveVal + 'px';
    gallery.style.minHeight = (totalHeight + itemSize + 120) + 'px';

    // Position section labels
    for (var si3 = 0; si3 < sectionLabels.length; si3++) {
      var sl = sectionLabels[si3];
      if (sl.idx === 0) { sl.el.style.left = '12px'; sl.el.style.top = '16px'; }
      else if (sl.idx === sections.length - 1) { sl.el.style.right = '12px'; sl.el.style.bottom = '16px'; sl.el.style.top = 'auto'; sl.el.style.left = 'auto'; }
      else { sl.el.style.right = '12px'; sl.el.style.top = '45%'; }
    }

    // ── Animation loop ──
    var angle = 0;
    var speed = 0.006; // radians per frame
    var paused = false;
    var animId = null;

    gallery.addEventListener('mouseenter', function () { paused = true; });
    gallery.addEventListener('mouseleave', function () { paused = false; });

    function frame() {
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

        // Wrapper positioned on helix
        wrappers[i].el.style.transform = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, ' + z.toFixed(1) + 'px)';

        // Item counter-rotates to ALWAYS face the viewer
        itemEls[i].el.style.transform = 'rotateY(' + (-itemAngle).toFixed(4) + 'rad)';
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    // ── Resize recalculation ──
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var nvw = window.innerWidth;
        if (nvw < 480) return;
        if (nvw < 768) {
          radius = 130; itemSize = 80; totalHeight = Math.min(window.innerHeight * 0.5, 380); perspectiveVal = 700;
        } else {
          radius = 180; itemSize = 130; totalHeight = Math.min(window.innerHeight * 0.6, 540); perspectiveVal = 800;
        }
        gallery.style.perspective = perspectiveVal + 'px';
        gallery.style.minHeight = (totalHeight + itemSize + 120) + 'px';
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
