/**
 * D2L Brightspace Dark Mode — Content Script
 *
 * Handles:
 * 1. Toggling the dark-mode.css injection based on user settings
 * 2. Injecting dark-mode overrides into Shadow DOM components
 * 3. Optional PDF viewer dark mode via iframe handling
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  let darkModeEnabled = true;
  let pdfDarkModeEnabled = false;
  let shadowObserver = null;
  let pdfObserver = null;
  const shadowObservers = new Set(); /* track all observers for cleanup */

  /* CSS that gets injected into every open Shadow Root */
  const SHADOW_CSS = `
    :host {
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
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Card-specific inner elements */
    .d2l-card-container,
    .d2l-card-content,
    .d2l-card-footer-content,
    .d2l-card-header,
    .d2l-card-badge,
    .d2l-card-link-container,
    [class*="card-container"],
    [class*="card-content"],
    [class*="card-footer"],
    [class*="card-header"] {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Enrollment card elements */
    .d2l-enrollment-card-overlay,
    .d2l-enrollment-card-icon-container,
    .d2l-enrollment-card-status-indicator {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
    }

    /* Collapsible panel elements */
    .d2l-collapsible-panel,
    .d2l-collapsible-panel-header,
    .d2l-collapsible-panel-header-primary,
    .d2l-collapsible-panel-header-secondary,
    .d2l-collapsible-panel.scrolled,
    .d2l-collapsible-panel.scrolled .d2l-collapsible-panel-header,
    .d2l-collapsible-panel-content,
    .d2l-collapsible-panel-before,
    .d2l-collapsible-panel-title,
    .d2l-collapsible-panel-divider {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Generic divs/containers inside shadow */
    div, span, p {
      color: #e0e0e0 !important;
    }

    /* Buttons inside shadow DOM — keep visible */
    button,
    [role="button"] {
      color: #e0e0e0 !important;
    }

    button:hover,
    [role="button"]:hover {
      background-color: rgba(255, 255, 255, 0.08) !important;
    }

    /* Links inside shadow DOM */
    a, a:link, a:visited {
      color: #5ba3ff !important;
    }
    a:hover {
      color: #82bbff !important;
    }

    /* Generic background overrides for containers inside shadow */
    .d2l-dropdown-content,
    .d2l-menu,
    .d2l-menu-items,
    .d2l-hierarchical-view-content,
    .d2l-dialog-inner,
    .d2l-dialog-content,
    .d2l-dialog-header,
    .d2l-dialog-footer,
    .content-container,
    .content-position,
    .content-width,
    .dropdown-content-layout,
    .dropdown-content,
    .dropdown-header,
    .dropdown-footer {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
    }

    /* Menu item text */
    .d2l-menu-item-text,
    .d2l-menu-item-supporting {
      color: #e0e0e0 !important;
    }

    /* Tooltip overrides */
    .d2l-tooltip-content {
      background-color: #2c2c2c !important;
      color: #e0e0e0 !important;
    }

    /* Input fields inside shadow DOM */
    input, textarea, select {
      background-color: #2c2c2c !important;
      color: #e0e0e0 !important;
      border-color: #555555 !important;
    }

    /* Tab elements inside shadow DOM */
    .d2l-tab-panel,
    [role="tabpanel"],
    [role="tab"] {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
    }
  `;

  /* ----------------------------------------------------------
     INITIALISE
  ---------------------------------------------------------- */
  chrome.storage.sync.get(['darkModeEnabled', 'pdfDarkModeEnabled'], (result) => {
    darkModeEnabled = result.darkModeEnabled !== false;
    pdfDarkModeEnabled = result.pdfDarkModeEnabled === true;

    if (darkModeEnabled) {
      enableDarkMode();
    } else {
      disableDarkMode();
    }

    if (pdfDarkModeEnabled) {
      enablePDFDarkMode();
    }
  });

  /* Listen for real-time setting changes from the popup */
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
     DARK MODE TOGGLE
  ---------------------------------------------------------- */
  function enableDarkMode() {
    document.documentElement.classList.add('d2l-dark-mode-active');
    if (document.body) {
      document.body.classList.add('d2l-dark-mode-active');
    } else {
      /* body not ready yet (run_at: document_start) */
      document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('d2l-dark-mode-active');
      }, { once: true });
    }
    startShadowObserver();
  }

  function disableDarkMode() {
    document.documentElement.classList.remove('d2l-dark-mode-active');
    document.body?.classList.remove('d2l-dark-mode-active');
    stopShadowObserver();
    removeShadowStyles();
  }

  /* ----------------------------------------------------------
     SHADOW DOM INJECTION
  ---------------------------------------------------------- */

  /**
   * Walk the entire DOM tree and inject styles into every open
   * shadow root. Set up MutationObservers on both the light DOM
   * AND inside each shadow root so we catch nested components
   * (e.g. d2l-card inside d2l-my-courses' shadow root).
   */
  let rescanInterval = null;

  function startShadowObserver() {
    /* Process anything already in the DOM */
    injectAllShadowRoots(document.documentElement);

    if (shadowObserver) return; /* already observing */

    shadowObserver = new MutationObserver(handleMutations);
    shadowObserver.observe(document.documentElement, { childList: true, subtree: true });
    shadowObservers.add(shadowObserver);

    /*
     * Safety net: some components attach shadow roots lazily
     * after being added to the DOM. The MutationObserver sees the
     * element added but shadowRoot is null at that point.
     * Re-scan periodically to catch these late shadow roots.
     */
    if (!rescanInterval) {
      rescanInterval = setInterval(() => {
        injectAllShadowRoots(document.documentElement);
      }, 2000);
      /* Stop re-scanning after 30s to save resources */
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
        if (node.nodeType !== 1) continue;
        injectAllShadowRoots(node);
      }
    }
  }

  function stopShadowObserver() {
    for (const obs of shadowObservers) {
      obs.disconnect();
    }
    shadowObservers.clear();
    shadowObserver = null;
    if (rescanInterval) {
      clearInterval(rescanInterval);
      rescanInterval = null;
    }
  }

  /**
   * Recursively find all elements under `root` that have an
   * open shadowRoot, then inject our dark-mode styles into each.
   * Also sets up a MutationObserver inside each shadow root.
   */
  function injectAllShadowRoots(root) {
    if (!root) return;

    /* If this element has a shadow root, inject + observe it */
    if (root.shadowRoot) {
      injectShadowStyles(root.shadowRoot);
      observeShadowRoot(root.shadowRoot);
    }

    /* Scan all descendants in the light DOM */
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of elements) {
      if (el.shadowRoot) {
        injectShadowStyles(el.shadowRoot);
        observeShadowRoot(el.shadowRoot);
        /* Recurse into the shadow root to find nested components */
        injectAllShadowRoots(el.shadowRoot);
      }
    }
  }

  /**
   * Set up a MutationObserver inside a shadow root so we catch
   * components added dynamically inside other shadow roots.
   */
  function observeShadowRoot(shadowRoot) {
    /* Don't double-observe */
    if (shadowRoot._d2lDarkModeObserved) return;
    shadowRoot._d2lDarkModeObserved = true;

    const obs = new MutationObserver(handleMutations);
    obs.observe(shadowRoot, { childList: true, subtree: true });
    shadowObservers.add(obs);
  }

  function injectShadowStyles(shadowRoot) {
    if (shadowRoot.querySelector('[data-d2l-dark-mode]')) return;

    const style = document.createElement('style');
    style.setAttribute('data-d2l-dark-mode', 'true');
    style.textContent = SHADOW_CSS;
    shadowRoot.appendChild(style);
  }

  function removeShadowStyles() {
    removeShadowStylesFrom(document.documentElement);
  }

  function removeShadowStylesFrom(root) {
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of elements) {
      if (el.shadowRoot) {
        const style = el.shadowRoot.querySelector('[data-d2l-dark-mode]');
        if (style) style.remove();
        el.shadowRoot._d2lDarkModeObserved = false;
        /* Recurse into shadow root */
        removeShadowStylesFrom(el.shadowRoot);
      }
    }
  }

  /* ----------------------------------------------------------
     PDF DARK MODE
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

    const target = document.head || document.documentElement;
    target.appendChild(link);
  }

  /**
   * Monitor for <iframe> elements that load D2L's content /
   * PDF viewer pages. Attempt to inject dark-mode styles
   * directly into same-origin iframes.
   */
  function startPDFObserver() {
    processExistingIframes();

    if (pdfObserver) return;

    pdfObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'IFRAME') {
            handleIframe(node);
          }
          const iframes = node.querySelectorAll ? node.querySelectorAll('iframe') : [];
          iframes.forEach(handleIframe);
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

    // More specific PDF viewer detection
    const isPDFViewer =
      src.includes('/pdfjs-d2l-dist/web/viewer.html') ||
      src.includes('/d2l/common/assets/pdfjs') ||
      src.includes('/common/viewFile.d2lfile');

    // Quiz page detection
    const isQuizViewer =
      src.includes('/quizzing/') ||
      src.includes('/quiz/') ||
      src.includes('quiz_attempt') ||
      src.includes('quiz_start') ||
      iframe.classList.contains('d2l-iframe') ||
      iframe.id === 'ctl_2';

    const isContentViewer =
      src.includes('/content/') ||
      src.includes('ViewerController') ||
      iframe.classList.contains('d2l-iframe');

    if (!isPDFViewer && !isContentViewer && !isQuizViewer) return;

    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        if (doc.getElementById('d2l-dark-mode-iframe')) return;

        const style = doc.createElement('style');
        style.id = 'd2l-dark-mode-iframe';

        if (isPDFViewer) {
          // PDF-specific styles (comprehensive PDF.js coverage)
          style.textContent = `
            /* PDF.js Outer Containers */
            #outerContainer,
            #viewerContainer {
              background-color: #1a1a1a !important;
            }

            /* PDF.js Toolbar */
            #toolbarContainer,
            #toolbarViewer,
            #secondaryToolbar,
            #toolbarSidebar {
              background-color: #222222 !important;
              border-color: #3a3a3a !important;
            }

            /* PDF.js Toolbar Buttons */
            #toolbarViewer button,
            #secondaryToolbar button,
            .toolbarButton,
            button {
              color: #e0e0e0 !important;
              background-color: transparent !important;
            }

            #toolbarViewer button:hover,
            .toolbarButton:hover,
            button:hover {
              background-color: #2c2c2c !important;
            }

            /* PDF.js Input Fields */
            #toolbarViewer input,
            .toolbarField,
            #pageNumber,
            input,
            select {
              background-color: #2c2c2c !important;
              color: #e0e0e0 !important;
              border-color: #555555 !important;
            }

            /* PDF.js Sidebar */
            #sidebarContainer,
            #sidebarContent {
              background-color: #222222 !important;
              border-color: #3a3a3a !important;
            }

            /* PDF.js Find Bar */
            #findbar,
            .findbar {
              background-color: #222222 !important;
              border-color: #3a3a3a !important;
            }

            #findInput {
              background-color: #2c2c2c !important;
              color: #e0e0e0 !important;
              border-color: #555555 !important;
            }

            /* PDF.js Pages */
            #viewer.pdfViewer .page,
            .pdfViewer .page {
              background-color: #2a2a2a !important;
              border-color: #3a3a3a !important;
            }

            /* PDF.js Canvas - Apply Smart Inversion */
            .page canvas {
              filter: invert(0.9) hue-rotate(180deg) !important;
            }

            /* Counter-Invert Images Inside PDFs */
            .page img {
              filter: invert(1) hue-rotate(-180deg) !important;
            }

            /* PDF.js Text Layer */
            .textLayer {
              color: #e0e0e0 !important;
            }

            /* PDF.js Annotation Layer */
            .annotationLayer a {
              color: #5ba3ff !important;
            }

            /* PDF.js Thumbnails */
            #thumbnailView,
            .thumbnail {
              background-color: #2c2c2c !important;
            }

            /* PDF.js Loading Bar */
            #loadingBar {
              background-color: #2c2c2c !important;
            }

            #loadingBar .progress {
              background-color: #4d9fff !important;
            }

            /* PDF.js Dropdowns */
            .dropdownToolbarButton,
            #scaleSelect {
              background-color: #2c2c2c !important;
              color: #e0e0e0 !important;
              border-color: #555555 !important;
            }

            /* PDF.js Error Messages */
            #errorWrapper {
              background-color: #222222 !important;
              color: #ff5555 !important;
            }

            /* PDF.js Overlays */
            #overlayContainer,
            .overlayContainer {
              background-color: rgba(0, 0, 0, 0.7) !important;
            }

            #passwordOverlay,
            #documentPropertiesOverlay {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
              border-color: #3a3a3a !important;
            }
          `;
        } else {
          // General content viewer + quiz styles for iframes
          style.textContent = `
            html, body {
              background-color: #1a1a1a !important;
              color: #e0e0e0 !important;
            }
            a { color: #5ba3ff !important; }
            a:hover { color: #82bbff !important; }
            /* Preserve images inside iframes */
            img, svg, video, canvas { filter: none !important; }

            /* Quiz containers */
            .d2l-quiz-navbar,
            .d2l-quizzing-header,
            .d2l-quizzing-info,
            .d2l-quizzing-exit,
            .d2l-quiz-navbar-buttons {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
              border-color: #3a3a3a !important;
            }

            /* Question containers */
            .dco, .dco_c, .dco_t, .dco_t_h, .dco_f,
            .d2l-activity-question-container,
            .d2l-quiz-question-autosave-container,
            .d2l-quiz-answer-container,
            .d2l-quiz-text-blank-container {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
              border-color: #3a3a3a !important;
            }

            /* Answer options */
            .d2l-datalist-container,
            .d2l-datalist-checkboxitem,
            .d2l-datalist-radioitem,
            .d2l-datalist-item-content {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
            }

            /* Text readability */
            p, span, div, label, legend, fieldset, td, th, tr, table {
              color: #e0e0e0 !important;
            }

            table, td, th, tr {
              background-color: #222222 !important;
              border-color: #3a3a3a !important;
            }

            /* Inputs */
            input, textarea, select {
              background-color: #2c2c2c !important;
              color: #e0e0e0 !important;
              border-color: #555555 !important;
            }

            /* Headings */
            h1, h2, h3, h4, h5, h6 {
              color: #e0e0e0 !important;
            }

            /* Buttons */
            button, .d2l-button, .vui-button {
              background-color: #2c2c2c !important;
              color: #e0e0e0 !important;
              border-color: #555555 !important;
            }

            /* Quiz status */
            .d2l-quiz-status-questions,
            .d2l-quiz-status-info,
            .d2l-quiz-attempt-save,
            .d2l-quiz-attempt-buttons,
            .d2l-save-status-container {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
            }

            /* Fieldsets */
            .dfs_m, .dfs_l, .dfs_l_f {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
            }

            /* McMaster branding colors */
            .cDark { background-color: #4a1030 !important; color: #e0e0e0 !important; }
            .cLight { background-color: #3a3a3a !important; color: #e0e0e0 !important; }
            .cSoft { background-color: #2c2c2c !important; color: #e0e0e0 !important; }

            /* Timer */
            .d2l-quizzing-timer, .d2l-quizzing-timer-meter {
              background-color: #2c2c2c !important;
              color: #e0e0e0 !important;
            }

            /* Collapse pane */
            .d2l-collapsepane, .d2l-collapsepane-content,
            #CollapsePaneTarget, .d2l-page-collapsepane {
              background-color: #222222 !important;
              color: #e0e0e0 !important;
            }

            /* Generic white background catch-all */
            [style*="background-color: white"],
            [style*="background-color:#fff"],
            [style*="background-color: #fff"],
            [style*="background-color:#FFFFFF"],
            [style*="background-color: #FFFFFF"],
            [style*="background-color: rgb(255, 255, 255)"] {
              background-color: #222222 !important;
            }
          `;
        }

        doc.head.appendChild(style);
      } catch (_) {
        /* Cross-origin iframe — cannot inject. Silently ignore. */
      }
    });
  }
})();
