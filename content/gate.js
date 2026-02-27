/**
 * D2L Dark Mode — Gatekeeper Script
 * Runs on every page at document_start. Determines if this is a Brightspace
 * page and triggers content script injection via the service worker.
 */

(function () {
  'use strict';

  var CFG = self.D2LConfig;

  // about: iframes inherit the parent's origin and need dark mode if parent has it
  var isAboutFrame = location.protocol === 'about:';
  if (isAboutFrame) {
    try {
      if (window.parent.document.documentElement.classList.contains(CFG.CSS.ACTIVE)) {
        document.documentElement.classList.add(CFG.CSS.ACTIVE);
        chrome.runtime.sendMessage({ type: 'injectScripts' });
      }
    } catch (e) {}
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

  // Cross-origin child frames that failed the fast check are not Brightspace
  if (!isFastMatch && window.self !== window.top) {
    try {
      void window.parent.document;
    } catch (e) {
      return;
    }
  }

  function checkExcludedThenInject(excluded, source) {
    if (CFG.matchesAnyHost(hostname, excluded)) {
      // Undo FOUC-prevention class for excluded domains
      document.documentElement.classList.remove(CFG.CSS.ACTIVE);
      document.documentElement.setAttribute('data-d2l-detected', 'true');
      document.documentElement.setAttribute('data-d2l-source', 'excluded');
      return;
    }
    document.documentElement.setAttribute('data-d2l-detected', 'true');
    document.documentElement.setAttribute('data-d2l-source', source || 'auto');
    chrome.runtime.sendMessage({ type: 'injectScripts', d2lDetected: true });
  }

  if (isFastMatch) {
    // Apply dark class immediately to prevent FOUC
    document.documentElement.classList.add(CFG.CSS.ACTIVE);
    chrome.storage.sync.get([CFG.STORAGE_KEYS.EXCLUDED_DOMAINS], function (result) {
      checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [], 'auto');
    });
  } else {
    // Unknown domain: try DOM detection, then fall back to custom domains
    function tryDOMThenCustomDomains() {
      if (document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR)) {
        chrome.storage.sync.get([CFG.STORAGE_KEYS.EXCLUDED_DOMAINS], function (result) {
          checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [], 'auto');
        });
        return;
      }
      // No D2L selectors found — check custom domains
      chrome.storage.sync.get(
        [CFG.STORAGE_KEYS.CUSTOM_DOMAINS, CFG.STORAGE_KEYS.EXCLUDED_DOMAINS],
        function (result) {
          var customDomains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
          if (CFG.matchesAnyHost(hostname, customDomains)) {
            checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [], 'custom');
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
