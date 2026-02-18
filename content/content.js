/**
 * D2L Brightspace Dark Mode — Content Script (Filter-Based)
 *
 * Uses filter: invert(1) hue-rotate(180deg) on <html> in the top frame.
 * Shadow DOM injection is still needed to counter-invert media elements
 * inside shadow roots (CSS selectors cannot pierce shadow boundaries).
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     BRIGHTSPACE DETECTION
     The script runs on all pages but should only activate on
     Brightspace instances. Fast checks first, deferred DOM
     check as fallback.
  ---------------------------------------------------------- */
  const KNOWN_BRIGHTSPACE_HOSTS = [
    // --- McMaster University ---
    'avenue.mcmaster.ca',
    'avenue.cllmcmaster.ca',

    // --- Broad patterns (covers hundreds of institutions) ---
    // All *.brightspace.com deployments (e.g. uottawa.brightspace.com, carleton.brightspace.com)
    'brightspace.com',
    // All Ontario school boards on the Ministry's Virtual Learning Environment
    // (e.g. ocdsb.elearningontario.ca, yrdsb.elearningontario.ca, tvdsb.elearningontario.ca)
    'elearningontario.ca',
    // Older D2L/Desire2Learn hosted instances
    // (e.g. durhamcollege.desire2learn.com, hwdsbtest.desire2learn.com)
    'desire2learn.com',

    // --- Specific custom domains ---
    // University of Calgary
    'elearn.ucalgary.ca',
    // Bow Valley College
    'd2l.bowvalleycollege.ca',
    // Calgary Board of Education (CBE)
    'd2l.cbe.ab.ca',
    // Wilfrid Laurier University (MyLearningSpace)
    'mylearningspace.wlu.ca',
    // Fanshawe College (FanshaweOnline)
    'fanshaweonline.ca',
    // Hamilton-Wentworth District School Board (The Hub) portal
    'myhome.hwdsb.on.ca',
  ];

  function isBrightspace() {
    const url = window.location.href;
    if (/\/d2l\//.test(url)) return true;
    if (document.documentElement.hasAttribute('data-app-version')) return true;
    const hostname = window.location.hostname;
    if (KNOWN_BRIGHTSPACE_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) return true;
    return false;
  }

  function isBrightspaceDeferred() {
    return !!document.querySelector('d2l-navigation, [class*="d2l-"], meta[name="d2l"]');
  }

  // Returns true when this frame is a cross-origin child (e.g. Echo360,
  // YouTube embed). These frames should NOT run the dark mode logic —
  // the parent frame handles their inversion via counter-invert on the
  // iframe element.
  function isCrossOriginChild() {
    if (window.self === window.top) return false;
    try {
      window.parent.document; // throws if cross-origin
      return false;
    } catch {
      return true;
    }
  }

  function initIfBrightspace(customDomains) {
    const hostname = window.location.hostname;
    if (isBrightspace()) {
      initExtension();
      return;
    }
    if (customDomains.some(d => hostname === d || hostname.endsWith('.' + d))) {
      initExtension();
      return;
    }
    // Cross-origin child frames that didn't pass the strict checks above
    // are third-party embeds (video players, widgets, etc.) — skip them.
    // The broad isBrightspaceDeferred() check (e.g. [class*="d2l-"]) can
    // false-positive inside embeds that happen to use "d2l-" in a class name.
    if (isCrossOriginChild()) return;

    // Deferred check after DOM loads (top frame & same-origin children only)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (isBrightspaceDeferred()) initExtension();
      }, { once: true });
    } else {
      if (isBrightspaceDeferred()) initExtension();
    }
  }

  // Load custom domains then run detection
  chrome.storage.sync.get(['customDomains'], (result) => {
    const customDomains = result.customDomains || [];
    initIfBrightspace(customDomains);
  });

  let initialized = false;
  function initExtension() {
    if (initialized) return;
    initialized = true;
    initDarkMode();
  }

  function initDarkMode() {

  /* ----------------------------------------------------------
     VIDEO IFRAME DETECTION (heuristic, no domain list)
     Tiered approach:
       Strong signals  → pass alone (video-only allow policies,
                         explicit video title)
       Weaker signals  → require allowfullscreen + a second hint
     This avoids false-positives on widget iframes (Libraries,
     campus services, etc.) that may have allowfullscreen but
     are not video embeds.
  ---------------------------------------------------------- */
  function isVideoIframe(iframe) {
    const allow = iframe.getAttribute('allow') || '';

    // --- Strong signals (any one is sufficient) ---

    // picture-in-picture / encrypted-media are video-only policies
    if (/picture-in-picture|encrypted-media/.test(allow)) return true;

    // Explicit "video" / "video player" / "media player" in title or aria-label
    const text = ((iframe.title || '') + ' ' + (iframe.getAttribute('aria-label') || '')).toLowerCase();
    if (/\bvideo\b|video.player|media.player/.test(text)) return true;

    // --- Combined signals (allowfullscreen + one more hint) ---
    const hasFullscreen = iframe.hasAttribute('allowfullscreen') || iframe.hasAttribute('allowFullScreen');
    if (!hasFullscreen) return false;

    // autoplay policy — widgets almost never request it
    if (/autoplay/.test(allow)) return true;

    // src path contains a video-related segment
    try {
      const path = new URL(iframe.src, window.location.href).pathname.toLowerCase();
      if (/\/embed\/|\/player\/|\/video\/|\/watch|\/stream\/|\/lecture\/|\/media\//.test(path)) return true;
    } catch { /* invalid src — skip */ }

    // class or id contains "video" or "player"
    const classAndId = ((iframe.className || '') + ' ' + (iframe.id || '')).toLowerCase();
    if (/video|player/.test(classAndId)) return true;

    return false;
  }

  /* ----------------------------------------------------------
     SHADOW DOM CSS — counter-invert media inside shadow roots
  ---------------------------------------------------------- */
  const sharedShadowSheet = new CSSStyleSheet();

  /* ----------------------------------------------------------
     SMART ROOT DETECTION
     Determines if this frame should apply the inversion filter.
     Returns true if:
     1. We are the top window
     2. We are an orphan (cross-origin parent)
     3. Parent is a frameset (cannot be filtered)
     4. Parent does not have the filter active
  ---------------------------------------------------------- */
  function shouldApplyFilter() {
    if (window.self === window.top) return true;

    try {
      // If we can access parent, check if it's already handling inversion
      const parentDoc = window.parent.document;
      const parentHasFilter = parentDoc.documentElement.classList.contains('d2l-dark-mode-top') ||
        parentDoc.documentElement.classList.contains('d2l-dark-mode-nested');

      // Framesets cannot be filtered effectively, so children must self-invert
      const parentIsFrameset = parentDoc.querySelector('frameset') !== null;

      if (parentIsFrameset || !parentHasFilter) {
        return true;
      }
      return false; // Parent is handling it
    } catch (e) {
      // Cross-origin parent (or restricted): Assume we are the effective root
      return true;
    }
  }

  const isEffectiveRoot = shouldApplyFilter();

  // Builds shadow DOM CSS.
  // Effective root: canvas always included (counter-inverted to show original colors).
  // Child frames: canvas included only when document dark mode is OFF (double-inversion
  // restores light document). When document dark mode is ON, canvas is excluded so the
  // parent frame's single inversion keeps the document dark.
  function buildShadowCSS(includeCanvas) {
    const media = includeCanvas ? 'img, video, canvas, picture' : 'img, video, picture';
    return `
    ${media} {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    :popover-open {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    :host(:popover-open) {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    :popover-open :is(${media}) {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
  }
  // Default: include canvas. applyDocDarkMode() will update this for child frames.
  sharedShadowSheet.replaceSync(buildShadowCSS(true));

  /* ----------------------------------------------------------
     DOCUMENT VIEWER DETECTION
  ---------------------------------------------------------- */
  function isDocumentViewer() {
    const url = window.location.href;
    return /viewFile|viewer\.html|pdfjs/.test(url);
  }

  let documentDarkModeEnabled = false;
  let videoDarkModeEnabled = false;

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  let darkModeEnabled = true;
  let shadowObserver = null;
  const shadowObservers = new Set();
  /* ----------------------------------------------------------
     INITIALIZATION
  ---------------------------------------------------------- */
  chrome.storage.sync.get(['darkModeEnabled', 'documentDarkModeEnabled', 'pdfDarkModeEnabled', 'videoDarkModeEnabled'], (result) => {
    darkModeEnabled = result.darkModeEnabled !== false;
    // Backward compat: prefer documentDarkModeEnabled, fall back to pdfDarkModeEnabled
    documentDarkModeEnabled = result.documentDarkModeEnabled !== undefined
      ? result.documentDarkModeEnabled === true
      : result.pdfDarkModeEnabled === true;
    videoDarkModeEnabled = result.videoDarkModeEnabled === true;
    applyDocDarkMode();
    if (darkModeEnabled) enableDarkMode();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes.darkModeEnabled) {
      darkModeEnabled = changes.darkModeEnabled.newValue;
      darkModeEnabled ? enableDarkMode() : disableDarkMode();
    }
    if (changes.documentDarkModeEnabled) {
      documentDarkModeEnabled = changes.documentDarkModeEnabled.newValue;
      applyDocDarkMode();
    }
    if (changes.videoDarkModeEnabled) {
      videoDarkModeEnabled = changes.videoDarkModeEnabled.newValue;
      if (darkModeEnabled) applyVideoMode();
    }
  });

  function applyDocDarkMode() {
    if (documentDarkModeEnabled && isDocumentViewer()) {
      document.documentElement.classList.add('d2l-doc-dark');
    } else {
      document.documentElement.classList.remove('d2l-doc-dark');
    }

    // Child frames (e.g. d2l-pdf-viewer in smart-curriculum): toggle canvas
    // counter-inversion based on document dark mode setting.
    // Doc dark OFF → include canvas → double-inversion → document appears light.
    // Doc dark ON  → exclude canvas → parent's single inversion → document appears dark.
    if (!isEffectiveRoot) {
      sharedShadowSheet.replaceSync(buildShadowCSS(!documentDarkModeEnabled));
    }
  }

  /* ----------------------------------------------------------
     VIDEO MODE — counter-invert video iframes
     When videoDarkModeEnabled is OFF (default), video iframes
     get counter-inverted so they appear in original colors.
     When ON, the counter-inversion is removed so parent's
     inversion darkens the video.
  ---------------------------------------------------------- */
  function applyVideoMode() {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      if (isVideoIframe(iframe)) {
        if (videoDarkModeEnabled) {
          // Let parent inversion darken the video
          iframe.style.removeProperty('filter');
        } else {
          // Counter-invert to preserve original colors
          iframe.style.filter = 'invert(1) hue-rotate(180deg)';
        }
      }
    }
  }

  /* ----------------------------------------------------------
     ENABLE / DISABLE
  ---------------------------------------------------------- */
  function enableDarkMode() {
    injectDarkModeStylesheet();

    // d2l-dark-mode-active: all frames (color-scheme + counter-invert)
    document.documentElement.classList.add('d2l-dark-mode-active');

    // d2l-dark-mode-nested: applies filter to effective roots (top or nested)
    if (isEffectiveRoot) {
      document.documentElement.classList.add('d2l-dark-mode-top'); // Keep legacy name for consistency
      document.documentElement.classList.add('d2l-dark-mode-nested'); // Marker for children
    }

    // Ensure body class for selectors that may depend on it
    if (document.body) {
      document.body.classList.add('d2l-dark-mode-active');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('d2l-dark-mode-active');
      }, { once: true });
    }

    startShadowObserver();
    applyVideoMode();
  }

  function disableDarkMode() {
    removeDarkModeStylesheet();
    document.documentElement.classList.remove('d2l-dark-mode-active', 'd2l-dark-mode-top', 'd2l-dark-mode-nested', 'd2l-doc-dark');
    document.body?.classList.remove('d2l-dark-mode-active');
    stopShadowObserver();
    removeShadowStyles();
    // Clean up video iframe inline filters
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      if (isVideoIframe(iframe)) {
        iframe.style.removeProperty('filter');
      }
    }
  }

  /* ----------------------------------------------------------
     STYLESHEET INJECTION
  ---------------------------------------------------------- */
  function injectDarkModeStylesheet() {
    if (document.getElementById('d2l-dark-mode-main-css')) return;

    const link = document.createElement('link');
    link.id = 'd2l-dark-mode-main-css';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/dark-mode.css');

    (document.head || document.documentElement).appendChild(link);
  }

  function removeDarkModeStylesheet() {
    const link = document.getElementById('d2l-dark-mode-main-css');
    if (link) link.remove();
  }

  /* ----------------------------------------------------------
     SHADOW DOM OBSERVER
     Still needed: CSS selectors cannot target elements inside
     shadow roots. We inject a tiny stylesheet that counter-
     inverts img/video/canvas/picture inside every shadow root.
  ---------------------------------------------------------- */
  let rescanInterval = null;

  function startShadowObserver() {
    injectAllShadowRoots(document.documentElement);

    if (shadowObserver) return;

    shadowObserver = new MutationObserver(handleMutations);
    shadowObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    shadowObservers.add(shadowObserver);

    // Safety net for lazy-loaded web components and late-arriving video iframes
    // (iframes may be added to DOM before their attributes are set)
    if (!rescanInterval) {
      rescanInterval = setInterval(() => {
        injectAllShadowRoots(document.documentElement);
        applyVideoMode();
      }, 2000);

      setTimeout(() => {
        if (rescanInterval) {
          clearInterval(rescanInterval);
          rescanInterval = null;
        }
      }, 30000);
    }
  }

  function handleMutations(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          injectAllShadowRoots(node);
          // Apply video mode to newly added iframes
          if (node.tagName === 'IFRAME' && isVideoIframe(node)) {
            applyVideoModeToIframe(node);
          }
          // Also check children for iframes
          const iframes = node.querySelectorAll ? node.querySelectorAll('iframe') : [];
          for (const iframe of iframes) {
            if (isVideoIframe(iframe)) {
              applyVideoModeToIframe(iframe);
            }
          }
        }
      }
    }
  }

  function applyVideoModeToIframe(iframe) {
    if (!darkModeEnabled) return;
    if (videoDarkModeEnabled) {
      iframe.style.removeProperty('filter');
    } else {
      iframe.style.filter = 'invert(1) hue-rotate(180deg)';
    }
  }

  function stopShadowObserver() {
    for (const obs of shadowObservers) obs.disconnect();
    shadowObservers.clear();
    shadowObserver = null;
    if (rescanInterval) {
      clearInterval(rescanInterval);
      rescanInterval = null;
    }
  }

  function injectAllShadowRoots(root) {
    if (!root) return;

    if (root.shadowRoot) {
      injectShadowStyles(root.shadowRoot);
      observeShadowRoot(root.shadowRoot);
      injectAllShadowRoots(root.shadowRoot);
    }

    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of elements) {
      if (el.shadowRoot) {
        injectShadowStyles(el.shadowRoot);
        observeShadowRoot(el.shadowRoot);
        injectAllShadowRoots(el.shadowRoot);
      }
    }
  }

  function observeShadowRoot(shadowRoot) {
    if (shadowRoot._d2lDarkModeObserved) return;
    shadowRoot._d2lDarkModeObserved = true;

    const obs = new MutationObserver(handleMutations);
    obs.observe(shadowRoot, { childList: true, subtree: true });
    shadowObservers.add(obs);
  }

  function injectShadowStyles(shadowRoot) {
    if (shadowRoot.adoptedStyleSheets.includes(sharedShadowSheet)) return;
    shadowRoot.adoptedStyleSheets = [
      ...shadowRoot.adoptedStyleSheets,
      sharedShadowSheet,
    ];
  }

  function removeShadowStyles() {
    function walk(root) {
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      if (root.shadowRoot) process(root.shadowRoot);
      for (const el of elements) {
        if (el.shadowRoot) {
          process(el.shadowRoot);
          walk(el.shadowRoot);
        }
      }
    }

    function process(shadowRoot) {
      shadowRoot.adoptedStyleSheets = shadowRoot.adoptedStyleSheets.filter(
        (s) => s !== sharedShadowSheet
      );
      shadowRoot._d2lDarkModeObserved = false;
    }

    walk(document.documentElement);
  }

  } // end initDarkMode
})();