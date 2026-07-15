/**
 * Academic Lineage Tree v3 — enriched with flags + notable contributions.
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

    container.innerHTML = '';
    container.className = 'lineage-tree';

    // Central spine
    var spine = document.createElement('div');
    spine.className = 'lineage-tree__spine';
    container.appendChild(spine);

    // Terminus dot
    var terminus = document.createElement('div');
    terminus.className = 'lineage-tree__terminus';
    container.appendChild(terminus);

    // Ancestors (all except last)
    for (var i = 0; i < people.length - 1; i++) {
      container.appendChild(buildNode(people[i], false));
    }

    // Current person (last)
    container.appendChild(buildNode(people[people.length - 1], true));

    positionTerminus();

    function buildNode(p, isCurrent) {
      var node = document.createElement('div');
      node.className = 'lineage-node' + (isCurrent ? ' lineage-node--current' : '');

      // ── Flag ──
      var flag = document.createElement('span');
      flag.className = 'lineage-node__flag';
      flag.textContent = p.flag || '';
      node.appendChild(flag);

      // ── Name ──
      var nameEl = document.createElement('span');
      nameEl.className = 'lineage-node__name';
      nameEl.textContent = p.name;
      node.appendChild(nameEl);

      // ── Degree + year ──
      var meta = document.createElement('span');
      meta.className = 'lineage-node__meta';
      meta.textContent = p.degree + ' ' + p.year;
      node.appendChild(meta);

      // ── University ──
      var uni = document.createElement('span');
      uni.className = 'lineage-node__uni';
      uni.textContent = p.uni;
      node.appendChild(uni);

      // ── Current affiliation ──
      if (p.current) {
        var cur = document.createElement('span');
        cur.className = 'lineage-node__current';
        cur.textContent = p.current;
        node.appendChild(cur);
      }

      // ── Notable contribution (subtle) ──
      if (p.note) {
        var note = document.createElement('span');
        note.className = 'lineage-node__note';
        note.textContent = p.note;
        node.appendChild(note);
      }

      return node;
    }

    function positionTerminus() {
      var nodes = container.querySelectorAll('.lineage-node:not(.lineage-node--current)');
      var lastAncestor = nodes[nodes.length - 1];
      if (!lastAncestor) return;
      var cr = container.getBoundingClientRect();
      var lr = lastAncestor.getBoundingClientRect();
      terminus.style.top = (lr.bottom - cr.top + 8) + 'px';
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(positionTerminus, 200);
    });

    setTimeout(positionTerminus, 400);
    setTimeout(positionTerminus, 1000);
  }
})();
