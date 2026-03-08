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
      FONT_SIZE: 'fontSize',
      FONT_FAMILY: 'fontFamily',
      FULL_WIDTH: 'fullWidthEnabled',
      PRESERVE_DISPLAY: 'preserveDisplay',
      AUTO_DARK_MODE: 'autoDarkModeEnabled',
      DARK_START_TIME: 'darkStartTime',
      DARK_END_TIME: 'darkEndTime',
    },

    /* ---- Defaults (used on install and reset) ---- */
    DEFAULTS: {
      darkModeEnabled: true,
      documentDarkModeEnabled: false,
      videoDarkModeEnabled: false,
      customDomains: [],
      excludedDomains: [],
      fontSize: 100,
      fontFamily: 'default',
      fullWidthEnabled: false,
      preserveDisplay: false,
      autoDarkModeEnabled: false,
      darkStartTime: '18:00',
      darkEndTime: '06:00',
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
      INVERT_FILTER: 'invert(1) hue-rotate(180deg)',
      FONT_SIZE_STYLE_ID: 'd2l-font-size',
      FONT_FAMILY_LINK_ID: 'd2l-font-family-link',
      FONT_FAMILY_STYLE_ID: 'd2l-font-family-style',
      FULL_WIDTH_STYLE_ID: 'd2l-full-width',
    },

    /* ---- Font Families ---- */
    FONT_FAMILIES: {
      // System
      default:      { label: 'Default (System)',       url: null, family: null },
      // Sans-serif
      inter:        { label: 'Inter',                  url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',                        family: "'Inter', sans-serif" },
      dmSans:       { label: 'DM Sans',                url: 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap', family: "'DM Sans', sans-serif" },
      nunito:       { label: 'Nunito',                 url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600&display=swap',                        family: "'Nunito', sans-serif" },
      outfit:       { label: 'Outfit',                 url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap',                        family: "'Outfit', sans-serif" },
      plusJakarta:  { label: 'Plus Jakarta Sans',      url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',             family: "'Plus Jakarta Sans', sans-serif" },
      // Serif / Reading
      merriweather: { label: 'Merriweather',           url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',                     family: "'Merriweather', serif" },
      lora:         { label: 'Lora',                   url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap',                          family: "'Lora', serif" },
      sourceSerif:  { label: 'Source Serif 4',         url: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600&display=swap',                   family: "'Source Serif 4', serif" },
      // Monospace
      jetbrains:    { label: 'JetBrains Mono',         url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',                   family: "'JetBrains Mono', monospace" },
      firaCode:     { label: 'Fira Code',              url: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap',                        family: "'Fira Code', monospace" },
      // Accessibility
      lexend:       { label: 'Lexend',                 url: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap',                        family: "'Lexend', sans-serif" },
      atkinson:     { label: 'Atkinson Hyperlegible',  url: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',            family: "'Atkinson Hyperlegible', sans-serif" },
      opendyslexic: { label: 'OpenDyslexic',           url: 'https://fonts.googleapis.com/css2?family=OpenDyslexic:wght@400;700&display=swap',                     family: "'OpenDyslexic', sans-serif" },
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

    matchesHost: function (hostname, pattern) {
      return hostname === pattern || hostname.endsWith('.' + pattern);
    },

    matchesAnyHost: function (hostname, hostList) {
      var self = this;
      return hostList.some(function (h) { return self.matchesHost(hostname, h); });
    },

    isBrightspaceElement: function (el) {
      return el.hasAttribute('data-app-version')
        && (el.getAttribute('data-cdn') || '').indexOf('brightspace') !== -1;
    },

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
      'content/font-engine.js',
      'content/layout-engine.js',
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
        this.STORAGE_KEYS.FONT_SIZE,
        this.STORAGE_KEYS.FONT_FAMILY,
        this.STORAGE_KEYS.FULL_WIDTH,
        this.STORAGE_KEYS.PRESERVE_DISPLAY,
        this.STORAGE_KEYS.AUTO_DARK_MODE,
        this.STORAGE_KEYS.DARK_START_TIME,
        this.STORAGE_KEYS.DARK_END_TIME,
      ];
    },
  };

  self.D2LConfig = config;
})();
