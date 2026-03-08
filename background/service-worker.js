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

  if (changes[D2LConfig.STORAGE_KEYS.DARK_MODE]) {
    cachedDarkMode = changes[D2LConfig.STORAGE_KEYS.DARK_MODE].newValue !== false;
    for (const tabId of d2lTabs.keys()) {
      updateIcon(tabId);
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) updateIcon(tabs[0].id);
    });
  }

  /* ---- Auto Dark Mode scheduling changes ---- */
  if (changes[D2LConfig.STORAGE_KEYS.AUTO_DARK_MODE]) {
    scheduleEnabled = changes[D2LConfig.STORAGE_KEYS.AUTO_DARK_MODE].newValue === true;
    if (scheduleEnabled) {
      setupScheduleAlarm();
      applySchedule();
    } else {
      teardownScheduleAlarm();
    }
  }
  if (changes[D2LConfig.STORAGE_KEYS.DARK_START_TIME]) {
    scheduleStart = changes[D2LConfig.STORAGE_KEYS.DARK_START_TIME].newValue || '18:00';
    if (scheduleEnabled) applySchedule();
  }
  if (changes[D2LConfig.STORAGE_KEYS.DARK_END_TIME]) {
    scheduleEnd = changes[D2LConfig.STORAGE_KEYS.DARK_END_TIME].newValue || '06:00';
    if (scheduleEnabled) applySchedule();
  }
});

/* ---- Auto Dark Mode Scheduling ---- */

let scheduleEnabled = false;
let scheduleStart = '18:00';
let scheduleEnd = '06:00';

const scheduleReady = new Promise((resolve) => {
  chrome.storage.sync.get([
    D2LConfig.STORAGE_KEYS.AUTO_DARK_MODE,
    D2LConfig.STORAGE_KEYS.DARK_START_TIME,
    D2LConfig.STORAGE_KEYS.DARK_END_TIME,
  ], (result) => {
    scheduleEnabled = result[D2LConfig.STORAGE_KEYS.AUTO_DARK_MODE] === true;
    scheduleStart = result[D2LConfig.STORAGE_KEYS.DARK_START_TIME] || '18:00';
    scheduleEnd = result[D2LConfig.STORAGE_KEYS.DARK_END_TIME] || '06:00';
    resolve();
  });
});

function parseHHMM(str) {
  var parts = (str || '00:00').split(':');
  return Number(parts[0]) * 60 + (Number(parts[1]) || 0);
}

function isInScheduleWindow(startStr, endStr) {
  var now = new Date();
  var cur = now.getHours() * 60 + now.getMinutes();
  var s = parseHHMM(startStr);
  var e = parseHHMM(endStr);
  return s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e);
}

function applySchedule() {
  if (!scheduleEnabled) return;
  var shouldBeDark = isInScheduleWindow(scheduleStart, scheduleEnd);
  chrome.storage.sync.get([D2LConfig.STORAGE_KEYS.DARK_MODE], (result) => {
    var currentlyDark = result[D2LConfig.STORAGE_KEYS.DARK_MODE] !== false;
    if (shouldBeDark !== currentlyDark) {
      chrome.storage.sync.set({ [D2LConfig.STORAGE_KEYS.DARK_MODE]: shouldBeDark });
    }
  });
}

function setupScheduleAlarm() {
  chrome.alarms.get('darkModeSchedule', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('darkModeSchedule', { periodInMinutes: 1 });
    }
  });
}

function teardownScheduleAlarm() {
  chrome.alarms.clear('darkModeSchedule');
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'darkModeSchedule') {
    // Always wait for schedule state to load — the SW may have woken cold from sleep
    scheduleReady.then(() => applySchedule());
  }
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

// Start schedule alarm if enabled
scheduleReady.then(() => {
  if (scheduleEnabled) {
    setupScheduleAlarm();
    applySchedule();
  }
});
