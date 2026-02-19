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
  var isKnownHost = CFG.KNOWN_HOSTS.some(function (h) {
    return hostname === h || hostname.endsWith('.' + h);
  });

  // Fast synchronous check — no IPC, no storage access
  var isFastMatch = CFG.PATTERNS.D2L_PATH.test(location.href)
    || document.documentElement.hasAttribute('data-app-version')
    || isKnownHost;

  // Cross-origin child frame that failed the fast check → definitely not
  // a Brightspace frame (video embeds, widgets, etc.) — exit with zero async work
  if (!isFastMatch && window.self !== window.top) {
    try {
      void window.parent.document; // throws if cross-origin
    } catch (e) {
      return; // cross-origin child, not Brightspace
    }
  }

  function injectHeavy() {
    chrome.runtime.sendMessage({ type: 'injectScripts' });
  }

  if (isFastMatch) {
    // Apply immediate dark class to prevent FOUC, then load heavy scripts
    document.documentElement.classList.add(CFG.CSS.ACTIVE);
    injectHeavy();
  } else {
    // Top frame or same-origin child on unknown domain.
    // First try a DOM check (no IPC); if that also fails, fall back to
    // checking the user's custom domains via storage (one IPC call only
    // when the page has no D2L indicators at all).
    function tryDOMThenCustomDomains() {
      if (document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR)) {
        injectHeavy();
        return;
      }
      // DOM had no D2L selectors — check user-configured custom domains
      chrome.storage.sync.get([CFG.STORAGE_KEYS.CUSTOM_DOMAINS], function (result) {
        var customDomains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
        if (customDomains.some(function (d) {
          return hostname === d || hostname.endsWith('.' + d);
        })) {
          injectHeavy();
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryDOMThenCustomDomains, { once: true });
    } else {
      tryDOMThenCustomDomains();
    }
  }
})();
