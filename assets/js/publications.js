/**
 * Publications library — filters, inline abstracts, copy citation.
 *
 * The page stays a plain markdown list. This module reads the existing
 * #abstract-data JSON, annotates every <li> with data-year / data-type /
 * data-topics, then builds the filter toolbar. With JS off nothing is hidden
 * and the list remains fully readable; the toolbar simply does not exist.
 */
(function () {
  "use strict";

  var TYPE_BY_SECTION = {
    "Publications": "journal",
    "Revision submitted": "preprint",
    "In revision": "preprint",
    "Submission": "preprint",
    "In Preparation": "preprint",
    "已授权专利": "patent",
    "二审专利": "patent",
    "在修改专利": "patent",
    "已受理专利": "patent",
    "软件著作权": "software"
  };

  var TYPE_LABEL = {
    journal: "期刊 / 会议",
    preprint: "在投 / 在准备",
    patent: "专利",
    software: "软件著作权"
  };

  var TOPIC_LABEL = {
    "phase-field": "相场",
    "topology": "拓扑优化",
    "additive": "增材制造",
    "fluid": "流体 / CFD",
    "image": "图像处理",
    "ml": "机器学习"
  };

  /* Ordered so the most specific field wins when an entry spans several. */
  var TOPIC_RULES = [
    ["phase-field", /phase[- ]field|cahn[- ]hilliard|allen[- ]cahn|lifshitz|nucleation|crystal|sintering|dendritic|grain boundary/i],
    ["topology", /topology optimization|triply periodic|\btpms\b|scaffold|shell[- ]infill|microstructure/i],
    ["additive", /3d printing|additive manufacturing|\bfdm\b|\bslm\b|selective laser|laser melting|fused deposition|printing|powder/i],
    ["fluid", /fluid|navier[- ]stokes|\bflow\b|\bcfd\b|combustion|heat transfer|boiling|convection|hydrodynamic|surfactant|thermal/i],
    ["image", /\bimage\b|fingerprint|restoration|\bcolor\b|segmentation/i],
    ["ml", /neural|\bvae\b|\blstm\b|data assimilation|reduced[- ]order|kalman|attention|machine learning/i]
  ];

  function init() {
    /* publications uses the archive layout; other pages may use page__content. */
    var content = document.querySelector(".page__content, .archive");
    if (!content) return;

    var dataEl = document.getElementById("abstract-data");
    var abstracts = {};
    if (dataEl) {
      try { abstracts = JSON.parse(dataEl.textContent); } catch (e) { abstracts = {}; }
    }

    /* Pair each list with the nearest preceding h2 to derive its type. */
    var items = [];
    var lists = content.querySelectorAll("ol, ul");

    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      if (list.closest(".pub-toolbar, .pagination, .page__related")) continue;

      var head = list.previousElementSibling;
      while (head && head.tagName !== "H2") head = head.previousElementSibling;
      /* page-tools.js may append a "#" anchor to h2; strip it before matching. */
      var section = head ? head.textContent.replace(/#\s*$/, "").trim() : "";
      var type = TYPE_BY_SECTION[section] || "journal";

      for (var j = 0; j < list.children.length; j++) {
        var li = list.children[j];
        if (li.tagName !== "LI") continue;
        items.push({ el: li, type: type });
      }
    }

    if (!items.length) return;

    /* Annotate: year from the JSON record, else the last 4-digit year in text. */
    items.forEach(function (item) {
      var li = item.el;
      var btn = li.querySelector(".abstract-trigger[data-abstract-key]");
      var key = btn ? btn.getAttribute("data-abstract-key") : "";
      var rec = key ? abstracts[key] : null;
      var text = li.textContent;

      var year = rec && rec.year ? String(rec.year) : "";
      if (!year) {
        var found = text.match(/\b(19|20)\d{2}\b/g);
        if (found) year = found[found.length - 1];
      }

      var hay = text + (rec ? " " + (rec.title || "") + " " + (rec.abstract || "") : "");
      var topics = [];
      TOPIC_RULES.forEach(function (rule) {
        if (rule[1].test(hay)) topics.push(rule[0]);
      });
      if (!topics.length) topics.push("other");

      li.classList.add("pub-item");
      li.setAttribute("data-year", year);
      li.setAttribute("data-type", item.type);
      li.setAttribute("data-topics", topics.join(" "));
      item.year = year;
      item.topics = topics;
    });

    var firstH2 = content.querySelector("h2");
    if (!firstH2) return;

    /* ── Toolbar ────────────────────────────────────────────────────────── */
    var toolbar = document.createElement("div");
    toolbar.className = "pub-toolbar";
    toolbar.setAttribute("role", "search");
    toolbar.setAttribute("aria-label", "论文筛选");

    var years = [];
    items.forEach(function (it) {
      if (it.year && years.indexOf(it.year) === -1) years.push(it.year);
    });
    years.sort(function (a, b) { return b.localeCompare(a); });

    var types = [];
    items.forEach(function (it) {
      if (types.indexOf(it.type) === -1) types.push(it.type);
    });

    var topics = [];
    items.forEach(function (it) {
      it.topics.forEach(function (t) {
        if (t !== "other" && topics.indexOf(t) === -1) topics.push(t);
      });
    });
    topics.sort();

    var state = { year: "", type: "", topic: "" };
    var groups = {};

    function makeGroup(name, label, options, display) {
      var row = document.createElement("div");
      row.className = "pub-filter";
      row.setAttribute("data-filter", name);

      var caption = document.createElement("span");
      caption.className = "pub-filter__label";
      caption.textContent = label;
      row.appendChild(caption);

      var all = document.createElement("button");
      all.type = "button";
      all.className = "pub-chip";
      all.setAttribute("data-value", "");
      all.setAttribute("aria-pressed", "true");
      all.textContent = "全部";
      row.appendChild(all);

      options.forEach(function (value) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "pub-chip";
        chip.setAttribute("data-value", value);
        chip.setAttribute("aria-pressed", "false");
        chip.textContent = display(value);
        row.appendChild(chip);
      });

      groups[name] = row;
      toolbar.appendChild(row);
    }

    makeGroup("year", "年份", years, function (v) { return v; });
    makeGroup("type", "类型", types, function (v) { return TYPE_LABEL[v] || v; });
    makeGroup("topic", "主题", topics, function (v) { return TOPIC_LABEL[v] || v; });

    var foot = document.createElement("div");
    foot.className = "pub-toolbar__foot";

    var count = document.createElement("p");
    count.className = "pub-count";
    count.setAttribute("role", "status");
    count.setAttribute("aria-live", "polite");

    var reset = document.createElement("button");
    reset.type = "button";
    reset.className = "pub-reset";
    reset.textContent = "清除筛选";
    reset.hidden = true;

    foot.appendChild(count);
    foot.appendChild(reset);
    toolbar.appendChild(foot);

    /* Put the toolbar after the "First Author" note, directly above the list. */
    var firstList = firstH2.nextElementSibling;
    while (firstList && firstList.tagName !== "OL" && firstList.tagName !== "UL") {
      firstList = firstList.nextElementSibling;
    }
    if (firstList) firstList.insertAdjacentElement("beforebegin", toolbar);
    else firstH2.insertAdjacentElement("afterend", toolbar);

    var empty = document.createElement("p");
    empty.className = "pub-empty";
    empty.textContent = "没有匹配的条目，试试清除筛选。";
    empty.hidden = true;
    toolbar.insertAdjacentElement("afterend", empty);

    function apply() {
      var shown = 0;
      items.forEach(function (it) {
        var ok = true;
        if (state.year && it.year !== state.year) ok = false;
        if (state.type && it.type !== state.type) ok = false;
        if (state.topic && it.topics.indexOf(state.topic) === -1) ok = false;
        it.el.hidden = !ok;
        if (ok) shown++;
      });
      count.textContent = "显示 " + shown + " / " + items.length + " 条";
      empty.hidden = shown !== 0;
      reset.hidden = !(state.year || state.type || state.topic);
    }

    function syncUrl() {
      if (!window.history || !window.history.replaceState) return;
      var params = new URLSearchParams(location.search);
      ["year", "type", "topic"].forEach(function (k) {
        if (state[k]) params.set(k, state[k]);
        else params.delete(k);
      });
      var q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    }

    function setFilter(name, value) {
      state[name] = value;
      var chips = groups[name].querySelectorAll(".pub-chip");
      for (var n = 0; n < chips.length; n++) {
        chips[n].setAttribute(
          "aria-pressed",
          chips[n].getAttribute("data-value") === value ? "true" : "false"
        );
      }
      apply();
      syncUrl();
    }

    Object.keys(groups).forEach(function (name) {
      groups[name].addEventListener("click", function (event) {
        var chip = event.target.closest(".pub-chip");
        if (!chip) return;
        setFilter(name, chip.getAttribute("data-value"));
      });
    });

    reset.addEventListener("click", function () {
      setFilter("year", "");
      setFilter("type", "");
      setFilter("topic", "");
    });

    var params = new URLSearchParams(location.search);
    ["year", "type", "topic"].forEach(function (k) {
      var value = params.get(k);
      if (!value) return;
      var chip = groups[k] && groups[k].querySelector('.pub-chip[data-value="' + value + '"]');
      if (chip) setFilter(k, value);
    });
    apply();

    /* ── Inline abstract + copy citation ──────────────────────────────── */
    items.forEach(function (item) {
      var li = item.el;
      var btn = li.querySelector(".abstract-trigger[data-abstract-key]");
      if (!btn) return;

      var key = btn.getAttribute("data-abstract-key");
      var rec = abstracts[key];
      if (!rec) return;

      var panel = document.createElement("div");
      panel.className = "pub-abstract";
      panel.hidden = true;
      panel.id = "abs-" + key.replace(/[^\w-]+/g, "-");

      if (rec.title) {
        var title = document.createElement("p");
        title.className = "pub-abstract__title";
        title.textContent = rec.title;
        panel.appendChild(title);
      }

      var metaBits = [rec.authors, rec.journal, rec.year].filter(Boolean);
      if (metaBits.length) {
        var meta = document.createElement("p");
        meta.className = "pub-abstract__meta";
        meta.textContent = metaBits.join(" · ");
        panel.appendChild(meta);
      }

      if (rec.badges && rec.badges.length) {
        var badges = document.createElement("div");
        badges.className = "pub-abstract__badges";
        rec.badges.forEach(function (badge) {
          var span = document.createElement("span");
          span.className = "pub-abstract__badge";
          span.textContent = badge.label;
          badges.appendChild(span);
        });
        panel.appendChild(badges);
      }

      var body = document.createElement("p");
      body.className = "pub-abstract__body";
      body.textContent = rec.abstract || "";
      panel.appendChild(body);
      li.appendChild(panel);

      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", panel.id);
      btn.setAttribute("aria-haspopup", "false");
      btn.addEventListener("click", function () {
        var opening = panel.hidden;
        panel.hidden = !opening;
        btn.setAttribute("aria-expanded", opening ? "true" : "false");
        btn.textContent = opening ? "收起摘要" : "Abstract";
      });

      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "pub-copy";
      copyBtn.textContent = "复制引用";
      copyBtn.addEventListener("click", function () {
        var clone = li.cloneNode(true);
        var junk = clone.querySelectorAll(".pub-actions, .pub-abstract, button");
        for (var k = 0; k < junk.length; k++) {
          if (junk[k].parentNode) junk[k].parentNode.removeChild(junk[k]);
        }
        var text = clone.textContent.replace(/\s+/g, " ").trim();
        /* Resolve at click time: page-tools.js may finish after this module. */
        var tools = window.siteTools || {};
        var write = tools.copy || function (t) {
          return navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject();
        };
        write(text).then(function () {
          if (tools.toast) tools.toast("引用已复制");
        }).catch(function () {
          if (tools.toast) tools.toast("复制失败，请手动选择");
        });
      });

      var wrap = document.createElement("span");
      wrap.className = "pub-actions";
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);
      wrap.appendChild(copyBtn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
