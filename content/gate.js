/**
 * D2L Dark Mode — Gatekeeper Script
 * Runs on every page at document_start. Determines if this is a Brightspace
 * page, applies the dark classes before first paint, and triggers content script
 * injection via the service worker.
 */

(function () {
  'use strict';

  var CFG = self.D2LConfig;
  var FL = CFG.FRAME_LINK;
  var FrameRole = self.D2LFrameRole;

  /**
   * Child side of the frame handshake (parent side: frame-link.js). Asks the
   * parent whether this frame renders inverted; if so, this frame corrects its
   * own media via embedded.js. Answers the parent's pings so it never
   * counter-inverts this frame from outside.
   */
  function linkToParent() {
    if (self.D2LEmbedded) return;
    var link = self.D2LEmbedded = { inverted: false, requested: false, answered: false, onChange: null };
    // Marks the handshake as underway so same-origin children link too
    document.documentElement.setAttribute(CFG.CSS.ROLE_ATTR, 'linking');

    function ask() {
      var msg = {};
      msg[FL.KEY] = 'ctx?';
      try { window.parent.postMessage(msg, '*'); } catch (e) {}
    }

    // The first question can arrive before the parent's scripts listen, and the
    // parent's broadcast can land on the placeholder document this one replaced.
    // Keep asking on a short backoff until the parent answers.
    var retries = 0;
    function askAgainLater() {
      if (link.answered || retries >= FL.ASK_RETRY_MS.length) return;
      setTimeout(function () {
        if (link.answered) return;
        ask();
        askAgainLater();
      }, FL.ASK_RETRY_MS[retries++]);
    }

    window.addEventListener('message', function (e) {
      if (e.source !== window.parent) return;
      var d = e.data;
      if (!d || typeof d !== 'object') return;
      var kind = d[FL.KEY];
      if (kind === 'ping') { ask(); return; }
      if (kind !== 'ctx') return;

      link.answered = true;
      link.inverted = d.inverted === true;
      facts.parentInverted = link.inverted;
      if (!link.requested && FrameRole.resolve(facts).role === CFG.CSS.ROLE_EMBEDDED) {
        link.requested = true;
        var html = document.documentElement;
        html.setAttribute(CFG.CSS.ROLE_ATTR, CFG.CSS.ROLE_EMBEDDED);
        // dark-mode.css is already loaded here: this counter-inverts media at once
        html.classList.add(CFG.CSS.ACTIVE);
        chrome.runtime.sendMessage({ type: 'injectScripts', role: CFG.CSS.ROLE_EMBEDDED });
      }
      if (link.onChange) link.onChange();
      else if (!link.inverted) document.documentElement.classList.remove(CFG.CSS.ACTIVE);
    });
    ask();
    askAgainLater();
  }

  /** Records this Brightspace origin so its cross-origin children can find it. */
  function rememberOrigin() {
    var origin = location.origin;
    if (!origin || origin === 'null') return;
    chrome.storage.local.get([FL.ORIGINS_KEY], function (result) {
      if (chrome.runtime.lastError) return;
      var known = (result && result[FL.ORIGINS_KEY]) || [];
      if (known.indexOf(origin) !== -1) return;
      known.push(origin);
      var update = {};
      update[FL.ORIGINS_KEY] = known.slice(-FL.MAX_ORIGINS);
      chrome.storage.local.set(update);
    });
  }

  var hostname = location.hostname;
  var html = document.documentElement;

  /** Synchronous facts about this document and its parent (see shared/frame-role.js). */
  function collectFacts() {
    var top = window.self === window.top;
    var parent = null;
    if (!top) {
      try {
        var pd = window.parent.document;
        var ph = pd.documentElement;
        parent = {
          role: ph.getAttribute(CFG.CSS.ROLE_ATTR),
          active: ph.classList.contains(CFG.CSS.ACTIVE),
          top: ph.classList.contains(CFG.CSS.TOP),
          markers: CFG.isBrightspaceElement(ph),
          frameset: pd.querySelector('frameset') !== null,
          d2lPath: CFG.PATTERNS.D2L_PATH.test(window.parent.location.href),
          knownHost: CFG.matchesAnyHost(window.parent.location.hostname, CFG.KNOWN_HOSTS),
        };
      } catch (e) {
        parent = { crossOrigin: true };
      }
    }
    return {
      top: top,
      about: location.protocol === 'about:',
      excludedHost: CFG.matchesAnyHost(hostname, CFG.EXCLUDED_HOSTS),
      markers: CFG.isBrightspaceElement(html),
      knownHost: CFG.matchesAnyHost(hostname, CFG.KNOWN_HOSTS),
      parent: parent,
    };
  }

  // One storage read serves both the custom-domain fact and activation
  var syncSettings = null;
  function readSync(callback) {
    if (syncSettings) return callback(syncSettings);
    chrome.storage.sync.get(
      [CFG.STORAGE_KEYS.CUSTOM_DOMAINS, CFG.STORAGE_KEYS.EXCLUDED_DOMAINS, CFG.STORAGE_KEYS.DARK_MODE],
      function (result) {
        syncSettings = result || {};
        callback(syncSettings);
      }
    );
  }

  /** Fetches the asynchronous fact the resolver is waiting for. */
  var fetchFact = {
    // Cross-origin frames can't see their parent, so only start the handshake
    // when an ancestor origin was detected as Brightspace before. Keeps the
    // message off every other site's iframes. ancestorOrigins is Chrome-only and
    // reads "null" when the embedder hides its origin.
    origins: function (done) {
      var anc = location.ancestorOrigins;
      if (!anc || !anc.length) return done('knownAncestor', false);
      function hasKnownAncestor(known) {
        for (var i = 0; i < anc.length; i++) {
          if (anc[i] === 'null' || known.indexOf(anc[i]) !== -1) return true;
        }
        return false;
      }
      chrome.storage.local.get([FL.ORIGINS_KEY], function (result) {
        if (chrome.runtime.lastError) return done('knownAncestor', false);
        if (hasKnownAncestor((result && result[FL.ORIGINS_KEY]) || [])) return done('knownAncestor', true);
        done('knownAncestor', false);
        // First visit after install: the Brightspace page above may record its
        // origin a moment after this frame looked. Watch briefly for it.
        function onChanged(changes, area) {
          if (area !== 'local' || !changes[FL.ORIGINS_KEY]) return;
          if (!hasKnownAncestor(changes[FL.ORIGINS_KEY].newValue || [])) return;
          stop();
          done('knownAncestor', true);
        }
        function stop() {
          clearTimeout(timer);
          chrome.storage.onChanged.removeListener(onChanged);
        }
        chrome.storage.onChanged.addListener(onChanged);
        var timer = setTimeout(stop, FL.ORIGIN_WAIT_MS);
      });
    },
    dom: function (done) {
      function check() {
        done('domDetected', !!document.querySelector(CFG.BRIGHTSPACE_DEFERRED_SELECTOR));
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', check, { once: true });
      } else {
        check();
      }
    },
    custom: function (done) {
      readSync(function (result) {
        done('customDomain', CFG.matchesAnyHost(hostname, result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || []));
      });
    },
    // Stays pending until a reply says inverted; linkToParent re-resolves on each one
    parent: function () {
      linkToParent();
    },
  };

  /** Applies the dark classes at document_start so the first paint is already dark. */
  function applyInstantDark(role) {
    html.classList.add(CFG.CSS.ACTIVE);
    // TOP carries the filter; frames below inherit it
    if (role === 'root') html.classList.add(CFG.CSS.TOP);
  }

  function undoInstantDark() {
    html.classList.remove(CFG.CSS.ACTIVE, CFG.CSS.TOP);
  }

  function activate(role) {
    // about: frames follow their parent; main.js reads dark mode itself
    if (facts.about) {
      html.setAttribute(CFG.CSS.ROLE_ATTR, role);
      html.classList.add(CFG.CSS.ACTIVE);
      chrome.runtime.sendMessage({ type: 'injectScripts' });
      return;
    }

    var source = facts.markers || facts.knownHost || facts.domDetected !== false ? 'auto' : 'custom';
    // Known up front: assume enabled and undo a few ms later if storage says otherwise, before first paint
    var instant = facts.domDetected === undefined;
    if (instant) applyInstantDark(role);

    readSync(function (result) {
      var darkEnabled = result[CFG.STORAGE_KEYS.DARK_MODE] !== false;
      html.setAttribute('data-d2l-detected', 'true');
      if (CFG.matchesAnyHost(hostname, result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || [])) {
        undoInstantDark();
        html.setAttribute('data-d2l-source', 'excluded');
        return;
      }
      if (darkEnabled) applyInstantDark(role);
      else undoInstantDark();
      html.setAttribute(CFG.CSS.ROLE_ATTR, role);
      rememberOrigin();
      html.setAttribute('data-d2l-source', source);
      chrome.runtime.sendMessage({ type: 'injectScripts', d2lDetected: true });
    });
  }

  var facts = collectFacts();

  function step() {
    var result = FrameRole.resolve(facts);
    if (result.role === 'root' || result.role === 'nested') return activate(result.role);
    if (result.role !== 'pending') return;
    fetchFact[result.wait](function (name, value) {
      facts[name] = value;
      step();
    });
  }

  step();
})();
