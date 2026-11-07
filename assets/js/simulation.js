/* assets/js/simulation.js — 只读 DOM data-*，不加载任何外部 JSON/YAML。
   Jekyll 页与静态预览页共用本文件；JS 失败/关闭时自动退回纯静态网格。 */
(function () {
  'use strict';
  var D = document, page = D.querySelector('.sim-page');
  if (!page) return;
  var figs = [].slice.call(page.querySelectorAll('.sim-figure')), N = figs.length;
  if (!N) return;

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
      e.preventDefault(); open(figs.indexOf(f), this);   // DOM 顺序即扁平 0..15，不依赖计数器运行时值
    });
    if (gp) gp.addEventListener('click', function () { toggle(f); });
  });

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
        '</div>' +
        '<span class="sim-lightbox__status" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  D.body.appendChild(box);
  LB.root = box; LB.overlay = q(box, '.sim-lightbox__overlay');
  LB.panel = q(box, '.sim-lightbox__panel'); LB.title = q(box, '.sim-lightbox__title');
  LB.close = q(box, '.sim-lightbox__close'); LB.img = q(box, '.sim-lightbox__img');
  LB.cz = q(box, '.sim-lightbox__cz'); LB.ce = q(box, '.sim-lightbox__ce');
  LB.count = q(box, '.sim-lightbox__count'); LB.prev = q(box, '.sim-lightbox__prev');
  LB.next = q(box, '.sim-lightbox__next'); LB.play = q(box, '.sim-lightbox__play');
  LB.pdf = q(box, '.sim-lightbox__pdf'); LB.status = q(box, '.sim-lightbox__status');

  var cur = 0, lbOpen = false, trigger = null;

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
    if (trigger && trigger.focus) trigger.focus();
    setTimeout(function () { if (!lbOpen) box.hidden = true; }, reduce() ? 0 : 120);
  }
  function focusables() {
    return [].slice.call(LB.panel.querySelectorAll('button, a[href]'))
      .filter(function (el) { return !el.hidden && !el.disabled; });
  }

  LB.overlay.addEventListener('click', close);
  LB.close.addEventListener('click', close);
  LB.prev.addEventListener('click', function () { render(cur - 1); });
  LB.next.addEventListener('click', function () { render(cur + 1); });
  LB.play.addEventListener('click', function () { toggle(figs[cur]); });

  D.addEventListener('keydown', function (e) {
    if (!lbOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
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
