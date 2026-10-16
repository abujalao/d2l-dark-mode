/**
 * D2L Dark Mode — Settings
 * One place that knows the stored settings: their defaults (config.js
 * DEFAULTS) and how a stored value maps onto them.
 */

(function () {
  'use strict';

  var CFG = self.D2LConfig;

  // Older versions stored document dark mode under this key
  var LEGACY_DOC_KEY = 'pdfDarkModeEnabled';

  /** Calls back with every setting, stored value or its default. */
  function read(callback) {
    var keys = Object.keys(CFG.DEFAULTS);
    chrome.storage.sync.get(keys.concat(LEGACY_DOC_KEY), function (stored) {
      stored = stored || {};
      var settings = {};
      keys.forEach(function (k) {
        settings[k] = stored[k] !== undefined ? stored[k] : CFG.DEFAULTS[k];
      });
      if (stored.documentDarkModeEnabled === undefined && stored[LEGACY_DOC_KEY] !== undefined) {
        settings.documentDarkModeEnabled = stored[LEGACY_DOC_KEY] === true;
      }
      callback(settings);
    });
  }

  /** Calls fn({ setting: newValue }) whenever settings change; removed ones read as their default. */
  function watch(fn) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'sync') return;
      var changed = {};
      var any = false;
      Object.keys(changes).forEach(function (k) {
        if (!(k in CFG.DEFAULTS)) return;
        var v = changes[k].newValue;
        changed[k] = v !== undefined ? v : CFG.DEFAULTS[k];
        any = true;
      });
      if (any) fn(changed);
    });
  }

  /** One-time upgrade: moves the legacy document key to its current name, then deletes it. */
  function migrate(callback) {
    var done = callback || function () {};
    chrome.storage.sync.get([LEGACY_DOC_KEY, 'documentDarkModeEnabled'], function (stored) {
      stored = stored || {};
      if (stored[LEGACY_DOC_KEY] === undefined) return done();
      var removeLegacy = function () { chrome.storage.sync.remove(LEGACY_DOC_KEY, done); };
      if (stored.documentDarkModeEnabled !== undefined) return removeLegacy();
      chrome.storage.sync.set({ documentDarkModeEnabled: stored[LEGACY_DOC_KEY] === true }, removeLegacy);
    });
  }

  self.D2LSettings = {
    read: read,
    watch: watch,
    migrate: migrate,
  };
})();
