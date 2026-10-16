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

  /**
   * Whether this frame applies the inversion filter. gate.js decides the role
   * (shared/frame-role.js); without one, only the top frame is a root.
   */
  var role = CFG ? document.documentElement.getAttribute(CFG.CSS.ROLE_ATTR) : null;
  D2L.isEffectiveRoot = role ? role === CFG.CSS.ROLE_ROOT : window.self === window.top;

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

    D2L.refreshShadowSheet();
  };

  /** Enables dark mode. */
  D2L.enableDarkMode = function () {
    D2L.applyFontSize(D2L.state.fontSize);
    D2L.applyFontFamily(D2L.state.fontFamily);
    D2L.applyFullWidth(D2L.state.fullWidthEnabled);

    document.documentElement.classList.add(CFG.CSS.ACTIVE);

    if (D2L.isEffectiveRoot) {
      document.documentElement.classList.add(CFG.CSS.TOP);
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
    D2L.refreshFrameLinks();
  };

  /** Disables dark mode. */
  D2L.disableDarkMode = function () {
    if (!D2L.state.preserveDisplay) {
      D2L.removeFontSize();
      D2L.removeFontFamily();
      D2L.removeFullWidth();
    }
    document.documentElement.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.TOP, CFG.CSS.DOC_DARK, CFG.CSS.VIDEO_DARK);
    if (document.body) {
      document.body.classList.remove(CFG.CSS.ACTIVE);
    }
    D2L.stopShadowObserver();
    D2L.stopFullscreenHandler();

    // Shadow sheet, iframe filters and fullscreen overrides in one traversal
    D2L.teardownRoots();
    D2L.refreshFrameLinks();
  };

})();
