/**
 * D2L Dark Mode — Video Iframe Detection & Mode
 * Tiered heuristic to identify video iframes and apply/remove counter-inversion.
 */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /**
   * Tiered heuristic to identify video iframes.
   * Strong signals pass alone; weaker signals require allowfullscreen + a second hint.
   */
  D2L.isVideoIframe = function (iframe) {
    var allow = iframe.getAttribute('allow') || '';

    // --- Strong signals (any one is sufficient) ---

    // picture-in-picture / encrypted-media are video-only policies
    if (CFG.PATTERNS.VIDEO_STRONG_ALLOW.test(allow)) return true;

    // Explicit "video" / "video player" / "media player" in title or aria-label
    var text = ((iframe.title || '') + ' ' + (iframe.getAttribute('aria-label') || '')).toLowerCase();
    if (CFG.PATTERNS.VIDEO_TITLE.test(text)) return true;

    // --- Negative check: D2L Lessons content viewer ---
    // D2L content viewer frames include both encrypted-media and clipboard-write
    // in their allow policy (for DRM playback and clipboard operations).
    // Video embeds that also carry encrypted-media (YouTube) always include
    // picture-in-picture too, which is caught above. Bail out early.
    if (/encrypted-media/.test(allow) && /clipboard-write/.test(allow)) return false;

    // --- Combined signals (allowfullscreen + one more hint) ---
    var hasFullscreen = iframe.hasAttribute('allowfullscreen') || iframe.hasAttribute('allowFullScreen');
    if (!hasFullscreen) return false;

    // autoplay policy — widgets almost never request it
    if (CFG.PATTERNS.VIDEO_AUTOPLAY.test(allow)) return true;

    // src path contains a video-related segment
    try {
      var path = new URL(iframe.src, window.location.href).pathname.toLowerCase();
      if (CFG.PATTERNS.VIDEO_PATH.test(path)) return true;
    } catch (e) { /* invalid src — skip */ }

    // class or id contains "video" or "player"
    var classAndId = ((iframe.className || '') + ' ' + (iframe.id || '')).toLowerCase();
    if (CFG.PATTERNS.VIDEO_CLASS_ID.test(classAndId)) return true;

    return false;
  };

  /**
   * Scans all iframes and applies/removes counter-inversion based on state.
   */
  D2L.applyVideoMode = function () {
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (D2L.isVideoIframe(iframes[i])) {
        D2L.applyVideoModeToIframe(iframes[i]);
      }
    }
  };

  /**
   * Apply or remove counter-inversion on a single video iframe.
   */
  D2L.applyVideoModeToIframe = function (iframe) {
    if (!D2L.state.darkModeEnabled) return;
    if (D2L.state.videoDarkModeEnabled) {
      iframe.style.removeProperty('filter');
    } else {
      iframe.style.filter = 'invert(1) hue-rotate(180deg)';
    }
  };
})();
