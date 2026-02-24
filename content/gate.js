/**
 * D2L Dark Mode — Gatekeeper Script
 * Lightweight entry point that runs on every page at document_start.
 * Performs a fast synchronous check to determine if this page could be Brightspace.
 * If yes, injects heavy scripts via the service worker. If no, exits immediately
 * with zero storage calls, zero IPC, and zero DOM modification.
 */

(function () {
  'use strict';

  var CFG = self.D2LConfig;

  // Handle about:blank / about:srcdoc iframes — these inherit the parent's
  // origin and need dark mode scripts if the parent is a Brightspace page.
  var isAboutFrame = location.protocol === 'about:';
  if (isAboutFrame) {
    try {
      if (window.parent.document.documentElement.classList.contains(CFG.CSS.ACTIVE)) {
        document.documentElement.classList.add(CFG.CSS.ACTIVE);
        chrome.runtime.sendMessage({ type: 'injectScripts' });
      }
    } catch (e) {
      // cross-origin — shouldn't happen for about: frames but be safe
    }
    return;
  }

  var hostname = location.hostname;

  // Bail out immediately on excluded hosts (corporate sites, not LMS)
  var isExcluded = CFG.EXCLUDED_HOSTS.some(function (h) {
    return hostname === h || hostname.endsWith('.' + h);
  });
  if (isExcluded) return;

  var isKnownHost = CFG.KNOWN_HOSTS.some(function (h) {
    return hostname === h || hostname.endsWith('.' + h);
  });

  // Fast synchronous check — no IPC, no storage access
  var isFastMatch = document.documentElement.hasAttribute('data-app-version')
    || isKnownHost;

  // Same-origin child frames (document viewers, content iframes) inherit the
  // parent's host but may lack data-app-version. Check if the parent is Brightspace.
  if (!isFastMatch && window.self !== window.top) {
    try {
      var parentDoc = window.parent.document;
      if (parentDoc.documentElement.hasAttribute('data-app-version')
        || parentDoc.documentElement.classList.contains(CFG.CSS.ACTIVE)) {
        isFastMatch = true;
      }
    } catch (e) { /* cross-origin — handled below */ }
  }

  // Cross-origin child frame that failed the fast check → definitely not
  // a Brightspace frame (video embeds, widgets, etc.) — exit with zero async work
  if (!isFastMatch && window.self !== window.top) {
    try {
      void window.parent.document; // throws if cross-origin
    } catch (e) {
      return; // cross-origin child, not Brightspace
    }
  }

  function checkExcludedThenInject(excluded) {
    if (excluded.some(function (d) {
      return hostname === d || hostname.endsWith('.' + d);
    })) {
      // User excluded this domain — undo any early FOUC-prevention class
      document.documentElement.classList.remove(CFG.CSS.ACTIVE);
      return;
    }
    document.documentElement.setAttribute('data-d2l-detected', 'true');
    chrome.runtime.sendMessage({ type: 'injectScripts', d2lDetected: true });
  }

  if (isFastMatch) {
    // Apply immediate dark class to prevent FOUC, then load heavy scripts
    document.documentElement.classList.add(CFG.CSS.ACTIVE);
    // Fast-match path: only need excluded domains from storage (one call)
    chrome.storage.sync.get([CFG.STORAGE_KEYS.EXCLUDED_DOMAINS], function (result) {
      checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || []);
    });
  } else {
    // Top frame or same-origin child on unknown domain.
    // First try a DOM check (no IPC); if that also fails, fall back to
    // checking the user's custom domains via storage.
    function tryDOMThenCustomDomains() {
      if (document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR)) {
        // DOM detected D2L — only need excluded domains (one call)
        chrome.storage.sync.get([CFG.STORAGE_KEYS.EXCLUDED_DOMAINS], function (result) {
          checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || []);
        });
        return;
      }
      // DOM had no D2L selectors — fetch both custom and excluded in one call
      chrome.storage.sync.get(
        [CFG.STORAGE_KEYS.CUSTOM_DOMAINS, CFG.STORAGE_KEYS.EXCLUDED_DOMAINS],
        function (result) {
          var customDomains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
          if (customDomains.some(function (d) {
            return hostname === d || hostname.endsWith('.' + d);
          })) {
            checkExcludedThenInject(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || []);
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
