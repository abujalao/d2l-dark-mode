/** D2L Dark Mode - Shadow DOM Injector (MAIN world, document_start) */

(function () {
  'use strict';

  // Bail on every non-Brightspace page. Mirrors gate.js's fast-match check so
  // this script is independent of inter-world injection order.
  var html = document.documentElement;
  var isBrightspace = html.hasAttribute('data-app-version')
    && (html.getAttribute('data-cdn') || '').indexOf('brightspace') !== -1;
  if (!isBrightspace) return;

  if (window.__d2lShadowOverrideApplied) return;
  window.__d2lShadowOverrideApplied = true;

  var originalAttachShadow = Element.prototype.attachShadow;
  if (!originalAttachShadow) return;

  var sheet;

  /** Builds the counter-invert sheet lazily so non-Brightspace tabs never pay. */
  function getSheet() {
    if (sheet !== undefined) return sheet;
    try {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(
        'img, picture, canvas, video {' +
        '  filter: invert(1) hue-rotate(180deg) !important;' +
        '}' +
        '[style*="background-image"] {' +
        '  filter: invert(1) hue-rotate(180deg) !important;' +
        '}' +
        '[style*="background-image"] img,' +
        '[style*="background-image"] picture,' +
        '[style*="background-image"] canvas,' +
        '[style*="background-image"] video {' +
        '  filter: none !important;' +
        '}'
      );
    } catch (e) { sheet = null; }
    return sheet;
  }

  // Gate on TOP, not ACTIVE: TOP marks "page-level invert is committed".
  // Inverting shadow-DOM images before then would render them as negatives.
  function isDarkOn() {
    return document.documentElement.classList.contains('d2l-dark-mode-top');
  }

  // ACTIVE is set in every Brightspace frame, TOP only in the filtered one.
  // Announcements follow ACTIVE so nested frames still report late roots.
  function isActive() {
    return document.documentElement.classList.contains('d2l-dark-mode-active');
  }

  var trackedRoots = new Set();

  var ANNOUNCE = 'd2l-shadow-root';
  var announcing = false; // set during the bulk toggle loop to suppress N announcements

  /** Announces a root the isolated world cannot see: late attachShadow or replaced sheets. */
  function announce(host) {
    if (announcing || !host || !host.isConnected) return;
    announcing = true;
    try {
      host.dispatchEvent(new CustomEvent(ANNOUNCE, { bubbles: true, composed: true }));
    } catch (e) {
      /* the page may have replaced CustomEvent */
    } finally {
      announcing = false;
    }
  }

  /** Appends the counter-invert sheet to a shadow root if not already present. */
  function inject(root) {
    var s = getSheet();
    if (!s) return;
    try {
      var list = root.adoptedStyleSheets || [];
      if (list.indexOf(s) === -1) {
        root.adoptedStyleSheets = [].concat(list, s);
      }
    } catch (e) {}
  }

  /** Removes the counter-invert sheet from a shadow root. */
  function uninject(root) {
    if (!sheet) return;
    try {
      var list = root.adoptedStyleSheets || [];
      if (list.indexOf(sheet) !== -1) {
        root.adoptedStyleSheets = list.filter(function (x) { return x !== sheet; });
      }
    } catch (e) {}
  }

  // Override the adoptedStyleSheets setter. Lit replaces the entire array
  // during component init, which evicts anything we attached at attachShadow
  // time. This re-appends our sheet on every write while dark mode is on.
  var adDesc = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'adoptedStyleSheets');
  if (adDesc && adDesc.set) {
    var origAdSet = adDesc.set;
    var origAdGet = adDesc.get;
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
      configurable: true,
      enumerable: adDesc.enumerable,
      get: function () { return origAdGet.call(this); },
      set: function (sheets) {
        // Fast path: dark mode off costs only this check per write.
        if (!isActive()) { origAdSet.call(this, sheets); return; }
        var s = isDarkOn() ? getSheet() : null;
        if (s) {
          var arr = sheets ? Array.prototype.slice.call(sheets) : [];
          if (arr.indexOf(s) === -1) arr.push(s);
          sheets = arr;
        }
        origAdSet.call(this, sheets);
        announce(this.host);
      }
    });
  }

  // Track every shadow root the moment it's created.
  Element.prototype.attachShadow = function (init) {
    var root = originalAttachShadow.call(this, init);
    trackedRoots.add(root);
    if (isDarkOn()) inject(root);
    // No-op while detached; inserting the host raises a mutation record instead
    if (isActive()) announce(this);
    return root;
  };

  // Toggle on real dark-mode transitions only. D2L flips other classes on
  // <html>; iterating tracked roots on every unrelated change would scale
  // work with N(roots). Also prunes detached roots so the Set doesn't pin
  // removed component subtrees.
  var wasOn = isDarkOn();
  new MutationObserver(function () {
    var on = isDarkOn();
    if (on === wasOn) return;
    wasOn = on;
    // No announcements here; the isolated world does its own pass on a transition
    announcing = true;
    try {
      trackedRoots.forEach(function (root) {
        if (!root.host.isConnected) {
          trackedRoots.delete(root);
          return;
        }
        if (on) inject(root); else uninject(root);
      });
    } finally {
      announcing = false;
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /** Walks the DOM and tracks every open shadow root reachable from <html>. */
  function walkAndTrack() {
    function walk(el) {
      if (el.shadowRoot) {
        trackedRoots.add(el.shadowRoot);
        walk(el.shadowRoot);
      }
      var kids = el.children;
      if (kids) for (var i = 0; i < kids.length; i++) walk(kids[i]);
    }
    walk(document.documentElement);
  }

  // DOMContentLoaded walk catches declarative shadow DOM. Those roots
  // aren't created via attachShadow so the patch above doesn't see them.
  walkAndTrack();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', walkAndTrack, { once: true });
  }
  if (isDarkOn()) trackedRoots.forEach(inject);
})();
