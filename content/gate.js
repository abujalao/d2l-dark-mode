/**
 * D2L Dark Mode — Gatekeeper Script
 * Runs on every page at document_start. Determines if this is a Brightspace
 * page, applies the dark classes before first paint, and triggers content script
 * injection via the service worker.
 */

(function () {
  'use strict';

  var CFG = self.D2LConfig;
  var FL = CFG.FRAME_LINK;

  /**
   * Child side of the frame handshake (parent side: frame-link.js). Asks the
   * parent whether this frame renders inverted; if so, this frame corrects its
   * own media via embedded.js. Answers the parent's pings so it never
   * counter-inverts this frame from outside.
   */
  function linkToParent() {
    if (self.D2LEmbedded) return;
    var link = self.D2LEmbedded = { inverted: false, requested: false, onChange: null };

    function ask() {
      var msg = {};
      msg[FL.KEY] = 'ctx?';
      try { window.parent.postMessage(msg, '*'); } catch (e) {}
    }

    window.addEventListener('message', function (e) {
      if (e.source !== window.parent) return;
      var d = e.data;
      if (!d || typeof d !== 'object') return;
      var kind = d[FL.KEY];
      if (kind === 'ping') { ask(); return; }
      if (kind !== 'ctx') return;

      link.inverted = d.inverted === true;
      if (link.inverted && !link.requested) {
        link.requested = true;
        var html = document.documentElement;
        html.setAttribute(CFG.CSS.ROLE_ATTR, CFG.CSS.ROLE_EMBEDDED);
        // dark-mode.css is already loaded here: this counter-inverts media at once
        html.classList.add(CFG.CSS.ACTIVE);
        chrome.runtime.sendMessage({ type: 'injectScripts', role: CFG.CSS.ROLE_EMBEDDED });
      }
      if (link.onChange) link.onChange();
      else if (!link.inverted) document.documentElement.classList.remove(CFG.CSS.ACTIVE);
    });
    ask();
  }

  /** True when the parent document is itself an embedded (non-Brightspace) frame. */
  function parentIsEmbedded() {
    try {
      return window.parent.document.documentElement.getAttribute(CFG.CSS.ROLE_ATTR) === CFG.CSS.ROLE_EMBEDDED;
    } catch (e) {
      return false;
    }
  }

  /**
   * Cross-origin frames can't see their parent, so only start the handshake
   * when an ancestor origin was detected as Brightspace before. Keeps the
   * message off every other site's iframes. ancestorOrigins is Chrome-only and
   * reads "null" when the embedder hides its origin.
   */
  function linkIfInsideBrightspace() {
    var anc = location.ancestorOrigins;
    if (!anc || !anc.length) return;
    chrome.storage.local.get([FL.ORIGINS_KEY], function (result) {
      if (chrome.runtime.lastError) return;
      var known = (result && result[FL.ORIGINS_KEY]) || [];
      for (var i = 0; i < anc.length; i++) {
        if (anc[i] === 'null' || known.indexOf(anc[i]) !== -1) {
          linkToParent();
          return;
        }
      }
    });
  }

  /** Records this Brightspace origin so its cross-origin children can find it. */
  function rememberOrigin() {
    var origin = location.origin;
    if (!origin || origin === 'null') return;
    chrome.storage.local.get([FL.ORIGINS_KEY], function (result) {
      if (chrome.runtime.lastError) return;
      var known = (result && result[FL.ORIGINS_KEY]) || [];
      if (known.indexOf(origin) !== -1) return;
      known.push(origin);
      var update = {};
      update[FL.ORIGINS_KEY] = known.slice(-FL.MAX_ORIGINS);
      chrome.storage.local.set(update);
    });
  }

  // about: iframes inherit the parent's origin and need dark mode if parent has it
  var isAboutFrame = location.protocol === 'about:';
  if (isAboutFrame) {
    try {
      if (parentIsEmbedded()) {
        linkToParent();
      } else if (window.parent.document.documentElement.classList.contains(CFG.CSS.ACTIVE)) {
        document.documentElement.classList.add(CFG.CSS.ACTIVE);
        chrome.runtime.sendMessage({ type: 'injectScripts' });
      }
    } catch (e) {}
    return;
  }

  // Children of embedded frames are embedded too, never Brightspace pages
  if (window.self !== window.top && parentIsEmbedded()) {
    linkToParent();
    return;
  }

  var hostname = location.hostname;

  // Skip excluded hosts
  if (CFG.matchesAnyHost(hostname, CFG.EXCLUDED_HOSTS)) return;

  var isKnownHost = CFG.matchesAnyHost(hostname, CFG.KNOWN_HOSTS);

  // Fast synchronous check: data-app-version + Brightspace CDN, or known host
  var htmlEl = document.documentElement;
  var isFastMatch = CFG.isBrightspaceElement(htmlEl) || isKnownHost;

  // Same-origin child frames may lack data-app-version; check parent instead
  if (!isFastMatch && window.self !== window.top) {
    try {
      var parentHtml = window.parent.document.documentElement;
      if (parentHtml.classList.contains(CFG.CSS.ACTIVE)
        || CFG.isBrightspaceElement(parentHtml)) {
        isFastMatch = true;
      }
    } catch (e) {}
  }

  // Cross-origin child frames that failed the fast check are not Brightspace,
  // but may be content (a video player, ...) shown inside an inverted Brightspace page
  if (!isFastMatch && window.self !== window.top) {
    try {
      void window.parent.document;
    } catch (e) {
      linkIfInsideBrightspace();
      return;
    }
  }

  /** Applies the dark classes at document_start so the first paint is already dark. */
  function applyInstantDark() {
    var html = document.documentElement;
    html.classList.add(CFG.CSS.ACTIVE);
    // TOP carries the filter; child frames inherit it (see D2L.shouldApplyFilter)
    if (window.self === window.top) {
      html.classList.add(CFG.CSS.TOP, CFG.CSS.NESTED);
    }
  }

  function undoInstantDark() {
    document.documentElement.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.TOP, CFG.CSS.NESTED);
  }

  function checkExcludedThenInject(excluded, source, darkEnabled) {
    if (CFG.matchesAnyHost(hostname, excluded)) {
      // Undo FOUC-prevention classes for excluded domains
      undoInstantDark();
      document.documentElement.setAttribute('data-d2l-detected', 'true');
      document.documentElement.setAttribute('data-d2l-source', 'excluded');
      return;
    }
    if (darkEnabled) applyInstantDark();
    rememberOrigin();
    document.documentElement.setAttribute('data-d2l-detected', 'true');
    document.documentElement.setAttribute('data-d2l-source', source || 'auto');
    chrome.runtime.sendMessage({ type: 'injectScripts', d2lDetected: true });
  }

  if (isFastMatch) {
    // Assume enabled; undo a few ms later if storage says otherwise, before first paint
    applyInstantDark();
    chrome.storage.sync.get(
      [CFG.STORAGE_KEYS.EXCLUDED_DOMAINS, CFG.STORAGE_KEYS.DARK_MODE],
      function (result) {
        var darkEnabled = result[CFG.STORAGE_KEYS.DARK_MODE] !== false;
        if (!darkEnabled) undoInstantDark();
        checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [], 'auto', darkEnabled);
      }
    );
  } else {
    // Unknown domain: try DOM detection, then fall back to custom domains
    function tryDOMThenCustomDomains() {
      if (document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR)) {
        chrome.storage.sync.get(
          [CFG.STORAGE_KEYS.EXCLUDED_DOMAINS, CFG.STORAGE_KEYS.DARK_MODE],
          function (result) {
            checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [], 'auto',
              result[CFG.STORAGE_KEYS.DARK_MODE] !== false);
          }
        );
        return;
      }
      // No D2L selectors found — check custom domains
      chrome.storage.sync.get(
        [CFG.STORAGE_KEYS.CUSTOM_DOMAINS, CFG.STORAGE_KEYS.EXCLUDED_DOMAINS, CFG.STORAGE_KEYS.DARK_MODE],
        function (result) {
          var customDomains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
          if (CFG.matchesAnyHost(hostname, customDomains)) {
            checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [], 'custom',
              result[CFG.STORAGE_KEYS.DARK_MODE] !== false);
          }
        }
      );
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryDOMThenCustomDomains, { once: true });
    } else {
      tryDOMThenCustomDomains();
    }
  }
})();
