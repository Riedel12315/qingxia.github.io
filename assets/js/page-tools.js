/**
 * Page tools — reading progress, heading anchor copying, copy toast.
 *
 * Functional, not decorative: the progress bar only appears on pages longer
 * than about one and a half screens, heading anchors only on hover/focus, and
 * the toast only after an explicit copy. Exposes window.siteTools so the
 * publications module can reuse the same clipboard + toast implementation.
 */
(function () {
  "use strict";

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  var toastTimer = 0;

  function toast(message) {
    var el = document.getElementById("site-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "site-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 1800);
  }

  window.siteTools = { copy: copy, toast: toast };

  /* ── Reading progress ─────────────────────────────────────────────────── */
  var bar = document.createElement("div");
  bar.id = "read-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  var ticking = false;

  function updateProgress() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var y = window.pageYOffset || doc.scrollTop || 0;
    var ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    bar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
    /* Only meaningful when there is real distance to scroll. */
    bar.classList.toggle("is-visible", max > window.innerHeight * 0.6);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateProgress);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateProgress();

  /* ── Heading anchors ──────────────────────────────────────────────────── */
  function slug(text) {
    return text.trim().toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  var heads = document.querySelectorAll(".page__content h2, .archive h2");
  for (var i = 0; i < heads.length; i++) {
    (function (h) {
      if (!h.id) h.id = slug(h.textContent);
      var anchor = document.createElement("a");
      anchor.className = "heading-anchor";
      anchor.href = "#" + h.id;
      anchor.setAttribute("aria-label", "复制此节链接");
      anchor.textContent = "#";
      anchor.addEventListener("click", function (event) {
        event.preventDefault();
        var url = location.origin + location.pathname + "#" + h.id;
        copy(url).then(function () {
          toast("链接已复制");
        }).catch(function () {
          location.hash = h.id;
        });
      });
      h.appendChild(anchor);
    })(heads[i]);
  }
})();
