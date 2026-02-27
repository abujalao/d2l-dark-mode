/** D2L Dark Mode — Detection Helpers */

(function () {
  'use strict';

  var D2L = window.D2L = window.D2L || {};

  /** Recursively walks all shadow roots under a root, calling callback on each. */
  D2L.walkShadowRoots = function (root, callback) {
    if (!root) return;
    if (root.shadowRoot) {
      callback(root.shadowRoot);
      D2L.walkShadowRoots(root.shadowRoot, callback);
    }
    var elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].shadowRoot) {
        callback(elements[i].shadowRoot);
        D2L.walkShadowRoots(elements[i].shadowRoot, callback);
      }
    }
  };
})();
