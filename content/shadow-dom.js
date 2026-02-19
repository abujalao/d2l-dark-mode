/**
 * D2L Dark Mode — Shadow DOM Observer
 * Injects counter-inversion styles into shadow roots and observes for new ones.
 */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /* ---- Private state (IIFE closure) ---- */
  var shadowObserver = null;
  var shadowObservers = new Set();
  var rescanInterval = null;

  /* ---- Shared stylesheet for shadow roots ---- */
  D2L.sharedShadowSheet = new CSSStyleSheet();

  /**
   * Builds shadow DOM CSS for counter-inverting media elements.
   * @param {boolean} includeCanvas - whether to counter-invert canvas elements
   * @returns {string}
   */
  D2L.buildShadowCSS = function (includeCanvas) {
    var media = includeCanvas ? 'img, video, canvas, picture' : 'img, video, picture';
    return '\n' +
      '    ' + media + ' {\n' +
      '      filter: invert(1) hue-rotate(180deg) !important;\n' +
      '    }\n' +
      '    :popover-open {\n' +
      '      filter: invert(1) hue-rotate(180deg) !important;\n' +
      '    }\n' +
      '    :host(:popover-open) {\n' +
      '      filter: invert(1) hue-rotate(180deg) !important;\n' +
      '    }\n' +
      '    :popover-open :is(' + media + ') {\n' +
      '      filter: invert(1) hue-rotate(180deg) !important;\n' +
      '    }\n';
  };

  // Default: include canvas. applyDocDarkMode() will update this for child frames.
  D2L.sharedShadowSheet.replaceSync(D2L.buildShadowCSS(true));

  /**
   * Starts the MutationObserver on document.documentElement and periodic rescan.
   */
  D2L.startShadowObserver = function () {
    D2L.injectAllShadowRoots(document.documentElement);

    if (shadowObserver) return;

    shadowObserver = new MutationObserver(D2L.handleMutations);
    shadowObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    shadowObservers.add(shadowObserver);

    // Safety net for lazy-loaded web components and late-arriving video iframes
    if (!rescanInterval) {
      rescanInterval = setInterval(function () {
        D2L.injectAllShadowRoots(document.documentElement);
        D2L.applyVideoMode();
      }, CFG.TIMING.RESCAN_INTERVAL_MS);

      setTimeout(function () {
        if (rescanInterval) {
          clearInterval(rescanInterval);
          rescanInterval = null;
        }
      }, CFG.TIMING.RESCAN_TIMEOUT_MS);
    }
  };

  /**
   * Processes added nodes: injects shadow styles and applies video mode to new iframes.
   */
  D2L.handleMutations = function (mutations) {
    for (var m = 0; m < mutations.length; m++) {
      var addedNodes = mutations[m].addedNodes;
      for (var n = 0; n < addedNodes.length; n++) {
        var node = addedNodes[n];
        if (node.nodeType === 1) {
          D2L.injectAllShadowRoots(node);
          // Apply video mode to newly added iframes
          if (node.tagName === 'IFRAME' && D2L.isVideoIframe(node)) {
            D2L.applyVideoModeToIframe(node);
          }
          // Also check children for iframes
          var iframes = node.querySelectorAll ? node.querySelectorAll('iframe') : [];
          for (var i = 0; i < iframes.length; i++) {
            if (D2L.isVideoIframe(iframes[i])) {
              D2L.applyVideoModeToIframe(iframes[i]);
            }
          }
        }
      }
    }
  };

  /**
   * Disconnects all observers and clears the rescan interval.
   */
  D2L.stopShadowObserver = function () {
    shadowObservers.forEach(function (obs) { obs.disconnect(); });
    shadowObservers.clear();
    shadowObserver = null;
    if (rescanInterval) {
      clearInterval(rescanInterval);
      rescanInterval = null;
    }
  };

  /**
   * Recursively walks the DOM tree injecting styles into all shadow roots.
   */
  D2L.injectAllShadowRoots = function (root) {
    if (!root) return;

    if (root.shadowRoot) {
      D2L.injectShadowStyles(root.shadowRoot);
      D2L.observeShadowRoot(root.shadowRoot);
      D2L.injectAllShadowRoots(root.shadowRoot);
    }

    var elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].shadowRoot) {
        D2L.injectShadowStyles(elements[i].shadowRoot);
        D2L.observeShadowRoot(elements[i].shadowRoot);
        D2L.injectAllShadowRoots(elements[i].shadowRoot);
      }
    }
  };

  /**
   * Observes a single shadow root for new children.
   */
  D2L.observeShadowRoot = function (shadowRoot) {
    if (shadowRoot._d2lDarkModeObserved) return;
    shadowRoot._d2lDarkModeObserved = true;

    var obs = new MutationObserver(D2L.handleMutations);
    obs.observe(shadowRoot, { childList: true, subtree: true });
    shadowObservers.add(obs);
  };

  /**
   * Adds the shared shadow stylesheet to a shadow root (if not already present).
   */
  D2L.injectShadowStyles = function (shadowRoot) {
    if (shadowRoot.adoptedStyleSheets.includes(D2L.sharedShadowSheet)) return;
    shadowRoot.adoptedStyleSheets = [
      ...shadowRoot.adoptedStyleSheets,
      D2L.sharedShadowSheet,
    ];
  };

  /**
   * Removes the shared shadow stylesheet from all shadow roots in the document.
   */
  D2L.removeShadowStyles = function () {
    function walk(root) {
      var elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      if (root.shadowRoot) process(root.shadowRoot);
      for (var i = 0; i < elements.length; i++) {
        if (elements[i].shadowRoot) {
          process(elements[i].shadowRoot);
          walk(elements[i].shadowRoot);
        }
      }
    }

    function process(shadowRoot) {
      shadowRoot.adoptedStyleSheets = shadowRoot.adoptedStyleSheets.filter(
        function (s) { return s !== D2L.sharedShadowSheet; }
      );
      shadowRoot._d2lDarkModeObserved = false;
    }

    walk(document.documentElement);
  };
})();
