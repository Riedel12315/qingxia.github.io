/**
 * Simulation Spiral Gallery v3
 * Archimedean spiral layout — click to expand, hover to preview.
 */
(function () {
  'use strict';

  // ── Wait for DOM ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // ── Constants ──
    var SPIRAL_TURNS = 2.8;
    var MIN_RADIUS = 80;
    var TURN_SPACING = 90;
    var ITEM_SIZE = 110;

    // ── Find the content area ──
    // archive layout puts content in .archive
    var archive = document.querySelector('.archive');
    if (!archive) return;

    // Hide loading text
    var loadingEl = document.querySelector('.spiral-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    // ── Collect all h1, h2, img elements from .archive ──
    // Skip the first h1.page__title (page title from layout)
    var allChildren = [];
    var childNodes = archive.childNodes;
    for (var i = 0; i < childNodes.length; i++) {
      var node = childNodes[i];
      if (node.nodeType !== 1) continue; // skip text nodes
      var tag = node.tagName;
      if (tag === 'H1' || tag === 'H2') {
        // Skip the page title h1 that has class page__title
        if (tag === 'H1' && node.classList.contains('page__title')) continue;
        allChildren.push({ type: 'heading', tag: tag, el: node, text: node.textContent.trim() });
      } else if (tag === 'IMG') {
        allChildren.push({ type: 'img', el: node, src: node.src || node.getAttribute('src') });
      } else if (tag === 'P') {
        // Images wrapped in paragraphs
        var imgs = node.querySelectorAll('img');
        for (var j = 0; j < imgs.length; j++) {
          allChildren.push({ type: 'img', el: imgs[j], src: imgs[j].src || imgs[j].getAttribute('src') });
        }
        // Also check for PDF links in the paragraph
        var pdfInP = node.querySelector('a[href*=".pdf"]');
        if (pdfInP) {
          allChildren.push({ type: 'pdflink', href: pdfInP.href });
        }
      }
    }

    // ── Build sections and items ──
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
        if (!currentSection) {
          currentSection = { title: 'Results', items: [] };
          sections.push(currentSection);
        }
        // Extract PDF link from heading text
        var pdfLink = null;
        var pdfAnchor = child.el.querySelector('a[href*=".pdf"]');
        if (pdfAnchor) pdfLink = pdfAnchor.href;

        var displayTitle = child.text.replace(/\s*\[\(PDF\)\].*$/, '').replace(/\s*\(PDF\).*$/, '').trim();

        currentItem = {
          title: displayTitle,
          section: currentSection.title,
          images: [],
          pdfLink: pdfLink
        };
        currentSection.items.push(currentItem);
      } else if (child.type === 'img' && currentItem) {
        currentItem.images.push(child.src);
      } else if (child.type === 'pdflink' && currentItem && !currentItem.pdfLink) {
        currentItem.pdfLink = child.href;
      }
    }

    // ── Flatten all items ──
    var allItems = [];
    for (var si = 0; si < sections.length; si++) {
      for (var ii = 0; ii < sections[si].items.length; ii++) {
        allItems.push(sections[si].items[ii]);
      }
    }

    if (allItems.length === 0) {
      console.warn('Spiral gallery: No items found.');
      return;
    }

    // ── Build gallery DOM ──
    var gallery = document.createElement('div');
    gallery.className = 'spiral-gallery';
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-label', 'Simulation results spiral gallery');

    // Hint
    var hint = document.createElement('div');
    hint.className = 'spiral-hint';
    hint.textContent = '⟳  Click any result to expand  ·  Scroll to explore  ⟳';
    gallery.appendChild(hint);

    // Background canvas
    var bgCanvas = document.createElement('canvas');
    bgCanvas.className = 'spiral-gallery__bg';
    gallery.appendChild(bgCanvas);

    // ── Find section label positions (midpoint of each section's items in allItems) ──
    var sectionLabels = [];
    var flatIdx = 0;
    for (var si2 = 0; si2 < sections.length; si2++) {
      if (sections[si2].items.length === 0) continue;
      var midItem = Math.floor(sections[si2].items.length / 2);
      var midGlobalIdx = flatIdx + midItem;
      flatIdx += sections[si2].items.length;

      var label = document.createElement('div');
      label.className = 'spiral-section-label';
      label.textContent = sections[si2].title;
      gallery.appendChild(label);
      sectionLabels.push({ el: label, index: midGlobalIdx });
    }

    // ── Create item elements ──
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
        // Fallback for broken images
        img.onerror = function () {
          img.style.display = 'none';
          thumb.style.background = 'rgba(255,99,99,0.1)';
          thumb.style.display = 'flex';
          thumb.style.alignItems = 'center';
          thumb.style.justifyContent = 'center';
          thumb.style.fontSize = '1.5em';
          thumb.textContent = '◉';
        };
        thumb.appendChild(img);

        var labelEl = document.createElement('div');
        labelEl.className = 'spiral-item__label';
        labelEl.textContent = item.title;
        labelEl.title = item.title;

        el.appendChild(thumb);
        el.appendChild(labelEl);

        el.addEventListener('click', function (e) {
          e.stopPropagation();
          openModal(item, i);
        });

        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(item, i);
          }
        });

        gallery.appendChild(el);
        itemEls.push({ el: el, item: item, idx: i });
      })(allItems[idx], idx);
    }

    // ── Insert gallery into page ──
    // Hide original headings and images
    var toHide = archive.querySelectorAll('h1:not(.page__title), h2, img, p > img');
    toHide.forEach(function (el) {
      // Only hide if it's a direct content element (not inside our gallery)
      if (!el.closest('.spiral-gallery')) {
        el.style.display = 'none';
      }
    });

    // Also hide empty paragraphs left after hiding images
    var paragraphs = archive.querySelectorAll('p');
    paragraphs.forEach(function (p) {
      var hasVisible = false;
      for (var c = 0; c < p.childNodes.length; c++) {
        if (p.childNodes[c].nodeType === 3 && p.childNodes[c].textContent.trim()) {
          hasVisible = true;
          break;
        }
        if (p.childNodes[c].nodeType === 1 && p.childNodes[c].style.display !== 'none') {
          hasVisible = true;
          break;
        }
      }
      if (!hasVisible && !p.closest('.spiral-gallery') && !p.closest('.spiral-modal')) {
        p.style.display = 'none';
      }
    });

    archive.appendChild(gallery);

    // ── Spiral positioning ──
    function positionItems() {
      var rect = gallery.getBoundingClientRect();
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var totalItems = allItems.length;
      var totalAngle = SPIRAL_TURNS * 2 * Math.PI;

      var vw = window.innerWidth;
      var itemSize, minR, turnSpacing;
      if (vw < 480) {
        return; // CSS grid fallback
      } else if (vw < 768) {
        itemSize = 72;
        minR = 50;
        turnSpacing = 65;
      } else {
        itemSize = ITEM_SIZE;
        minR = MIN_RADIUS;
        turnSpacing = TURN_SPACING;
      }

      var maxR = minR + turnSpacing * SPIRAL_TURNS;
      var neededHeight = (maxR + itemSize) * 2 + 60;
      gallery.style.minHeight = Math.max(neededHeight, window.innerHeight * 0.6) + 'px';

      // Recalc center after height change
      var newRect = gallery.getBoundingClientRect();
      var newCx = newRect.width / 2;
      var newCy = newRect.height / 2;

      for (var i = 0; i < itemEls.length; i++) {
        var entry = itemEls[i];
        var angle = totalItems > 1 ? (i / (totalItems - 1)) * totalAngle : 0;
        var r = minR + (angle / (2 * Math.PI)) * turnSpacing;

        var x = newCx + r * Math.cos(angle - Math.PI / 2);
        var y = newCy + r * Math.sin(angle - Math.PI / 2);

        entry.el.style.left = (x - itemSize / 2) + 'px';
        entry.el.style.top = (y - itemSize / 2) + 'px';
      }

      // Position section labels
      for (var si3 = 0; si3 < sectionLabels.length; si3++) {
        var sl = sectionLabels[si3];
        var refIdx = Math.min(sl.index, itemEls.length - 1);
        if (refIdx < 0) continue;
        var ref = itemEls[refIdx];
        var l = parseFloat(ref.el.style.left) || 0;
        var t = parseFloat(ref.el.style.top) || 0;
        sl.el.style.left = (l + itemSize * 0.85) + 'px';
        sl.el.style.top = (t - 24) + 'px';
      }

      drawSpiralPath(bgCanvas, itemSize, minR, turnSpacing);
    }

    function drawSpiralPath(canvas, itemSize, minR, turnSpacing) {
      var rect = gallery.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var totalAngle = SPIRAL_TURNS * 2 * Math.PI;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 10]);

      var steps = 400;
      for (var i = 0; i <= steps; i++) {
        var angle = (i / steps) * totalAngle;
        var r = minR + (angle / (2 * Math.PI)) * turnSpacing;
        var x = cx + r * Math.cos(angle - Math.PI / 2);
        var y = cy + r * Math.sin(angle - Math.PI / 2);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    // ── Modal ──
    var currentModal = null;

    function openModal(item, idx) {
      closeModal();

      var overlay = document.createElement('div');
      overlay.className = 'spiral-modal-overlay';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
      });

      var modal = document.createElement('div');
      modal.className = 'spiral-modal';
      modal.addEventListener('click', function (e) { e.stopPropagation(); });

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.className = 'spiral-modal__close';
      closeBtn.innerHTML = '&#10005;';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', closeModal);
      modal.appendChild(closeBtn);

      // Image
      var modalImg = document.createElement('img');
      modalImg.className = 'spiral-modal__image';
      modalImg.src = item.images[0] || '';
      modalImg.alt = item.title;
      modalImg.onerror = function () {
        modalImg.style.display = 'none';
      };
      modal.appendChild(modalImg);

      // Info bar
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

      var closeActionBtn = document.createElement('button');
      closeActionBtn.className = 'spiral-modal__btn spiral-modal__btn--close';
      closeActionBtn.textContent = 'Close';
      closeActionBtn.addEventListener('click', closeModal);
      actions.appendChild(closeActionBtn);

      info.appendChild(actions);
      modal.appendChild(info);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      currentModal = overlay;

      // Mark active
      if (itemEls[idx]) {
        itemEls[idx].el.classList.add('spiral-item--active');
      }
    }

    function closeModal() {
      if (!currentModal) return;
      document.body.style.overflow = '';
      if (currentModal.parentNode) currentModal.parentNode.removeChild(currentModal);
      currentModal = null;

      var actives = document.querySelectorAll('.spiral-item--active');
      for (var a = 0; a < actives.length; a++) {
        actives[a].classList.remove('spiral-item--active');
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    // ── Resize handler ──
    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(positionItems, 200);
    });

    // ── Start ──
    requestAnimationFrame(function () {
      requestAnimationFrame(positionItems);
    });
  }
})();
