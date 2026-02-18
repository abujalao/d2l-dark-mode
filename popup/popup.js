/**
 * D2L Dark Mode — Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const documentDarkModeToggle = document.getElementById('documentDarkModeToggle');
  const videoDarkModeToggle = document.getElementById('videoDarkModeToggle');
  const domainInput = document.getElementById('domainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const domainList = document.getElementById('domainList');
  const resetButton = document.getElementById('resetButton');

  /* ---- Load saved settings ---- */
  chrome.storage.sync.get(['darkModeEnabled', 'documentDarkModeEnabled', 'pdfDarkModeEnabled', 'videoDarkModeEnabled', 'customDomains'], (result) => {
    darkModeToggle.checked = result.darkModeEnabled !== false; // default ON
    // Backward compat: prefer documentDarkModeEnabled, fall back to pdfDarkModeEnabled
    documentDarkModeToggle.checked = result.documentDarkModeEnabled !== undefined
      ? result.documentDarkModeEnabled === true
      : result.pdfDarkModeEnabled === true; // default OFF
    videoDarkModeToggle.checked = result.videoDarkModeEnabled === true; // default OFF
    renderDomainList(result.customDomains || []);
  });

  /* ---- Persist changes on toggle ---- */
  darkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ darkModeEnabled: darkModeToggle.checked });
  });

  /* ---- Document dark mode toggle ---- */
  documentDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ documentDarkModeEnabled: documentDarkModeToggle.checked });
  });

  /* ---- Video dark mode toggle ---- */
  videoDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ videoDarkModeEnabled: videoDarkModeToggle.checked });
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
    chrome.storage.sync.get(['customDomains'], (result) => {
      const domains = result.customDomains || [];
      if (domains.includes(domain)) return;
      domains.push(domain);
      chrome.storage.sync.set({ customDomains: domains }, () => {
        domainInput.value = '';
        renderDomainList(domains);
      });
    });
  }

  function removeDomain(index) {
    chrome.storage.sync.get(['customDomains'], (result) => {
      const domains = result.customDomains || [];
      domains.splice(index, 1);
      chrome.storage.sync.set({ customDomains: domains }, () => {
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
    chrome.storage.sync.set({ darkModeEnabled: true, documentDarkModeEnabled: false, videoDarkModeEnabled: false, customDomains: [] }, () => {
      darkModeToggle.checked = true;
      documentDarkModeToggle.checked = false;
      videoDarkModeToggle.checked = false;
      renderDomainList([]);
    });
  });
});
