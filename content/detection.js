/**
 * D2L Dark Mode — Brightspace Detection Helpers
 * Utility functions for Brightspace detection.
 * Orchestration (initIfBrightspace) has moved to gate.js.
 */

(function () {
  'use strict';

  var D2L = window.D2L = window.D2L || {};
  var CFG = window.D2LConfig;

  /**
   * Fast synchronous check: URL path, data attribute, or known host.
   */
  D2L.isBrightspace = function () {
    var url = window.location.href;
    if (CFG.PATTERNS.D2L_PATH.test(url)) return true;
    if (document.documentElement.hasAttribute('data-app-version')) return true;
    var hostname = window.location.hostname;
    if (CFG.KNOWN_HOSTS.some(function (h) { return hostname === h || hostname.endsWith('.' + h); })) return true;
    return false;
  };

  /**
   * Deferred DOM-based check (runs after DOMContentLoaded).
   */
  D2L.isBrightspaceDeferred = function () {
    return !!document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR);
  };

  /**
   * Returns true when this frame is a cross-origin child (e.g. Echo360,
   * YouTube embed). These frames should NOT run the dark mode logic.
   */
  D2L.isCrossOriginChild = function () {
    if (window.self === window.top) return false;
    try {
      void window.parent.document; // throws if cross-origin
      return false;
    } catch (e) {
      return true;
    }
  };
})();
