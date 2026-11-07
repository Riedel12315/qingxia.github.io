/**
 * Academic lineage tree — progressive enhancement ONLY.
 * The nine scholars are server-rendered as a static <ol> in cv.md; this script
 * must never clear or replace that content (works with JS disabled / blocked).
 */
(function () {
  'use strict';

  function init() {
    var tree = document.getElementById('lineage-tree');
    if (!tree) return;

    tree.classList.add('lineage-tree--enhanced');
    tree.setAttribute('aria-label', 'Academic lineage, nine scholars in order');

    var current = tree.querySelector('.lineage-node--current');
    if (current) current.setAttribute('aria-current', 'step');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
