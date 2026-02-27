/** D2L Dark Mode — Shadow DOM Observer */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  var shadowObserver = null;
  var shadowObservers = new Set();
  var rescanInterval = null;

  D2L.sharedShadowSheet = new CSSStyleSheet();

  /** Builds shadow DOM CSS for counter-inverting media elements. */
  D2L.buildShadowCSS = function (includeCanvas, includeVideo) {
    if (includeVideo === undefined) includeVideo = true;
    var parts = ['img', 'picture'];
    if (includeVideo) parts.push('video');
    if (includeCanvas) parts.push('canvas');
    var media = parts.join(', ');
    // Compensating selector: media nested inside a background-image element
    // would be triple-inverted (page + parent + own). Cancel their own filter.
    var compensate = 'img, picture';
    if (includeCanvas) compensate += ', canvas';
    if (includeVideo) compensate += ', video';
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
      '    }\n' +
      '    [style*="background-image"] {\n' +
      '      filter: invert(1) hue-rotate(180deg) !important;\n' +
      '    }\n' +
      '    [style*="background-image"] :is(' + compensate + ') {\n' +
      '      filter: none !important;\n' +
      '    }\n' +
      // Fullscreen escapes the page-level filter; invert rules are flipped
      '    video:fullscreen, :host(:fullscreen) video, iframe.d2l-video-iframe:fullscreen {\n' +
      '      filter: ' + (includeVideo ? 'none' : 'invert(1) hue-rotate(180deg)') + ' !important;\n' +
      '    }\n';
  };

  D2L.sharedShadowSheet.replaceSync(D2L.buildShadowCSS(true));

  /** Starts the MutationObserver and periodic rescan. */
  D2L.startShadowObserver = function () {
    D2L.injectAllShadowRoots(document.documentElement);

    if (shadowObserver) return;

    shadowObserver = new MutationObserver(D2L.handleMutations);
    shadowObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    shadowObservers.add(shadowObserver);

    // Periodic rescan for lazy-loaded web components
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

  /** Handles mutations: injects shadow styles and applies video mode to new iframes. */
  D2L.handleMutations = function (mutations) {
    for (var m = 0; m < mutations.length; m++) {
      var addedNodes = mutations[m].addedNodes;
      for (var n = 0; n < addedNodes.length; n++) {
        var node = addedNodes[n];
        if (node.nodeType === 1) {
          D2L.injectAllShadowRoots(node);
          if (node.tagName === 'IFRAME' && D2L.isVideoIframe(node)) {
            D2L.applyVideoModeToIframe(node);
          }
          if (D2L._applyVideoModeIn) {
            D2L._applyVideoModeIn(node);
          } else {
            var iframes = node.querySelectorAll ? node.querySelectorAll('iframe') : [];
            for (var i = 0; i < iframes.length; i++) {
              if (D2L.isVideoIframe(iframes[i])) {
                D2L.applyVideoModeToIframe(iframes[i]);
              }
            }
          }
        }
      }
    }
  };

  /** Disconnects all observers and clears the rescan interval. */
  D2L.stopShadowObserver = function () {
    shadowObservers.forEach(function (obs) { obs.disconnect(); });
    shadowObservers.clear();
    shadowObserver = null;
    if (rescanInterval) {
      clearInterval(rescanInterval);
      rescanInterval = null;
    }
  };

  /** Recursively injects styles into all shadow roots. */
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

  /** Observes a shadow root for new children. */
  D2L.observeShadowRoot = function (shadowRoot) {
    if (shadowRoot._d2lDarkModeObserved) return;
    shadowRoot._d2lDarkModeObserved = true;

    var obs = new MutationObserver(D2L.handleMutations);
    obs.observe(shadowRoot, { childList: true, subtree: true });
    shadowObservers.add(obs);
  };

  /** Adopts the shared stylesheet into a shadow root. */
  D2L.injectShadowStyles = function (shadowRoot) {
    if (shadowRoot.adoptedStyleSheets.includes(D2L.sharedShadowSheet)) return;
    shadowRoot.adoptedStyleSheets = [
      ...shadowRoot.adoptedStyleSheets,
      D2L.sharedShadowSheet,
    ];
  };

  /** Removes the shared stylesheet from all shadow roots. */
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
