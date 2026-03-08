/** D2L Dark Mode — Layout Engine */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /** Injects full-width layout override. */
  D2L.applyFullWidth = function (enabled) {
    var old = document.getElementById(CFG.CSS.FULL_WIDTH_STYLE_ID);
    if (old) old.remove();
    if (!enabled) return;

    var style = document.createElement('style');
    style.id = CFG.CSS.FULL_WIDTH_STYLE_ID;
    style.textContent =
      'body, main, [role="main"], article, section,\n' +
      'body > div, body > div > div, body > div > div > div,\n' +
      'main > div, main > div > div,\n' +
      '[role="main"] > div, [role="main"] > div > div {\n' +
      '  max-width: none !important;\n' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  };

  /** Removes the full-width layout override. */
  D2L.removeFullWidth = function () {
    var el = document.getElementById(CFG.CSS.FULL_WIDTH_STYLE_ID);
    if (el) el.remove();
  };
})();
