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

    // --- Strongest positive signal ---
    // picture-in-picture is exclusive to video players
    if (CFG.PATTERNS.VIDEO_STRONG_ALLOW.test(allow)) return true;

    // --- Negative checks: known non-video iframe types ---
    // These run BEFORE the title check because D2L Lessons wrappers often
    // carry course titles that contain the word "Video" (e.g.,
    // "WHMIS 1A00 Video - ...") which would otherwise false-positive.

    // D2L Lessons content viewer: encrypted-media + clipboard-write in allow
    if (/encrypted-media/.test(allow) && /clipboard-write/.test(allow)) return false;

    // Compute class+id once for both negative and positive checks below
    var classAndId = ((iframe.className || '') + ' ' + (iframe.id || '')).toLowerCase();

    // D2L HTML topic iframe: course content pages carry broad allow policies
    // that overlap with video signals.
    if (/html-topic-iframe/.test(classAndId)) return false;

    // D2L hosted content served from /content/enforced/ are never video iframes.
    // Race-condition-proof: src is set at iframe creation time.
    try {
      var srcUrl = new URL(iframe.src, window.location.href);
      if (/^\/content\/enforced\//.test(srcUrl.pathname)) return false;
    } catch (e) { /* invalid src — skip */ }

    // --- Medium positive signal ---
    // Explicit "video" / "video player" / "media player" in title or aria-label.
    // Placed after negative checks to avoid false-positives on D2L wrappers
    // whose course title happens to contain "Video".
    var text = ((iframe.title || '') + ' ' + (iframe.getAttribute('aria-label') || '')).toLowerCase();
    if (CFG.PATTERNS.VIDEO_TITLE.test(text)) return true;

    // --- Combined signals (fullscreen capability + one more hint) ---
    var hasFullscreen = iframe.hasAttribute('allowfullscreen')
      || iframe.hasAttribute('allowFullScreen')
      || /\bfullscreen\b/.test(allow);
    if (!hasFullscreen) return false;

    // autoplay policy — widgets almost never request it
    if (CFG.PATTERNS.VIDEO_AUTOPLAY.test(allow)) return true;

    // src path contains a video-related segment
    try {
      var path = new URL(iframe.src, window.location.href).pathname.toLowerCase();
      if (CFG.PATTERNS.VIDEO_PATH.test(path)) return true;
    } catch (e) { /* invalid src — skip */ }

    // class or id contains "video" or "player"
    if (CFG.PATTERNS.VIDEO_CLASS_ID.test(classAndId)) return true;

    return false;
  };

  /**
   * Scans all iframes (including those inside shadow roots) and applies/removes
   * counter-inversion based on state.
   */
  D2L.applyVideoMode = function () {
    D2L._applyVideoModeIn(document);

    // Toggle class on <html> so CSS can conditionally counter-invert native <video> elements
    if (D2L.state.videoDarkModeEnabled) {
      document.documentElement.classList.add(CFG.CSS.VIDEO_DARK);
    } else {
      document.documentElement.classList.remove(CFG.CSS.VIDEO_DARK);
    }

    // Rebuild shadow CSS so shadow-DOM <video> elements follow the same rule.
    // Respect document dark mode: in child frames with doc dark mode ON, exclude canvas.
    var includeVideo = !D2L.state.videoDarkModeEnabled;
    var includeCanvas = D2L.isEffectiveRoot || !D2L.state.documentDarkModeEnabled;
    D2L.sharedShadowSheet.replaceSync(D2L.buildShadowCSS(includeCanvas, includeVideo));
  };

  /**
   * Recursively scans a root (document or shadow root) for video iframes,
   * descending into shadow roots to find iframes that querySelectorAll misses.
   */
  D2L._applyVideoModeIn = function (root) {
    var iframes = root.querySelectorAll ? root.querySelectorAll('iframe') : [];
    for (var i = 0; i < iframes.length; i++) {
      if (D2L.isVideoIframe(iframes[i])) {
        D2L.applyVideoModeToIframe(iframes[i]);
      } else if (iframes[i].style.filter === 'invert(1) hue-rotate(180deg)') {
        // Clean up stale counter-inversion from iframes that were previously
        // misidentified as video (e.g., web component added the class after
        // iframe creation, or src changed).
        iframes[i].style.removeProperty('filter');
      }
    }
    // Walk into shadow roots
    var elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var j = 0; j < elements.length; j++) {
      if (elements[j].shadowRoot) {
        D2L._applyVideoModeIn(elements[j].shadowRoot);
      }
    }
  };

  /**
   * Recursively removes the extension's counter-inversion filter from all iframes,
   * including those inside shadow roots. Used during disableDarkMode to ensure
   * no stale filters remain.
   */
  D2L._cleanupIframeFilters = function (root) {
    var iframes = root.querySelectorAll ? root.querySelectorAll('iframe') : [];
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].style.filter === 'invert(1) hue-rotate(180deg)') {
        iframes[i].style.removeProperty('filter');
      }
    }
    var elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var j = 0; j < elements.length; j++) {
      if (elements[j].shadowRoot) {
        D2L._cleanupIframeFilters(elements[j].shadowRoot);
      }
    }
  };

  /**
   * Apply or remove counter-inversion on a single video iframe.
   */
  D2L.applyVideoModeToIframe = function (iframe) {
    if (!iframe.classList.contains(CFG.CSS.VIDEO_IFRAME)) {
      iframe.classList.add(CFG.CSS.VIDEO_IFRAME);
    }
    if (!D2L.state.darkModeEnabled) return;
    if (D2L.state.videoDarkModeEnabled) {
      iframe.style.removeProperty('filter');
    } else {
      iframe.style.filter = 'invert(1) hue-rotate(180deg)';
    }
  };
})();
