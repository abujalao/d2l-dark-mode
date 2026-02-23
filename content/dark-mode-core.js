/**
 * D2L Dark Mode — Enable/Disable Engine
 * State management, filter logic, stylesheet injection, and document viewer handling.
 */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /* ---- Shared mutable state ---- */
  D2L.state = {
    darkModeEnabled: true,
    documentDarkModeEnabled: false,
    videoDarkModeEnabled: false,
    initialized: false,
  };

  /**
   * Smart root detection — determines if this frame should apply the inversion filter.
   * Returns true if: top window, orphan (cross-origin parent), parent is frameset,
   * or parent does not have the filter active.
   */
  D2L.shouldApplyFilter = function () {
    if (window.self === window.top) return true;

    try {
      var parentDoc = window.parent.document;
      var parentIsFrameset = parentDoc.querySelector('frameset') !== null;
      if (parentIsFrameset) return true;

      // Check if parent already has the full filter classes (ideal case)
      var parentHasFilter = parentDoc.documentElement.classList.contains(CFG.CSS.TOP) ||
        parentDoc.documentElement.classList.contains(CFG.CSS.NESTED);
      if (parentHasFilter) return false;

      // Check if parent has the ACTIVE class set synchronously by gate.js at
      // document_start — this is guaranteed to be present before any dynamically
      // injected scripts run, eliminating the timing race.
      if (parentDoc.documentElement.classList.contains(CFG.CSS.ACTIVE)) return false;

      // Check if parent URL matches Brightspace patterns (parent is D2L but
      // hasn't finished initializing yet)
      var parentHref = window.parent.location.href;
      var parentHostname = window.parent.location.hostname;
      if (CFG.PATTERNS.D2L_PATH.test(parentHref)) return false;
      if (parentDoc.documentElement.hasAttribute('data-app-version')) return false;
      if (CFG.KNOWN_HOSTS.some(function (h) {
        return parentHostname === h || parentHostname.endsWith('.' + h);
      })) return false;

      // Parent is not Brightspace — this frame should apply its own filter
      return true;
    } catch (e) {
      return true;
    }
  };

  /** Computed once — is this frame the effective root for inversion? */
  D2L.isEffectiveRoot = D2L.shouldApplyFilter();

  /**
   * Checks if the current page is a document viewer (PDF, slides, etc.).
   */
  D2L.isDocumentViewer = function () {
    return CFG.PATTERNS.DOCUMENT_VIEWER.test(window.location.href);
  };

  /**
   * Toggles the document dark mode class and updates shadow CSS for child frames.
   */
  D2L.applyDocDarkMode = function () {
    if (D2L.state.documentDarkModeEnabled && D2L.isDocumentViewer()) {
      document.documentElement.classList.add(CFG.CSS.DOC_DARK);
    } else {
      document.documentElement.classList.remove(CFG.CSS.DOC_DARK);
    }

    // Child frames: toggle canvas counter-inversion based on document dark mode.
    if (!D2L.isEffectiveRoot) {
      D2L.sharedShadowSheet.replaceSync(D2L.buildShadowCSS(!D2L.state.documentDarkModeEnabled, !D2L.state.videoDarkModeEnabled));
    }
  };

  /**
   * Enables dark mode: injects stylesheet, adds CSS classes, starts observers.
   */
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

  /**
   * Disables dark mode: removes stylesheet, classes, stops observers, cleans up.
   */
  D2L.disableDarkMode = function () {
    D2L.removeDarkModeStylesheet();
    document.documentElement.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.TOP, CFG.CSS.NESTED, CFG.CSS.DOC_DARK, CFG.CSS.VIDEO_DARK);
    if (document.body) {
      document.body.classList.remove(CFG.CSS.ACTIVE);
    }
    D2L.stopShadowObserver();
    D2L.stopFullscreenHandler();
    D2L.removeShadowStyles();

    // Clean up all iframe inline filters and fullscreen overrides (walks into shadow roots)
    D2L._cleanupIframeFilters(document);
    D2L._clearFullscreenVideoFilter(document);
  };

  /**
   * Injects the main dark-mode CSS stylesheet (link element).
   */
  D2L.injectDarkModeStylesheet = function () {
    if (document.getElementById(CFG.CSS.STYLESHEET_ID)) return;

    var link = document.createElement('link');
    link.id = CFG.CSS.STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/dark-mode.css');

    (document.head || document.documentElement).appendChild(link);
  };

  /**
   * Removes the main dark-mode CSS stylesheet.
   */
  D2L.removeDarkModeStylesheet = function () {
    var link = document.getElementById(CFG.CSS.STYLESHEET_ID);
    if (link) link.remove();
  };
})();
