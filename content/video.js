/** D2L Dark Mode — Video Iframe Detection & Mode */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  /** Tiered heuristic to identify video iframes. */
  D2L.isVideoIframe = function (iframe) {
    var allow = iframe.getAttribute('allow') || '';

    // Strongest signal: picture-in-picture is exclusive to video players
    if (CFG.PATTERNS.VIDEO_STRONG_ALLOW.test(allow)) return true;

    // Negative checks run before title check to avoid false positives
    // from D2L Lessons wrappers with "Video" in course titles
    if (/encrypted-media/.test(allow) && /clipboard-write/.test(allow)) return false;

    var classAndId = ((iframe.className || '') + ' ' + (iframe.id || '')).toLowerCase();
    if (/html-topic-iframe/.test(classAndId)) return false;

    // /content/enforced/ paths are D2L-hosted content, never video
    try {
      var srcUrl = new URL(iframe.src, window.location.href);
      if (/^\/content\/enforced\//.test(srcUrl.pathname)) return false;
    } catch (e) {}

    // Title or aria-label contains "video" / "media player"
    var text = ((iframe.title || '') + ' ' + (iframe.getAttribute('aria-label') || '')).toLowerCase();
    if (CFG.PATTERNS.VIDEO_TITLE.test(text)) return true;

    // Combined signals: fullscreen + one more hint
    var hasFullscreen = iframe.hasAttribute('allowfullscreen')
      || iframe.hasAttribute('allowFullScreen')
      || /\bfullscreen\b/.test(allow);
    if (!hasFullscreen) return false;

    // autoplay policy is a strong video signal
    if (CFG.PATTERNS.VIDEO_AUTOPLAY.test(allow)) return true;

    // Video-related path segment
    try {
      var path = new URL(iframe.src, window.location.href).pathname.toLowerCase();
      if (CFG.PATTERNS.VIDEO_PATH.test(path)) return true;
    } catch (e) {}

    // Class or id contains "video" or "player"
    if (CFG.PATTERNS.VIDEO_CLASS_ID.test(classAndId)) return true;

    return false;
  };

  /** Applies video mode to all iframes, including those in shadow roots. */
  D2L.applyVideoMode = function () {
    D2L._applyVideoModeIn(document);

    if (D2L.state.videoDarkModeEnabled) {
      document.documentElement.classList.add(CFG.CSS.VIDEO_DARK);
    } else {
      document.documentElement.classList.remove(CFG.CSS.VIDEO_DARK);
    }

    // Rebuild shadow CSS to match current video/document dark mode state
    var includeVideo = !D2L.state.videoDarkModeEnabled;
    var includeCanvas = D2L.isEffectiveRoot || !D2L.state.documentDarkModeEnabled;
    D2L.sharedShadowSheet.replaceSync(D2L.buildShadowCSS(includeCanvas, includeVideo));
  };

  /** Recursively scans a root for video iframes, descending into shadow roots. */
  D2L._applyVideoModeIn = function (root) {
    function processRoot(r) {
      var iframes = r.querySelectorAll ? r.querySelectorAll('iframe') : [];
      for (var i = 0; i < iframes.length; i++) {
        if (D2L.isVideoIframe(iframes[i])) {
          D2L.applyVideoModeToIframe(iframes[i]);
        } else if (iframes[i].style.filter === CFG.CSS.INVERT_FILTER) {
          iframes[i].style.removeProperty('filter');
        }
      }
    }
    processRoot(root);
    D2L.walkShadowRoots(root, processRoot);
  };

  /** Removes counter-inversion filters from all iframes (including shadow roots). */
  D2L._cleanupIframeFilters = function (root) {
    function processRoot(r) {
      var iframes = r.querySelectorAll ? r.querySelectorAll('iframe') : [];
      for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].style.filter === CFG.CSS.INVERT_FILTER) {
          iframes[i].style.removeProperty('filter');
        }
      }
    }
    processRoot(root);
    D2L.walkShadowRoots(root, processRoot);
  };

  /* ---- Fullscreen handler ----
   * Fullscreen elements escape the html filter. JS handles this because
   * CSS :fullscreen in adopted stylesheets is unreliable in Chrome. */

  D2L.startFullscreenHandler = function () {
    document.addEventListener('fullscreenchange', D2L._handleFullscreenChange);
  };

  D2L.stopFullscreenHandler = function () {
    document.removeEventListener('fullscreenchange', D2L._handleFullscreenChange);
  };

  D2L._handleFullscreenChange = function () {
    if (!D2L.state.darkModeEnabled) return;

    var fsElement = document.fullscreenElement;
    if (fsElement) {
      var filterValue = D2L.state.videoDarkModeEnabled
        ? CFG.CSS.INVERT_FILTER
        : 'none';
      D2L._setFullscreenVideoFilter(fsElement, filterValue);
    } else {
      D2L._clearFullscreenVideoFilter(document);
    }
  };

  /** Sets inline filter on all videos inside a root, walking into shadow roots. */
  D2L._setFullscreenVideoFilter = function (root, filterValue) {
    if (root.tagName === 'VIDEO') {
      root.style.setProperty('filter', filterValue, 'important');
      root._d2lFullscreenFixed = true;
      return;
    }
    function processRoot(r) {
      var videos = r.querySelectorAll ? r.querySelectorAll('video') : [];
      for (var i = 0; i < videos.length; i++) {
        videos[i].style.setProperty('filter', filterValue, 'important');
        videos[i]._d2lFullscreenFixed = true;
      }
    }
    processRoot(root);
    D2L.walkShadowRoots(root, processRoot);
  };

  /** Removes inline fullscreen filter overrides from videos. */
  D2L._clearFullscreenVideoFilter = function (root) {
    function processRoot(r) {
      var videos = r.querySelectorAll ? r.querySelectorAll('video') : [];
      for (var i = 0; i < videos.length; i++) {
        if (videos[i]._d2lFullscreenFixed) {
          videos[i].style.removeProperty('filter');
          delete videos[i]._d2lFullscreenFixed;
        }
      }
    }
    processRoot(root);
    D2L.walkShadowRoots(root, processRoot);
  };

  /** Applies counter-inversion to a single video iframe. */
  D2L.applyVideoModeToIframe = function (iframe) {
    if (!iframe.classList.contains(CFG.CSS.VIDEO_IFRAME)) {
      iframe.classList.add(CFG.CSS.VIDEO_IFRAME);
    }
    if (!D2L.state.darkModeEnabled) return;
    if (D2L.state.videoDarkModeEnabled) {
      iframe.style.removeProperty('filter');
    } else {
      iframe.style.filter = CFG.CSS.INVERT_FILTER;
    }
  };
})();
