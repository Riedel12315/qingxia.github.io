/**
 * Simulation 3D Helix Gallery v4
 * Full-page 3D spiral using CSS perspective + translate3d.
 * Click to expand, hover to preview.
 */
(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // ── Find the archive content area ──
    var archive = document.querySelector('.archive');
    if (!archive) return;

    // Hide loading
    var loadingEl = document.querySelector('.spiral-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    // ── Parse content: h1 sections, h2 items, img sources ──
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
        var pdfA = node.querySelector('a[href*=".pdf"]');
        if (pdfA) allChildren.push({ type: 'pdflink', href: pdfA.href });
      }
    }

    // ── Build sections + items ──
    var sections = [];
    var currentSection = null;
    var currentItem = null;

    for (var k = 0; k < allChildren.length; k++) {
      var child = allChildren[k];
      if (child.type === 'heading' && child.tag === 'H1') {
        currentSection = { title: child.text, items: [] };
        sections.push(currentSection);
        currentItem = null;
      } else if (child.type === 'heading' && child.tag === 'H2') {
        if (!currentSection) { currentSection = { title: 'Results', items: [] }; sections.push(currentSection); }
        var pdfLink = null;
        var a = child.el.querySelector('a[href*=".pdf"]');
        if (a) pdfLink = a.href;
        var displayTitle = child.text.replace(/\s*\[\(PDF\)\].*$/, '').replace(/\s*\(PDF\).*$/, '').trim();
        currentItem = { title: displayTitle, section: currentSection.title, images: [], pdfLink: pdfLink };
        currentSection.items.push(currentItem);
      } else if (child.type === 'img' && currentItem) {
        currentItem.images.push(child.src);
      } else if (child.type === 'pdflink' && currentItem && !currentItem.pdfLink) {
        currentItem.pdfLink = child.href;
      }
    }

    var allItems = [];
    for (var si = 0; si < sections.length; si++) {
      for (var ii = 0; ii < sections[si].items.length; ii++) {
        allItems.push(sections[si].items[ii]);
      }
    }
    if (allItems.length === 0) return;

    // ── Build 3D gallery DOM ──
    var gallery = document.createElement('div');
    gallery.className = 'spiral-gallery';

    var hint = document.createElement('div');
    hint.className = 'spiral-hint';
    hint.textContent = '⟳  Click to expand  ·  3D helix view  ⟳';
    gallery.appendChild(hint);

    // Section labels
    var sectionLabels = [];
    var flatIdx = 0;
    for (var si2 = 0; si2 < sections.length; si2++) {
      if (sections[si2].items.length === 0) continue;
      var mid = flatIdx + Math.floor(sections[si2].items.length / 2);
      flatIdx += sections[si2].items.length;
      var lbl = document.createElement('div');
      lbl.className = 'spiral-section-label';
      lbl.textContent = sections[si2].title;
      gallery.appendChild(lbl);
      sectionLabels.push({ el: lbl, index: mid });
    }

    // Item cards
    var itemEls = [];
    for (var idx = 0; idx < allItems.length; idx++) {
      (function (item, i) {
        var el = document.createElement('div');
        el.className = 'spiral-item';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', item.title);
        el.dataset.index = i;

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

        gallery.appendChild(el);
        itemEls.push({ el: el, item: item, idx: i });
      })(allItems[idx], idx);
    }

    // ── Hide original content, insert gallery ──
    var toHide = archive.querySelectorAll('h1:not(.page__title), h2, img, p > img');
    for (var h = 0; h < toHide.length; h++) {
      if (!toHide[h].closest('.spiral-gallery')) toHide[h].style.display = 'none';
    }
    var paragraphs = archive.querySelectorAll('p');
    for (var p = 0; p < paragraphs.length; p++) {
      if (paragraphs[p].closest('.spiral-gallery') || paragraphs[p].closest('.spiral-modal')) continue;
      var hasContent = false;
      for (var c = 0; c < paragraphs[p].childNodes.length; c++) {
        var cn = paragraphs[p].childNodes[c];
        if ((cn.nodeType === 3 && cn.textContent.trim()) || (cn.nodeType === 1 && cn.style.display !== 'none')) {
          hasContent = true; break;
        }
      }
      if (!hasContent) paragraphs[p].style.display = 'none';
    }
    archive.appendChild(gallery);

    // ── 3D Helix positioning ──
    // Items arranged in a 3D helix: angle around + depth into screen
    // CSS perspective on container handles the 3D projection

    function positionItems() {
      var rect = gallery.getBoundingClientRect();
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var totalItems = allItems.length;

      if (vw < 480) return; // CSS grid fallback

      // ── Helix parameters ──
      var turns = 3.2;
      var totalAngle = turns * 2 * Math.PI;

      // Radius range — spread across full page width
      var maxR, minR, itemSize, frontZ, backZ;
      if (vw < 768) {
        itemSize = 64;
        maxR = Math.min(rect.width * 0.42, 280);
        minR = 50;
        frontZ = 100;
        backZ = -180;
      } else {
        itemSize = 110;
        maxR = Math.min(rect.width * 0.43, 380);
        minR = 70;
        frontZ = 180;
        backZ = -350;
      }

      // Set gallery height to fill most of the viewport
      var neededH = Math.max((maxR + itemSize) * 2 + 80, vh * 0.7);
      gallery.style.minHeight = neededH + 'px';

      // Recalc center
      var newRect = gallery.getBoundingClientRect();
      var cx = newRect.width / 2;
      var cy = newRect.height * 0.48; // slightly above center

      var angleStep = totalItems > 1 ? totalAngle / (totalItems - 1) : 0;

      for (var i = 0; i < itemEls.length; i++) {
        var entry = itemEls[i];

        // ── Helix: angle rotates, z goes from front to back ──
        var frac = totalItems > 1 ? i / (totalItems - 1) : 0;
        var angle = frac * totalAngle;
        var r = maxR - frac * (maxR - minR); // spiral narrows going deeper
        var z = frontZ - frac * (frontZ - backZ); // depth: front → back

        // Scale & opacity by depth
        var depthScale = 1 - frac * 0.4;
        var opacity = 1 - frac * 0.25;

        // Elliptical: compress Y slightly
        var x = r * Math.cos(angle - Math.PI / 2);
        var y = r * Math.sin(angle - Math.PI / 2) * 0.7;

        // 3D transform
        entry.el.style.left = '0px';
        entry.el.style.top = '0px';
        entry.el.style.transform =
          'translate3d(' + (cx + x - itemSize / 2) + 'px, ' +
          (cy + y - itemSize / 2) + 'px, ' +
          z + 'px) ' +
          'scale(' + depthScale.toFixed(2) + ')';
        entry.el.style.opacity = opacity.toFixed(2);
        entry.el.style.zIndex = Math.round(100 - frac * 80);
      }

      // Section labels
      for (var si3 = 0; si3 < sectionLabels.length; si3++) {
        var sl = sectionLabels[si3];
        var refIdx = Math.min(sl.index, itemEls.length - 1);
        if (refIdx < 0) continue;
        var refEntry = itemEls[refIdx];
        // Position label near its reference item
        var refTransform = refEntry.el.style.transform;
        // Hack: extract x,y from transform string
        var match = refTransform.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
        if (match) {
          var tx = parseFloat(match[1]) + itemSize * 0.7;
          var ty = parseFloat(match[2]) - 22;
          sl.el.style.left = tx + 'px';
          sl.el.style.top = ty + 'px';
        }
      }
    }

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

      var title = document.createElement('div');
      title.className = 'spiral-modal__title';
      title.textContent = item.title;
      info.appendChild(title);

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

      var closeAction = document.createElement('button');
      closeAction.className = 'spiral-modal__btn spiral-modal__btn--close';
      closeAction.textContent = 'Close';
      closeAction.addEventListener('click', closeModal);
      actions.appendChild(closeAction);

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

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(positionItems, 200);
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(positionItems);
    });
  }
})();
