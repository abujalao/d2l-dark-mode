/** D2L Dark Mode — Background Service Worker */

importScripts('../shared/config.js', '../shared/tab-status.js', '../shared/schedule.js', '../shared/settings.js');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ ...D2LConfig.DEFAULTS });
  } else if (details.reason === 'update') {
    D2LSettings.migrate();
  }
});

// Maps tabId → { host, page } for confirmed Brightspace tabs. `page` holds the
// tab's detection marks ({ detected, source }), the same facts the popup reads.
const d2lTabs = new Map();

function hostOf(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}

// The Map is lost when the worker sleeps; storage.session keeps it for the
// browser session, so background tabs still get icon updates after a wake-up
const TABS_KEY = 'd2lTabs';

// Saving before the restore would overwrite the stored list with only the new entries
function saveTabs() {
  tabsReady.then(() => {
    chrome.storage.session.set({ [TABS_KEY]: Object.fromEntries(d2lTabs) });
  });
}

const tabsReady = new Promise((resolve) => {
  chrome.storage.session.get([TABS_KEY], (result) => {
    const saved = (result && result[TABS_KEY]) || {};
    for (const id of Object.keys(saved)) {
      // Fresher entries recorded since the wake-up win
      if (!d2lTabs.has(Number(id))) d2lTabs.set(Number(id), saved[id]);
    }
    resolve();
  });
});

function track(tab, page) {
  d2lTabs.set(tab.id, { host: hostOf(tab.url), page: page });
  saveTabs();
}

function forget(tabId) {
  if (d2lTabs.delete(tabId)) saveTabs();
}

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

// Icon decisions read d2lTabs, which an event that woke the worker sees before the restore
const iconReady = Promise.all([cacheReady, tabsReady]);

// Inject content scripts into frames confirmed as Brightspace by gate.js
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (msg.type !== 'injectScripts' || !sender.tab) return;
  // gate.js only asks for scripts on pages that aren't excluded
  track(sender.tab, { detected: true, source: 'auto' });
  cacheReady.then(function () {
    updateIcon(sender.tab.id);
  });
  // A frameId survives navigations; a documentId (Chrome 106+) does not
  var target = sender.documentId
    ? { tabId: sender.tab.id, documentIds: [sender.documentId] }
    : { tabId: sender.tab.id, frameIds: [sender.frameId] };
  var embedded = msg.role === D2LConfig.CSS.ROLE_EMBEDDED;
  chrome.scripting.executeScript({
    target: target,
    files: embedded ? D2LConfig.EMBEDDED_SCRIPTS : D2LConfig.CONTENT_SCRIPTS,
    // Default (document_idle) delays activation until the page finishes loading
    injectImmediately: true,
  }).catch(function () { /* frame may have been destroyed before injection */ });
  if (embedded) {
    // The manifest copy bailed at document_start (not a Brightspace page);
    // without it, frameworks that replace adoptedStyleSheets drop our sheet
    chrome.scripting.executeScript({
      target: target,
      files: ['content/shadow-injector.js'],
      world: 'MAIN',
      injectImmediately: true,
    }).catch(function () {});
  }
});

/* ---- Toolbar icon ---- */

function updateIcon(tabId) {
  const tracked = d2lTabs.get(tabId);
  const active = D2LTabStatus.isActive(tracked && tracked.page, cachedDarkMode);
  chrome.action.setIcon({
    tabId,
    path: {
      16:  active ? '/icons/icon16_active.png'  : '/icons/icon16.png',
      32:  active ? '/icons/icon32_active.png'  : '/icons/icon32.png',
      48:  active ? '/icons/icon48_active.png'  : '/icons/icon48.png',
      128: active ? '/icons/icon128_active.png' : '/icons/icon128.png',
    },
  }, () => void chrome.runtime.lastError);
}

/**
 * Re-detect Brightspace from the marks gate.js left on the page.
 * Survives service worker restarts since the marks live on the page.
 */
function redetectTab(tabId, callback) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !D2LTabStatus.canReadPage(tab.url)) return callback();
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: D2LTabStatus.readPageMarks,
    }, (results) => {
      const page = !chrome.runtime.lastError && results && results[0] && results[0].result;
      if (page && page.detected) track(tab, page);
      callback();
    });
  });
}

// Clean up closed tabs (after the restore, or it would bring them back)
chrome.tabs.onRemoved.addListener((tabId) => {
  tabsReady.then(() => forget(tabId));
});

// Keep tab marked as D2L for same-host SPA navigations; clear on host change.
// Re-apply icon at 'complete' since Chrome resets per-tab icons on navigation.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    var newHost = hostOf(tab.url);
    tabsReady.then(function () {
      if (d2lTabs.has(tabId) && d2lTabs.get(tabId).host !== newHost) {
        forget(tabId);
      }
    });
  }
  if (changeInfo.status === 'complete') {
    iconReady.then(function () {
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
  iconReady.then(function () {
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
    tabsReady.then(() => {
      for (const tabId of d2lTabs.keys()) updateIcon(tabId);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) updateIcon(tabs[0].id);
    });
  }

  /* ---- Auto Dark Mode scheduling changes ---- */
  // Take every changed value first, then apply once: one write can carry
  // the toggle and both times together
  var autoChange = changes[D2LConfig.STORAGE_KEYS.AUTO_DARK_MODE];
  var startChange = changes[D2LConfig.STORAGE_KEYS.DARK_START_TIME];
  var endChange = changes[D2LConfig.STORAGE_KEYS.DARK_END_TIME];
  if (!autoChange && !startChange && !endChange) return;
  // A worker woken by this change hasn't loaded the schedule yet, and a time
  // edit alone doesn't say whether auto mode is on
  scheduleReady.then(() => {
    if (autoChange) scheduleEnabled = autoChange.newValue === true;
    if (startChange) scheduleStart = startChange.newValue || D2LConfig.DEFAULTS.darkStartTime;
    if (endChange) scheduleEnd = endChange.newValue || D2LConfig.DEFAULTS.darkEndTime;
    if (autoChange && !scheduleEnabled) {
      teardownScheduleAlarm();
      return;
    }
    if (autoChange) setupScheduleAlarm();
    // Editing the schedule is a deliberate "follow it now", even after a manual press
    if (scheduleEnabled) applySchedule({ force: true });
  });
});

/* ---- Auto Dark Mode Scheduling ---- */

let scheduleEnabled = false;
let scheduleStart = D2LConfig.DEFAULTS.darkStartTime;
let scheduleEnd = D2LConfig.DEFAULTS.darkEndTime;

const scheduleReady = new Promise((resolve) => {
  D2LSettings.read((s) => {
    scheduleEnabled = s.autoDarkModeEnabled === true;
    scheduleStart = s.darkStartTime;
    scheduleEnd = s.darkEndTime;
    resolve();
  });
});

function applySchedule(opts) {
  if (!scheduleEnabled) return;
  var force = !!(opts && opts.force);
  var schedule = { start: scheduleStart, end: scheduleEnd };
  var now = new Date();
  var shouldBeDark = D2LSchedule.isDarkAt(schedule, now);
  chrome.storage.sync.get([D2LConfig.STORAGE_KEYS.DARK_MODE, D2LConfig.STORAGE_KEYS.SCHEDULE_OVERRIDE_AT], (result) => {
    // A press of the power button since the last switch wins until the next one
    var overrideAt = result[D2LConfig.STORAGE_KEYS.SCHEDULE_OVERRIDE_AT] || 0;
    if (!force && overrideAt >= D2LSchedule.lastSwitchBefore(schedule, now)) return;
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
iconReady.then(() => {
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
