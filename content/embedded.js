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

  // 'wait' until settings load: keeps gate.js's optimistic class, and makes the
  // first real decision always apply in full (even "off")
  var mode = 'wait';
  var storageReady = false;

  /* ---- Player detection: judged by content, not by iframe attributes ---- */

  var lastShadowScan = 0;
  // Until the page loads plus a short grace, trust the parent's "looks like a player"
  var graceOver = false;
  var SHADOW_SCAN_INTERVAL_MS = 2000;
  // Shadow roots that can hold a player's <video> (archive.org, media-chrome, ...)
  var shadowRoots = new Set();

  /** Adds each video's visible area, own size and whether its real size is known to `m`. */
  function measureVideos(videos, vw, vh, m) {
    for (var i = 0; i < videos.length; i++) {
      var r = videos[i].getBoundingClientRect();
      var w = Math.min(r.right, vw) - Math.max(r.left, 0);
      var h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (w > 0 && h > 0) m.visible = Math.max(m.visible, w * h);
      m.size = Math.max(m.size, r.width * r.height);
      // A <video> only has its real size once metadata loaded (before that it can be
      // a 300x150 default box), unless the page sized it with CSS: only then trust "small"
      if (videos[i].readyState >= 1) m.sized = true;
    }
  }

  /** 'large' (fills the frame), 'small' (sized and small) or 'none' (no video judged yet). */
  D2L.videoVerdict = function () {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (!vw || !vh) return 'none';
    var m = { visible: 0, size: 0, sized: false };
    measureVideos(document.querySelectorAll('video'), vw, vh, m);
    shadowRoots.forEach(function (root) {
      if (root.host && root.host.isConnected) measureVideos(root.querySelectorAll('video'), vw, vh, m);
      else shadowRoots.delete(root);
    });
    // Roots nobody announced (attached while this frame showed its own look): walking
    // every root is costly, so only now and then
    if (!m.size && Date.now() - lastShadowScan > SHADOW_SCAN_INTERVAL_MS) {
      lastShadowScan = Date.now();
      D2L.walkShadowRoots(document.documentElement, function (root) {
        watchRoot(root);
        measureVideos(root.querySelectorAll('video'), vw, vh, m);
      });
    }
    var frame = vw * vh;
    if (m.visible / frame >= FL.PLAYER_MIN_COVERAGE) return 'large';
    // A full-size video parked off-screen until play (YouTube before the first click),
    // in a frame that isn't an article with a video further down
    if (m.size / frame >= FL.PLAYER_MIN_COVERAGE && !CFG.readsLikePage(document)) return 'large';
    return m.visible > 0 && (m.sized || graceOver) ? 'small' : 'none';
  };

  /** A child frame fills this one: a video site's embed page around its player frame. */
  function wrapsFrame() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (!vw || !vh) return false;
    var m = { visible: 0, size: 0, sized: false };
    measureVideos(document.getElementsByTagName('iframe'), vw, vh, m);
    return m.visible / (vw * vh) >= FL.PLAYER_MIN_COVERAGE;
  }

  /* ---- Mode switching ---- */

  function resolveMode() {
    if (!storageReady) return 'wait';
    if (!link.inverted) return 'off';
    // Video dark mode wants the video inverted, which page mode already does
    if (D2L.state.videoDarkModeEnabled) return 'page';
    var verdict = D2L.videoVerdict();
    if (verdict === 'large') return 'player';
    if (verdict === 'small') return 'page';
    // Only a frame around the player's own frame: let that frame pick its look now, not
    // both flip together when the grace ends (its video would show as a negative between)
    if (wrapsFrame()) return 'page';
    // No video yet: players build theirs late, so keep the parent's hint until the grace ends
    return link.player && !graceOver && !CFG.readsLikePage(document) ? 'player' : 'page';
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
    if (next === 'wait') return;
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

  /* ---- When to re-judge: only when a <video> appears, goes or resizes ---- */

  // One check per frame at most; rAF doesn't run in hidden tabs, so fall back to a timer
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    var run = function () { scheduled = false; apply(); };
    if (document.hidden) setTimeout(run, 100);
    else requestAnimationFrame(run);
  }

  var resizeWatch = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  var sizedVideos = new WeakSet();
  function watchVideoSize(v) {
    if (resizeWatch && !sizedVideos.has(v)) {
      sizedVideos.add(v);
      resizeWatch.observe(v);
    }
  }

  function touchesVideo(node) {
    if (node.nodeType !== 1) return false;
    if (node.tagName === 'VIDEO') { watchVideoSize(node); return true; }
    var inner = node.getElementsByTagName ? node.getElementsByTagName('video') : [];
    for (var i = 0; i < inner.length; i++) watchVideoSize(inner[i]);
    return inner.length > 0;
  }

  // Player UIs mutate constantly while playing (progress bars, timers): ignore all of
  // that and only react when a <video> is added or removed
  var videoWatch = new MutationObserver(function (mutations) {
    for (var m = 0; m < mutations.length; m++) {
      var lists = [mutations[m].addedNodes, mutations[m].removedNodes];
      for (var l = 0; l < 2; l++) {
        for (var n = 0; n < lists[l].length; n++) {
          if (touchesVideo(lists[l][n])) { schedule(); return; }
        }
      }
    }
  });
  videoWatch.observe(html, { childList: true, subtree: true });

  /** Watches a shadow root for the <video> a player builds inside it after attaching it. */
  function watchRoot(root) {
    if (shadowRoots.has(root)) return;
    shadowRoots.add(root);
    videoWatch.observe(root, { childList: true, subtree: true });
    var inner = root.querySelectorAll('video');
    for (var i = 0; i < inner.length; i++) watchVideoSize(inner[i]);
  }

  // shadow-injector.js announces each shadow root as a page attaches it
  document.addEventListener('d2l-shadow-root', function (e) {
    var path = e.composedPath ? e.composedPath() : null;
    var host = (path && path[0]) || e.target;
    if (host && host.shadowRoot) {
      watchRoot(host.shadowRoot);
      schedule();
    }
  }, true);
  D2L.walkShadowRoots(html, watchRoot);

  var existing = document.getElementsByTagName('video');
  for (var ev = 0; ev < existing.length; ev++) watchVideoSize(existing[ev]);

  link.onChange = apply;
  window.addEventListener('resize', schedule);
  ['loadedmetadata', 'emptied'].forEach(function (type) {
    document.addEventListener(type, schedule, true);
  });

  // End of the grace for the parent's hint: a load plus a beat for late players
  function startGrace() {
    setTimeout(function () { graceOver = true; apply(); }, FL.PLAYER_HINT_GRACE_MS);
  }
  if (document.readyState === 'complete') startGrace();
  else window.addEventListener('load', startGrace, { once: true });

  // While the hint is all there is, look again as the page renders its content
  var textCheck = setInterval(function () {
    if (graceOver || mode === 'page' || mode === 'off') clearInterval(textCheck);
    else if (link.player) schedule();
  }, FL.PAGE_TEXT_CHECK_MS);

  self.D2LSettings.read(function (s) {
    D2L.state.documentDarkModeEnabled = s.documentDarkModeEnabled === true;
    D2L.state.videoDarkModeEnabled = s.videoDarkModeEnabled === true;
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
