/**
 * D2L Dark Mode — Content Script Entry Point
 * Reads storage, orchestrates detection, and listens for storage changes.
 */

(function () {
  'use strict';

  const D2L = window.D2L;
  const CFG = window.D2LConfig;

  // Load custom domains and settings, then run detection
  chrome.storage.sync.get([CFG.STORAGE_KEYS.CUSTOM_DOMAINS], function (result) {
    var customDomains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
    D2L.initIfBrightspace(customDomains, initExtension);
  });

  function initExtension() {
    if (D2L.state.initialized) return;
    D2L.state.initialized = true;

    chrome.storage.sync.get(CFG.allReadKeys(), function (result) {
      D2L.state.darkModeEnabled = result[CFG.STORAGE_KEYS.DARK_MODE] !== false;
      D2L.state.documentDarkModeEnabled = CFG.resolveDocumentDarkMode(result);
      D2L.state.videoDarkModeEnabled = result[CFG.STORAGE_KEYS.VIDEO_DARK_MODE] === true;

      D2L.applyDocDarkMode();
      if (D2L.state.darkModeEnabled) D2L.enableDarkMode();
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
      if (namespace !== 'sync') return;

      if (changes[CFG.STORAGE_KEYS.DARK_MODE]) {
        D2L.state.darkModeEnabled = changes[CFG.STORAGE_KEYS.DARK_MODE].newValue;
        D2L.state.darkModeEnabled ? D2L.enableDarkMode() : D2L.disableDarkMode();
      }

      if (changes[CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE]) {
        D2L.state.documentDarkModeEnabled = changes[CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE].newValue;
        D2L.applyDocDarkMode();
      }

      if (changes[CFG.STORAGE_KEYS.VIDEO_DARK_MODE]) {
        D2L.state.videoDarkModeEnabled = changes[CFG.STORAGE_KEYS.VIDEO_DARK_MODE].newValue;
        if (D2L.state.darkModeEnabled) D2L.applyVideoMode();
      }
    });
  }
})();
