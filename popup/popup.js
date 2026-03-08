/** D2L Dark Mode — Popup */

document.addEventListener('DOMContentLoaded', () => {
  const CFG = window.D2LConfig;

  const powerButton = document.getElementById('powerButton');
  const powerStatus = document.getElementById('powerStatus');
  const documentDarkModeToggle = document.getElementById('documentDarkModeToggle');
  const videoDarkModeToggle = document.getElementById('videoDarkModeToggle');
  const resetButton = document.getElementById('resetButton');
  const resetLabel = resetButton.querySelector('.btn-reset-label');
  const detectionBanner = document.getElementById('detectionBanner');
  const detectionLabel = document.getElementById('detectionLabel');
  const detectionUrl = document.getElementById('detectionUrl');
  const docIcon = document.getElementById('docIcon');
  const videoIcon = document.getElementById('videoIcon');
  const toast = document.getElementById('toast');

  let darkModeOn = true;
  let resetPending = false;
  let resetTimer = null;

  // Logo updates once both D2L detection and storage read have resolved
  const logoState = { isD2L: null, darkOn: null };

  function updatePopupLogo() {
    if (logoState.isD2L === null || logoState.darkOn === null) return;
    const logo = document.getElementById('popupLogo');
    const active = logoState.isD2L && logoState.darkOn;
    logo.src = chrome.runtime.getURL(
      active ? 'icons/popupLogo_active.png' : 'icons/popupLogo_notactive.png'
    );
  }

  document.getElementById('versionLabel').textContent = 'v' + chrome.runtime.getManifest().version;

  /* ---- Toast System ---- */
  let toastTimer = null;
  function showToast(message, type) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = 'toast is-visible' + (type === 'success' ? ' is-success' : '');
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2000);
  }

  /* ---- Options Button ---- */
  document.getElementById('optionsBtn').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });

  /* ---- D2L Detection ---- */
  function showDetectionStatus(isD2L, url, source) {
    if (isD2L) {
      detectionBanner.classList.add('detected');
      if (source === 'excluded') {
        detectionLabel.textContent = 'Brightspace Detected (Excluded)';
      } else if (source === 'custom') {
        detectionLabel.textContent = 'Detected via Custom Domain';
      } else {
        detectionLabel.textContent = 'Brightspace Detected';
      }
    } else {
      detectionBanner.classList.remove('detected');
      detectionLabel.textContent = 'Not a Brightspace page';
    }

    if (url) {
      try {
        const parsed = new URL(url);
        const display = parsed.hostname + parsed.pathname;
        detectionUrl.textContent = display.length > 45 ? display.substring(0, 45) + '...' : display;
      } catch {
        detectionUrl.textContent = '';
      }
    } else {
      detectionUrl.textContent = '';
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id || !tab.url) {
      showDetectionStatus(false, null);
      logoState.isD2L = false;
      updatePopupLogo();
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:') || tab.url.startsWith('edge://')) {
      showDetectionStatus(false, null);
      logoState.isD2L = false;
      updatePopupLogo();
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        detected: document.documentElement.hasAttribute('data-d2l-detected'),
        source: document.documentElement.getAttribute('data-d2l-source') || 'auto',
      }),
    }, (results) => {
      const data = !chrome.runtime.lastError && results && results[0] && results[0].result;
      const detected = data && data.detected === true;
      const source = data ? data.source : 'auto';
      showDetectionStatus(detected, tab.url, source);
      logoState.isD2L = detected;
      updatePopupLogo();
    });
  });

  /* ---- Settings ---- */
  chrome.storage.sync.get(CFG.allReadKeys(), (result) => {
    darkModeOn = result[CFG.STORAGE_KEYS.DARK_MODE] !== false;
    updatePowerButton(darkModeOn);
    logoState.darkOn = darkModeOn;
    updatePopupLogo();

    documentDarkModeToggle.checked = CFG.resolveDocumentDarkMode(result);
    videoDarkModeToggle.checked = result[CFG.STORAGE_KEYS.VIDEO_DARK_MODE] === true;

    updateToggleIcon(docIcon, documentDarkModeToggle.checked);
    updateToggleIcon(videoIcon, videoDarkModeToggle.checked);
  });

  /* ---- Power Button ---- */
  function updatePowerButton(isOn) {
    if (isOn) {
      powerButton.classList.add('is-active');
      powerStatus.textContent = 'Dark Mode: ON';
    } else {
      powerButton.classList.remove('is-active');
      powerStatus.textContent = 'Dark Mode: OFF';
    }
  }

  powerButton.addEventListener('click', () => {
    darkModeOn = !darkModeOn;
    updatePowerButton(darkModeOn);
    logoState.darkOn = darkModeOn;
    updatePopupLogo();
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DARK_MODE]: darkModeOn });
  });

  /* ---- Toggle Icons ---- */
  function updateToggleIcon(icon, isActive) {
    if (isActive) {
      icon.classList.add('is-active');
    } else {
      icon.classList.remove('is-active');
    }
  }

  /* ---- Document Dark Mode ---- */
  documentDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE]: documentDarkModeToggle.checked });
    updateToggleIcon(docIcon, documentDarkModeToggle.checked);
  });

  /* ---- Video Dark Mode ---- */
  videoDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.VIDEO_DARK_MODE]: videoDarkModeToggle.checked });
    updateToggleIcon(videoIcon, videoDarkModeToggle.checked);
  });

  /* ---- Reset with Confirmation ---- */
  resetButton.addEventListener('click', () => {
    if (!resetPending) {
      resetPending = true;
      resetButton.classList.add('is-confirming');
      resetLabel.textContent = 'Click again to confirm';

      resetTimer = setTimeout(() => {
        resetPending = false;
        resetButton.classList.remove('is-confirming');
        resetLabel.textContent = 'Reset to Defaults';
      }, 3000);
    } else {
      clearTimeout(resetTimer);
      resetPending = false;

      chrome.storage.sync.set({ ...CFG.DEFAULTS }, () => {
        darkModeOn = CFG.DEFAULTS.darkModeEnabled;
        updatePowerButton(darkModeOn);
        documentDarkModeToggle.checked = CFG.DEFAULTS.documentDarkModeEnabled;
        videoDarkModeToggle.checked = CFG.DEFAULTS.videoDarkModeEnabled;
        updateToggleIcon(docIcon, false);
        updateToggleIcon(videoIcon, false);

        resetButton.classList.remove('is-confirming');
        resetButton.classList.add('is-done');
        resetLabel.textContent = 'Reset complete!';
        showToast('All settings restored to defaults', 'success');

        setTimeout(() => {
          resetButton.classList.remove('is-done');
          resetLabel.textContent = 'Reset to Defaults';
        }, 2000);
      });
    }
  });
});
