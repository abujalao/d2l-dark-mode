/**
 * D2L Dark Mode — Embedded Frame Entry Point
 * Runs in non-Brightspace frames (Kaltura, YouTube, H5P, ...) that render
 * inside an inverted Brightspace page. gate.js has already learnt from the
 * parent frame, through self.D2LEmbedded, whether this frame is shown inverted.
 *
 * Modes:
 *  - page:   stay inverted like the page around it; counter-invert own media.
 *  - player: a video fills most of the frame, so un-invert the whole frame and
 *            the player looks exactly as designed (controls included).
 *  - off:    the parent says this frame isn't rendered inverted.
 */

(function () {
  'use strict';

  var D2L = window.D2L;
  var CFG = window.D2LConfig;
  var link = self.D2LEmbedded;

  // Stale injection, or gate.js never linked this frame
  if (!CFG || !link) return;
  if (D2L.state && D2L.state.initialized) return;

  var html = document.documentElement;
  var FL = CFG.FRAME_LINK;

  D2L.isEffectiveRoot = false;
  D2L.state = {
    darkModeEnabled: false,
    documentDarkModeEnabled: false,
    videoDarkModeEnabled: false,
    initialized: true,
  };

  var mode = 'off';
  var storageReady = false;

  /* ---- Player detection: judged by content, not by iframe attributes ---- */

  var lastShadowScan = 0;
  var SHADOW_SCAN_INTERVAL_MS = 2000;

  function visibleArea(el, vw, vh) {
    var r = el.getBoundingClientRect();
    var w = Math.min(r.right, vw) - Math.max(r.left, 0);
    var h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function largestVideoArea(videos, vw, vh) {
    var best = 0;
    for (var i = 0; i < videos.length; i++) {
      best = Math.max(best, visibleArea(videos[i], vw, vh));
    }
    return best;
  }

  D2L.isPlayerFrame = function () {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (!vw || !vh) return false;
    var best = largestVideoArea(document.querySelectorAll('video'), vw, vh);
    // Shadow-DOM players (media-chrome, ...): walking every root is costly, so throttle it
    if (!best && Date.now() - lastShadowScan > SHADOW_SCAN_INTERVAL_MS) {
      lastShadowScan = Date.now();
      D2L.walkShadowRoots(document.documentElement, function (root) {
        best = Math.max(best, largestVideoArea(root.querySelectorAll('video'), vw, vh));
      });
    }
    return best / (vw * vh) >= FL.PLAYER_MIN_COVERAGE;
  };

  /* ---- Mode switching ---- */

  function resolveMode() {
    if (!link.inverted || !storageReady) return 'off';
    // Video dark mode wants the video inverted, which page mode already does
    if (!D2L.state.videoDarkModeEnabled && D2L.isPlayerFrame()) return 'player';
    return 'page';
  }

  function applyDocDark() {
    html.classList.toggle(CFG.CSS.DOC_DARK, D2L.state.documentDarkModeEnabled);
  }

  function enterPage() {
    html.classList.remove(CFG.CSS.PLAYER);
    html.classList.add(CFG.CSS.ACTIVE);
    applyDocDark();
    D2L.updateVideoState();
    D2L.startShadowObserver();
    D2L.startFullscreenHandler();
  }

  function leavePage() {
    html.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.VIDEO_DARK, CFG.CSS.DOC_DARK);
    D2L.stopShadowObserver();
    D2L.stopFullscreenHandler();
    D2L.teardownRoots();
  }

  function apply() {
    var next = resolveMode();
    if (next === mode) {
      // Toggles that don't change the mode still change the counter-invert set
      if (mode === 'page') { applyDocDark(); D2L.updateVideoState(); }
      return;
    }
    if (mode === 'page') leavePage();
    mode = next;
    D2L.state.darkModeEnabled = mode === 'page';
    if (mode === 'page') enterPage();
    html.classList.toggle(CFG.CSS.PLAYER, mode === 'player');
    // gate.js set ACTIVE optimistically; only page mode keeps it
    if (mode !== 'page') html.classList.remove(CFG.CSS.ACTIVE);
    D2L.refreshFrameLinks();
  }

  var scheduled = 0;
  function schedule() {
    if (scheduled) return;
    scheduled = setTimeout(function () { scheduled = 0; apply(); }, 250);
  }

  link.onChange = apply;

  // Players build their <video> late and resize it; re-judge on those moments
  new MutationObserver(schedule).observe(html, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  ['loadedmetadata', 'play', 'resize', 'emptied'].forEach(function (type) {
    document.addEventListener(type, schedule, true);
  });

  chrome.storage.sync.get(CFG.allReadKeys(), function (result) {
    D2L.state.documentDarkModeEnabled = CFG.resolveDocumentDarkMode(result);
    D2L.state.videoDarkModeEnabled = result[CFG.STORAGE_KEYS.VIDEO_DARK_MODE] === true;
    storageReady = true;
    apply();
  });

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace !== 'sync') return;
    var touched = false;
    if (changes[CFG.STORAGE_KEYS.VIDEO_DARK_MODE]) {
      D2L.state.videoDarkModeEnabled = changes[CFG.STORAGE_KEYS.VIDEO_DARK_MODE].newValue === true;
      touched = true;
    }
    if (changes[CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE]) {
      D2L.state.documentDarkModeEnabled = changes[CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE].newValue === true;
      touched = true;
    }
    // Dark mode on/off arrives from the parent frame as a context change
    if (touched) apply();
  });
})();
