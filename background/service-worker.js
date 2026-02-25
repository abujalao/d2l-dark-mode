/**
 * D2L Dark Mode — Background Service Worker
 */

importScripts('../shared/config.js');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ ...D2LConfig.DEFAULTS });
  }
});

// Tracks which tabs have been confirmed as Brightspace by gate.js
// Maps tabId → hostname so we can distinguish full navigations from SPA navigations
const d2lTabs = new Map();

// Cache dark mode state so updateIcon() never hits storage.
// Use a promise to ensure the cache is ready before processing messages,
// preventing a race where the service worker wakes and handles injectScripts
// before the storage read completes (which would default to active).
let cachedDarkMode = null;
const cacheReady = new Promise((resolve) => {
  chrome.storage.sync.get(
    [D2LConfig.STORAGE_KEYS.DARK_MODE],
    (result) => {
      cachedDarkMode = result[D2LConfig.STORAGE_KEYS.DARK_MODE] !== false;
      resolve();
    }
  );
});

// Handle injection requests from gate.js — injects heavy content scripts
// only into frames confirmed as Brightspace pages.
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (msg.type !== 'injectScripts' || !sender.tab) return;
  try {
    d2lTabs.set(sender.tab.id, new URL(sender.tab.url).hostname);
  } catch (e) {
    d2lTabs.set(sender.tab.id, '');
  }
  cacheReady.then(function () {
    updateIcon(sender.tab.id);
  });
  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
    files: D2LConfig.CONTENT_SCRIPTS,
  }).catch(function () { /* frame may have been destroyed before injection */ });
});

/* ---- Dynamic toolbar icon ---- */
// Note: no per-tab icon cache. Chrome resets per-tab icon overrides on every
// navigation back to the manifest default, which would desync any cache and
// cause stale (active) icons to stick.

function updateIcon(tabId) {
  const active = cachedDarkMode && d2lTabs.has(tabId);
  chrome.action.setIcon({
    tabId,
    path: {
      16:  active ? '/icons/icon16_active.png'  : '/icons/icon16.png',
      48:  active ? '/icons/icon48_active.png'  : '/icons/icon48.png',
      128: active ? '/icons/icon128_active.png' : '/icons/icon128.png',
    },
  }, () => void chrome.runtime.lastError); // suppress stale-tab errors
}

/**
 * Re-detect a tab as Brightspace by checking the page's data-d2l-detected
 * attribute — the ground truth set by gate.js. This survives service worker
 * restarts because the attribute lives on the page, not in SW memory.
 * If detected, re-adds the tab to d2lTabs. Calls callback when done.
 */
function redetectTab(tabId, callback) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return callback();
    if (/^(chrome|chrome-extension|about|edge):/.test(tab.url)) return callback();
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => document.documentElement.hasAttribute('data-d2l-detected'),
    }, (results) => {
      if (!chrome.runtime.lastError && results && results[0] && results[0].result === true) {
        try { d2lTabs.set(tabId, new URL(tab.url).hostname); } catch (e) {}
      }
      callback();
    });
  });
}

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  d2lTabs.delete(tabId);
});

// Handle navigations.
// D2L uses SPA navigation between topics — the URL changes but the page
// doesn't fully reload, so gate.js never re-runs. We keep the tab marked
// as D2L for same-host navigations. Only reset when navigating to a
// different host.
// Chrome resets per-tab icon overrides on navigation, so we must re-apply
// the icon at 'complete' (after Chrome's reset) rather than at 'loading'.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && d2lTabs.has(tabId)) {
    var prevHost = d2lTabs.get(tabId);
    var newHost = '';
    try { newHost = new URL(tab.url).hostname; } catch (e) {}
    if (newHost !== prevHost) {
      d2lTabs.delete(tabId);
    }
  }
  if (changeInfo.status === 'complete') {
    cacheReady.then(function () {
      if (d2lTabs.has(tabId)) {
        updateIcon(tabId);
      } else {
        redetectTab(tabId, function () { updateIcon(tabId); });
      }
    });
  }
});

// Update icon when the user switches tabs.
// Re-detect Brightspace tabs that were lost when the service worker slept.
chrome.tabs.onActivated.addListener((info) => {
  cacheReady.then(function () {
    if (d2lTabs.has(info.tabId)) {
      updateIcon(info.tabId);
    } else {
      redetectTab(info.tabId, function () { updateIcon(info.tabId); });
    }
  });
});

// Update cached state + icons when dark mode is toggled from the popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!changes[D2LConfig.STORAGE_KEYS.DARK_MODE]) return;
  cachedDarkMode = changes[D2LConfig.STORAGE_KEYS.DARK_MODE].newValue !== false;
  // Update icon for all tracked D2L tabs + the active tab
  for (const tabId of d2lTabs.keys()) {
    updateIcon(tabId);
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) updateIcon(tabs[0].id);
  });
});

// Set the correct icon on startup (service worker wake).
// Re-detect the active tab since d2lTabs is lost when the worker sleeps.
cacheReady.then(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    var tab = tabs[0];
    if (d2lTabs.has(tab.id)) {
      updateIcon(tab.id);
    } else {
      redetectTab(tab.id, function () { updateIcon(tab.id); });
    }
  });
});
