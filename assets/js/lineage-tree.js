/**
 * Academic Lineage Tree v2 — compact, elegant cascade.
 * Central spine stops before current person. No Gen badges.
 */
(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var container = document.getElementById('lineage-tree');
    if (!container) return;

    var dataScript = container.querySelector('script[type="application/json"]');
    if (!dataScript) return;
    var people;
    try { people = JSON.parse(dataScript.textContent); } catch (e) { return; }
    if (!people || !people.length) return;

    // ── Clear ──
    container.innerHTML = '';
    container.className = 'lineage-tree';

    // ── Central spine ──
    var spine = document.createElement('div');
    spine.className = 'lineage-tree__spine';
    container.appendChild(spine);

    // ── Terminus dot (end of line, before current person) ──
    var terminus = document.createElement('div');
    terminus.className = 'lineage-tree__terminus';
    container.appendChild(terminus);

    // ── Render ancestors (all except last) ──
    for (var i = 0; i < people.length - 1; i++) {
      container.appendChild(buildNode(people[i], false));
    }

    // ── Render current person (last item) ──
    container.appendChild(buildNode(people[people.length - 1], true));

    // ── Position terminus dot at end of spine ──
    positionTerminus();

    function buildNode(p, isCurrent) {
      var node = document.createElement('div');
      node.className = 'lineage-node' + (isCurrent ? ' lineage-node--current' : '');

      // Name
      var nameEl = document.createElement('span');
      nameEl.className = 'lineage-node__name';
      nameEl.textContent = p.name;
      node.appendChild(nameEl);

      // Meta: degree + year
      var meta = document.createElement('span');
      meta.className = 'lineage-node__meta';
      meta.textContent = p.degree + ' ' + p.year;
      node.appendChild(meta);

      // University
      var uni = document.createElement('span');
      uni.className = 'lineage-node__uni';
      uni.textContent = p.uni;
      node.appendChild(uni);

      // Current affiliation (if different)
      if (p.current) {
        var cur = document.createElement('span');
        cur.className = 'lineage-node__current';
        cur.textContent = p.current;
        node.appendChild(cur);
      }

      return node;
    }

    function positionTerminus() {
      var nodes = container.querySelectorAll('.lineage-node:not(.lineage-node--current)');
      var lastAncestor = nodes[nodes.length - 1];
      if (!lastAncestor) return;
      var cr = container.getBoundingClientRect();
      var lr = lastAncestor.getBoundingClientRect();
      var y = lr.bottom - cr.top + 8;
      terminus.style.top = y + 'px';
    }

    // ── Reposition on resize ──
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(positionTerminus, 200);
    });

    // ── Delay to let fonts load ──
    setTimeout(positionTerminus, 400);
    setTimeout(positionTerminus, 1000);
  }
})();
