/* assets/js/simulation.js — 只读 DOM data-*，不加载任何外部 JSON/YAML。
   Jekyll 页与静态预览页共用本文件；JS 失败/关闭时自动退回纯静态网格。 */
(function () {
  'use strict';
  var D = document, page = D.querySelector('.sim-page');
  if (!page) return;
  var figs = [].slice.call(page.querySelectorAll('.sim-figure')), N = figs.length;
  if (!N) return;
  var view = 'grid', picked = [];

  function q(el, s) { return el.querySelector(s); }
  function reduce() {
    return (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      D.documentElement.hasAttribute('data-reduced-motion');
  }
  function bg() {
    return ['#main', '.masthead', '.page__footer']
      .map(function (s) { return D.querySelector(s); }).filter(Boolean);
  }

  /* ---------- 每图状态：POSTER / CONFIRM / LOADING / PLAYING / ERROR ---------- */
  figs.forEach(function (f) {
    var img = q(f, '.sim-figure__img'), gp = q(f, '.sim-play');
    f._s = {
      img: img, gridPlay: gp, gridStatus: q(f, '.sim-figure__status'),
      mode: 'POSTER', timer: null, pre: null, box: null, confirmed: false,
      target: img, btn: gp, st: q(f, '.sim-figure__status'), host: f
    };
    if (gp) gp.hidden = false;                       // JS 可用才显示播放按钮
    q(f, '.sim-figure__open').addEventListener('click', function (e) {
      e.preventDefault();
      if (view === 'compare') { pick(f); return; }     // 对比模式：选择而非放大
      open(figs.indexOf(f), this);                     // DOM 顺序即扁平 0..15
    });
    if (gp) gp.addEventListener('click', function () {
      if (view === 'compare') return;                  // 对比模式不播放动画
      toggle(f);
    });
  });

  /* ---------- 视图：网格 / 对比（两张并排、同步缩放平移） ---------- */
  var viewbar = D.createElement('div');
  viewbar.className = 'sim-viewbar';
  viewbar.innerHTML =
    '<div class="sim-viewbar__group" role="group" aria-label="展示方式">' +
      '<button type="button" class="sim-viewbtn" data-view="grid" aria-pressed="true">网格</button>' +
      '<button type="button" class="sim-viewbtn" data-view="compare" aria-pressed="false">对比</button>' +
    '</div>' +
    '<p class="sim-viewbar__hint" role="status" aria-live="polite">点击图片放大查看</p>';
  page.insertBefore(viewbar, page.firstChild);

  var hint = q(viewbar, '.sim-viewbar__hint');
  var viewBtns = [].slice.call(viewbar.querySelectorAll('.sim-viewbtn'));

  var compare = D.createElement('div');
  compare.className = 'sim-compare';
  compare.hidden = true;
  compare.innerHTML =
    '<div class="sim-compare__head"><h2 class="sim-compare__title">并排对比</h2>' +
      '<button type="button" class="sim-compare__close">清除选择</button></div>' +
    '<div class="sim-compare__panes">' +
      '<div class="sim-compare__pane"><div class="sim-compare__stage" data-pane="0">' +
        '<img class="sim-compare__img" alt="" decoding="async"></div>' +
        '<p class="sim-compare__caption"></p></div>' +
      '<div class="sim-compare__pane"><div class="sim-compare__stage" data-pane="1">' +
        '<img class="sim-compare__img" alt="" decoding="async"></div>' +
        '<p class="sim-compare__caption"></p></div>' +
    '</div>' +
    '<div class="sim-compare__foot"><p class="sim-compare__note">拖动平移 · 滚轮缩放 · 双击复位</p>' +
      '<div class="sim-compare__zoom">' +
        '<button type="button" class="sim-zoombtn" data-zoom="out" aria-label="缩小">−</button>' +
        '<button type="button" class="sim-zoombtn" data-zoom="reset">1:1</button>' +
        '<button type="button" class="sim-zoombtn" data-zoom="in" aria-label="放大">+</button>' +
      '</div></div>';
  viewbar.insertAdjacentElement('afterend', compare);

  var Z = { s: 1, x: 0, y: 0 };

  function applyZoom() {
    var t = 'translate(' + Z.x + 'px,' + Z.y + 'px) scale(' + Z.s + ')';
    [].forEach.call(compare.querySelectorAll('.sim-compare__img'), function (img) {
      img.style.transform = t;
    });
  }
  function resetZoom() { Z = { s: 1, x: 0, y: 0 }; applyZoom(); }
  function zoomAt(px, py, factor) {
    var ns = Math.min(6, Math.max(1, Z.s * factor));
    if (ns === Z.s) return;
    Z.x = px - (px - Z.x) * (ns / Z.s);
    Z.y = py - (py - Z.y) * (ns / Z.s);
    Z.s = ns;
    applyZoom();
  }
  function zoomCenter(factor) {
    var stage = compare.querySelector('.sim-compare__stage');
    if (stage) zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, factor);
  }

  function openCompare() {
    if (picked.length !== 2) return;
    var imgs = compare.querySelectorAll('.sim-compare__img');
    var caps = compare.querySelectorAll('.sim-compare__caption');
    picked.forEach(function (f, n) {
      imgs[n].src = f.dataset.poster;
      imgs[n].alt = q(f, '.sim-figure__img').alt;
      caps[n].textContent = (f.dataset.captionZh ? f.dataset.captionZh + ' / ' : '') + (f.dataset.captionEn || '');
    });
    resetZoom();
    compare.hidden = false;
    if (compare.scrollIntoView) compare.scrollIntoView({ block: 'nearest' });
  }

  function renumber() {
    picked.forEach(function (f, n) {
      q(f, '.sim-figure__media').setAttribute('data-pick', String(n + 1));
    });
  }

  function closeCompare() {
    compare.hidden = true;
    picked.forEach(function (f) {
      f.classList.remove('is-picked');
      q(f, '.sim-figure__media').removeAttribute('data-pick');
    });
    picked = [];
    if (view === 'compare') hint.textContent = '选择 2 张图进行并排对比';
  }

  function pick(f) {
    var at = picked.indexOf(f);
    if (at > -1) {                                   // 取消已选
      picked.splice(at, 1);
      f.classList.remove('is-picked');
      q(f, '.sim-figure__media').removeAttribute('data-pick');
      renumber();
      if (picked.length < 2) compare.hidden = true;
      hint.textContent = picked.length
        ? '已选 ' + picked.length + ' / 2，再选一张'
        : '选择 2 张图进行并排对比';
      return;
    }
    if (picked.length >= 2) {                        // 已满：提示先取消
      hint.textContent = '最多选择 2 张，请先取消一张';
      return;
    }
    picked.push(f);
    f.classList.add('is-picked');
    q(f, '.sim-figure__media').setAttribute('data-pick', String(picked.length));
    hint.textContent = picked.length === 2 ? '已选 2 / 2，正在对比' : '已选 1 / 2，再选一张';
    if (picked.length === 2) openCompare();
  }

  function syncViewUrl() {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams(location.search);
    if (view === 'compare') params.set('view', 'compare');
    else params.delete('view');
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function setView(v, silent) {
    view = v;
    page.setAttribute('data-view', v);
    viewBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false');
    });
    if (v === 'grid') {
      closeCompare();
      hint.textContent = '点击图片放大查看';
    } else if (!picked.length) {
      hint.textContent = '选择 2 张图进行并排对比';
    }
    if (!silent) syncViewUrl();
  }

  viewBtns.forEach(function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
  });

  /* 同步缩放/平移：拖任一栏，两栏一起动 */
  [].forEach.call(compare.querySelectorAll('.sim-compare__stage'), function (stage) {
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    var drag = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, tx: Z.x, ty: Z.y };
      stage.classList.add('is-dragging');
      if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      Z.x = drag.tx + (e.clientX - drag.x);
      Z.y = drag.ty + (e.clientY - drag.y);
      applyZoom();
    });
    function endDrag() { drag = null; stage.classList.remove('is-dragging'); }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('dblclick', resetZoom);
  });

  compare.addEventListener('click', function (e) {
    var zoomBtn = e.target.closest('.sim-zoombtn');
    if (zoomBtn) {
      var act = zoomBtn.getAttribute('data-zoom');
      if (act === 'in') zoomCenter(1.2);
      else if (act === 'out') zoomCenter(1 / 1.2);
      else resetZoom();
      return;
    }
    if (e.target.closest('.sim-compare__close')) closeCompare();
  });

  setView(new URLSearchParams(location.search).get('view') === 'compare' ? 'compare' : 'grid', true);

  function ctx(f, lb) {
    var s = f._s;
    s.target = lb ? lb.img : s.img;
    s.btn = lb ? lb.play : s.gridPlay;
    s.st = lb ? lb.status : s.gridStatus;
    s.host = lb ? lb.panel : f;
  }
  function status(s, t) { if (s.st) s.st.textContent = t; }
  function icon(f, t) {
    var b = f._s.btn; if (!b) return;
    var sp = q(b, '.sim-play__icon');
    if (sp) sp.textContent = t;
    else b.textContent = t === '❚❚' ? '❚❚ 暂停' : t === '…' ? '… 载入中' : '▶ 播放';
  }
  function clearBox(f) { var s = f._s; if (s.box) { s.box.remove(); s.box = null; } }
  function busy(f, on) { f.setAttribute('aria-busy', on ? 'true' : 'false'); }
  function btnReset(f) {
    var b = f._s.btn; if (!b) return;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-disabled', 'false');
    b.setAttribute('aria-label', '播放动画：' + f.dataset.captionEn);
  }

  function reset(f) {
    var s = f._s, d = f.dataset;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    if (s.pre) { s.pre.onload = s.pre.onerror = null; s.pre.src = ''; s.pre = null; }
    clearBox(f);
    if (s.mode === 'PLAYING') s.target.src = d.poster;   // GIF -> 静帧，释放解码
    s.mode = 'POSTER';
    if (s.st) s.st.removeAttribute('data-error');
    icon(f, '▶'); btnReset(f); busy(f, false); status(s, '');
  }
  function restore(f) { reset(f); ctx(f, null); }
  function restoreAll() { figs.forEach(restore); }

  function load(f) {
    var s = f._s, d = f.dataset, pre = new Image();
    s.mode = 'LOADING'; busy(f, true);
    if (s.btn) {
      s.btn.setAttribute('aria-disabled', 'true');
      s.btn.setAttribute('aria-label', '动画载入中：' + d.captionEn);
    }
    icon(f, '…'); status(s, '动画载入中…');
    s.pre = pre;
    s.timer = setTimeout(function () { fail(f); }, 10000);
    pre.onload = function () {
      if (s.pre !== pre) return;
      clearTimeout(s.timer); s.timer = null; s.pre = null;
      s.mode = 'PLAYING'; s.target.src = d.gif;
      icon(f, '❚❚'); busy(f, false);
      if (s.btn) {
        s.btn.setAttribute('aria-pressed', 'true');
        s.btn.setAttribute('aria-disabled', 'false');
        s.btn.setAttribute('aria-label', '暂停动画（回到静帧）：' + d.captionEn);
      }
      status(s, '动画播放中，可暂停');
    };
    pre.onerror = function () { if (s.pre === pre) fail(f); };
    pre.src = d.gif;
  }

  function fail(f) {
    var s = f._s;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    if (s.pre) { s.pre.onload = s.pre.onerror = null; s.pre.src = ''; s.pre = null; }
    s.mode = 'ERROR'; busy(f, false); icon(f, '▶'); btnReset(f);
    status(s, '动画加载失败，当前显示静态首帧');
    if (s.st) s.st.setAttribute('data-error', 'true');
    clearBox(f);
    var b = D.createElement('div');
    b.className = 'sim-error';
    b.innerHTML = '<span class="sim-error__text">动画加载失败，当前显示静态首帧</span>' +
      '<button type="button" class="sim-error__btn">重试</button>';
    q(b, '.sim-error__btn').addEventListener('click', function () { clearBox(f); load(f); });
    s.host.appendChild(b); s.box = b;
  }

  function confirm(f) {
    var s = f._s;
    s.mode = 'CONFIRM'; status(s, '需要确认是否播放动画'); clearBox(f);
    var b = D.createElement('div');
    b.className = 'sim-confirm';
    b.setAttribute('role', 'group');
    b.setAttribute('aria-label', '动态内容确认');
    b.innerHTML = '<span>此图为动态仿真（循环播放）。</span>' +
      '<div class="sim-confirm__actions">' +
      '<button type="button" class="sim-confirm__btn" data-act="play">播放动画</button>' +
      '<button type="button" class="sim-confirm__btn" data-act="keep">保持静帧</button></div>';
    q(b, '[data-act="play"]').addEventListener('click', function () {
      s.confirmed = true; clearBox(f); load(f);
    });
    q(b, '[data-act="keep"]').addEventListener('click', function () {
      clearBox(f); s.mode = 'POSTER'; status(s, '');
    });
    s.host.appendChild(b); s.box = b;
    q(b, '[data-act="play"]').focus();
  }

  function toggle(f) {
    var s = f._s, d = f.dataset;
    if (!d.gif || !s.btn) return;
    if (s.mode === 'PLAYING') {
      reset(f);                                     // 保持当前上下文（灯箱内暂停不切回网格）
      status(s, '已暂停，显示静态首帧');
      s.timer = setTimeout(function () { if (s.mode === 'POSTER') status(s, ''); }, 2000);
      return;
    }
    if (s.mode === 'LOADING' || s.btn.getAttribute('aria-disabled') === 'true') return;
    if (s.mode === 'ERROR' || s.mode === 'CONFIRM') { clearBox(f); load(f); return; }
    if (reduce() && !s.confirmed) { confirm(f); return; }
    load(f);
  }

  /* ---------- 灯箱：单一 close() 收敛所有关闭路径 ---------- */
  var LB = {}, box = D.createElement('div');
  box.className = 'sim-lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'sim-lb-title');
  box.hidden = true;
  box.innerHTML =
    '<div class="sim-lightbox__overlay"></div>' +
    '<div class="sim-lightbox__panel">' +
      '<div class="sim-lightbox__head"><h2 id="sim-lb-title" class="sim-lightbox__title"></h2>' +
      '<button type="button" class="sim-lightbox__close" aria-label="关闭大图查看"></button></div>' +
      '<div class="sim-lightbox__media"><img class="sim-lightbox__img" alt=""></div>' +
      '<div class="sim-lightbox__foot">' +
        '<div class="sim-lightbox__caption"><span class="sim-lightbox__cz"></span>' +
        '<span class="sim-lightbox__ce"></span>' +
        '<span class="sim-lightbox__count" role="status" aria-live="polite"></span></div>' +
        '<div class="sim-lightbox__controls">' +
          '<button type="button" class="sim-lb-btn sim-lightbox__prev" aria-label="上一张">← 上一张</button>' +
          '<button type="button" class="sim-lb-btn sim-lightbox__next" aria-label="下一张">下一张 →</button>' +
          '<button type="button" class="sim-lb-btn sim-lightbox__play" aria-pressed="false" hidden>▶ 播放</button>' +
          '<a class="btn btn--inverse sim-lb-btn sim-lightbox__pdf" target="_blank" rel="noopener noreferrer" hidden>PDF <span aria-hidden="true">↗</span></a>' +
          '<div class="sim-lightbox__zoom">' +
            '<button type="button" class="sim-lb-btn" data-lbzoom="out" aria-label="缩小">−</button>' +
            '<button type="button" class="sim-lb-btn" data-lbzoom="reset" aria-label="恢复原始比例">1:1</button>' +
            '<button type="button" class="sim-lb-btn" data-lbzoom="in" aria-label="放大">+</button>' +
          '</div>' +
        '</div>' +
        '<span class="sim-lightbox__status" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  D.body.appendChild(box);
  LB.root = box; LB.overlay = q(box, '.sim-lightbox__overlay');
  LB.panel = q(box, '.sim-lightbox__panel'); LB.title = q(box, '.sim-lightbox__title');
  LB.media = q(box, '.sim-lightbox__media');
  LB.close = q(box, '.sim-lightbox__close'); LB.img = q(box, '.sim-lightbox__img');
  LB.cz = q(box, '.sim-lightbox__cz'); LB.ce = q(box, '.sim-lightbox__ce');
  LB.count = q(box, '.sim-lightbox__count'); LB.prev = q(box, '.sim-lightbox__prev');
  LB.next = q(box, '.sim-lightbox__next'); LB.play = q(box, '.sim-lightbox__play');
  LB.pdf = q(box, '.sim-lightbox__pdf'); LB.status = q(box, '.sim-lightbox__status');

  var cur = 0, lbOpen = false, trigger = null;

  /* 灯箱缩放：以指针为中心，1x–5x；拖拽平移；双击或 0 键复位 */
  var LZ = { s: 1, x: 0, y: 0 };
  function applyLZ() {
    LB.img.style.transform = 'translate(' + LZ.x + 'px,' + LZ.y + 'px) scale(' + LZ.s + ')';
  }
  function resetLZ() { LZ = { s: 1, x: 0, y: 0 }; applyLZ(); }
  function zoomLAt(px, py, factor) {
    var ns = Math.min(5, Math.max(1, LZ.s * factor));
    if (ns === LZ.s) return;
    LZ.x = px - (px - LZ.x) * (ns / LZ.s);
    LZ.y = py - (py - LZ.y) * (ns / LZ.s);
    LZ.s = ns;
    applyLZ();
  }
  function zoomLCenter(factor) {
    zoomLAt(LB.img.offsetLeft + LB.img.offsetWidth / 2,
      LB.img.offsetTop + LB.img.offsetHeight / 2, factor);
  }
  function lbPoint(e) {
    var mr = LB.media.getBoundingClientRect();
    return {
      x: e.clientX - mr.left - LB.img.offsetLeft,
      y: e.clientY - mr.top - LB.img.offsetTop
    };
  }

  function heading(f, sel, strip) {
    var host = f.closest(sel), h = host && q(host, strip.sel);
    if (!h) return '';
    var c = h.cloneNode(true), n = strip.cls && q(c, strip.cls);
    if (n) n.parentNode.removeChild(n);
    return c.textContent.trim();
  }
  function render(i) {
    cur = (i + N) % N;
    var f = figs[cur], d = f.dataset, gif = !!d.gif, src = q(f, '.sim-figure__img');
    restoreAll(); ctx(f, LB);
    LB.title.textContent = heading(f, '.sim-group', { sel: '.sim-group__title', cls: '.sim-group__count' }) +
      ' › ' + heading(f, '.sim-item', { sel: '.sim-item__title' }) + ' › 第 ' + (cur + 1) + ' 张';
    LB.cz.textContent = d.captionZh || '';
    LB.ce.textContent = d.captionEn || '';
    LB.count.textContent = '图 ' + (cur + 1) + ' / ' + N;
    LB.img.alt = src.alt; LB.img.width = src.width; LB.img.height = src.height;
    LB.img.src = d.poster; LB.status.textContent = '';
    resetLZ();
    LB.status.removeAttribute('data-error');
    LB.play.hidden = !gif;
    if (gif) { btnReset(f); icon(f, '▶'); }
    if (d.pdf) {
      LB.pdf.hidden = false; LB.pdf.href = d.pdf;
      LB.pdf.setAttribute('aria-label', '打开 PDF：' + d.captionEn + '（在新窗口打开）');
    } else { LB.pdf.hidden = true; LB.pdf.removeAttribute('href'); }
    if (!gif) {                                    // 静帧先显示，原图就绪后再升级，避免破图
      var p = new Image();
      p.onload = function () { if (lbOpen && figs[cur] === f) LB.img.src = d.full; };
      p.src = d.full;
    }
  }

  function open(i, el) {
    trigger = el; lbOpen = true;
    D.body.style.overflow = 'hidden';
    bg().forEach(function (n) {
      if ('inert' in n) n.inert = true; else n.setAttribute('aria-hidden', 'true');
    });
    box.hidden = false;
    void box.offsetWidth;                          // 强制回流让 opacity 过渡生效，不用 rAF
    box.classList.add('is-open');
    render(i);
    LB.close.focus();
  }
  function close() {
    if (!lbOpen) return;
    lbOpen = false;
    box.classList.remove('is-open');
    D.body.style.overflow = '';
    bg().forEach(function (n) {
      if ('inert' in n) n.inert = false;
      n.removeAttribute('aria-hidden');
    });
    restoreAll();
    resetLZ();
    if (trigger && trigger.focus) trigger.focus();
    setTimeout(function () { if (!lbOpen) box.hidden = true; }, reduce() ? 0 : 120);
  }
  function focusables() {
    return [].slice.call(LB.panel.querySelectorAll('button, a[href]'))
      .filter(function (el) { return !el.hidden && !el.disabled; });
  }

  LB.media.addEventListener('wheel', function (e) {
    e.preventDefault();
    var p = lbPoint(e);
    zoomLAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  var lbDrag = null;
  LB.media.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    lbDrag = { x: e.clientX, y: e.clientY, tx: LZ.x, ty: LZ.y };
    LB.media.classList.add('is-dragging');
    if (LB.media.setPointerCapture) LB.media.setPointerCapture(e.pointerId);
  });
  LB.media.addEventListener('pointermove', function (e) {
    if (!lbDrag) return;
    LZ.x = lbDrag.tx + (e.clientX - lbDrag.x);
    LZ.y = lbDrag.ty + (e.clientY - lbDrag.y);
    applyLZ();
  });
  function endLbDrag() { lbDrag = null; LB.media.classList.remove('is-dragging'); }
  LB.media.addEventListener('pointerup', endLbDrag);
  LB.media.addEventListener('pointercancel', endLbDrag);
  LB.media.addEventListener('dblclick', resetLZ);

  q(box, '.sim-lightbox__zoom').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lbzoom]');
    if (!b) return;
    var act = b.getAttribute('data-lbzoom');
    if (act === 'in') zoomLCenter(1.2);
    else if (act === 'out') zoomLCenter(1 / 1.2);
    else resetLZ();
  });

  LB.overlay.addEventListener('click', close);
  LB.close.addEventListener('click', close);
  LB.prev.addEventListener('click', function () { render(cur - 1); });
  LB.next.addEventListener('click', function () { render(cur + 1); });
  LB.play.addEventListener('click', function () { toggle(figs[cur]); });

  D.addEventListener('keydown', function (e) {
    if (!lbOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomLCenter(1.2); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomLCenter(1 / 1.2); return; }
    if (e.key === '0') { e.preventDefault(); resetLZ(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); render(cur - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); render(cur + 1); return; }
    if (e.key !== 'Tab') return;
    var l = focusables(); if (!l.length) return;
    var first = l[0], last = l[l.length - 1], a = D.activeElement;
    if (e.shiftKey && (a === first || l.indexOf(a) < 0)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || l.indexOf(a) < 0)) { e.preventDefault(); first.focus(); }
  });
  D.addEventListener('focusin', function (e) {
    if (lbOpen && !LB.panel.contains(e.target)) LB.close.focus();
  });
  window.addEventListener('popstate', function () { if (lbOpen) close(); });

  D.addEventListener('visibilitychange', function () {
    if (!D.hidden) return;
    restoreAll();                                  // 后台释放全部 GIF 解码
    if (lbOpen) ctx(figs[cur], LB);
  });

  /* ---------- 静帧懒加载增强：src 已写在 HTML 上（JS 关闭仍可见） ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.decode) e.target.decode().catch(function () {});
      });
    }, { rootMargin: '200px' });
    figs.forEach(function (f) { io.observe(f._s.img); });
  }
})();
