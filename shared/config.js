/**
 * D2L Dark Mode — Shared Configuration
 * Single source of truth for all constants, storage keys, defaults, and patterns.
 * Used by content scripts (window) and service worker (ServiceWorkerGlobalScope).
 */

(function () {
  'use strict';

  const config = {

    /* ---- Storage Keys ---- */
    STORAGE_KEYS: {
      DARK_MODE: 'darkModeEnabled',
      DOCUMENT_DARK_MODE: 'documentDarkModeEnabled',
      PDF_DARK_MODE: 'pdfDarkModeEnabled',           // legacy key for backward compat
      VIDEO_DARK_MODE: 'videoDarkModeEnabled',
      CUSTOM_DOMAINS: 'customDomains',
    },

    /* ---- Defaults (used on install and reset) ---- */
    DEFAULTS: {
      darkModeEnabled: true,
      documentDarkModeEnabled: false,
      videoDarkModeEnabled: false,
      customDomains: [],
    },

    /* ---- CSS Class Names & IDs ---- */
    CSS: {
      ACTIVE: 'd2l-dark-mode-active',
      TOP: 'd2l-dark-mode-top',
      NESTED: 'd2l-dark-mode-nested',
      DOC_DARK: 'd2l-doc-dark',
      STYLESHEET_ID: 'd2l-dark-mode-main-css',
    },

    /* ---- Timing ---- */
    TIMING: {
      RESCAN_INTERVAL_MS: 2000,
      RESCAN_TIMEOUT_MS: 30000,
    },

    /* ---- URL / DOM Patterns ---- */
    PATTERNS: {
      D2L_PATH: /\/d2l\//,
      DOCUMENT_VIEWER: /viewFile|viewer\.html|pdfjs/,
      VIDEO_STRONG_ALLOW: /picture-in-picture/,
      VIDEO_TITLE: /\bvideo\b|video.player|media.player/,
      VIDEO_AUTOPLAY: /autoplay/,
      VIDEO_PATH: /\/embed\/|\/player\/|\/video\/|\/watch|\/stream\/|\/lecture\/|\/media\//,
      VIDEO_CLASS_ID: /video|player/,
    },

    /* ---- Brightspace Deferred Detection Selector ---- */
    BRIGHTSPACE_DEFERRED_SELECTOR: 'd2l-navigation, [class*="d2l-"], meta[name="d2l"]',

    /* ---- Excluded Hosts (corporate / non-LMS sites that share D2L branding) ---- */
    EXCLUDED_HOSTS: [     // D2L corporate website — not a Brightspace LMS
    ],

    /* ---- Known Brightspace Hosts ---- */
    KNOWN_HOSTS: [
      // McMaster University
      'avenue.mcmaster.ca',
      'avenue.cllmcmaster.ca',

      // Broad patterns (covers hundreds of institutions)
      'brightspace.com',
      'elearningontario.ca',
      'desire2learn.com',

      // Specific custom domains
      'elearn.ucalgary.ca',
      'd2l.bowvalleycollege.ca',
      'd2l.cbe.ab.ca',
      'mylearningspace.wlu.ca',
      'fanshaweonline.ca',
      'myhome.hwdsb.on.ca',
    ],

    /**
     * Resolve document dark mode from storage result, handling legacy pdfDarkModeEnabled key.
     * @param {Object} result - chrome.storage.sync.get result
     * @returns {boolean}
     */
    resolveDocumentDarkMode: function (result) {
      if (result.documentDarkModeEnabled !== undefined) {
        return result.documentDarkModeEnabled === true;
      }
      return result.pdfDarkModeEnabled === true;
    },

    /* ---- Content scripts injected by gate.js via service worker ---- */
    CONTENT_SCRIPTS: [
      'content/detection.js',
      'content/video.js',
      'content/shadow-dom.js',
      'content/dark-mode-core.js',
      'content/main.js',
    ],

    /**
     * Returns the array of all storage keys to fetch (includes legacy key for migration).
     * @returns {string[]}
     */
    allReadKeys: function () {
      return [
        this.STORAGE_KEYS.DARK_MODE,
        this.STORAGE_KEYS.DOCUMENT_DARK_MODE,
        this.STORAGE_KEYS.PDF_DARK_MODE,
        this.STORAGE_KEYS.VIDEO_DARK_MODE,
        this.STORAGE_KEYS.CUSTOM_DOMAINS,
      ];
    },
  };

  self.D2LConfig = config;
})();
