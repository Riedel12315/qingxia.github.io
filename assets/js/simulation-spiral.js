/**
 * Simulation Spiral Gallery
 * Arranges simulation result items in an Archimedean spiral pattern.
 * Click to expand, hover to preview.
 */
(function () {
  'use strict';

  // ── Constants ──
  const SPIRAL_TURNS = 2.8;
  const MIN_RADIUS = 60;
  const TURN_SPACING = 85;
  const ITEM_SIZE = 110;

  // ── DOM refs ──
  const pageContent = document.querySelector('.page__content');
  if (!pageContent) return;

  // Find the simulation page (has h1 "CAD for 3D printing" or similar structure)
  const h1s = pageContent.querySelectorAll('h1');
  if (h1s.length === 0) return;

  // ── Extract items ──
  // Structure: h1 = section header, h2 = item title, then images
  const sections = [];
  let currentSection = null;

  // Walk through all child elements to build item data
  const children = pageContent.children;
  for (let i = 0; i < children.length; i++) {
    const el = children[i];

    if (el.tagName === 'H1') {
      currentSection = { title: el.textContent.trim(), items: [] };
      sections.push(currentSection);
      continue;
    }

    if (el.tagName === 'H2' && currentSection) {
      const item = {
        title: el.textContent.trim(),
        section: currentSection.title,
        headingEl: el,
        images: [],
        pdfLink: null,
      };

      // Look for PDF link in the heading
      const pdfLink = el.querySelector('a[href*=".pdf"]');
      if (pdfLink) {
        item.pdfLink = pdfLink.href;
        // Remove PDF link text from title for cleaner display
        item.displayTitle = item.title.replace(/\s*\[\(PDF\)\].*$/, '').trim();
      } else {
        item.displayTitle = item.title;
      }

      // Collect following images until next heading
      let j = i + 1;
      while (j < children.length) {
        const nextEl = children[j];
        if (nextEl.tagName === 'H1' || nextEl.tagName === 'H2') break;

        const imgs = nextEl.querySelectorAll('img');
        imgs.forEach(img => item.images.push(img.src));

        // Also check for PDF links in text nodes
        const links = nextEl.querySelectorAll('a[href*=".pdf"]');
        links.forEach(link => {
          if (!item.pdfLink) item.pdfLink = link.href;
        });

        j++;
      }

      if (item.images.length > 0) {
        currentSection.items.push(item);
      }
    }
  }

  // Flatten all items
  const allItems = sections.flatMap(s => s.items);
  if (allItems.length === 0) return;

  // ── Build spiral DOM ──
  const gallery = document.createElement('div');
  gallery.className = 'spiral-gallery';
  gallery.setAttribute('role', 'region');
  gallery.setAttribute('aria-label', 'Simulation results spiral gallery');

  // Hint text
  const hint = document.createElement('div');
  hint.className = 'spiral-hint';
  hint.textContent = '⟳  Click any result to expand  ·  Scroll to explore  ⟳';
  gallery.appendChild(hint);

  // Canvas for spiral path
  const bgCanvas = document.createElement('canvas');
  bgCanvas.className = 'spiral-gallery__bg';
  gallery.appendChild(bgCanvas);

  // Section labels
  const sectionAngles = new Map();
  sections.forEach((section, si) => {
    if (section.items.length === 0) return;
    const midIdx = allItems.indexOf(section.items[Math.floor(section.items.length / 2)]);
    sectionAngles.set(section.title, { index: midIdx, label: section.title });
  });

  // Create item elements
  const itemEls = [];
  allItems.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'spiral-item';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', item.displayTitle);
    el.dataset.index = idx;

    const thumb = document.createElement('div');
    thumb.className = 'spiral-item__thumb';

    const img = document.createElement('img');
    img.src = item.images[0];
    img.alt = item.displayTitle;
    img.loading = 'lazy';
    thumb.appendChild(img);

    const label = document.createElement('div');
    label.className = 'spiral-item__label';
    label.textContent = item.displayTitle;
    label.title = item.displayTitle;

    el.appendChild(thumb);
    el.appendChild(label);

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(item, idx);
    });

    // Keyboard
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(item, idx);
      }
    });

    gallery.appendChild(el);
    itemEls.push({ el, item, idx });
  });

  // Section labels
  const labelEls = [];
  sectionAngles.forEach((info, sectionTitle) => {
    const label = document.createElement('div');
    label.className = 'spiral-section-label';
    label.textContent = info.label;
    gallery.appendChild(label);
    labelEls.push({ el: label, index: info.index });
  });

  // ── Hide loading text ──
  const loadingEl = document.querySelector('.spiral-loading');
  if (loadingEl) loadingEl.style.display = 'none';

  // ── Replace original content ──
  // Hide original h1 and h2 but keep content in DOM for SEO
  pageContent.querySelectorAll('h1, h2').forEach(el => {
    el.style.display = 'none';
  });
  pageContent.querySelectorAll('img').forEach(el => {
    el.style.display = 'none';
  });
  // Insert gallery after the page title
  const pageInnerWrap = pageContent.closest('.page__inner-wrap');
  if (pageInnerWrap) {
    const firstH1 = pageInnerWrap.querySelector('h1');
    if (firstH1) {
      firstH1.style.display = '';
    }
    pageInnerWrap.appendChild(gallery);
  } else {
    pageContent.appendChild(gallery);
  }

  // ── Spiral positioning ──
  function positionItems() {
    const rect = gallery.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const totalItems = allItems.length;
    const totalAngle = SPIRAL_TURNS * 2 * Math.PI;

    // Responsive sizing
    const vw = window.innerWidth;
    let itemSize, minR, turnSpacing;
    if (vw < 480) {
      return; // Grid fallback in CSS
    } else if (vw < 768) {
      itemSize = 72;
      minR = 40;
      turnSpacing = 60;
    } else {
      itemSize = ITEM_SIZE;
      minR = MIN_RADIUS;
      turnSpacing = TURN_SPACING;
    }

    // Set gallery height based on spiral extent
    const maxR = minR + turnSpacing * SPIRAL_TURNS;
    const neededHeight = (maxR + itemSize) * 2 + 40;
    gallery.style.minHeight = Math.max(neededHeight, window.innerHeight * 0.6) + 'px';

    // Position each item
    itemEls.forEach(({ el, idx }) => {
      const angle = (idx / Math.max(totalItems - 1, 1)) * totalAngle;
      const r = minR + (angle / (2 * Math.PI)) * turnSpacing;

      // Recalculate positions after height update
      const newRect = gallery.getBoundingClientRect();
      const newCx = newRect.width / 2;
      const newCy = newRect.height / 2;

      const x = newCx + r * Math.cos(angle - Math.PI / 2); // Start from top
      const y = newCy + r * Math.sin(angle - Math.PI / 2);

      el.style.left = (x - itemSize / 2) + 'px';
      el.style.top = (y - itemSize / 2) + 'px';
    });

    // Position section labels
    labelEls.forEach(({ el: label, index }) => {
      const refItem = itemEls[Math.min(index, itemEls.length - 1)];
      if (!refItem) return;
      const itemEl = refItem.el;
      const itemLeft = parseFloat(itemEl.style.left);
      const itemTop = parseFloat(itemEl.style.top);
      label.style.left = (itemLeft + 55) + 'px';
      label.style.top = (itemTop - 20) + 'px';
    });

    // Draw spiral path
    drawSpiralPath(bgCanvas, itemSize, minR, turnSpacing);
  }

  function drawSpiralPath(canvas, itemSize, minR, turnSpacing) {
    const rect = gallery.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const totalAngle = SPIRAL_TURNS * 2 * Math.PI;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 8]);

    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * totalAngle;
      const r = minR + (angle / (2 * Math.PI)) * turnSpacing;
      const x = cx + r * Math.cos(angle - Math.PI / 2);
      const y = cy + r * Math.sin(angle - Math.PI / 2);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  // ── Modal ──
  let currentModal = null;

  function openModal(item, idx) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'spiral-modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const modal = document.createElement('div');
    modal.className = 'spiral-modal';
    modal.addEventListener('click', (e) => e.stopPropagation());

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'spiral-modal__close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', closeModal);
    modal.appendChild(closeBtn);

    // Image
    const img = document.createElement('img');
    img.className = 'spiral-modal__image';
    img.src = item.images[0];
    img.alt = item.displayTitle;
    modal.appendChild(img);

    // Info bar
    const info = document.createElement('div');
    info.className = 'spiral-modal__info';

    const title = document.createElement('div');
    title.className = 'spiral-modal__title';
    title.textContent = item.displayTitle;
    info.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'spiral-modal__actions';

    if (item.pdfLink) {
      const pdfBtn = document.createElement('a');
      pdfBtn.className = 'spiral-modal__btn spiral-modal__btn--pdf';
      pdfBtn.href = item.pdfLink;
      pdfBtn.target = '_blank';
      pdfBtn.rel = 'noopener';
      pdfBtn.textContent = 'PDF';
      actions.appendChild(pdfBtn);
    }

    const closeActionBtn = document.createElement('button');
    closeActionBtn.className = 'spiral-modal__btn spiral-modal__btn--close';
    closeActionBtn.textContent = 'Close';
    closeActionBtn.addEventListener('click', closeModal);
    actions.appendChild(closeActionBtn);

    info.appendChild(actions);
    modal.appendChild(info);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    currentModal = overlay;

    // Mark active spiral item
    const activeItem = itemEls[idx];
    if (activeItem) {
      activeItem.el.classList.add('spiral-item--active');
    }
  }

  function closeModal() {
    if (!currentModal) return;
    document.body.style.overflow = '';
    currentModal.remove();

    // Remove active state
    document.querySelectorAll('.spiral-item--active').forEach(el => {
      el.classList.remove('spiral-item--active');
    });

    currentModal = null;
  }

  // Keyboard: Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ── Resize handler ──
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(positionItems, 150);
  });

  // ── Initialize ──
  // Use requestAnimationFrame to ensure layout is settled
  requestAnimationFrame(() => {
    requestAnimationFrame(positionItems);
  });
})();
