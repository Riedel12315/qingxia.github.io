/**
 * Nav lens — a pointer-following magnifier over the top navigation.
 *
 * Desktop fine pointers only. The lens is decoration on top of the existing
 * hover state, so it is skipped entirely for touch, reduced motion, or when the
 * DOM APIs below are missing. Each menu link gets one reusable lens element:
 * a clipped copy of its own label, scaled about the cursor so the glyph under
 * the pointer stays put while the surrounding text grows.
 */
(function () {
  "use strict";

  if (!window.matchMedia || !document.createElement) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var RADIUS = 28;   /* lens radius in px — a little over one line of nav text */
  var SCALE = 1.55;  /* magnification — enough to read, not enough to distort */
  var SELECTOR = ".greedy-nav .visible-links li:not(:first-child) a";

  function labelBox(a) {
    var ar = a.getBoundingClientRect();
    var range = document.createRange();
    range.selectNodeContents(a);
    var tr = range.getBoundingClientRect();
    if (range.detach) range.detach();
    return { host: ar, x: tr.left - ar.left, y: tr.top - ar.top, width: tr.width };
  }

  function build(a) {
    if (a.__navLens) return a.__navLens;

    var label = a.textContent.trim();
    if (!label) return null;

    var box = labelBox(a);
    if (!box.width) return null;

    var lens = document.createElement("span");
    lens.className = "nav-lens";
    lens.setAttribute("aria-hidden", "true");
    lens.style.setProperty("--r", RADIUS + "px");
    lens.style.setProperty("--s", SCALE);

    var inner = document.createElement("span");
    inner.className = "nav-lens__inner";

    var text = document.createElement("span");
    text.className = "nav-lens__text";
    text.textContent = label;
    text.style.left = box.x + "px";
    text.style.top = box.y + "px";
    inner.appendChild(text);

    var ring = document.createElement("span");
    ring.className = "nav-lens__ring";

    lens.appendChild(inner);
    lens.appendChild(ring);
    a.appendChild(lens);

    lens.__text = text;
    lens.__box = box;
    a.__navLens = lens;
    return lens;
  }

  function place(lens, ev) {
    var box = lens.__box;
    var lx = ev.clientX - box.host.left;
    var ly = ev.clientY - box.host.top;
    if (lx < 0 || ly < 0 || lx > box.host.width || ly > box.host.height) return;

    lens.style.setProperty("--lx", lx + "px");
    lens.style.setProperty("--ly", ly + "px");
    /* Scale about the cursor, offset into the label's own coordinate space. */
    lens.__text.style.transformOrigin =
      (lx - box.x) + "px " + (ly - box.y) + "px";
  }

  var frame = 0;
  var next = null;

  function flush() {
    frame = 0;
    if (!next) return;
    place(next.lens, next.event);
    next = null;
  }

  document.addEventListener("pointerover", function (ev) {
    var a = ev.target.closest && ev.target.closest(SELECTOR);
    if (!a) return;
    var lens = build(a);
    if (!lens) return;
    place(lens, ev);
    lens.classList.add("is-active");
  }, true);

  document.addEventListener("pointermove", function (ev) {
    var a = ev.target.closest && ev.target.closest(SELECTOR);
    if (!a || !a.__navLens) return;
    next = { lens: a.__navLens, event: ev };
    if (!frame) frame = requestAnimationFrame(flush);
  }, { capture: true, passive: true });

  document.addEventListener("pointerout", function (ev) {
    var a = ev.target.closest && ev.target.closest(SELECTOR);
    if (!a || !a.__navLens) return;
    if (ev.relatedTarget && a.contains(ev.relatedTarget)) return;
    a.__navLens.classList.remove("is-active");
  }, true);

  /* Webfonts can land after first paint and shift the label; drop the cached
     lenses once so the next hover re-measures against the final metrics. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      var existing = document.querySelectorAll(".nav-lens");
      for (var i = 0; i < existing.length; i++) existing[i].remove();
      var links = document.querySelectorAll(SELECTOR);
      for (var j = 0; j < links.length; j++) delete links[j].__navLens;
    });
  }
})();
