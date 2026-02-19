/**
 * D2L Dark Mode — Brightspace Detection
 * Determines whether the current page is a Brightspace instance.
 */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

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

  /**
   * Orchestrates Brightspace detection with deferred fallback.
   * @param {string[]} customDomains
   * @param {Function} callback - called once if Brightspace is detected
   */
  D2L.initIfBrightspace = function (customDomains, callback) {
    var hostname = window.location.hostname;

    if (D2L.isBrightspace()) {
      callback();
      return;
    }

    if (customDomains.some(function (d) { return hostname === d || hostname.endsWith('.' + d); })) {
      callback();
      return;
    }

    // Cross-origin child frames that didn't pass strict checks are third-party
    // embeds (video players, widgets, etc.) — skip them.
    if (D2L.isCrossOriginChild()) return;

    // Deferred check after DOM loads (top frame & same-origin children only)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        if (D2L.isBrightspaceDeferred()) callback();
      }, { once: true });
    } else {
      if (D2L.isBrightspaceDeferred()) callback();
    }
  };
})();
