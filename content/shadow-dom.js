/** D2L Dark Mode — Shadow DOM Observer */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};

  var shadowObserver = null;
  var shadowObservers = new Set();

  // Dispatched by shadow-injector.js (MAIN world)
  var SHADOW_EVENT = 'd2l-shadow-root';

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

  /** Re-processes a root the MAIN world announced: late attachShadow or replaced sheets. */
  function onShadowAnnounced(e) {
    // e.target is retargeted across shadow boundaries; composedPath()[0] is the host
    var path = e.composedPath ? e.composedPath() : null;
    var target = (path && path[0]) || e.target;
    if (!target || target.nodeType !== 1 || !target.shadowRoot) return;
    // Only this root; its own observer handles anything added inside it
    D2L.injectShadowStyles(target.shadowRoot);
    D2L.observeShadowRoot(target.shadowRoot);
  }

  function rescanDocument() {
    D2L.processSubtree(document.documentElement);
  }

  /** Starts the MutationObserver and shadow-root discovery. */
  D2L.startShadowObserver = function () {
    rescanDocument();

    if (shadowObserver) return;

    shadowObserver = new MutationObserver(D2L.handleMutations);
    shadowObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    shadowObservers.add(shadowObserver);

    document.addEventListener(SHADOW_EVENT, onShadowAnnounced, true);

    // Declarative shadow DOM raises no mutation or announcement; rescan once after parsing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', rescanDocument, { once: true });
    }
  };

  /** Applies every per-root job (shadow styles, video iframes) in a single traversal. */
  D2L.processSubtree = function (node) {
    if (!node) return;
    D2L.forEachRoot(node, function (ctx) {
      if (D2L.isShadowRoot(ctx)) {
        D2L.injectShadowStyles(ctx);
        D2L.observeShadowRoot(ctx);
      }
      D2L._applyVideoModeToRoot(ctx);
    });
  };

  /** Handles mutations: injects shadow styles and applies video mode to new iframes. */
  D2L.handleMutations = function (mutations) {
    for (var m = 0; m < mutations.length; m++) {
      var addedNodes = mutations[m].addedNodes;
      for (var n = 0; n < addedNodes.length; n++) {
        var node = addedNodes[n];
        if (node.nodeType === 1) {
          if (node.tagName === 'IFRAME' && D2L.isVideoIframe(node)) {
            D2L.applyVideoModeToIframe(node);
          }
          D2L.processSubtree(node);
        }
      }
    }
  };

  /** Disconnects all observers. */
  D2L.stopShadowObserver = function () {
    shadowObservers.forEach(function (obs) { obs.disconnect(); });
    shadowObservers.clear();
    shadowObserver = null;
    document.removeEventListener(SHADOW_EVENT, onShadowAnnounced, true);
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

  /** Undoes every per-root change in a single traversal (mirror of processSubtree). */
  D2L.teardownRoots = function () {
    D2L.forEachRoot(document.documentElement, function (ctx) {
      if (D2L.isShadowRoot(ctx)) {
        ctx.adoptedStyleSheets = ctx.adoptedStyleSheets.filter(
          function (s) { return s !== D2L.sharedShadowSheet; }
        );
        ctx._d2lDarkModeObserved = false;
      }
      D2L._cleanupIframeFiltersInRoot(ctx);
      D2L._clearFullscreenVideoInRoot(ctx);
    });
  };
})();
