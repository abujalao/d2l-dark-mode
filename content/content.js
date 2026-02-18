/**
 * D2L Brightspace Dark Mode — Content Script
 * Optimized for performance using Constructable Stylesheets
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CSS DEFINITIONS
  ---------------------------------------------------------- */

  // 1. Shadow DOM CSS (Parsed once, applied everywhere)
  const sharedShadowSheet = new CSSStyleSheet();
  const SHADOW_CSS = `
    :host(:not(d2l-image-banner-overlay)) {
      --d2l-color-ferrite: #e0e0e0;
      --d2l-color-tungsten: #b8b8b8;
      --d2l-color-galena: #999999;
      --d2l-color-chromite: #777777;
      --d2l-color-corundum: #555555;
      --d2l-color-mica: #3a3a3a;
      --d2l-color-gypsum: #2c2c2c;
      --d2l-color-sylvite: #222222;
      --d2l-color-regolith: #1a1a1a;
      --d2l-color-celestine: #4d9fff;
      --d2l-color-celestine-plus-1: #5ba3ff;
      --d2l-color-cinnabar: #ff5555;
      --d2l-color-olivine: #6bcc7d;
      --d2l-color-carnelian: #ff9d4d;
      --d2l-branding-primary-color: #ffffff;
      color-scheme: dark !important;
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Card-specific inner elements */
    .d2l-card-container, .d2l-card-content, .d2l-card-footer-content,
    .d2l-card-header, .d2l-card-badge, .d2l-card-link-container,
    [class*="card-container"], [class*="card-content"],
    [class*="card-footer"], [class*="card-header"] {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Enrollment card elements */
    .d2l-enrollment-card-overlay, .d2l-enrollment-card-icon-container,
    .d2l-enrollment-card-status-indicator {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
    }

    /* Collapsible panel elements */
    .d2l-collapsible-panel, .d2l-collapsible-panel-header,
    .d2l-collapsible-panel-header-primary, .d2l-collapsible-panel-header-secondary,
    .d2l-collapsible-panel.scrolled, .d2l-collapsible-panel-content,
    .d2l-collapsible-panel-before, .d2l-collapsible-panel-title,
    .d2l-collapsible-panel-divider {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Generic divs/containers inside shadow */
    div, span, p, body { color: #e0e0e0 !important; }

    /* Buttons inside shadow DOM */
    button, [role="button"] { color: #e0e0e0 !important; }
    button:hover, [role="button"]:hover { background-color: rgba(255, 255, 255, 0.08) !important; }

    /* Links inside shadow DOM */
    a, a:link, a:visited { color: #5ba3ff !important; }
    a:hover { color: #82bbff !important; }

    /* Generic background overrides */
    .d2l-dropdown-content, .d2l-menu, .d2l-menu-items,
    .d2l-hierarchical-view-content, .d2l-dialog-inner, .d2l-dialog-content,
    .d2l-dialog-header, .d2l-dialog-footer, .content-container,
    .content-position, .content-width, .dropdown-content-layout,
    .dropdown-content, .dropdown-header, .dropdown-footer,
    .d2l-labs-navigation-centerer, .d2l-labs-navigation-scroll,
    .d2l-labs-navigation-gutters, .d2l-htmleditor-container, .tox .tox-edit-area__iframe {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Menu & Tooltips */
    .d2l-menu-item-text, .d2l-menu-item-supporting { color: #e0e0e0 !important; }
    .d2l-tooltip-content { background-color: #2c2c2c !important; color: #e0e0e0 !important; }

    /* Inputs */
    input, textarea, select {
      background-color: #2c2c2c !important;
      color: #e0e0e0 !important;
      border-color: #555555 !important;
    }

    /* Tabs */
    .d2l-tab-panel, [role="tabpanel"], [role="tab"] {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
    }

    /* Image Overlays */
    .icon-container, .change-image-loading .icon-container,
    .change-image-success .icon-container, .change-image-failure .icon-container {
      background-color: #2c2c2c !important;
    }

    /* Work To Do (W2D) & List Skeletons */
    .d2l-w2d-collection-fixed, .d2l-w2d-heading-3, .d2l-w2d-block, 
    .d2l-w2d-attribute-list, .d2l-w2d-list-item, .d2l-list-item-content,
    .d2l-activity-name, .d2l-text-block, d2l-w2d-no-activities, 
    .d2l-w2d-collection-overflow, .d2l-empty-template,
    .d2l-list-content, .d2l-list-container, d2l-list {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
    }

    /* Skeleton Loading States & Spinners */
    .d2l-skeletize,
    .d2l-skeletize-container,
    .d2l-skeletize::before,
    .d2l-skeletize::after {
      background-color: #2c2c2c !important;
      color: #e0e0e0 !important;
    }

    /* Loading Spinners - Fix White Background circles */
    .d2l-loading-spinner-bg circle[fill="#FFF"],
    .d2l-loading-spinner-bg circle[fill="#ffffff"] {
      fill: #2c2c2c !important;
    }

    /* Fix empty state SVG icons in W2D */
    .d2l-empty-icon svg path[fill="#202122"], 
    .d2l-empty-icon svg path[fill="#494C4E"] {
      fill: #e0e0e0 !important;
    }


    /* Fix empty state SVG icons in W2D */
    .d2l-empty-icon svg path[fill="#202122"], 
    .d2l-empty-icon svg path[fill="#494C4E"] {
      fill: #e0e0e0 !important;
    }

    /* Loading Spinners (d2l-loading-spinner) - Fix White Background circles */
    .d2l-loading-spinner-bg circle[fill="#FFF"],
    .d2l-loading-spinner-bg circle[fill="#ffffff"] {
      fill: #2c2c2c !important;
    }

    /* Skeleton Loading States */
    .d2l-skeletize,
    .d2l-skeletize-container {
      background-color: #2c2c2c !important;
    }
      
    :host(d2l-labs-navigation-band) {
      --d2l-branding-primary-color: #222222 !important;
      background-color: #222222 !important;
      box-shadow: none !important;
      border-bottom: 1px solid #3a3a3a !important;
    }
  `;
  sharedShadowSheet.replaceSync(SHADOW_CSS);

  /* ----------------------------------------------------------
     STATE MANAGEMENT
  ---------------------------------------------------------- */
  let darkModeEnabled = true;
  let pdfDarkModeEnabled = false;
  let shadowObserver = null;
  let pdfObserver = null;
  const shadowObservers = new Set();

  /* ----------------------------------------------------------
     LUMINANCE SCANNER
     Catches elements whose background-color is set in D2L's
     own CSS files (not via variables, not inline), which
     neither :root variable overrides nor attribute selectors
     can reach. Uses requestIdleCallback to be non-blocking.
  ---------------------------------------------------------- */

  const _scanned = new WeakSet();

  function _linearize(v) {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function _luminance(r, g, b) {
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b);
  }

  function _parseRGB(str) {
    const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (alpha < 0.05) return null; // near-transparent — skip
    return [+m[1], +m[2], +m[3]];
  }

  function _darkenIfLight(el) {
    if (!el || el.nodeType !== 1) return;
    if (_scanned.has(el)) return;
    _scanned.add(el);

    const tag = el.tagName;
    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS' ||
        tag === 'SVG'  || tag === 'IFRAME') return;

    const bg = window.getComputedStyle(el).backgroundColor;
    const rgb = _parseRGB(bg);
    if (!rgb) return;

    if (_luminance(rgb[0], rgb[1], rgb[2]) > 0.4) {
      el.style.setProperty('background-color', '#222222', 'important');

      const fg = _parseRGB(window.getComputedStyle(el).color);
      if (fg && _luminance(fg[0], fg[1], fg[2]) < 0.15) {
        el.style.setProperty('color', '#e0e0e0', 'important');
      }
    }
  }

  function _scanList(elements) {
    const arr = Array.from(elements);
    let i = 0;

    function chunk(deadline) {
      while (i < arr.length && deadline.timeRemaining() > 1) {
        _darkenIfLight(arr[i++]);
      }
      if (i < arr.length) requestIdleCallback(chunk, { timeout: 500 });
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(chunk, { timeout: 200 });
    } else {
      arr.forEach(_darkenIfLight); // synchronous fallback
    }
  }

  function startLuminanceScanner() {
    const run = () => _scanList(document.querySelectorAll('*'));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  /* ----------------------------------------------------------
     INITIALIZATION
  ---------------------------------------------------------- */
  chrome.storage.sync.get(['darkModeEnabled', 'pdfDarkModeEnabled'], (result) => {
    darkModeEnabled = result.darkModeEnabled !== false;
    pdfDarkModeEnabled = result.pdfDarkModeEnabled === true;

    if (darkModeEnabled) enableDarkMode();
    if (pdfDarkModeEnabled) enablePDFDarkMode();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;

    if (changes.darkModeEnabled) {
      darkModeEnabled = changes.darkModeEnabled.newValue;
      darkModeEnabled ? enableDarkMode() : disableDarkMode();
    }

    if (changes.pdfDarkModeEnabled) {
      pdfDarkModeEnabled = changes.pdfDarkModeEnabled.newValue;
      pdfDarkModeEnabled ? enablePDFDarkMode() : disablePDFDarkMode();
    }
  });

  /* ----------------------------------------------------------
     DARK MODE TOGGLE LOGIC
  ---------------------------------------------------------- */
  function enableDarkMode() {
    injectDarkModeStylesheet();
    document.documentElement.classList.add('d2l-dark-mode-active');

    // Ensure body class is added even if script runs at document_start
    if (document.body) {
      document.body.classList.add('d2l-dark-mode-active');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('d2l-dark-mode-active');
      }, { once: true });
    }
    startShadowObserver();
    startLuminanceScanner();
  }

  function disableDarkMode() {
    removeDarkModeStylesheet();
    document.documentElement.classList.remove('d2l-dark-mode-active');
    document.body?.classList.remove('d2l-dark-mode-active');
    stopShadowObserver();
    removeShadowStyles();
  }

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
     SHADOW DOM INJECTION (OPTIMIZED)
  ---------------------------------------------------------- */
  let rescanInterval = null;

  function startShadowObserver() {
    // Process existing elements immediately
    injectAllShadowRoots(document.documentElement);

    if (shadowObserver) return;

    shadowObserver = new MutationObserver(handleMutations);
    shadowObserver.observe(document.documentElement, { childList: true, subtree: true });
    shadowObservers.add(shadowObserver);

    // Safety net for lazy-loaded components
    if (!rescanInterval) {
      rescanInterval = setInterval(() => {
        injectAllShadowRoots(document.documentElement);
      }, 2000);

      // Stop safety net after 30s
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
        if (node.nodeType === 1) { // Element node
          injectAllShadowRoots(node);
        }
      }
      if (darkModeEnabled) _scanList(mutation.addedNodes);
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

    // If this element has a shadow root, inject + observe it
    if (root.shadowRoot) {
      injectShadowStyles(root.shadowRoot);
      observeShadowRoot(root.shadowRoot);
      // Recurse into the shadow root to find nested components
      injectAllShadowRoots(root.shadowRoot);
    }

    // Recursively scan light DOM children
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
    // Check if we already added our shared sheet
    if (shadowRoot.adoptedStyleSheets.includes(sharedShadowSheet)) return;

    // Add our sheet while preserving existing ones
    shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sharedShadowSheet];
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
      // Remove our specific sheet
      shadowRoot.adoptedStyleSheets = shadowRoot.adoptedStyleSheets.filter(
        s => s !== sharedShadowSheet
      );
      shadowRoot._d2lDarkModeObserved = false;
    }

    walk(document.documentElement);
  }

  /* ----------------------------------------------------------
     PDF & IFRAME DARK MODE
  ---------------------------------------------------------- */
  function enablePDFDarkMode() {
    injectPDFStylesheet();
    startPDFObserver();
  }

  function disablePDFDarkMode() {
    const link = document.getElementById('d2l-dark-mode-pdf-css');
    if (link) link.remove();
    stopPDFObserver();
  }

  function injectPDFStylesheet() {
    if (document.getElementById('d2l-dark-mode-pdf-css')) return;

    const link = document.createElement('link');
    link.id = 'd2l-dark-mode-pdf-css';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/pdf-dark-mode.css');

    (document.head || document.documentElement).appendChild(link);
  }

  function startPDFObserver() {
    processExistingIframes();

    if (pdfObserver) return;

    pdfObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'IFRAME') handleIframe(node);
          if (node.querySelectorAll) {
            node.querySelectorAll('iframe').forEach(handleIframe);
          }
        }
      }
    });

    const body = document.body || document.documentElement;
    pdfObserver.observe(body, { childList: true, subtree: true });
  }

  function stopPDFObserver() {
    if (pdfObserver) {
      pdfObserver.disconnect();
      pdfObserver = null;
    }
  }

  function processExistingIframes() {
    document.querySelectorAll('iframe').forEach(handleIframe);
  }

  function handleIframe(iframe) {
    const src = iframe.src || '';

    // Filter Logic
    const isPDFViewer =
      src.includes('/pdfjs') ||
      src.includes('viewer.html') ||
      src.includes('viewFile');

    const isQuizViewer =
      src.includes('/quiz') ||
      src.includes('quiz_attempt') ||
      src.includes('quiz_start') ||
      iframe.classList.contains('d2l-iframe') ||
      iframe.id === 'ctl_2';

    const isContentViewer =
      src.includes('/content/') ||
      src.includes('ViewerController') ||
      iframe.classList.contains('d2l-iframe');

    if (!isPDFViewer && !isContentViewer && !isQuizViewer) return;

    // Load Handler (Fixes Race Condition)
    try {
      // If content is already loaded (common in SPAs), inject immediately
      if (iframe.contentDocument &&
        (iframe.contentDocument.readyState === 'complete' || iframe.contentDocument.readyState === 'interactive')) {
        injectIframeStyles(iframe, isPDFViewer);
      } else {
        // Otherwise wait for load
        iframe.addEventListener('load', () => injectIframeStyles(iframe, isPDFViewer));
      }
    } catch (e) {
      // Cross-origin restriction caught here. 
      // Ensure 'all_frames': true is in manifest to bypass.
    }
  }

  function injectIframeStyles(iframe, isPDFViewer) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      if (doc.getElementById('d2l-dark-mode-iframe')) return;

      const style = doc.createElement('style');
      style.id = 'd2l-dark-mode-iframe';

      if (isPDFViewer) {
        /* ------------------ PDF CSS ------------------ */
        style.textContent = `
          /* Outer Containers */
          #outerContainer, #viewerContainer { background-color: #1a1a1a !important; }
          
          /* Toolbar */
          #toolbarContainer, #toolbarViewer, #secondaryToolbar, #toolbarSidebar {
            background-color: #222222 !important; border-color: #3a3a3a !important;
          }
          
          /* Buttons */
          #toolbarViewer button, #secondaryToolbar button, .toolbarButton, button {
            color: #e0e0e0 !important; background-color: transparent !important;
          }
          #toolbarViewer button:hover, .toolbarButton:hover, button:hover {
            background-color: #2c2c2c !important;
          }

          /* Inputs */
          #toolbarViewer input, .toolbarField, #pageNumber, input, select {
            background-color: #2c2c2c !important; color: #e0e0e0 !important; border-color: #555555 !important;
          }

          /* Sidebar */
          #sidebarContainer, #sidebarContent {
            background-color: #222222 !important; border-color: #3a3a3a !important;
          }

          /* Pages */
          #viewer.pdfViewer .page, .pdfViewer .page {
            background-color: #2a2a2a !important; border-color: #3a3a3a !important;
          }

          /* Canvas Smart Inversion */
          .page canvas { filter: invert(0.9) hue-rotate(180deg) !important; }
          .page img { filter: invert(1) hue-rotate(-180deg) !important; }

          /* Misc */
          .textLayer { color: #e0e0e0 !important; }
          #thumbnailView, .thumbnail { background-color: #2c2c2c !important; }
          .dropdownToolbarButton, #scaleSelect {
            background-color: #2c2c2c !important; color: #e0e0e0 !important; border-color: #555555 !important;
          }
          #errorWrapper { background-color: #222222 !important; color: #ff5555 !important; }
          #overlayContainer { background-color: rgba(0, 0, 0, 0.7) !important; }
          #passwordOverlay, #documentPropertiesOverlay {
             background-color: #222222 !important; color: #e0e0e0 !important;
          }
        `;
      } else {
        /* ------------------ GENERIC / QUIZ CSS ------------------ */
        style.textContent = `
          html, body { background-color: #1a1a1a !important; color: #e0e0e0 !important; }
          a { color: #5ba3ff !important; }
          a:hover { color: #82bbff !important; }
          img, svg, video, canvas { filter: none !important; }

          /* Quizzes & Questions */
          .d2l-quiz-navbar, .d2l-quizzing-header, .d2l-quizzing-info,
          .d2l-quizzing-exit, .d2l-quiz-navbar-buttons,
          .dco, .dco_c, .dco_t, .dco_t_h, .dco_f,
          .d2l-activity-question-container, .d2l-quiz-question-autosave-container,
          .d2l-quiz-answer-container, .d2l-quiz-text-blank-container {
            background-color: #222222 !important; color: #e0e0e0 !important; border-color: #3a3a3a !important;
          }

          /* Tables & Text */
          table, td, th, tr { background-color: #222222 !important; border-color: #3a3a3a !important; }
          p, span, div, label, legend, fieldset, td, th, tr, h1, h2, h3, h4, h5, h6 { color: #e0e0e0 !important; }

          /* Inputs & Buttons */
          input, textarea, select {
            background-color: #2c2c2c !important; color: #e0e0e0 !important; border-color: #555555 !important;
          }
          button, .d2l-button, .vui-button {
            background-color: #2c2c2c !important; color: #e0e0e0 !important; border-color: #555555 !important;
          }

          /* Branding & Misc */
          .cDark { background-color: #4a1030 !important; color: #e0e0e0 !important; }
          .cLight { background-color: #3a3a3a !important; color: #e0e0e0 !important; }
          .cSoft { background-color: #2c2c2c !important; color: #e0e0e0 !important; }
          .d2l-quizzing-timer { background-color: #2c2c2c !important; color: #e0e0e0 !important; }
          
          /* White Background Catch-all */
          [style*="background-color: white"], [style*="background-color:#fff"],
          [style*="background-color: #fff"], [style*="background-color:#FFFFFF"] {
            background-color: #222222 !important;
          }
        `;
      }

      doc.head.appendChild(style);
    } catch (e) {
      // Cross-origin iframe logic handled by manifest 'all_frames'
    }
  }

})();