/**
 * D2L Dark Mode — Background Service Worker
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      darkModeEnabled: true
    });
  }
});
