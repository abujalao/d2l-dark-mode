/** D2L Dark Mode — Options Page */

document.addEventListener('DOMContentLoaded', function () {
  var CFG = window.D2LConfig;

  /* ---- Version & Logo ---- */
  var version = 'v' + chrome.runtime.getManifest().version;
  document.getElementById('optionsVersion').textContent = version;
  document.getElementById('aboutVersion').textContent = version;
  document.getElementById('optionsLogo').src = chrome.runtime.getURL('icons/popupLogo_active.png');
  document.getElementById('aboutLogo').src = chrome.runtime.getURL('icons/popupLogo_active.png');

  /* ---- Toast System ---- */
  var toast = document.getElementById('toast');
  var toastTimer = null;
  function showToast(message, type) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = 'toast is-visible' + (type === 'success' ? ' is-success' : type === 'info' ? ' is-info' : '');
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2500);
  }

  /* ---- Tab Switching ---- */
  var navItems = document.querySelectorAll('.nav-item');
  var panels = document.querySelectorAll('.tab-panel');

  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tabId = btn.getAttribute('data-tab');
      navItems.forEach(function (b) { b.classList.remove('is-active'); });
      panels.forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      document.getElementById('tab-' + tabId).classList.add('is-active');
    });
  });

  /* ---- Populate Selects ---- */
  var fontSizeSlider = document.getElementById('fontSizeSlider');
  var fontSizeValue = document.getElementById('fontSizeValue');

  var fontFamilyOpts = [
    { group: 'System' },
    { value: 'default',      label: 'Default (System)' },
    { group: 'Sans-serif' },
    { value: 'inter',        label: 'Inter' },
    { value: 'dmSans',       label: 'DM Sans' },
    { value: 'nunito',       label: 'Nunito' },
    { value: 'outfit',       label: 'Outfit' },
    { value: 'plusJakarta',  label: 'Plus Jakarta Sans' },
    { group: 'Serif / Reading' },
    { value: 'merriweather', label: 'Merriweather' },
    { value: 'lora',         label: 'Lora' },
    { value: 'sourceSerif',  label: 'Source Serif 4' },
    { group: 'Monospace' },
    { value: 'jetbrains',    label: 'JetBrains Mono' },
    { value: 'firaCode',     label: 'Fira Code' },
    { group: 'Accessibility' },
    { value: 'lexend',       label: 'Lexend' },
    { value: 'atkinson',     label: 'Atkinson Hyperlegible' },
    { value: 'opendyslexic', label: 'OpenDyslexic' },
  ];
  var fontFamilySelect = makeCustomSelect(
    document.getElementById('fontFamilySelect'),
    fontFamilyOpts,
    function () { chrome.storage.sync.set({ [CFG.STORAGE_KEYS.FONT_FAMILY]: fontFamilySelect.getValue() }); }
  );

  /* ---- Element References ---- */
  var fullWidthToggle = document.getElementById('fullWidthToggle');
  var preserveDisplayToggle = document.getElementById('preserveDisplayToggle');
  var autoDarkToggle = document.getElementById('autoDarkToggle');
  var scheduleTimesCard = document.getElementById('scheduleTimesCard');

  /* ---- Time Picker ---- */
  function parseHHMM(hhmm) {
    var parts = (hhmm || '00:00').split(':');
    var h24 = parseInt(parts[0], 10) || 0;
    var min = Math.floor((parseInt(parts[1], 10) || 0) / 5) * 5;
    return { hour: h24 % 12 || 12, minute: min, period: h24 >= 12 ? 'PM' : 'AM' };
  }

  function getHHMM(h, m, p) {
    var hour = parseInt(h.getValue(), 10);
    var min  = parseInt(m.getValue(), 10);
    var per  = p.getValue();
    if (per === 'AM') { hour = hour === 12 ? 0 : hour; }
    else              { hour = hour === 12 ? 12 : hour + 12; }
    return String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  }

  function setTimePicker(h, m, p, hhmm) {
    var t = parseHHMM(hhmm);
    h.setValue(String(t.hour));
    m.setValue(String(t.minute));
    p.setValue(t.period);
  }

  function makeCustomSelect(container, opts, onChange) {
    // Find first real option (skip group headers)
    var firstOpt = opts.find(function (o) { return o.value !== undefined; });
    var currentValue = firstOpt ? firstOpt.value : '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cs-btn';

    var lbl = document.createElement('span');
    lbl.className = 'cs-label';
    btn.appendChild(lbl);
    btn.insertAdjacentHTML('beforeend',
      '<svg class="cs-arrow" width="10" height="10" viewBox="0 0 10 10" fill="none">' +
      '<path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>');

    var dropdown = document.createElement('div');
    dropdown.className = 'cs-dropdown';

    opts.forEach(function (opt) {
      if (opt.group !== undefined) {
        // Group header
        var grp = document.createElement('div');
        grp.className = 'cs-group';
        grp.textContent = opt.group;
        dropdown.appendChild(grp);
        return;
      }
      var item = document.createElement('div');
      item.className = 'cs-item';
      item.dataset.value = opt.value;
      item.textContent = opt.label;
      item.addEventListener('mousedown', function (e) { e.preventDefault(); });
      item.addEventListener('click', function () {
        setValue(opt.value);
        close();
        if (onChange) onChange();
      });
      dropdown.appendChild(item);
    });

    container.appendChild(btn);
    container.appendChild(dropdown);

    function open() {
      document.querySelectorAll('.cs-dropdown.is-open').forEach(function (d) {
        d.classList.remove('is-open');
        if (d.previousElementSibling) d.previousElementSibling.classList.remove('is-open');
      });
      dropdown.classList.add('is-open');
      btn.classList.add('is-open');
      var sel = dropdown.querySelector('.cs-item.is-selected');
      if (sel) setTimeout(function () { sel.scrollIntoView({ block: 'nearest' }); }, 16);
    }

    function close() {
      dropdown.classList.remove('is-open');
      btn.classList.remove('is-open');
    }

    function setValue(v) {
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].value === v) {
          currentValue = v;
          lbl.textContent = opts[i].label;
          dropdown.querySelectorAll('.cs-item').forEach(function (item) {
            item.classList.toggle('is-selected', item.dataset.value === v);
          });
          return;
        }
      }
    }

    setValue(currentValue);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.contains('is-open') ? close() : open();
    });

    return { getValue: function () { return currentValue; }, setValue: setValue };
  }

  // Close all dropdowns on outside click or Escape key
  function closeAllDropdowns() {
    document.querySelectorAll('.cs-dropdown.is-open').forEach(function (d) {
      d.classList.remove('is-open');
      if (d.previousElementSibling) d.previousElementSibling.classList.remove('is-open');
    });
  }
  document.addEventListener('click', closeAllDropdowns);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllDropdowns();
  });

  var hourOpts = [], minuteOpts = [];
  for (var _h = 1; _h <= 12; _h++) hourOpts.push({ value: String(_h), label: String(_h) });
  for (var _m = 0; _m < 60; _m += 5) minuteOpts.push({ value: String(_m), label: _m < 10 ? '0' + _m : String(_m) });
  var periodOpts = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }];

  var darkStartHour   = makeCustomSelect(document.getElementById('darkStartHour'),   hourOpts,   function () { onStartTimeChange(); });
  var darkStartMinute = makeCustomSelect(document.getElementById('darkStartMinute'), minuteOpts, function () { onStartTimeChange(); });
  var darkStartPeriod = makeCustomSelect(document.getElementById('darkStartPeriod'), periodOpts, function () { onStartTimeChange(); });
  var darkEndHour     = makeCustomSelect(document.getElementById('darkEndHour'),     hourOpts,   function () { onEndTimeChange(); });
  var darkEndMinute   = makeCustomSelect(document.getElementById('darkEndMinute'),   minuteOpts, function () { onEndTimeChange(); });
  var darkEndPeriod   = makeCustomSelect(document.getElementById('darkEndPeriod'),   periodOpts, function () { onEndTimeChange(); });

  /* ---- Schedule UI Update ---- */
  function timeToMins(hhmm) {
    var p = (hhmm || '00:00').split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function formatDuration(mins) {
    if (mins <= 0) return '—';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h > 0 ? (h + 'h' + (m > 0 ? ' ' + m + 'm' : '')) : m + 'm';
  }

  function updateScheduleUI() {
    var startHHMM = getHHMM(darkStartHour, darkStartMinute, darkStartPeriod);
    var endHHMM   = getHHMM(darkEndHour, darkEndMinute, darkEndPeriod);
    var s = timeToMins(startHHMM);
    var e = timeToMins(endHHMM);
    var total = 24 * 60;

    // Duration
    var duration = e > s ? e - s : total - s + e;
    document.getElementById('scheduleDuration').textContent = 'Active for ' + formatDuration(duration);

    // Timeline positions (%)
    var sPct = (s / total) * 100;
    var ePct = (e / total) * 100;
    var fill = document.getElementById('timelineFill');
    var ms   = document.getElementById('timelineMarkerStart');
    var me   = document.getElementById('timelineMarkerEnd');

    ms.style.left = sPct + '%';
    me.style.left = ePct + '%';

    if (e > s) {
      // Same day range
      fill.style.left  = sPct + '%';
      fill.style.width = (ePct - sPct) + '%';
      fill.style.background = 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))';
    } else {
      // Overnight range — render as two filled segments via a multi-stop gradient
      fill.style.left  = '0%';
      fill.style.width = '100%';
      fill.style.background =
        'linear-gradient(90deg,' +
        ' var(--gradient-start) 0%, var(--gradient-end) ' + ePct + '%,' +
        ' var(--bg-tertiary) ' + ePct + '%, var(--bg-tertiary) ' + sPct + '%,' +
        ' var(--gradient-start) ' + sPct + '%, var(--gradient-end) 100%)';
    }
  }

  /* ---- Domain Management ---- */
  function extractHostname(input) {
    input = input.trim().toLowerCase();
    if (input.includes('/') || input.includes(':')) {
      try {
        var toParse = input.includes('://') ? input : 'https://' + input;
        return new URL(toParse).hostname;
      } catch (e) {}
    }
    return input;
  }

  function createDomainManager(storageKey, listEl, inputEl) {
    function render(domains) {
      listEl.innerHTML = '';
      domains.forEach(function (domain, index) {
        var li = document.createElement('li');
        li.textContent = domain;
        var removeBtn = document.createElement('button');
        removeBtn.className = 'domain-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', function () { remove(index); });
        li.appendChild(removeBtn);
        listEl.appendChild(li);
      });
    }

    function add() {
      var domain = extractHostname(inputEl.value);
      if (!domain) return;
      chrome.storage.sync.get([storageKey], function (result) {
        var domains = result[storageKey] || [];
        if (domains.includes(domain)) {
          showToast('Domain already exists', 'info');
          return;
        }
        domains.push(domain);
        chrome.storage.sync.set({ [storageKey]: domains }, function () {
          inputEl.value = '';
          render(domains);
          showToast('Domain added: ' + domain, 'success');
        });
      });
    }

    function remove(index) {
      chrome.storage.sync.get([storageKey], function (result) {
        var domains = result[storageKey] || [];
        var removed = domains[index];
        domains.splice(index, 1);
        chrome.storage.sync.set({ [storageKey]: domains }, function () {
          render(domains);
          showToast('Domain removed: ' + removed, 'info');
        });
      });
    }

    return { render: render, add: add, remove: remove };
  }

  var customDomains = createDomainManager(
    CFG.STORAGE_KEYS.CUSTOM_DOMAINS,
    document.getElementById('optDomainList'),
    document.getElementById('optDomainInput')
  );
  var excludedDomains = createDomainManager(
    CFG.STORAGE_KEYS.EXCLUDED_DOMAINS,
    document.getElementById('optExcludedDomainList'),
    document.getElementById('optExcludedDomainInput')
  );

  document.getElementById('optAddDomainBtn').addEventListener('click', customDomains.add);
  document.getElementById('optDomainInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') customDomains.add();
  });
  document.getElementById('optAddExcludedDomainBtn').addEventListener('click', excludedDomains.add);
  document.getElementById('optExcludedDomainInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') excludedDomains.add();
  });

  /* ---- Load All Settings ---- */
  chrome.storage.sync.get(CFG.allReadKeys(), function (result) {
    /* Display */
    var fontSize = result[CFG.STORAGE_KEYS.FONT_SIZE] !== undefined ? result[CFG.STORAGE_KEYS.FONT_SIZE] : 100;
    fontSizeSlider.value = fontSize;
    fontSizeValue.textContent = fontSize + '%';
    fontFamilySelect.setValue(result[CFG.STORAGE_KEYS.FONT_FAMILY] || 'default');
    fullWidthToggle.checked = result[CFG.STORAGE_KEYS.FULL_WIDTH] === true;
    preserveDisplayToggle.checked = result[CFG.STORAGE_KEYS.PRESERVE_DISPLAY] === true;

    /* Schedule */
    autoDarkToggle.checked = result[CFG.STORAGE_KEYS.AUTO_DARK_MODE] === true;
    setTimePicker(darkStartHour, darkStartMinute, darkStartPeriod, result[CFG.STORAGE_KEYS.DARK_START_TIME] || '18:00');
    setTimePicker(darkEndHour, darkEndMinute, darkEndPeriod, result[CFG.STORAGE_KEYS.DARK_END_TIME] || '06:00');
    if (autoDarkToggle.checked) scheduleTimesCard.classList.add('is-active');
    updateScheduleUI();

    /* Domains */
    customDomains.render(result[CFG.STORAGE_KEYS.CUSTOM_DOMAINS] || []);
    excludedDomains.render(result[CFG.STORAGE_KEYS.EXCLUDED_DOMAINS] || []);
  });

  /* ---- Event Listeners ---- */

  /* Font Size */
  var fontSizeTimeout;
  fontSizeSlider.addEventListener('input', function () {
    fontSizeValue.textContent = fontSizeSlider.value + '%';
    clearTimeout(fontSizeTimeout);
    fontSizeTimeout = setTimeout(function () {
      chrome.storage.sync.set({ [CFG.STORAGE_KEYS.FONT_SIZE]: Number(fontSizeSlider.value) });
    }, 150);
  });

  /* Full Width */
  fullWidthToggle.addEventListener('change', function () {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.FULL_WIDTH]: fullWidthToggle.checked });
  });

  /* Preserve Display */
  preserveDisplayToggle.addEventListener('change', function () {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.PRESERVE_DISPLAY]: preserveDisplayToggle.checked });
  });

  /* Auto Dark Mode */
  autoDarkToggle.addEventListener('change', function () {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.AUTO_DARK_MODE]: autoDarkToggle.checked });
    if (autoDarkToggle.checked) {
      scheduleTimesCard.classList.add('is-active');
      updateScheduleUI();
    } else {
      scheduleTimesCard.classList.remove('is-active');
    }
  });

  function onStartTimeChange() {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DARK_START_TIME]: getHHMM(darkStartHour, darkStartMinute, darkStartPeriod) });
    updateScheduleUI();
  }

  function onEndTimeChange() {
    chrome.storage.sync.set({ [CFG.STORAGE_KEYS.DARK_END_TIME]: getHHMM(darkEndHour, darkEndMinute, darkEndPeriod) });
    updateScheduleUI();
  }

  /* ---- Reset Modal ---- */
  var resetModal = document.getElementById('resetModal');
  var resetCancel = document.getElementById('resetCancel');
  var resetConfirm = document.getElementById('resetConfirm');

  function showModal() {
    resetModal.classList.add('is-visible');
  }

  function hideModal() {
    resetModal.classList.remove('is-visible');
  }

  document.getElementById('optResetButton').addEventListener('click', showModal);

  resetCancel.addEventListener('click', hideModal);

  // Close modal on overlay click (outside card)
  resetModal.addEventListener('click', function (e) {
    if (e.target === resetModal) hideModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && resetModal.classList.contains('is-visible')) {
      hideModal();
    }
  });

  resetConfirm.addEventListener('click', function () {
    chrome.storage.sync.set({ ...CFG.DEFAULTS }, function () {
      /* Refresh UI */
      fontSizeSlider.value = CFG.DEFAULTS.fontSize;
      fontSizeValue.textContent = CFG.DEFAULTS.fontSize + '%';
      fontFamilySelect.setValue(CFG.DEFAULTS.fontFamily);
      fullWidthToggle.checked = CFG.DEFAULTS.fullWidthEnabled;
      preserveDisplayToggle.checked = CFG.DEFAULTS.preserveDisplay;
      autoDarkToggle.checked = CFG.DEFAULTS.autoDarkModeEnabled;
      setTimePicker(darkStartHour, darkStartMinute, darkStartPeriod, CFG.DEFAULTS.darkStartTime);
      setTimePicker(darkEndHour, darkEndMinute, darkEndPeriod, CFG.DEFAULTS.darkEndTime);
      scheduleTimesCard.classList.remove('is-active');
      updateScheduleUI();
      customDomains.render(CFG.DEFAULTS.customDomains);
      excludedDomains.render(CFG.DEFAULTS.excludedDomains);

      hideModal();
      showToast('All settings restored to defaults', 'success');
    });
  });
});
