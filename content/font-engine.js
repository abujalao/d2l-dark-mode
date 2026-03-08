/** D2L Dark Mode — Font Engine */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /* ---- Font Size ---- */

  /** Injects a font-size scale override on html (percentage-based). */
  D2L.applyFontSize = function (pct) {
    var old = document.getElementById(CFG.CSS.FONT_SIZE_STYLE_ID);
    if (old) old.remove();

    var val = Math.min(150, Math.max(80, Number(pct) || 100));
    if (val === 100) return;

    var style = document.createElement('style');
    style.id = CFG.CSS.FONT_SIZE_STYLE_ID;
    style.textContent = 'html { zoom: ' + (val / 100).toFixed(2) + '; }';
    (document.head || document.documentElement).appendChild(style);
  };

  /** Removes the font-size override. */
  D2L.removeFontSize = function () {
    var el = document.getElementById(CFG.CSS.FONT_SIZE_STYLE_ID);
    if (el) el.remove();
  };

  /* ---- Font Family ---- */

  /** Injects a Google Fonts link and body font-family override. */
  D2L.applyFontFamily = function (familyKey) {
    var oldLink = document.getElementById(CFG.CSS.FONT_FAMILY_LINK_ID);
    if (oldLink) oldLink.remove();
    var oldStyle = document.getElementById(CFG.CSS.FONT_FAMILY_STYLE_ID);
    if (oldStyle) oldStyle.remove();

    var cfg = CFG.FONT_FAMILIES[familyKey];
    if (!cfg || !cfg.family) return;

    if (cfg.url) {
      var link = document.createElement('link');
      link.id = CFG.CSS.FONT_FAMILY_LINK_ID;
      link.rel = 'stylesheet';
      link.href = cfg.url;
      (document.head || document.documentElement).appendChild(link);
    }

    var style = document.createElement('style');
    style.id = CFG.CSS.FONT_FAMILY_STYLE_ID;
    style.textContent = 'body { font-family: ' + cfg.family + ' !important; }';
    (document.head || document.documentElement).appendChild(style);
  };

  /** Removes the font-family override and Google Fonts link. */
  D2L.removeFontFamily = function () {
    var el1 = document.getElementById(CFG.CSS.FONT_FAMILY_LINK_ID);
    if (el1) el1.remove();
    var el2 = document.getElementById(CFG.CSS.FONT_FAMILY_STYLE_ID);
    if (el2) el2.remove();
  };
})();
