/** D2L Dark Mode — Brightspace Detection Helpers */

(function () {
  'use strict';

  var D2L = window.D2L = window.D2L || {};
  var CFG = window.D2LConfig;

  /** Fast synchronous Brightspace check. */
  D2L.isBrightspace = function () {
    var url = window.location.href;
    if (CFG.PATTERNS.D2L_PATH.test(url)) return true;
    var htmlEl = document.documentElement;
    if (htmlEl.hasAttribute('data-app-version')
      && (htmlEl.getAttribute('data-cdn') || '').indexOf('brightspace') !== -1) return true;
    var hostname = window.location.hostname;
    if (CFG.KNOWN_HOSTS.some(function (h) { return hostname === h || hostname.endsWith('.' + h); })) return true;
    return false;
  };

  /** Deferred DOM-based Brightspace check. */
  D2L.isBrightspaceDeferred = function () {
    return !!document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR);
  };

  /** Returns true for cross-origin child frames (should not run dark mode). */
  D2L.isCrossOriginChild = function () {
    if (window.self === window.top) return false;
    try {
      void window.parent.document;
      return false;
    } catch (e) {
      return true;
    }
  };
})();
