(function () {
  'use strict';
  function getTop() {
    try { var w = window; for (var i = 0; i < 6 && w.parent && w.parent !== w; i++) { try { void w.parent.document; w = w.parent; } catch (e) { break; } } return w; } catch (e) { return window; }
  }
  var TOP = getTop();
  var DOC = TOP.document;
  var YCDK_VER = '1.0.2';
  var YCDK_NAME = '\u828b\u5706\u6536\u7eb3';

  function teardown(b) {
    if (!b) return;
    (b.observers || []).forEach(function (o) { try { o.disconnect(); } catch (e) {} });
    (b.intervals || []).forEach(function (id) { try { clearInterval(id); } catch (e) {} });
    (b.listeners || []).forEach(function (l) { try { l.t.removeEventListener(l.type, l.fn, l.opt); } catch (e) {} });
    b.observers = []; b.intervals = []; b.listeners = [];
  }
  try {
    if (TOP.__ycDock) {
      var oldR = TOP.__ycDock;
      teardown(oldR.dock); teardown(oldR.settings);
      try { oldR.dock && oldR.dock.handle && oldR.dock.handle.remove(); } catch (e) {}
      try { oldR.dock && oldR.dock.drawer && oldR.dock.drawer.remove(); } catch (e) {}
      try { oldR.settings && oldR.settings.el && oldR.settings.el.remove(); } catch (e) {}
      try { var _omi = DOC.getElementById('yc-dock-menu-item'); if (_omi) _omi.remove(); } catch (e) {}
    }
  } catch (e) {}
  var ROOT = { dock: null, settings: null };
  TOP.__ycDock = ROOT;

  function mkBucket() { return { observers: [], intervals: [], listeners: [] }; }
  function on(b, t, type, fn, opt) { try { t.addEventListener(type, fn, opt); b.listeners.push({ t: t, type: type, fn: fn, opt: opt }); } catch (e) {} }
  function every(b, ms, fn) { var id = setInterval(fn, ms); b.intervals.push(id); return id; }
  function H() { return ROOT.dock && ROOT.dock.handle; }
  function DR() { return ROOT.dock && ROOT.dock.drawer; }

  var CFG_KEY = 'yc_dock_cfg';
  function loadCfg() { try { var c = JSON.parse(TOP.localStorage.getItem(CFG_KEY) || '{}') || {}; return { enabled: c.enabled !== false, hideHandle: !!c.hideHandle }; } catch (e) { return { enabled: true, hideHandle: false }; } }
  function saveCfg() { try { TOP.localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }
  var cfg = loadCfg();

  var LS_KEY = 'yc_dock_v1';
  function loadState() { try { return JSON.parse(TOP.localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveState() { try { TOP.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  var state = loadState();
  state.docked = state.docked || {};
  state.open = !!state.open;
  var balls = {};
  ROOT.balls = balls;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cssId(id) { try { return (TOP.CSS && CSS.escape) ? CSS.escape(id) : String(id).replace(/[^\w-]/g, '\\$&'); } catch (e) { return id; } }
  function isImg(s) { return /^(data:|https?:|\/\/|blob:)/.test(String(s || '')); }
  function vw() { return TOP.innerWidth || 360; }
  function vh() { return TOP.innerHeight || 640; }
  function isOurs(el) { var h = H(), dr = DR(); return el === h || el === dr || (h && h.contains(el)) || (dr && dr.contains(el)); }

  function guessIcon(el) {
    try {
      if (el.tagName === 'IMG' && el.src) return el.src;
      var im = el.querySelector && el.querySelector('img'); if (im && im.src) return im.src;
      var bg = TOP.getComputedStyle(el).backgroundImage || ''; var m = bg.match(/url\(["']?(.*?)["']?\)/); if (m && m[1]) return m[1];
      var t = (el.textContent || '').trim(); if (t && t.length <= 2) return t;
    } catch (e) {}
    return '';
  }
  function foreignKey(el) { var cls = ''; try { cls = (el.className && el.className.toString) ? el.className.toString().slice(0, 30) : ''; } catch (e) {} return 'foreign:' + (el.id || '') + '|' + cls; }

  // 拖动收纳用（宽松）：按住的那一点往上找到一个"定位着的小方块"——fixed/absolute/sticky 都认，图片球/图标球也认
  function grabbable(el) {
    try {
      if (!el || el.nodeType !== 1) return false;
      if (isOurs(el)) return false;
      var cs = TOP.getComputedStyle(el);
      if (!cs) return false;
      var pos = cs.position;
      if (pos !== 'fixed' && pos !== 'absolute' && pos !== 'sticky') return false;
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      var r = el.getBoundingClientRect();
      if (r.width < 14 || r.height < 14 || r.width > 260 || r.height > 260) return false;
      return true;
    } catch (e) { return false; }
  }
  // 一键扫描用（略严）：fixed，或 body/html 直属的 absolute
  function looksLikeBall(el) {
    try {
      if (!el || el.nodeType !== 1) return false;
      if (isOurs(el)) return false;
      for (var k in balls) { if (balls[k].el === el) return false; }
      var cs = TOP.getComputedStyle(el);
      if (!cs) return false;
      var pos = cs.position;
      var topLevel = el.parentNode === DOC.body || el.parentNode === DOC.documentElement;
      if (pos !== 'fixed' && !(pos === 'absolute' && topLevel)) return false;
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') < 0.2) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 18 || r.width > 160 || r.height < 18 || r.height > 160) return false;
      var lo = Math.min(r.width, r.height), hi = Math.max(r.width, r.height);
      if (hi > lo * 2.5) return false;
      var nearEdge = (r.left < 200 || r.right > vw() - 200 || r.top < 150 || r.bottom > vh() - 150);
      if (!nearEdge) return false;
      return true;
    } catch (e) { return false; }
  }
  function scanForeign() {
    var out = [], seen = new Set(), nodes;
    try { nodes = DOC.querySelectorAll('html > *, body > *, body > * > *, body > * > * > *'); } catch (e) { nodes = []; }
    Array.prototype.forEach.call(nodes, function (el) {
      if (seen.has(el)) return; seen.add(el);
      if (!looksLikeBall(el)) return;
      var anc = el.parentNode, dup = false;
      while (anc && anc.nodeType === 1) { if (out.indexOf(anc) >= 0) { dup = true; break; } anc = anc.parentNode; }
      if (!dup) out.push(el);
    });
    return out;
  }

  function registerNative(info) {
    if (!info || !info.id) return;
    var el = info.el || DOC.getElementById(info.id) || null;
    var b = balls[info.id] || {};
    b.id = info.id; b.type = 'native';
    b.name = info.name || b.name || info.id;
    b.icon = info.icon || b.icon || (el ? guessIcon(el) : '');
    b.el = el || b.el || null;
    balls[info.id] = b;
    if (state.docked[b.id]) setDock(b, true, true);
    scheduleRender();
  }

  function setDock(b, docked, silent) {
    if (!b) return;
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null) || DOC.getElementById(b.id);
    b.el = el || b.el;
    if (b.type === 'native') {
      if (el) {
        if (docked) {
          if (typeof b.prevDisplay !== 'string') b.prevDisplay = el.style.getPropertyValue('display') || '';
          el.setAttribute('data-ycdock', 'docked');
          try { el.dispatchEvent(new CustomEvent('ycdock:cmd', { bubbles: false, detail: { action: 'dock' } })); } catch (e) {}
          el.style.setProperty('display', 'none', 'important');
        } else {
          el.removeAttribute('data-ycdock');
          el.style.removeProperty('display');
          if (b.prevDisplay) el.style.display = b.prevDisplay;
          b.prevDisplay = undefined;
          try { el.dispatchEvent(new CustomEvent('ycdock:cmd', { bubbles: false, detail: { action: 'free' } })); } catch (e) {}
        }
      }
    } else { if (docked) forceHide(b); else forceShow(b); }
    if (docked) state.docked[b.id] = { foreign: b.type === 'foreign', selector: b.selector || '' };
    else delete state.docked[b.id];
    if (!silent) { saveState(); scheduleRender(); }
  }

  function forceHide(b) {
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null);
    if (!el) return; b.el = el;
    if (!b.force) b.force = {};
    el.style.setProperty('display', 'none', 'important');
    if (!b.force.observer) {
      var mo = new MutationObserver(function () { if (!state.docked[b.id]) return; try { if (el.style.display !== 'none') el.style.setProperty('display', 'none', 'important'); } catch (e) {} });
      try { mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {}
      b.force.observer = mo; if (ROOT.dock) ROOT.dock.observers.push(mo);
    }
    if (!b.force.timer && ROOT.dock) {
      b.force.timer = every(ROOT.dock, 2500, function () {
        if (!state.docked[b.id]) return;
        var cur = b.selector ? DOC.querySelector(b.selector) : b.el;
        if (cur && cur !== b.el) { b.el = cur; if (b.force.observer) { try { b.force.observer.disconnect(); b.force.observer.observe(cur, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {} } }
        if (cur && cur.style.display !== 'none') cur.style.setProperty('display', 'none', 'important');
      });
    }
  }
  function forceShow(b) {
    if (b.force) { try { b.force.observer && b.force.observer.disconnect(); } catch (e) {} try { b.force.timer && clearInterval(b.force.timer); } catch (e) {} b.force = null; }
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null);
    if (el && el.style.display === 'none') el.style.removeProperty('display');
  }

  function findBallElement(t) {
    if (!t || t.nodeType !== 1) return null;
    if (isOurs(t)) return null;
    var el = t, depth = 0;
    while (el && el.nodeType === 1 && depth < 12) {
      for (var k in balls) { if (balls[k].el === el) return el; }
      if (grabbable(el)) return el;
      el = el.parentNode; depth++;
    }
    return null;
  }
  function collectElement(el, silent) {
    for (var k in balls) { if (balls[k].el === el && balls[k].type === 'native') { setDock(balls[k], true, silent); return; } }
    var key = foreignKey(el);
    var b = balls[key] || { id: key, type: 'foreign', el: el, selector: el.id ? '#' + cssId(el.id) : '', name: (el.id || el.getAttribute('title') || '\u5176\u4ed6\u60ac\u6d6e\u7403'), icon: guessIcon(el) };
    b.el = el; balls[key] = b;
    setDock(b, true, silent);
  }
  function collectAll() {
    for (var k in balls) { var b = balls[k]; if (b.type === 'native' && !state.docked[b.id]) setDock(b, true, true); }
    scanForeign().forEach(function (el) { collectElement(el, true); });
    saveState(); render();
  }
  function runByBall(b) {
    if (!b) return;
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null) || DOC.getElementById(b.id);
    if (!el) return;
    try {
      var mk = function (type) { return new MouseEvent(type, { bubbles: true, cancelable: true, view: TOP }); };
      el.dispatchEvent(mk('mousedown')); el.dispatchEvent(mk('mouseup')); el.dispatchEvent(mk('click'));
    } catch (e) { try { el.click(); } catch (er) {} }
  }

  function chipHTML(b) {
    var icon = b.icon ? (isImg(b.icon) ? '<img src="' + esc(b.icon) + '" alt="">' : '<span class="ycdk-emoji">' + esc(b.icon) + '</span>') : '<span class="ycdk-letter">' + esc((b.name || '?').slice(0, 1)) + '</span>';
    var warn = b.type === 'foreign' ? ' <span class="ycdk-warn" title="\u522b\u4eba\u7684\u7403\uff0c\u6536\u8d77\u53ef\u80fd\u95ea">\u26a0</span>' : '';
    return '<div class="ycdk-chip">' +
      '<button class="ycdk-run" data-run="' + esc(b.id) + '"><span class="ycdk-ic">' + icon + '</span><span class="ycdk-nm">' + esc(b.name) + warn + '</span></button>' +
      '<button class="ycdk-out" data-out="' + esc(b.id) + '" title="\u653e\u56de\u5c4f\u5e55">\u653e\u51fa</button></div>';
  }
  var _rt = null;
  function scheduleRender() { clearTimeout(_rt); _rt = setTimeout(render, 60); }
  function render() {
    var dr = DR(); if (!dr || !state.open) return;
    var list = dr.querySelector('[data-list="docked"]'); if (!list) return;
    var html = '';
    for (var id in balls) { var b = balls[id]; if (state.docked[b.id]) html += chipHTML(b); }
    list.innerHTML = html || '<div class="ycdk-empty">\u8fd8\u6ca1\u6536\u8d77\u4efb\u4f55\u7403</div>';
  }
  function flash(el) { if (!el) return; el.classList.add('ycdk-flash'); setTimeout(function () { try { el.classList.remove('ycdk-flash'); } catch (e) {} }, 260); }
  function toggleDrawer(force) { state.open = (typeof force === 'boolean') ? force : !state.open; saveState(); applyOpen(); if (state.open) scheduleRender(); }
  function applyOpen() { var h = H(), dr = DR(); if (!h || !dr) return; dr.classList.toggle('open', !!state.open); h.classList.toggle('open', !!state.open); }
  function applyHideHandle() { var h = H(); if (h) h.style.setProperty('display', cfg.hideHandle ? 'none' : 'flex', 'important'); }

  function buildDock() {
    if (ROOT.dock) return;
    var D = ROOT.dock = mkBucket();
    var h = DOC.createElement('div'); h.id = 'yc-dock-handle'; h.title = '\u60ac\u6d6e\u7403\u6536\u7eb3'; h.innerHTML = '<span class="ycdk-grip"></span>';
    var d = DOC.createElement('div'); d.id = 'yc-dock-drawer';
    d.innerHTML =
      '<div class="ycdk-hd"><span>\u60ac\u6d6e\u7403\u6536\u7eb3</span><button class="ycdk-x" data-x>\u00d7</button></div>' +
      '<div class="ycdk-body"><div class="ycdk-list" data-list="docked"></div></div>' +
      '<button class="ycdk-all" data-all>\u4e00\u952e\u6536\u8d77\u5168\u90e8</button>';
    DOC.documentElement.appendChild(h); DOC.documentElement.appendChild(d);
    D.handle = h; D.drawer = d;
    if (typeof state.handleTop === 'number') h.style.top = state.handleTop + '%';
    applyHideHandle();

    var hp = { down: false, moved: false, startY: 0, startTop: 42 };
    on(D, h, 'pointerdown', function (e) { hp.down = true; hp.moved = false; hp.startY = e.clientY; hp.startTop = (typeof state.handleTop === 'number') ? state.handleTop : 42; try { h.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); });
    on(D, h, 'pointermove', function (e) { if (!hp.down) return; var dy = e.clientY - hp.startY; if (Math.abs(dy) > 6) hp.moved = true; if (hp.moved) { var pct = hp.startTop + dy / vh() * 100; pct = Math.max(6, Math.min(88, pct)); h.style.top = pct + '%'; state.handleTop = pct; } });
    on(D, h, 'pointerup', function () { if (!hp.down) return; hp.down = false; if (hp.moved) saveState(); else toggleDrawer(); });
    on(D, h, 'pointercancel', function () { hp.down = false; });

    on(D, d, 'click', function (e) {
      var t = e.target;
      if (t.closest('[data-x]')) { toggleDrawer(false); return; }
      if (t.closest('[data-all]')) { collectAll(); flash(t.closest('[data-all]')); return; }
      var out = t.closest('[data-out]'); if (out) { var bo = balls[out.getAttribute('data-out')]; if (bo) setDock(bo, false); return; }
      var run = t.closest('[data-run]'); if (run) { var br = balls[run.getAttribute('data-run')]; if (br) runByBall(br); return; }
    });

    // 拖球到把手上＝收起。按下只记目标（零开销），松手落在把手上才去判断是不是球——不拖慢日常点击
    var db = { target: null, active: false };
    on(D, DOC, 'pointerdown', function (e) { db.target = e.target; db.active = true; }, true);
    on(D, DOC, 'pointerup', function (e) {
      if (!db.active) return; db.active = false;
      var tgt = db.target; db.target = null;
      if (!tgt) return;
      try {
        var r = h.getBoundingClientRect(); if (!(r.width > 0)) return;
        var pad = 30;
        if (!(e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad)) return;
        var ball = findBallElement(tgt); if (ball) { collectElement(ball); flash(h); }
      } catch (er) {}
    }, true);
    on(D, DOC, 'pointercancel', function () { db.active = false; db.target = null; }, true);

    on(D, TOP, 'ycdock:hello', function (e) { registerNative(e.detail || {}); });
    TOP.__ycDockPresent = true;
    present();
    [120, 400, 1200, 3000].forEach(function (ms) { setTimeout(function () { if (ROOT.dock === D) present(); }, ms); });
    every(D, 8000, present);
    var moT = null;
    var mo = new MutationObserver(function () { clearTimeout(moT); moT = setTimeout(present, 600); });
    try { mo.observe(DOC.documentElement, { childList: true, subtree: false }); } catch (e) {}
    try { if (DOC.body) mo.observe(DOC.body, { childList: true, subtree: false }); } catch (e) {}
    D.observers.push(mo);

    [600, 1800].forEach(function (ms) { setTimeout(function () { if (ROOT.dock === D) reapplyForeign(); }, ms); });
    if (state.open) scheduleRender();
    applyOpen();
  }
  function present() { try { TOP.dispatchEvent(new CustomEvent('ycdock:present')); } catch (e) {} }
  function reapplyForeign() {
    for (var id in state.docked) {
      var meta = state.docked[id]; if (!meta || !meta.foreign) continue;
      var el = meta.selector ? DOC.querySelector(meta.selector) : null; if (!el) continue;
      var b = balls[id] || { id: id, type: 'foreign', el: el, selector: meta.selector, name: (el.id || '\u5176\u4ed6\u60ac\u6d6e\u7403'), icon: guessIcon(el) };
      b.el = el; balls[id] = b; forceHide(b);
    }
  }
  function destroyDock() {
    if (!ROOT.dock) return;
    try {
      Object.keys(state.docked).slice().forEach(function (id) {
        var b = balls[id];
        if (b) setDock(b, false, true);
        else { var m = state.docked[id]; if (m && m.selector) { var el = DOC.querySelector(m.selector); if (el && el.style.display === 'none') el.style.removeProperty('display'); } delete state.docked[id]; }
      });
      saveState();
    } catch (e) {}
    try { ROOT.dock.handle && ROOT.dock.handle.remove(); } catch (e) {}
    try { ROOT.dock.drawer && ROOT.dock.drawer.remove(); } catch (e) {}
    teardown(ROOT.dock); ROOT.dock = null;
    TOP.__ycDockPresent = false;
  }

  function openDrawerToggle() { if (!cfg.enabled) return; if (!ROOT.dock) { buildDock(); toggleDrawer(true); return; } toggleDrawer(); }
  TOP.__ycDockToggle = openDrawerToggle;
  function registerOpeners() {
    try {
      var ctx = (TOP.SillyTavern && TOP.SillyTavern.getContext) ? TOP.SillyTavern.getContext() : null;
      var cb = function () { try { TOP.__ycDockToggle && TOP.__ycDockToggle(); } catch (e) {} return ''; };
      var help = '\u6253\u5f00/\u6536\u8d77 \u828b\u5706\u6536\u7eb3\u62bd\u5c49';
      if (ctx && ctx.SlashCommandParser && ctx.SlashCommand && ctx.SlashCommand.fromProps) {
        ctx.SlashCommandParser.addCommandObject(ctx.SlashCommand.fromProps({ name: 'dock', callback: cb, helpString: help }));
      } else if (ctx && typeof ctx.registerSlashCommand === 'function') {
        ctx.registerSlashCommand('dock', cb, [], help, true, true);
      } else if (typeof TOP.registerSlashCommand === 'function') {
        TOP.registerSlashCommand('dock', cb, [], help, true, true);
      }
    } catch (e) {}
    var tries = 0;
    (function tryMenu() {
      try {
        var menu = DOC.getElementById('extensionsMenu');
        if (!menu) { if (tries++ < 25) setTimeout(tryMenu, 800); return; }
        if (DOC.getElementById('yc-dock-menu-item')) return;
        var item = DOC.createElement('div');
        item.id = 'yc-dock-menu-item';
        item.className = 'list-group-item flex-container flexGap5 interactable';
        item.tabIndex = 0;
        item.innerHTML = '<div class="fa-solid fa-inbox" style="width:1em;text-align:center;"></div><span>' + YCDK_NAME + '</span>';
        item.addEventListener('click', function () { try { TOP.__ycDockToggle && TOP.__ycDockToggle(); } catch (e) {} });
        menu.appendChild(item);
      } catch (e) {}
    })();
  }

  // ================= 更新：用 ST 自己的接口自动检测 + 一键更新 =================
  var selfInfo = null;
  function locateSelf(cb) {
    if (selfInfo) return cb(selfInfo);
    try {
      var links = DOC.querySelectorAll('link[rel="stylesheet"]');
      var cands = [];
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href') || '';
        var m = href.match(/^(.*\/([^\/]+))\/style\.css(?:\?.*)?$/);
        if (m && /extensions/.test(href)) cands.push({ dir: m[1], name: m[2] });
      }
      cands.sort(function (a, b) { var s = function (c) { return /yuyuan|dock|shouna|\u828b\u5706/i.test(c.name) ? 0 : 1; }; return s(a) - s(b); });
      var idx = 0;
      (function next() {
        if (idx >= cands.length) return cb(null);
        var c = cands[idx++];
        TOP.fetch(c.dir + '/manifest.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (mf) {
          if (mf && mf.display_name === YCDK_NAME) { selfInfo = { dir: c.dir, name: c.name, manifest: mf, global: false }; cb(selfInfo); } else next();
        }).catch(next);
      })();
    } catch (e) { cb(null); }
  }
  function csrf(cb) { try { TOP.fetch('/csrf-token').then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) { cb((d && d.token) || ''); }).catch(function () { cb(''); }); } catch (e) { cb(''); } }
  function apiPost(path, body, cb) {
    csrf(function (tok) {
      var h = { 'Content-Type': 'application/json' }; if (tok) h['X-CSRF-Token'] = tok;
      try {
        TOP.fetch(path, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) {
          return r.json().then(function (j) { return { ok: r.ok, data: j }; }).catch(function () { return { ok: r.ok, data: null }; });
        }).then(cb).catch(function () { cb({ ok: false }); });
      } catch (e) { cb({ ok: false }); }
    });
  }
  function checkUpdate(ui) {
    ui.set('\u68c0\u67e5\u4e2d\u2026', null);
    locateSelf(function (info) {
      if (!info) { ui.set('\u68c0\u67e5\u5931\u8d25', 'recheck'); return; }
      var ask = function (g, done) { apiPost('/api/extensions/version', { extensionName: info.name, global: g }, function (res) { done((res.ok && res.data && typeof res.data === 'object') ? res.data : null, g); }); };
      ask(false, function (d, g) {
        if (d) return finish(d, g);
        ask(true, finish);
      });
      function finish(d, g) {
        if (!d) { ui.set('\u68c0\u67e5\u5931\u8d25', 'recheck'); return; }
        info.global = g;
        if (d.isUpToDate === false) ui.set('\u53d1\u73b0\u65b0\u7248', 'update'); else ui.set('\u5df2\u662f\u6700\u65b0', 'recheck');
      }
    });
  }
  function doUpdate(ui) {
    ui.set('\u66f4\u65b0\u4e2d\u2026', null);
    locateSelf(function (info) {
      if (!info) { ui.set('\u66f4\u65b0\u5931\u8d25', 'update'); return; }
      apiPost('/api/extensions/update', { extensionName: info.name, global: !!info.global }, function (res) {
        if (res.ok) ui.set('\u5df2\u66f4\u65b0\uff0c\u5237\u65b0\u9875\u9762\u751f\u6548', 'reload'); else ui.set('\u66f4\u65b0\u5931\u8d25', 'update');
      });
    });
  }

  // ================= 扩展设置面板 =================
  function injectSettings() {
    var S = ROOT.settings = mkBucket();
    var tries = 0;
    (function tryInject() {
      if (ROOT.settings !== S) return;
      var host = DOC.getElementById('extensions_settings2') || DOC.getElementById('extensions_settings');
      if (!host) { if (tries++ < 25) setTimeout(tryInject, 800); return; }
      if (DOC.getElementById('yc-dock-settings')) return;
      var box = DOC.createElement('div'); box.id = 'yc-dock-settings';
      box.innerHTML =
        '<div class="inline-drawer wide100p">' +
        '<div class="inline-drawer-toggle inline-drawer-header"><b>' + YCDK_NAME + '</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>' +
        '<div class="inline-drawer-content">' +
        '<label class="checkbox_label" for="ycdk-enabled"><input id="ycdk-enabled" type="checkbox"><span>\u542f\u7528\u828b\u5706\u6536\u7eb3</span></label>' +
        '<label class="checkbox_label" for="ycdk-hidehandle"><input id="ycdk-hidehandle" type="checkbox"><span>\u9690\u85cf\u8fb9\u680f</span></label>' +
        '<div class="ycdk-set-note">\u9690\u85cf\u8fb9\u680f\u540e\uff0c\u53ef\u901a\u8fc7\u9b54\u6cd5\u68d2\u70b9\u51fb\u300c\u828b\u5706\u6536\u7eb3\u300d\u663e\u793a\u51fa\u6536\u7eb3\u680f</div>' +
        '<div class="ycdk-set-ver">\u5f53\u524d\u7248\u672c v' + YCDK_VER + ' \u00b7 <span class="ycdk-upd-state">\u2026</span> <button class="ycdk-upd-btn menu_button" type="button" style="display:none"></button></div>' +
        '</div></div>';
      host.appendChild(box); S.el = box;
      var en = box.querySelector('#ycdk-enabled'), hh = box.querySelector('#ycdk-hidehandle');
      en.checked = cfg.enabled; hh.checked = cfg.hideHandle;
      on(S, en, 'change', function () { cfg.enabled = en.checked; saveCfg(); if (cfg.enabled) buildDock(); else destroyDock(); });
      on(S, hh, 'change', function () { cfg.hideHandle = hh.checked; saveCfg(); applyHideHandle(); });

      var stEl = box.querySelector('.ycdk-upd-state'), btn = box.querySelector('.ycdk-upd-btn'), mode = null;
      var ui = { set: function (text, m) {
        stEl.textContent = text; mode = m;
        if (m === 'update') { btn.textContent = '\u66f4\u65b0'; btn.style.display = ''; }
        else if (m === 'reload') { btn.textContent = '\u5237\u65b0\u9875\u9762'; btn.style.display = ''; }
        else if (m === 'recheck') { btn.textContent = '\u91cd\u65b0\u68c0\u67e5'; btn.style.display = ''; }
        else btn.style.display = 'none';
      } };
      on(S, btn, 'click', function () {
        if (mode === 'update') doUpdate(ui);
        else if (mode === 'reload') { try { TOP.location.reload(); } catch (e) {} }
        else if (mode === 'recheck') checkUpdate(ui);
      });
      setTimeout(function () { if (ROOT.settings === S) checkUpdate(ui); }, 1500); // 打开就自动检测
    })();
  }

  function boot() { injectSettings(); registerOpeners(); if (cfg.enabled) buildDock(); }
  if (DOC.readyState === 'loading') DOC.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
