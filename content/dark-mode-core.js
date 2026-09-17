/** D2L Dark Mode - Enable/Disable Engine */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  D2L.state = {
    darkModeEnabled: true,
    documentDarkModeEnabled: false,
    videoDarkModeEnabled: false,
    fontSize: 100,
    fontFamily: 'default',
    fullWidthEnabled: false,
    preserveDisplay: false,
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
    D2L.applyFontSize(D2L.state.fontSize);
    D2L.applyFontFamily(D2L.state.fontFamily);
    D2L.applyFullWidth(D2L.state.fullWidthEnabled);

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

    // Set video state first so the observer's initial pass applies it in one traversal
    D2L.updateVideoState();
    D2L.startShadowObserver();
    D2L.startFullscreenHandler();
  };

  /** Disables dark mode. */
  D2L.disableDarkMode = function () {
    if (!D2L.state.preserveDisplay) {
      D2L.removeFontSize();
      D2L.removeFontFamily();
      D2L.removeFullWidth();
    }
    document.documentElement.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.TOP, CFG.CSS.NESTED, CFG.CSS.DOC_DARK, CFG.CSS.VIDEO_DARK);
    if (document.body) {
      document.body.classList.remove(CFG.CSS.ACTIVE);
    }
    D2L.stopShadowObserver();
    D2L.stopFullscreenHandler();

    // Shadow sheet, iframe filters and fullscreen overrides in one traversal
    D2L.teardownRoots();
  };

})();
