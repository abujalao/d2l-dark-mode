/** D2L Dark Mode - Enable/Disable Engine */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  D2L.state = {
    darkModeEnabled: true,
    documentDarkModeEnabled: false,
    videoDarkModeEnabled: false,
    initialized: false,
  };

  /** Determines if this frame should apply the inversion filter. */
  D2L.shouldApplyFilter = function () {
    if (window.self === window.top) return true;

    try {
      var parentDoc = window.parent.document;
      var parentIsFrameset = parentDoc.querySelector('frameset') !== null;
      if (parentIsFrameset) return true;

      var parentHasFilter = parentDoc.documentElement.classList.contains(CFG.CSS.TOP) ||
        parentDoc.documentElement.classList.contains(CFG.CSS.NESTED);
      if (parentHasFilter) return false;

      // ACTIVE class set by gate.js at document_start is always present first
      if (parentDoc.documentElement.classList.contains(CFG.CSS.ACTIVE)) return false;

      // Parent URL matches Brightspace patterns but hasn't initialized yet
      var parentHref = window.parent.location.href;
      var parentHostname = window.parent.location.hostname;
      if (CFG.PATTERNS.D2L_PATH.test(parentHref)) return false;
      var parentHtml = parentDoc.documentElement;
      if (CFG.isBrightspaceElement(parentHtml)) return false;
      if (CFG.matchesAnyHost(parentHostname, CFG.KNOWN_HOSTS)) return false;

      return true;
    } catch (e) {
      return true;
    }
  };

  /** Whether this frame is the effective root for inversion. */
  D2L.isEffectiveRoot = D2L.shouldApplyFilter();

  /** Checks if the current page is a document viewer. */
  D2L.isDocumentViewer = function () {
    return CFG.PATTERNS.DOCUMENT_VIEWER.test(window.location.href);
  };

  /** Toggles the document dark mode class. */
  D2L.applyDocDarkMode = function () {
    if (D2L.state.documentDarkModeEnabled && D2L.isDocumentViewer()) {
      document.documentElement.classList.add(CFG.CSS.DOC_DARK);
    } else {
      document.documentElement.classList.remove(CFG.CSS.DOC_DARK);
    }

    // Update shadow CSS for child frames
    if (!D2L.isEffectiveRoot) {
      D2L.sharedShadowSheet.replaceSync(D2L.buildShadowCSS(!D2L.state.documentDarkModeEnabled, !D2L.state.videoDarkModeEnabled));
    }
  };

  /** Enables dark mode. */
  D2L.enableDarkMode = function () {
    D2L.injectDarkModeStylesheet();

    document.documentElement.classList.add(CFG.CSS.ACTIVE);

    if (D2L.isEffectiveRoot) {
      document.documentElement.classList.add(CFG.CSS.TOP);
      document.documentElement.classList.add(CFG.CSS.NESTED);
    }

    if (document.body) {
      document.body.classList.add(CFG.CSS.ACTIVE);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.classList.add(CFG.CSS.ACTIVE);
      }, { once: true });
    }

    D2L.startShadowObserver();
    D2L.startFullscreenHandler();
    D2L.applyVideoMode();
  };

  /** Disables dark mode. */
  D2L.disableDarkMode = function () {
    D2L.removeDarkModeStylesheet();
    document.documentElement.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.TOP, CFG.CSS.NESTED, CFG.CSS.DOC_DARK, CFG.CSS.VIDEO_DARK);
    if (document.body) {
      document.body.classList.remove(CFG.CSS.ACTIVE);
    }
    D2L.stopShadowObserver();
    D2L.stopFullscreenHandler();
    D2L.removeShadowStyles();

    // Clean up iframe filters and fullscreen overrides
    D2L._cleanupIframeFilters(document);
    D2L._clearFullscreenVideoFilter(document);
  };

  /** Injects the main dark-mode CSS stylesheet. */
  D2L.injectDarkModeStylesheet = function () {
    if (document.getElementById(CFG.CSS.STYLESHEET_ID)) return;

    var link = document.createElement('link');
    link.id = CFG.CSS.STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/dark-mode.css');

    (document.head || document.documentElement).appendChild(link);
  };

  /** Removes the main dark-mode CSS stylesheet. */
  D2L.removeDarkModeStylesheet = function () {
    var link = document.getElementById(CFG.CSS.STYLESHEET_ID);
    if (link) link.remove();
  };
})();
