/** D2L Dark Mode — Detection Helpers */

(function () {
  'use strict';

  var D2L = window.D2L = window.D2L || {};

  /** Visits root and every shadow root beneath it. Hot path: do per-root work in one pass. */
  D2L.forEachRoot = function (root, callback) {
    if (!root) return;
    var pending = [root];
    while (pending.length) {
      var node = pending.pop();
      callback(node);
      if (node.shadowRoot) pending.push(node.shadowRoot);
      var elements = node.querySelectorAll ? node.querySelectorAll('*') : [];
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].shadowRoot) pending.push(elements[i].shadowRoot);
      }
    }
  };

  /** True for a ShadowRoot. <a> and <area> have a .host property too, hence nodeType. */
  D2L.isShadowRoot = function (node) {
    return !!node && node.nodeType === 11 && !!node.host;
  };

  /** Calls back with every shadow root under `root`, excluding `root` itself. */
  D2L.walkShadowRoots = function (root, callback) {
    D2L.forEachRoot(root, function (node) {
      if (node !== root && D2L.isShadowRoot(node)) callback(node);
    });
  };
})();
