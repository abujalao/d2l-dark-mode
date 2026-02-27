/** D2L Dark Mode — Popup */

document.addEventListener('DOMContentLoaded', () => {
  const CFG = window.D2LConfig;

  const powerButton = document.getElementById('powerButton');
  const powerStatus = document.getElementById('powerStatus');
  const documentDarkModeToggle = document.getElementById('documentDarkModeToggle');
  const videoDarkModeToggle = document.getElementById('videoDarkModeToggle');
  const domainInput = document.getElementById('domainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const domainList = document.getElementById('domainList');
  const excludedDomainInput = document.getElementById('excludedDomainInput');
  const addExcludedDomainBtn = document.getElementById('addExcludedDomainBtn');
  const excludedDomainList = document.getElementById('excludedDomainList');
  const resetButton = document.getElementById('resetButton');
  const detectionBanner = document.getElementById('detectionBanner');
  const detectionDot = document.getElementById('detectionDot');
  const detectionLabel = document.getElementById('detectionLabel');
  const detectionUrl = document.getElementById('detectionUrl');
  const docIcon = document.getElementById('docIcon');
  const videoIcon = document.getElementById('videoIcon');

  const advancedHeader = document.getElementById('advancedHeader');
  const advancedSection = document.getElementById('advancedSection');
  const domainsHeader = document.getElementById('domainsHeader');
  const domainsSection = document.getElementById('domainsSection');

  let darkModeOn = true;

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

  // Check gate.js's persistent detection marker on the page
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

  /* ---- Domain Managers ---- */
  const customDomains = createDomainManager(CFG.STORAGE_KEYS.CUSTOM_DOMAINS, domainList, domainInput);
  const excludedDomains = createDomainManager(CFG.STORAGE_KEYS.EXCLUDED_DOMAINS, excludedDomainList, excludedDomainInput);

  addDomainBtn.addEventListener('click', customDomains.add);
  domainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') customDomains.add();
  });

  addExcludedDomainBtn.addEventListener('click', excludedDomains.add);
  excludedDomainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') excludedDomains.add();
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

    customDomains.render(result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || []);
    excludedDomains.render(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || []);
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

  /* ---- Collapsible Sections ---- */
  function setupCollapsible(header, section, storageKey) {
    chrome.storage.local.get([storageKey], (result) => {
      if (result[storageKey] === true) {
        section.classList.add('is-open');
        const content = section.querySelector('.collapsible-content');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });

    header.addEventListener('click', () => {
      const isOpen = section.classList.toggle('is-open');
      const content = section.querySelector('.collapsible-content');

      if (isOpen) {
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        content.style.maxHeight = '0';
      }

      chrome.storage.local.set({ [storageKey]: isOpen });
    });
  }

  setupCollapsible(advancedHeader, advancedSection, 'popup_advancedOpen');
  setupCollapsible(domainsHeader, domainsSection, 'popup_domainsOpen');

  /* ---- Hostname Extraction ---- */
  function extractHostname(input) {
    input = input.trim().toLowerCase();
    if (input.includes('/') || input.includes(':')) {
      try {
        var toParse = input.includes('://') ? input : 'https://' + input;
        return new URL(toParse).hostname;
      } catch (e) {}
    }
    return input;
  }

  /* ---- Domain Management Factory ---- */
  function createDomainManager(storageKey, listEl, inputEl) {
    function render(domains) {
      listEl.innerHTML = '';
      domains.forEach((domain, index) => {
        const li = document.createElement('li');
        li.textContent = domain;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'domain-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', () => remove(index));
        li.appendChild(removeBtn);
        listEl.appendChild(li);
      });
      if (domainsSection.classList.contains('is-open')) {
        const content = domainsSection.querySelector('.collapsible-content');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    }

    function add() {
      const domain = extractHostname(inputEl.value);
      if (!domain) return;
      chrome.storage.sync.get([storageKey], (result) => {
        const domains = result[storageKey] || [];
        if (domains.includes(domain)) return;
        domains.push(domain);
        chrome.storage.sync.set({ [storageKey]: domains }, () => {
          inputEl.value = '';
          render(domains);
        });
      });
    }

    function remove(index) {
      chrome.storage.sync.get([storageKey], (result) => {
        const domains = result[storageKey] || [];
        domains.splice(index, 1);
        chrome.storage.sync.set({ [storageKey]: domains }, () => {
          render(domains);
        });
      });
    }

    return { render, add, remove };
  }

  /* ---- Reset ---- */
  resetButton.addEventListener('click', () => {
    chrome.storage.sync.set({ ...CFG.DEFAULTS }, () => {
      darkModeOn = CFG.DEFAULTS.darkModeEnabled;
      updatePowerButton(darkModeOn);
      documentDarkModeToggle.checked = CFG.DEFAULTS.documentDarkModeEnabled;
      videoDarkModeToggle.checked = CFG.DEFAULTS.videoDarkModeEnabled;
      updateToggleIcon(docIcon, false);
      updateToggleIcon(videoIcon, false);
      customDomains.render(CFG.DEFAULTS.customDomains);
      excludedDomains.render(CFG.DEFAULTS.excludedDomains);

      advancedSection.classList.remove('is-open');
      advancedSection.querySelector('.collapsible-content').style.maxHeight = '0';
      domainsSection.classList.remove('is-open');
      domainsSection.querySelector('.collapsible-content').style.maxHeight = '0';
      chrome.storage.local.set({ popup_advancedOpen: false, popup_domainsOpen: false });
    });
  });
});
