/**
 * D2L Dark Mode — Content Script Entry Point
 * Only runs on confirmed Brightspace pages (detection is handled by gate.js).
 */

(function () {
  'use strict';

  var D2L = window.D2L;
  var CFG = window.D2LConfig;

  // Stale injection: the frame navigated before config.js ran here. Let gate.js retry.
  if (!CFG) return;

  // Stale injection into a different document: a placeholder about:blank asked,
  // then a player page replaced it. That page runs embedded.js instead.
  var role = document.documentElement.getAttribute(CFG.CSS.ROLE_ATTR);
  if (role === CFG.CSS.ROLE_EMBEDDED || role === CFG.CSS.ROLE_LINKING) return;

  if (D2L.state.initialized) return;
  D2L.state.initialized = true;

  self.D2LSettings.read(function (s) {
    D2L.state.darkModeEnabled = s.darkModeEnabled !== false;
    D2L.state.documentDarkModeEnabled = s.documentDarkModeEnabled === true;
    D2L.state.videoDarkModeEnabled = s.videoDarkModeEnabled === true;
    D2L.state.fontSize = s.fontSize;
    D2L.state.fontFamily = s.fontFamily;
    D2L.state.fullWidthEnabled = s.fullWidthEnabled === true;
    D2L.state.preserveDisplay = s.preserveDisplay === true;

    D2L.applyDocDarkMode();
    if (D2L.state.darkModeEnabled) {
      D2L.enableDarkMode();
    } else {
      // Undo the dark classes gate.js applied optimistically at document_start
      D2L.disableDarkMode();
    }
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

    if (changes[CFG.STORAGE_KEYS.FONT_SIZE]) {
      D2L.state.fontSize = changes[CFG.STORAGE_KEYS.FONT_SIZE].newValue;
      if (D2L.state.darkModeEnabled || D2L.state.preserveDisplay) D2L.applyFontSize(D2L.state.fontSize);
    }

    if (changes[CFG.STORAGE_KEYS.FONT_FAMILY]) {
      D2L.state.fontFamily = changes[CFG.STORAGE_KEYS.FONT_FAMILY].newValue;
      if (D2L.state.darkModeEnabled || D2L.state.preserveDisplay) D2L.applyFontFamily(D2L.state.fontFamily);
    }

    if (changes[CFG.STORAGE_KEYS.FULL_WIDTH]) {
      D2L.state.fullWidthEnabled = changes[CFG.STORAGE_KEYS.FULL_WIDTH].newValue;
      if (D2L.state.darkModeEnabled || D2L.state.preserveDisplay) D2L.applyFullWidth(D2L.state.fullWidthEnabled);
    }

    if (changes[CFG.STORAGE_KEYS.PRESERVE_DISPLAY]) {
      D2L.state.preserveDisplay = changes[CFG.STORAGE_KEYS.PRESERVE_DISPLAY].newValue;
      if (!D2L.state.darkModeEnabled) {
        if (D2L.state.preserveDisplay) {
          D2L.applyFontSize(D2L.state.fontSize);
          D2L.applyFontFamily(D2L.state.fontFamily);
          D2L.applyFullWidth(D2L.state.fullWidthEnabled);
        } else {
          D2L.removeFontSize();
          D2L.removeFontFamily();
          D2L.removeFullWidth();
        }
      }
    }
  });
})();
