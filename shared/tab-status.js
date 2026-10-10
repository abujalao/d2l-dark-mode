/**
 * D2L Dark Mode — Tab Status
 * One answer, for the toolbar icon and the popup, to "is DarkSpace active on
 * this tab?". The page is the source of truth: gate.js marks it with
 * data-d2l-detected / data-d2l-source, which survive service-worker sleep.
 */

(function () {
  'use strict';

  /** page: { detected, source } as read from the tab's <html>. */
  function isActive(page, darkOn) {
    return !!(page && page.detected && page.source !== 'excluded' && darkOn);
  }

  /** Browser-owned pages can't be scripted, so they can't carry the marks either. */
  function canReadPage(url) {
    return !!url && !/^(chrome|chrome-extension|about|edge|devtools):/.test(url);
  }

  /**
   * Runs inside the tab via chrome.scripting.executeScript, so it must be
   * self-contained: no closures, no globals from this file.
   */
  function readPageMarks() {
    var h = document.documentElement;
    return {
      detected: h.hasAttribute('data-d2l-detected'),
      source: h.getAttribute('data-d2l-source') || 'auto',
    };
  }

  self.D2LTabStatus = {
    isActive: isActive,
    canReadPage: canReadPage,
    readPageMarks: readPageMarks,
  };
})();
