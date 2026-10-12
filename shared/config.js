/** D2L Dark Mode — Shared Configuration */

(function () {
  'use strict';

  // Scripts every frame we correct runs, Brightspace or embedded, in load order
  const FRAME_SCRIPTS = [
    'content/detection.js',
    'content/video.js',
    'shared/media-rules.js',
    'content/shadow-dom.js',
    'content/frame-link.js',
    'shared/settings.js',
  ];

  const config = {

    /* ---- Storage Keys ---- */
    STORAGE_KEYS: {
      DARK_MODE: 'darkModeEnabled',
      DOCUMENT_DARK_MODE: 'documentDarkModeEnabled',
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
      // When dark mode was last switched by hand; wins over the schedule until its next switch
      SCHEDULE_OVERRIDE_AT: 'scheduleOverrideAt',
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
      scheduleOverrideAt: 0,
    },

    /* ---- CSS Class Names & IDs ---- */
    CSS: {
      ACTIVE: 'd2l-dark-mode-active',
      TOP: 'd2l-dark-mode-top',
      DOC_DARK: 'd2l-doc-dark',
      VIDEO_DARK: 'd2l-video-dark',
      VIDEO_IFRAME: 'd2l-video-iframe',
      // Embedded frame dominated by a video player: the whole frame is un-inverted
      PLAYER: 'd2l-dark-mode-player',
      // Video iframe whose document can't run our scripts: counter-inverted from outside
      IFRAME_FALLBACK: 'd2l-iframe-fallback',
      // <html data-d2l-role>: what gate.js decided this document is (shared/frame-role.js)
      ROLE_ATTR: 'data-d2l-role',
      ROLE_ROOT: 'root',
      ROLE_NESTED: 'nested',
      ROLE_EMBEDDED: 'embedded',
      // Asked the parent frame, no answer yet
      ROLE_LINKING: 'linking',
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

    /* ---- Frame link (parent <-> child frame handshake) ---- */
    FRAME_LINK: {
      // postMessage envelope key; values: 'ctx?' (child asks), 'ctx' (parent answers), 'ping'
      KEY: '__darkspace',
      // Unanswered pings after this long mean the child runs none of our scripts
      FALLBACK_DELAY_MS: 1500,
      // A video covering this share of the frame's viewport makes it a player frame
      PLAYER_MIN_COVERAGE: 0.4,
      // How long after load a frame trusts its parent's "looks like a player" hint
      // while no <video> has appeared yet (players build theirs late)
      PLAYER_HINT_GRACE_MS: 3000,
      // ...unless it already shows this much readable text: a page. Measured live:
      // players under 150 chars (Kaltura <50, YouTube/Vimeo ~120 with control
      // labels); pages above 550 (library reserves 595, Echo360 lecture list 2000+).
      // Checked this often meanwhile.
      PAGE_TEXT_MIN_CHARS: 400,
      PAGE_TEXT_CHECK_MS: 100,
      // storage.local list of origins detected as Brightspace, used by cross-origin children
      ORIGINS_KEY: 'knownBrightspaceOrigins',
      MAX_ORIGINS: 50,
      // How long a frame with no known Brightspace ancestor watches for one to be recorded
      ORIGIN_WAIT_MS: 15000,
      // Gaps between repeated 'ctx?' questions until the parent answers (~8s total)
      ASK_RETRY_MS: [100, 250, 500, 1000, 2000, 4000],
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

    /**
     * Whether a document already shows a page's worth of readable text. The
     * parent's "looks like a player" hint comes from iframe attributes, which LTI
     * launchers share with real players (Echo360's lecture list).
     */
    readsLikePage: function (doc) {
      var body = doc.body;
      return !!body && (body.innerText || '').length >= this.FRAME_LINK.PAGE_TEXT_MIN_CHARS;
    },

    isBrightspaceElement: function (el) {
      return el.hasAttribute('data-app-version')
        && (el.getAttribute('data-cdn') || '').indexOf('brightspace') !== -1;
    },

    /* ---- Content Scripts ---- */
    CONTENT_SCRIPTS: FRAME_SCRIPTS.concat([
      'content/font-engine.js',
      'content/layout-engine.js',
      'content/dark-mode-core.js',
      'content/main.js',
    ]),

    /* Non-Brightspace frames rendered inside an inverted Brightspace page */
    EMBEDDED_SCRIPTS: FRAME_SCRIPTS.concat([
      'shared/player-mode.js',
      'content/embedded.js',
    ]),
  };

  self.D2LConfig = config;
})();
