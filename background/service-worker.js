/**
 * D2L Dark Mode — Background Service Worker
 * Sets default preferences on first install.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      darkModeEnabled: true,
      pdfDarkModeEnabled: false
    });
  }
});
