/** D2L Dark Mode — Frame Link (parent side of the frame handshake) */

/*
 * The top frame inverts everything below it, at any depth. A child frame that
 * runs our scripts corrects its own media, so its <iframe> element must never
 * be counter-inverted from outside: two frames doing it for the same video
 * stack into a negative. This file tells children whether their content is
 * rendered inverted, and counter-inverts only video iframes whose document
 * never answers (no scripts there: blocked host access, chrome-extension:, ...).
 */

(function () {
  'use strict';

  const D2L = window.D2L = window.D2L || {};
  const CFG = window.D2LConfig;

  // Stale injection: the frame navigated before config.js ran here
  if (!CFG) return;
  const FL = CFG.FRAME_LINK;

  // A second injection into the same document would double the listener
  if (D2L.watchIframe) return;

  var watched = new Set();
  // Every iframe the shadow-root scan has met. Browsers leave iframes inside
  // shadow roots out of window.frames (LTI tool frames often sit in one), so
  // this is how their children are recognised and reached.
  var known = new Set();

  /** Drops iframes that left the page. Runs whenever a new one is recorded, so neither set outgrows the page. */
  function forgetDetached() {
    watched.forEach(function (iframe) {
      if (iframe.isConnected) return;
      clearTimeout(iframe._d2lFallbackTimer);
      iframe.removeEventListener('load', onProbeLoad);
      watched.delete(iframe);
    });
    known.forEach(function (iframe) {
      if (!iframe.isConnected) known.delete(iframe);
    });
  }

  /** Records an iframe met by the page scan (light DOM or any shadow root). */
  D2L.noteIframe = function (iframe) {
    if (known.has(iframe)) return;
    forgetDetached();
    known.add(iframe);
  };

  /** How many iframes this frame is keeping track of (diagnostics and tests). */
  D2L.trackedIframeCount = function () {
    var all = new Set(known);
    watched.forEach(function (iframe) { all.add(iframe); });
    return all.size;
  };

  /** True when this frame's content currently renders inverted. */
  D2L.contentInverted = function () {
    var cl = document.documentElement.classList;
    return cl.contains(CFG.CSS.ACTIVE) && !cl.contains(CFG.CSS.PLAYER);
  };

  function post(win, kind, extra) {
    var msg = {};
    msg[FL.KEY] = kind;
    if (extra) for (var k in extra) msg[k] = extra[k];
    try { win.postMessage(msg, '*'); } catch (e) { /* frame gone */ }
  }

  function isChildWindow(win) {
    for (var i = 0; i < window.frames.length; i++) {
      if (window.frames[i] === win) return true;
    }
    return !!iframeFor(win);
  }

  /** The <iframe> element showing `win`: video iframes first, then light DOM, then shadow roots. */
  function iframeFor(win) {
    var found = null;
    watched.forEach(function (f) { if (!found && f.contentWindow === win) found = f; });
    known.forEach(function (f) { if (!found && f.contentWindow === win) found = f; });
    if (found) return found;
    var light = document.querySelectorAll('iframe');
    for (var i = 0; i < light.length; i++) if (light[i].contentWindow === win) return light[i];
    D2L.walkShadowRoots(document.documentElement, function (root) {
      if (found) return;
      var list = root.querySelectorAll('iframe');
      for (var j = 0; j < list.length; j++) if (list[j].contentWindow === win) { found = list[j]; return; }
    });
    return found;
  }

  /**
   * What a child frame needs to know. `player` is the cheap hint the old code
   * acted on: the iframe looks like a video player, so the child can show its
   * original look at once instead of waiting for its <video> to be built.
   */
  function contextPayload(iframe) {
    var inverted = D2L.contentInverted();
    var videoDark = !!(D2L.state && D2L.state.videoDarkModeEnabled);
    return { inverted: inverted, player: inverted && !videoDark && !!iframe && D2L.isVideoIframe(iframe) };
  }

  /** Tells every child frame whether its content is rendered inverted. */
  D2L.broadcastContext = function () {
    var sent = new Set();
    function send(iframe, win) {
      if (!win || sent.has(win)) return;
      sent.add(win);
      post(win, 'ctx', contextPayload(iframe));
    }
    watched.forEach(function (f) { send(f, f.contentWindow); });
    known.forEach(function (f) { if (f.isConnected) send(f, f.contentWindow); });
    var light = document.querySelectorAll('iframe');
    for (var i = 0; i < light.length; i++) send(light[i], light[i].contentWindow);
    for (var k = 0; k < window.frames.length; k++) send(null, window.frames[k]);
  };

  /* ---- Fallback counter-inversion for script-less video iframes ---- */

  function isSameOrigin(iframe) {
    try { return !!iframe.contentDocument; } catch (e) { return false; }
  }

  // Content scripts never run in these, so waiting for an answer is pointless
  function isUnscriptable(iframe) {
    var src = iframe.getAttribute('src');
    if (!src) return false;
    try {
      return !/^(https?|about|file):$/.test(new URL(src, location.href).protocol);
    } catch (e) {
      return false;
    }
  }

  function applyFallback(iframe) {
    var need = iframe._d2lUnscripted === true
      && iframe.isConnected
      && D2L.contentInverted()
      && !(D2L.state && D2L.state.videoDarkModeEnabled);
    if (need) {
      iframe.style.filter = CFG.CSS.INVERT_FILTER;
      iframe.classList.add(CFG.CSS.IFRAME_FALLBACK);
    } else if (iframe.classList.contains(CFG.CSS.IFRAME_FALLBACK)) {
      iframe.style.removeProperty('filter');
      iframe.classList.remove(CFG.CSS.IFRAME_FALLBACK);
    }
  }

  /** Works out, for the document currently in `iframe`, whether it runs our scripts. */
  function probe(iframe) {
    clearTimeout(iframe._d2lFallbackTimer);
    if (isUnscriptable(iframe)) {
      iframe._d2lUnscripted = true;
      applyFallback(iframe);
      return;
    }
    // Same-origin documents always get our scripts through gate.js
    if (isSameOrigin(iframe)) {
      iframe._d2lUnscripted = false;
      applyFallback(iframe);
      return;
    }
    // Keep the current state until the new document answers or the wait runs out
    iframe._d2lAcked = false;
    post(iframe.contentWindow, 'ping');
    iframe._d2lFallbackTimer = setTimeout(function () {
      if (iframe._d2lAcked) return;
      iframe._d2lUnscripted = true;
      applyFallback(iframe);
    }, FL.FALLBACK_DELAY_MS);
  }

  function onProbeLoad(e) {
    probe(e.currentTarget);
  }

  /** Tracks a video iframe; it is counter-inverted only if its document stays silent. */
  D2L.watchIframe = function (iframe) {
    if (!watched.has(iframe)) {
      forgetDetached();
      watched.add(iframe);
      iframe.addEventListener('load', onProbeLoad);
      probe(iframe);
    }
  };

  /** Re-applies fallbacks after a state change and tells children the new context. */
  D2L.refreshFrameLinks = function () {
    forgetDetached();
    watched.forEach(applyFallback);
    D2L.broadcastContext();
  };

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || d[FL.KEY] !== 'ctx?') return;
    if (!e.source || !isChildWindow(e.source)) return;
    post(e.source, 'ctx', contextPayload(iframeFor(e.source)));
    watched.forEach(function (iframe) {
      if (iframe.contentWindow !== e.source) return;
      clearTimeout(iframe._d2lFallbackTimer);
      iframe._d2lAcked = true;
      iframe._d2lUnscripted = false;
      applyFallback(iframe);
    });
  });
})();
