/**
 * Scroll reveal — one-off, opt-in, and invisible when it cannot run.
 *
 * Tags a few block-level elements with [data-reveal], marks everything already
 * in view as visible, and only then flips html.motion-ready so the CSS hiding
 * rule can never cause a first-paint flash. IntersectionObserver reveals each
 * remaining block once, then unobserves it. Under prefers-reduced-motion, or
 * without IntersectionObserver, this script returns immediately and the page is
 * simply fully visible.
 */
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  var SELECTOR = [
    ".page__content > h2",
    ".archive__subtitle",
    ".archive__item",
    ".sim-item"
  ].join(",");

  function init() {
    var nodes = [].slice.call(document.querySelectorAll(SELECTOR));
    if (!nodes.length) return;

    var vh = window.innerHeight || document.documentElement.clientHeight;
    var pending = [];
    var i;

    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hasAttribute("data-reveal")) continue;
      if (el.closest && el.closest("details")) continue;   /* folded content stays settled */
      el.setAttribute("data-reveal", "");
      if (el.getBoundingClientRect().top < vh) {
        el.classList.add("is-revealed");                   /* above the fold: no animation */
      } else {
        pending.push(el);
      }
    }

    /* Everything in view is already marked, so hiding the rest cannot flash. */
    document.documentElement.classList.add("motion-ready");
    if (!pending.length) return;

    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (!entries[j].isIntersecting) continue;
        entries[j].target.classList.add("is-revealed");
        io.unobserve(entries[j].target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    for (i = 0; i < pending.length; i++) {
      var node = pending[i];
      /* Cap the stagger at 5 steps so long lists never feel slow. */
      var step = 0;
      var sib = node.previousElementSibling;
      while (sib && step < 5) {
        if (sib.hasAttribute("data-reveal")) step++;
        sib = sib.previousElementSibling;
      }
      if (step) node.style.setProperty("--reveal-delay", (step * 30) + "ms");
      io.observe(node);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
