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
    .d2l-dialog-inner,
    .d2l-dialog-content,
    .d2l-dialog-header,
    .d2l-dialog-footer {
      background-color: #222222 !important;
      color: #e0e0e0 !important;
      border-color: #3a3a3a !important;
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
   * shadow root. Also set up a MutationObserver so new shadow
   * hosts added later are handled automatically.
   */
  function startShadowObserver() {
    /* Process anything already in the DOM */
    injectAllShadowRoots(document.documentElement);

    if (shadowObserver) return; /* already observing */

    shadowObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          injectAllShadowRoots(node);
        }
      }
    });

    const target = document.documentElement;
    shadowObserver.observe(target, { childList: true, subtree: true });
  }

  function stopShadowObserver() {
    if (shadowObserver) {
      shadowObserver.disconnect();
      shadowObserver = null;
    }
  }

  /**
   * Recursively find all elements under `root` that have an
   * open shadowRoot, then inject our dark-mode styles into each.
   */
  function injectAllShadowRoots(root) {
    if (!root) return;

    if (root.shadowRoot) {
      injectShadowStyles(root.shadowRoot);
    }

    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of elements) {
      if (el.shadowRoot) {
        injectShadowStyles(el.shadowRoot);
        /* Recurse into nested shadow roots */
        injectAllShadowRoots(el.shadowRoot);
      }
    }

    /* Also recurse inside this shadow root for nested components */
    if (root.shadowRoot) {
      const innerElements = root.shadowRoot.querySelectorAll('*');
      for (const el of innerElements) {
        if (el.shadowRoot) {
          injectShadowStyles(el.shadowRoot);
          injectAllShadowRoots(el.shadowRoot);
        }
      }
    }
  }

  function injectShadowStyles(shadowRoot) {
    if (shadowRoot.querySelector('[data-d2l-dark-mode]')) return;

    const style = document.createElement('style');
    style.setAttribute('data-d2l-dark-mode', 'true');
    style.textContent = SHADOW_CSS;
    shadowRoot.appendChild(style);
  }

  function removeShadowStyles() {
    document.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) {
        const style = el.shadowRoot.querySelector('[data-d2l-dark-mode]');
        if (style) style.remove();
      }
    });
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

    const isContentViewer =
      src.includes('/content/') ||
      src.includes('ViewerController') ||
      iframe.classList.contains('d2l-iframe');

    if (!isPDFViewer && !isContentViewer) return;

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
          // General content viewer styles
          style.textContent = `
            html, body {
              background-color: #1a1a1a !important;
              color: #e0e0e0 !important;
            }
            a { color: #5ba3ff !important; }
            /* Preserve images inside iframes */
            img, svg, video, canvas { filter: none !important; }
          `;
        }

        doc.head.appendChild(style);
      } catch (_) {
        /* Cross-origin iframe — cannot inject. Silently ignore. */
      }
    });
  }
})();
