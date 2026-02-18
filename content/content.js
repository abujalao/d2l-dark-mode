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
     SHADOW DOM CSS — counter-invert media inside shadow roots
  ---------------------------------------------------------- */
  const sharedShadowSheet = new CSSStyleSheet();
  const SHADOW_CSS = `
    /* Counter-invert media */
    img, video, canvas, picture {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* Top-layer popovers inside shadow DOM */
    :popover-open {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* Host element itself promoted to top layer */
    :host(:popover-open) {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* Counter-invert media inside shadow popovers */
    :popover-open :is(img, video, canvas, picture) {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
  sharedShadowSheet.replaceSync(SHADOW_CSS);

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  let darkModeEnabled = true;
  let shadowObserver = null;
  const shadowObservers = new Set();
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

  /* ----------------------------------------------------------
     INITIALIZATION
  ---------------------------------------------------------- */
  chrome.storage.sync.get(['darkModeEnabled'], (result) => {
    darkModeEnabled = result.darkModeEnabled !== false;
    if (darkModeEnabled) enableDarkMode();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes.darkModeEnabled) {
      darkModeEnabled = changes.darkModeEnabled.newValue;
      darkModeEnabled ? enableDarkMode() : disableDarkMode();
    }
  });

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
  }

  function disableDarkMode() {
    removeDarkModeStylesheet();
    document.documentElement.classList.remove('d2l-dark-mode-active', 'd2l-dark-mode-top', 'd2l-dark-mode-nested');
    document.body?.classList.remove('d2l-dark-mode-active');
    stopShadowObserver();
    removeShadowStyles();
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

    // Safety net for lazy-loaded web components
    if (!rescanInterval) {
      rescanInterval = setInterval(() => {
        injectAllShadowRoots(document.documentElement);
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
        }
      }
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
})();