/** D2L Dark Mode — Theme Engine */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /* Theme filter extras intentionally empty.
     Adding sepia/saturate/hue-rotate to the root filter taints images
     that are counter-inverted — they cannot selectively cancel those
     extra functions. CSS variable overrides below work cleanly for all
     D2L components (nav, sidebar, buttons, form fields, dropdowns). */
  D2L.THEME_FILTER_EXTRAS = {};

  /* ---- Theme CSS variable overrides ----
     For elements that DO read --d2l-color-* variables (nav bars, buttons,
     text). These complement the filter tint for finer control. */

  var THEME_VARS = {

    /* Nebula — blue-tinted darks */
    nebula: '\n' +
      'html.' + CFG.CSS.ACTIVE + ' {\n' +
      '  --d2l-color-regolith: #e8eeff !important;\n' +
      '  --d2l-color-sylvite: #d4dcf7 !important;\n' +
      '  --d2l-color-gypsum: #bbc6f0 !important;\n' +
      '  --d2l-color-mica: #8899dd !important;\n' +
      '  --d2l-color-galena: #5566bb !important;\n' +
      '  --d2l-color-tungsten: #3344aa !important;\n' +
      '  --d2l-color-ferrite: #112288 !important;\n' +
      '  --d2l-color-corundum: #0a1a77 !important;\n' +
      '  --d2l-color-chromite: #000033 !important;\n' +
      '  --d2l-color-fluorite: #f0f4ff !important;\n' +
      '  --d2l-color-celestine: #4488ff !important;\n' +
      '  --d2l-color-celestine-plus-1: #c8daff !important;\n' +
      '}\n',

    /* Ember — warm amber tones */
    ember: '\n' +
      'html.' + CFG.CSS.ACTIVE + ' {\n' +
      '  --d2l-color-regolith: #fff8f0 !important;\n' +
      '  --d2l-color-sylvite: #f5e8d4 !important;\n' +
      '  --d2l-color-gypsum: #e8d4b8 !important;\n' +
      '  --d2l-color-mica: #d4b896 !important;\n' +
      '  --d2l-color-galena: #b89060 !important;\n' +
      '  --d2l-color-tungsten: #9a7040 !important;\n' +
      '  --d2l-color-ferrite: #6b4420 !important;\n' +
      '  --d2l-color-corundum: #5a3818 !important;\n' +
      '  --d2l-color-chromite: #2c1a00 !important;\n' +
      '  --d2l-color-fluorite: #fffaf5 !important;\n' +
      '  --d2l-color-celestine: #cc7700 !important;\n' +
      '  --d2l-color-celestine-plus-1: #ffe8c8 !important;\n' +
      '}\n',

    /* Stark — high contrast, maximum luminance range */
    stark: '\n' +
      'html.' + CFG.CSS.ACTIVE + ' {\n' +
      '  --d2l-color-regolith: #ffffff !important;\n' +
      '  --d2l-color-sylvite: #f5f5f5 !important;\n' +
      '  --d2l-color-gypsum: #e0e0e0 !important;\n' +
      '  --d2l-color-mica: #c0c0c0 !important;\n' +
      '  --d2l-color-galena: #808080 !important;\n' +
      '  --d2l-color-tungsten: #404040 !important;\n' +
      '  --d2l-color-ferrite: #1a1a1a !important;\n' +
      '  --d2l-color-corundum: #0d0d0d !important;\n' +
      '  --d2l-color-chromite: #000000 !important;\n' +
      '  --d2l-color-fluorite: #ffffff !important;\n' +
      '  --d2l-color-celestine: #0055ff !important;\n' +
      '  --d2l-color-carnelian: #ff0000 !important;\n' +
      '  --d2l-color-olivine: #00cc00 !important;\n' +
      '  --d2l-color-celestine-plus-1: #c0d8ff !important;\n' +
      '}\n',

    /* Eclipse — solarized-inspired warm+cool balance */
    eclipse: '\n' +
      'html.' + CFG.CSS.ACTIVE + ' {\n' +
      '  --d2l-color-regolith: #fdf6e3 !important;\n' +
      '  --d2l-color-sylvite: #eee8d5 !important;\n' +
      '  --d2l-color-gypsum: #ddd8c5 !important;\n' +
      '  --d2l-color-mica: #93a1a1 !important;\n' +
      '  --d2l-color-galena: #657b83 !important;\n' +
      '  --d2l-color-tungsten: #586e75 !important;\n' +
      '  --d2l-color-ferrite: #073642 !important;\n' +
      '  --d2l-color-corundum: #002b36 !important;\n' +
      '  --d2l-color-chromite: #001c24 !important;\n' +
      '  --d2l-color-fluorite: #fdf6e3 !important;\n' +
      '  --d2l-color-celestine: #268bd2 !important;\n' +
      '  --d2l-color-carnelian: #dc322f !important;\n' +
      '  --d2l-color-olivine: #859900 !important;\n' +
      '  --d2l-color-citrine: #b58900 !important;\n' +
      '  --d2l-color-amethyst: #6c71c4 !important;\n' +
      '  --d2l-color-tourmaline: #2aa198 !important;\n' +
      '  --d2l-color-celestine-plus-1: #d5e8f0 !important;\n' +
      '}\n',
  };

  /** Injects theme-specific CSS variable overrides + updates root filter. */
  D2L.applyTheme = function (themeName) {
    var existing = document.getElementById(CFG.CSS.THEME_STYLE_ID);
    if (existing) existing.remove();

    var css = THEME_VARS[themeName];
    if (css) {
      var style = document.createElement('style');
      style.id = CFG.CSS.THEME_STYLE_ID;
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }

    // Update the root filter to include this theme's tint
    if (D2L.updateRootFilter) D2L.updateRootFilter();
  };

  /** Removes the theme override style tag. */
  D2L.removeTheme = function () {
    var el = document.getElementById(CFG.CSS.THEME_STYLE_ID);
    if (el) el.remove();
  };
})();
