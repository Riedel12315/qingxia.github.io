/**
 * Academic Lineage Tree — renders a premium glass-cascade genealogy.
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

    // ── Read data from embedded JSON ──
    var dataScript = container.querySelector('script[type="application/json"]');
    if (!dataScript) return;
    var people;
    try { people = JSON.parse(dataScript.textContent); } catch (e) { return; }
    if (!people || !people.length) return;

    // ── Clear container, remove loading ──
    container.innerHTML = '';
    container.className = 'lineage-tree';

    // ── Build nodes ──
    // Alternate left/right, except the last (current person) which is centered
    var isLeft = true;

    for (var i = 0; i < people.length; i++) {
      var p = people[i];
      var isLast = (i === people.length - 1);

      // Gen marker dot on the central line
      var marker = document.createElement('div');
      marker.className = 'lineage-gen-marker' + (isLast ? ' highlight' : '');
      marker.style.top = '0px'; // Will be positioned relative to node
      container.appendChild(marker);

      // Node card
      var node = document.createElement('div');
      node.className = 'lineage-node';
      if (isLast) {
        node.className += ' current';
      } else {
        node.className += isLeft ? ' left' : ' right';
        isLeft = !isLeft;
      }

      // Gen badge
      var badge = document.createElement('div');
      badge.className = 'lineage-gen-badge';
      badge.textContent = 'Gen ' + p.gen;
      node.appendChild(badge);

      // Name
      var nameEl = document.createElement('div');
      nameEl.className = 'lineage-node__name';
      nameEl.textContent = p.name;
      node.appendChild(nameEl);

      // Meta: degree + year + uni
      var meta = document.createElement('div');
      meta.className = 'lineage-node__meta';
      meta.innerHTML = '<span>' + p.degree + '</span> · ' + p.year + '<br>' + p.uni;
      node.appendChild(meta);

      // Current institution (if different from PhD uni)
      if (p.current) {
        var inst = document.createElement('div');
        inst.className = 'lineage-node__inst';
        inst.textContent = '📍 ' + p.current;
        node.appendChild(inst);
      }

      container.appendChild(node);
    }

    // ── Position gen markers after layout ──
    requestAnimationFrame(function () {
      var markers = container.querySelectorAll('.lineage-gen-marker');
      var nodes = container.querySelectorAll('.lineage-node');
      // Skip the first marker (there's one per node)
      for (var j = 0; j < nodes.length; j++) {
        var nodeRect = nodes[j].getBoundingClientRect();
        var containerRect = container.getBoundingClientRect();
        var markerY = nodeRect.top - containerRect.top + nodeRect.height / 2;
        if (markers[j]) {
          markers[j].style.top = markerY + 'px';
        }
      }
    });

    // ── Re-position on resize ──
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var m = container.querySelectorAll('.lineage-gen-marker');
        var n = container.querySelectorAll('.lineage-node');
        var cr = container.getBoundingClientRect();
        for (var k = 0; k < n.length; k++) {
          var nr = n[k].getBoundingClientRect();
          if (m[k]) {
            m[k].style.top = (nr.top - cr.top + nr.height / 2) + 'px';
          }
        }
      }, 200);
    });
  }
})();
