/** D2L Dark Mode — Background Service Worker */

importScripts('../shared/config.js');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ ...D2LConfig.DEFAULTS });
  }
});

// Maps tabId → hostname for confirmed Brightspace tabs
const d2lTabs = new Map();

// Cached dark mode state. Wrapped in a promise so early messages
// wait for the storage read to complete before using the value.
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

// Inject content scripts into frames confirmed as Brightspace by gate.js
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

/* ---- Toolbar icon ---- */

function updateIcon(tabId) {
  const active = cachedDarkMode && d2lTabs.has(tabId);
  chrome.action.setIcon({
    tabId,
    path: {
      16:  active ? '/icons/icon16_active.png'  : '/icons/icon16.png',
      48:  active ? '/icons/icon48_active.png'  : '/icons/icon48.png',
      128: active ? '/icons/icon128_active.png' : '/icons/icon128.png',
    },
  }, () => void chrome.runtime.lastError);
}

/**
 * Re-detect Brightspace by checking data-d2l-detected on the page.
 * Survives service worker restarts since the attribute lives on the page.
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

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  d2lTabs.delete(tabId);
});

// Keep tab marked as D2L for same-host SPA navigations; clear on host change.
// Re-apply icon at 'complete' since Chrome resets per-tab icons on navigation.
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

// Re-detect on tab switch (d2lTabs may be lost after SW sleep)
chrome.tabs.onActivated.addListener((info) => {
  cacheReady.then(function () {
    if (d2lTabs.has(info.tabId)) {
      updateIcon(info.tabId);
    } else {
      redetectTab(info.tabId, function () { updateIcon(info.tabId); });
    }
  });
});

// Sync cached state when dark mode is toggled
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!changes[D2LConfig.STORAGE_KEYS.DARK_MODE]) return;
  cachedDarkMode = changes[D2LConfig.STORAGE_KEYS.DARK_MODE].newValue !== false;
  for (const tabId of d2lTabs.keys()) {
    updateIcon(tabId);
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) updateIcon(tabs[0].id);
  });
});

// Re-detect active tab on startup (d2lTabs lost after SW sleep)
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
