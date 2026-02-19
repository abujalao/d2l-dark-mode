/**
 * D2L Dark Mode — Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const CFG = window.D2LConfig;
  const darkModeToggle = document.getElementById('darkModeToggle');
  const documentDarkModeToggle = document.getElementById('documentDarkModeToggle');
  const videoDarkModeToggle = document.getElementById('videoDarkModeToggle');
  const domainInput = document.getElementById('domainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const domainList = document.getElementById('domainList');
  const resetButton = document.getElementById('resetButton');

  /* ---- Version label ---- */
  document.getElementById('versionLabel').textContent = 'v' + chrome.runtime.getManifest().version;

  /* ---- Load saved settings ---- */
  chrome.storage.sync.get(CFG.allReadKeys(), (result) => {
    darkModeToggle.checked = result[CFG.STORAGE_KEYS.DARK_MODE] !== false; // default ON
    documentDarkModeToggle.checked = CFG.resolveDocumentDarkMode(result); // default OFF
    videoDarkModeToggle.checked = result[CFG.STORAGE_KEYS.VIDEO_DARK_MODE] === true; // default OFF
    renderDomainList(result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || []);
  });

  /* ---- Persist changes on toggle ---- */
  darkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DARK_MODE]: darkModeToggle.checked });
  });

  /* ---- Document dark mode toggle ---- */
  documentDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DOCUMENT_DARK_MODE]: documentDarkModeToggle.checked });
  });

  /* ---- Video dark mode toggle ---- */
  videoDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.VIDEO_DARK_MODE]: videoDarkModeToggle.checked });
  });

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
  }

  function addDomain() {
    const domain = domainInput.value.trim().toLowerCase();
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

  /* ---- Reset button ---- */
  resetButton.addEventListener('click', () => {
    chrome.storage.sync.set({ ...CFG.DEFAULTS }, () => {
      darkModeToggle.checked = CFG.DEFAULTS.darkModeEnabled;
      documentDarkModeToggle.checked = CFG.DEFAULTS.documentDarkModeEnabled;
      videoDarkModeToggle.checked = CFG.DEFAULTS.videoDarkModeEnabled;
      renderDomainList(CFG.DEFAULTS.customDomains);
    });
  });
});
