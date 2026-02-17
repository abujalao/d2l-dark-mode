/**
 * D2L Dark Mode — Popup Logic
 * Reads / writes settings via chrome.storage.sync so
 * the content script picks up changes in real time.
 */

document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const pdfDarkModeToggle = document.getElementById('pdfDarkModeToggle');
  const resetButton = document.getElementById('resetButton');

  /* ---- Load saved settings ---- */
  chrome.storage.sync.get(['darkModeEnabled', 'pdfDarkModeEnabled'], (result) => {
    darkModeToggle.checked = result.darkModeEnabled !== false; // default ON
    pdfDarkModeToggle.checked = result.pdfDarkModeEnabled === true; // default OFF
  });

  /* ---- Persist changes on toggle ---- */
  darkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ darkModeEnabled: darkModeToggle.checked });
  });

  pdfDarkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ pdfDarkModeEnabled: pdfDarkModeToggle.checked });
  });

  /* ---- Reset button ---- */
  resetButton.addEventListener('click', () => {
    chrome.storage.sync.set(
      { darkModeEnabled: true, pdfDarkModeEnabled: false },
      () => {
        darkModeToggle.checked = true;
        pdfDarkModeToggle.checked = false;
      }
    );
  });
});
