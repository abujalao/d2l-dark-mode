/**
 * D2L Dark Mode — Popup Logic (Redesigned)
 */

document.addEventListener('DOMContentLoaded', () => {
  const CFG = window.D2LConfig;

  // --- DOM references ---
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

  // Collapsible elements
  const advancedHeader = document.getElementById('advancedHeader');
  const advancedSection = document.getElementById('advancedSection');
  const domainsHeader = document.getElementById('domainsHeader');
  const domainsSection = document.getElementById('domainsSection');

  // Track dark mode state locally
  let darkModeOn = true;

  /* ---- Popup logo ---- */
  // Both the D2L detection and the storage read resolve independently.
  // Use a small shared state object so we only update the logo once both are done.
  const logoState = { isD2L: null, darkOn: null };

  function updatePopupLogo() {
    if (logoState.isD2L === null || logoState.darkOn === null) return;
    const logo = document.getElementById('popupLogo');
    const active = logoState.isD2L && logoState.darkOn;
    logo.src = chrome.runtime.getURL(
      active ? 'icons/popupLogo_active.png' : 'icons/popupLogo_notactive.png'
    );
  }

  /* ---- Version label ---- */
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

  // Check the page directly for gate.js's persistent detection marker.
  // This survives service worker restarts and is independent of dark mode state.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id || !tab.url) {
      showDetectionStatus(false, null);
      logoState.isD2L = false;
      updatePopupLogo();
      return;
    }

    // Skip restricted URLs where scripting isn't allowed
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
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

  /* ---- Load saved settings ---- */
  chrome.storage.sync.get(CFG.allReadKeys(), (result) => {
    darkModeOn = result[CFG.STORAGE_KEYS.DARK_MODE] !== false;
    updatePowerButton(darkModeOn);
    logoState.darkOn = darkModeOn;
    updatePopupLogo();

    documentDarkModeToggle.checked = CFG.resolveDocumentDarkMode(result);
    videoDarkModeToggle.checked = result[CFG.STORAGE_KEYS.VIDEO_DARK_MODE] === true;

    updateToggleIcon(docIcon, documentDarkModeToggle.checked);
    updateToggleIcon(videoIcon, videoDarkModeToggle.checked);

    renderDomainList(result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || []);
    renderExcludedList(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || []);
  });

  /* ---- Power button ---- */
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

  /* ---- Toggle icon animation ---- */
  function updateToggleIcon(icon, isActive) {
    if (isActive) {
      icon.classList.add('is-active');
    } else {
      icon.classList.remove('is-active');
    }
  }

  /* ---- Document dark mode toggle ---- */
  documentDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE]: documentDarkModeToggle.checked });
    updateToggleIcon(docIcon, documentDarkModeToggle.checked);
  });

  /* ---- Video dark mode toggle ---- */
  videoDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.VIDEO_DARK_MODE]: videoDarkModeToggle.checked });
    updateToggleIcon(videoIcon, videoDarkModeToggle.checked);
  });

  /* ---- Collapsible sections ---- */
  function setupCollapsible(header, section, storageKey) {
    // Load persisted collapse state (local, not sync)
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

      // Persist state
      chrome.storage.local.set({ [storageKey]: isOpen });
    });
  }

  setupCollapsible(advancedHeader, advancedSection, 'popup_advancedOpen');
  setupCollapsible(domainsHeader, domainsSection, 'popup_domainsOpen');

  /* ---- Hostname extraction helper ---- */
  function extractHostname(input) {
    input = input.trim().toLowerCase();
    // If it looks like it has a path or protocol, try URL parsing
    if (input.includes('/') || input.includes(':')) {
      try {
        // Prepend protocol if missing so URL constructor works
        var toParse = input.includes('://') ? input : 'https://' + input;
        return new URL(toParse).hostname;
      } catch (e) {}
    }
    return input;
  }

  /* ---- Custom domains ---- */
  function renderDomainList(domains) {
    domainList.innerHTML = '';
    domains.forEach((domain, index) => {
      const li = document.createElement('li');
      li.textContent = domain;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'domain-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => removeDomain(index));
      li.appendChild(removeBtn);
      domainList.appendChild(li);
    });

    // Update collapsible height if domains section is open
    if (domainsSection.classList.contains('is-open')) {
      const content = domainsSection.querySelector('.collapsible-content');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  }

  function addDomain() {
    const domain = extractHostname(domainInput.value);
    if (!domain) return;
    chrome.storage.sync.get([CFG.STORAGE_KEYS.CUSTOM_DOMAINS], (result) => {
      const domains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
      if (domains.includes(domain)) return;
      domains.push(domain);
      chrome.storage.sync.set({ [CFG.STORAGE_KEYS.CUSTOM_DOMAINS]: domains }, () => {
        domainInput.value = '';
        renderDomainList(domains);
      });
    });
  }

  function removeDomain(index) {
    chrome.storage.sync.get([CFG.STORAGE_KEYS.CUSTOM_DOMAINS], (result) => {
      const domains = result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || [];
      domains.splice(index, 1);
      chrome.storage.sync.set({ [CFG.STORAGE_KEYS.CUSTOM_DOMAINS]: domains }, () => {
        renderDomainList(domains);
      });
    });
  }

  addDomainBtn.addEventListener('click', addDomain);
  domainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomain();
  });

  /* ---- Excluded domains ---- */
  function renderExcludedList(domains) {
    excludedDomainList.innerHTML = '';
    domains.forEach((domain, index) => {
      const li = document.createElement('li');
      li.textContent = domain;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'domain-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', () => removeExcludedDomain(index));
      li.appendChild(removeBtn);
      excludedDomainList.appendChild(li);
    });

    // Update collapsible height if domains section is open
    if (domainsSection.classList.contains('is-open')) {
      const content = domainsSection.querySelector('.collapsible-content');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  }

  function addExcludedDomain() {
    const domain = extractHostname(excludedDomainInput.value);
    if (!domain) return;
    chrome.storage.sync.get([CFG.STORAGE_KEYS.EXCLUDED_DOMAINS], (result) => {
      const domains = result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [];
      if (domains.includes(domain)) return;
      domains.push(domain);
      chrome.storage.sync.set({ [CFG.STORAGE_KEYS.EXCLUDED_DOMAINS]: domains }, () => {
        excludedDomainInput.value = '';
        renderExcludedList(domains);
      });
    });
  }

  function removeExcludedDomain(index) {
    chrome.storage.sync.get([CFG.STORAGE_KEYS.EXCLUDED_DOMAINS], (result) => {
      const domains = result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [];
      domains.splice(index, 1);
      chrome.storage.sync.set({ [CFG.STORAGE_KEYS.EXCLUDED_DOMAINS]: domains }, () => {
        renderExcludedList(domains);
      });
    });
  }

  addExcludedDomainBtn.addEventListener('click', addExcludedDomain);
  excludedDomainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addExcludedDomain();
  });

  /* ---- Reset button ---- */
  resetButton.addEventListener('click', () => {
    chrome.storage.sync.set({ ...CFG.DEFAULTS }, () => {
      darkModeOn = CFG.DEFAULTS.darkModeEnabled;
      updatePowerButton(darkModeOn);
      documentDarkModeToggle.checked = CFG.DEFAULTS.documentDarkModeEnabled;
      videoDarkModeToggle.checked = CFG.DEFAULTS.videoDarkModeEnabled;
      updateToggleIcon(docIcon, false);
      updateToggleIcon(videoIcon, false);
      renderDomainList(CFG.DEFAULTS.customDomains);
      renderExcludedList(CFG.DEFAULTS.excludedDomains);

      // Collapse sections
      advancedSection.classList.remove('is-open');
      advancedSection.querySelector('.collapsible-content').style.maxHeight = '0';
      domainsSection.classList.remove('is-open');
      domainsSection.querySelector('.collapsible-content').style.maxHeight = '0';
      chrome.storage.local.set({ popup_advancedOpen: false, popup_domainsOpen: false });
    });
  });
});
