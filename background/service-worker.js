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
