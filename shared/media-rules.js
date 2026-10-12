/**
 * D2L Dark Mode — Media Rules
 *
 * The one list of what gets counter-inverted (flipped back to its real
 * colours) inside an inverted frame, and the generator for shadow-DOM CSS.
 *
 * Two copies can't be generated from here; keep them in step with this list:
 *  - content/dark-mode.css: must exist at first paint (manifest, document_start)
 *  - content/shadow-injector.js: MAIN world, where a shared global would be page-visible
 */

(function () {
  'use strict';

  var INVERT = 'invert(1) hue-rotate(180deg)';

  /**
   * `unless` names the toggle that leaves the element inverted with the page:
   *  - videoDark: "Video dark mode" is on
   *  - docDark:   "Document dark mode" is on in a non-root frame (document
   *               viewers draw pages on <canvas>)
   */
  var MEDIA = [
    { sel: 'img' },
    { sel: 'picture' },
    { sel: 'video', unless: 'videoDark' },
    { sel: 'canvas', unless: 'docDark' },
  ];

  /** Media selectors that are counter-inverted for the given toggles. */
  function mediaFor(opts) {
    opts = opts || {};
    return MEDIA
      .filter(function (m) { return !m.unless || !opts[m.unless]; })
      .map(function (m) { return m.sel; });
  }

  function rule(selector, filter) {
    return selector + ' { filter: ' + filter + ' !important; }\n';
  }

  /** CSS adopted into every shadow root of an inverted frame. */
  function shadowCSS(opts) {
    opts = opts || {};
    var media = mediaFor(opts).join(', ');
    return rule(media, INVERT) +
      rule(':popover-open', INVERT) +
      rule(':host(:popover-open)', INVERT) +
      rule(':popover-open :is(' + media + ')', INVERT) +
      rule('[style*="background-image"]', INVERT) +
      // Media inside a background-image element would be inverted three times
      // (page + parent + own); the parent's filter already covers it
      rule('[style*="background-image"] :is(' + media + ')', 'none') +
      // Fullscreen escapes the page-level filter, so the video rule is flipped
      rule('video:fullscreen, iframe.d2l-iframe-fallback:fullscreen', opts.videoDark ? INVERT : 'none') +
      // ...except inside a fullscreen host, which dark-mode.css inverts: its videos come along
      rule(':host(:fullscreen) video', opts.videoDark ? 'none' : INVERT);
  }

  self.D2LMediaRules = {
    shadowCSS: shadowCSS,
  };
})();
