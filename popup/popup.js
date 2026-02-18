/**
 * D2L Dark Mode — Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const resetButton = document.getElementById('resetButton');

  /* ---- Load saved settings ---- */
  chrome.storage.sync.get(['darkModeEnabled'], (result) => {
    darkModeToggle.checked = result.darkModeEnabled !== false; // default ON
  });

  /* ---- Persist changes on toggle ---- */
  darkModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ darkModeEnabled: darkModeToggle.checked });
  });

  /* ---- Reset button ---- */
  resetButton.addEventListener('click', () => {
    chrome.storage.sync.set({ darkModeEnabled: true }, () => {
      darkModeToggle.checked = true;
    });
  });
});
