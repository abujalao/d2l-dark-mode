/** D2L Dark Mode — Shared Configuration */

(function () {
  'use strict';

  const config = {

    /* ---- Storage Keys ---- */
    STORAGE_KEYS: {
      DARK_MODE: 'darkModeEnabled',
      DOCUMENT_DARK_MODE: 'documentDarkModeEnabled',
      PDF_DARK_MODE: 'pdfDarkModeEnabled',           // legacy key
      VIDEO_DARK_MODE: 'videoDarkModeEnabled',
      CUSTOM_DOMAINS: 'customDomains',
      EXCLUDED_DOMAINS: 'excludedDomains',
    },

    /* ---- Defaults (used on install and reset) ---- */
    DEFAULTS: {
      darkModeEnabled: true,
      documentDarkModeEnabled: false,
      videoDarkModeEnabled: false,
      customDomains: [],
      excludedDomains: [],
    },

    /* ---- CSS Class Names & IDs ---- */
    CSS: {
      ACTIVE: 'd2l-dark-mode-active',
      TOP: 'd2l-dark-mode-top',
      NESTED: 'd2l-dark-mode-nested',
      DOC_DARK: 'd2l-doc-dark',
      VIDEO_DARK: 'd2l-video-dark',
      VIDEO_IFRAME: 'd2l-video-iframe',
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
      DOCUMENT_VIEWER: /viewFile|viewer\.html|pdfjs|smart-curriculum/,
      VIDEO_STRONG_ALLOW: /picture-in-picture/,
      VIDEO_TITLE: /\bvideo\b|video.player|media.player/,
      VIDEO_AUTOPLAY: /autoplay/,
      VIDEO_PATH: /\/embed\/|\/player\/|\/video\/|\/watch|\/stream\/|\/lecture\/|\/media\//,
      VIDEO_CLASS_ID: /video|player/,
    },

    /* ---- Brightspace Deferred Detection Selector ---- */
    BRIGHTSPACE_DEFERRED_SELECTOR: 'd2l-navigation, d2l-labs-navigation, d2l-my-courses, [data-cdn*="brightspace"], body.d2l-body, meta[name="d2l"]',

    /* ---- Excluded Hosts ---- */
    EXCLUDED_HOSTS: [
      "d2l.com",
    ],

    /* ---- Known Brightspace Hosts ---- */
    KNOWN_HOSTS: [],

    /** Resolve document dark mode, falling back to legacy pdfDarkModeEnabled key. */
    resolveDocumentDarkMode: function (result) {
      if (result.documentDarkModeEnabled !== undefined) {
        return result.documentDarkModeEnabled === true;
      }
      return result.pdfDarkModeEnabled === true;
    },

    /* ---- Content Scripts ---- */
    CONTENT_SCRIPTS: [
      'content/detection.js',
      'content/video.js',
      'content/shadow-dom.js',
      'content/dark-mode-core.js',
      'content/main.js',
    ],

    /** All storage keys to fetch (includes legacy key for migration). */
    allReadKeys: function () {
      return [
        this.STORAGE_KEYS.DARK_MODE,
        this.STORAGE_KEYS.DOCUMENT_DARK_MODE,
        this.STORAGE_KEYS.PDF_DARK_MODE,
        this.STORAGE_KEYS.VIDEO_DARK_MODE,
        this.STORAGE_KEYS.CUSTOM_DOMAINS,
        this.STORAGE_KEYS.EXCLUDED_DOMAINS,
      ];
    },
  };

  self.D2LConfig = config;
})();
