/**
 * D2L Dark Mode — Background Service Worker
 */

importScripts('../shared/config.js');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ ...D2LConfig.DEFAULTS });
  }
});

// Handle injection requests from gate.js — injects heavy content scripts
// only into frames confirmed as Brightspace pages.
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (msg.type !== 'injectScripts' || !sender.tab) return;
  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
    files: D2LConfig.CONTENT_SCRIPTS,
  });
});

/* ---- Dynamic toolbar icon ---- */

function isD2LUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    const isKnownHost = D2LConfig.KNOWN_HOSTS.some(
      (h) => hostname === h || hostname.endsWith('.' + h)
    );
    return isKnownHost || D2LConfig.PATTERNS.D2L_PATH.test(url);
  } catch {
    return false;
  }
}

function updateIcon(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    chrome.storage.sync.get(['darkModeEnabled'], (result) => {
      const darkOn = result.darkModeEnabled !== false;
      const active = darkOn && isD2LUrl(tab.url);
      chrome.action.setIcon({
        tabId,
        path: {
          16:  active ? '/icons/icon16_active.png'  : '/icons/icon16.png',
          48:  active ? '/icons/icon48_active.png'  : '/icons/icon48.png',
          128: active ? '/icons/icon128_active.png' : '/icons/icon128.png',
        },
      });
    });
  });
}

// Update icon when the user switches tabs
chrome.tabs.onActivated.addListener((info) => {
  updateIcon(info.tabId);
});

// Update icon when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') updateIcon(tabId);
});

// Update icon when dark mode is toggled from the popup
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== 'sync') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) updateIcon(tabs[0].id);
  });
});

// Set the correct icon on startup (service worker wake)
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) updateIcon(tabs[0].id);
});
