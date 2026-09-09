(function () {
  'use strict';
  function getTop() {
    try { var w = window; for (var i = 0; i < 6 && w.parent && w.parent !== w; i++) { try { void w.parent.document; w = w.parent; } catch (e) { break; } } return w; } catch (e) { return window; }
  }
  var TOP = getTop();
  var DOC = TOP.document;

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

  // ---- 配置（启用 / 隐藏把手）----
  var CFG_KEY = 'yc_dock_cfg';
  function loadCfg() { try { var c = JSON.parse(TOP.localStorage.getItem(CFG_KEY) || '{}') || {}; return { enabled: c.enabled !== false, hideHandle: !!c.hideHandle }; } catch (e) { return { enabled: true, hideHandle: false }; } }
  function saveCfg() { try { TOP.localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }
  var cfg = loadCfg();

  // ---- 收纳状态 ----
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
  function looksLikeBall(el) {
    try {
      if (!el || el.nodeType !== 1) return false;
      var h = H(), dr = DR();
      if (el === h || el === dr) return false;
      if (h && h.contains(el)) return false;
      if (dr && dr.contains(el)) return false;
      for (var k in balls) { if (balls[k].el === el) return false; }
      var cs = TOP.getComputedStyle(el);
      if (!cs || cs.position !== 'fixed') return false;
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') < 0.2) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 20 || r.width > 110 || r.height < 20 || r.height > 110) return false;
      if (Math.abs(r.width - r.height) > Math.max(r.width, r.height) * 0.7) return false;
      var nearEdge = (r.left < 150 || r.right > vw() - 150 || r.top < 150 || r.bottom > vh() - 150);
      if (!nearEdge) return false;
      var z = parseInt(cs.zIndex, 10); if (isNaN(z)) z = 0;
      if (z < 5) return false;
      return true;
    } catch (e) { return false; }
  }
  function scanForeign() {
    var pool = [], seen = new Set(), out = [];
    try { Array.prototype.push.apply(pool, DOC.documentElement.children); } catch (e) {}
    try { if (DOC.body) Array.prototype.push.apply(pool, DOC.body.children); } catch (e) {}
    var deeper = []; pool.forEach(function (el) { try { Array.prototype.push.apply(deeper, el.children); } catch (e) {} });
    Array.prototype.push.apply(pool, deeper);
    pool.forEach(function (el) { if (seen.has(el)) return; seen.add(el); if (looksLikeBall(el)) out.push(el); });
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
      var mo = new MutationObserver(function () { if (!state.docked[b.id]) return; try { var cs = TOP.getComputedStyle(el); if (cs && cs.display !== 'none') el.style.setProperty('display', 'none', 'important'); } catch (e) {} });
      try { mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {}
      b.force.observer = mo; if (ROOT.dock) ROOT.dock.observers.push(mo);
    }
    if (!b.force.timer && ROOT.dock) {
      b.force.timer = every(ROOT.dock, 1200, function () {
        if (!state.docked[b.id]) return;
        var cur = b.selector ? DOC.querySelector(b.selector) : b.el;
        if (cur && cur !== b.el) { b.el = cur; if (b.force.observer) { try { b.force.observer.disconnect(); b.force.observer.observe(cur, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {} } }
        if (cur) { try { var cs = TOP.getComputedStyle(cur); if (cs && cs.display !== 'none') cur.style.setProperty('display', 'none', 'important'); } catch (e) {} }
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
    var h = H(), dr = DR();
    if (h && (t === h || h.contains(t))) return null;
    if (dr && (t === dr || dr.contains(t))) return null;
    var el = t, depth = 0;
    while (el && el.nodeType === 1 && depth < 8) {
      for (var k in balls) { if (balls[k].el === el) return el; }
      if (looksLikeBall(el)) return el;
      el = el.parentNode; depth++;
    }
    return null;
  }
  function collectElement(el, silent) {
    for (var k in balls) { if (balls[k].el === el && balls[k].type === 'native') { setDock(balls[k], true, silent); return; } }
    var key = foreignKey(el);
    var b = balls[key] || { id: key, type: 'foreign', el: el, selector: el.id ? '#' + cssId(el.id) : '', name: (el.id || el.getAttribute('title') || '其他悬浮球'), icon: guessIcon(el) };
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
    var warn = b.type === 'foreign' ? ' <span class="ycdk-warn" title="别人的球，收起可能闪">⚠</span>' : '';
    return '<div class="ycdk-chip">' +
      '<button class="ycdk-run" data-run="' + esc(b.id) + '"><span class="ycdk-ic">' + icon + '</span><span class="ycdk-nm">' + esc(b.name) + warn + '</span></button>' +
      '<button class="ycdk-out" data-out="' + esc(b.id) + '" title="放回屏幕">放出</button></div>';
  }
  var _rt = null;
  function scheduleRender() { clearTimeout(_rt); _rt = setTimeout(render, 60); }
  function render() {
    var dr = DR(); if (!dr || !state.open) return;
    var list = dr.querySelector('[data-list="docked"]'); if (!list) return;
    var html = '';
    for (var id in balls) { var b = balls[id]; if (state.docked[b.id]) html += chipHTML(b); }
    list.innerHTML = html || '<div class="ycdk-empty">还没收起任何球</div>';
  }
  function flash(el) { if (!el) return; el.classList.add('ycdk-flash'); setTimeout(function () { try { el.classList.remove('ycdk-flash'); } catch (e) {} }, 260); }
  function toggleDrawer(force) { state.open = (typeof force === 'boolean') ? force : !state.open; saveState(); applyOpen(); if (state.open) scheduleRender(); }
  function applyOpen() { var h = H(), dr = DR(); if (!h || !dr) return; dr.classList.toggle('open', !!state.open); h.classList.toggle('open', !!state.open); }
  function applyHideHandle() { var h = H(); if (h) h.style.display = cfg.hideHandle ? 'none' : 'flex'; }

  // ================= 建/拆 收纳栏 =================
  function buildDock() {
    if (ROOT.dock) return;
    var D = ROOT.dock = mkBucket();
    var h = DOC.createElement('div'); h.id = 'yc-dock-handle'; h.title = '悬浮球收纳'; h.innerHTML = '<span class="ycdk-grip"></span>';
    var d = DOC.createElement('div'); d.id = 'yc-dock-drawer';
    d.innerHTML =
      '<div class="ycdk-hd"><span>悬浮球收纳</span><button class="ycdk-x" data-x>×</button></div>' +
      '<div class="ycdk-body"><div class="ycdk-list" data-list="docked"></div></div>' +
      '<button class="ycdk-all" data-all>一键收起全部</button>' +
      '<div class="ycdk-tip">把悬浮球拖到把手上＝单独收起</div>';
    DOC.documentElement.appendChild(h); DOC.documentElement.appendChild(d);
    D.handle = h; D.drawer = d;
    if (typeof state.handleTop === 'number') h.style.top = state.handleTop + '%';
    applyHideHandle();

    // 把手：拖动＝移动，轻点＝开/收抽屉
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

    // 拖球到把手上＝单独收起
    var db = { el: null, active: false };
    on(D, DOC, 'pointerdown', function (e) { var ball = findBallElement(e.target); db.el = ball; db.active = !!ball; }, true);
    on(D, DOC, 'pointerup', function (e) {
      if (!db.active || !db.el) { db.active = false; db.el = null; return; }
      db.active = false;
      try { var r = h.getBoundingClientRect(), pad = 26; var hit = e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad; if (hit) { collectElement(db.el); flash(h); } } catch (er) {}
      db.el = null;
    }, true);
    on(D, DOC, 'pointercancel', function () { db.active = false; db.el = null; }, true);

    // 从屏幕右边缘往左滑＝打开抽屉（把手藏了也能拉出来）
    var es = { active: false, x: 0, y: 0 };
    on(D, DOC, 'pointerdown', function (e) {
      es.active = false;
      var t = e.target;
      if (h && (t === h || h.contains(t))) return;
      if (d && (t === d || d.contains(t))) return;
      if (findBallElement(t)) return;
      if (state.open) return;
      if (e.clientX >= vw() - 66 && e.clientX <= vw() - 22) { es.active = true; es.x = e.clientX; es.y = e.clientY; }
    }, true);
    on(D, DOC, 'pointermove', function (e) { if (!es.active) return; var dx = e.clientX - es.x, dy = e.clientY - es.y; if (dx < -28 && Math.abs(dx) > Math.abs(dy)) { es.active = false; toggleDrawer(true); } }, true);
    on(D, DOC, 'pointerup', function () { es.active = false; }, true);

    // 握手
    on(D, TOP, 'ycdock:hello', function (e) { registerNative(e.detail || {}); });
    TOP.__ycDockPresent = true;
    present();
    [120, 400, 1200, 3000].forEach(function (ms) { setTimeout(function () { if (ROOT.dock === D) present(); }, ms); });
    every(D, 5000, present);
    var moT = null;
    var mo = new MutationObserver(function () { clearTimeout(moT); moT = setTimeout(present, 500); });
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
      var b = balls[id] || { id: id, type: 'foreign', el: el, selector: meta.selector, name: (el.id || '其他悬浮球'), icon: guessIcon(el) };
      b.el = el; balls[id] = b; forceHide(b);
    }
  }
  function destroyDock() {
    if (!ROOT.dock) return;
    // 收进去的球全部放回屏幕
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

  // ================= 扩展设置面板（启用 / 隐藏把手）=================
  function injectSettings() {
    var S = ROOT.settings = mkBucket();
    var tries = 0;
    (function tryInject() {
      if (ROOT.settings !== S) return;
      var host = DOC.getElementById('extensions_settings2') || DOC.getElementById('extensions_settings');
      if (!host) { if (tries++ < 25) setTimeout(tryInject, 800); return; }
      if (DOC.getElementById('yc-dock-settings')) return;
      var box = DOC.createElement('div'); box.id = 'yc-dock-settings'; box.className = 'yc-dock-settings';
      box.innerHTML =
        '<div class="ycdk-set-head"><b>芋圆收纳by小芋</b><span class="ycdk-set-caret">▾</span></div>' +
        '<div class="ycdk-set-body">' +
        '<label class="ycdk-set-row"><input type="checkbox" id="ycdk-enabled"> <span>启用芋圆收纳</span></label>' +
        '<label class="ycdk-set-row"><input type="checkbox" id="ycdk-hidehandle"> <span>隐藏边缘把手（从屏幕右边缘往左滑打开）</span></label>' +
        '<div class="ycdk-set-note">关掉「启用」后本收纳完全停用，收进去的球会全部放回屏幕。</div>' +
        '</div>';
      host.appendChild(box); S.el = box;
      var head = box.querySelector('.ycdk-set-head'), body = box.querySelector('.ycdk-set-body');
      on(S, head, 'click', function () { body.style.display = (body.style.display === 'none') ? '' : 'none'; });
      var en = box.querySelector('#ycdk-enabled'), hh = box.querySelector('#ycdk-hidehandle');
      en.checked = cfg.enabled; hh.checked = cfg.hideHandle;
      on(S, en, 'change', function () { cfg.enabled = en.checked; saveCfg(); if (cfg.enabled) buildDock(); else destroyDock(); });
      on(S, hh, 'change', function () { cfg.hideHandle = hh.checked; saveCfg(); applyHideHandle(); });
    })();
  }

  // 无手势冲突的打开方式：魔棒菜单按钮 + 斜杠命令 /dock（回调走 TOP.__ycDockToggle，热重载后自动指向最新）
  function openDrawerToggle() { if (!cfg.enabled) return; if (!ROOT.dock) { buildDock(); toggleDrawer(true); return; } toggleDrawer(); }
  TOP.__ycDockToggle = openDrawerToggle;
  function registerOpeners() {
    // 斜杠命令 /dock
    try {
      var ctx = (TOP.SillyTavern && TOP.SillyTavern.getContext) ? TOP.SillyTavern.getContext() : null;
      var cb = function () { try { TOP.__ycDockToggle && TOP.__ycDockToggle(); } catch (e) {} return ''; };
      if (ctx && ctx.SlashCommandParser && ctx.SlashCommand && ctx.SlashCommand.fromProps) {
        ctx.SlashCommandParser.addCommandObject(ctx.SlashCommand.fromProps({ name: 'dock', callback: cb, helpString: '\u6253\u5f00/\u6536\u8d77 \u828b\u5706\u6536\u7eb3\u62bd\u5c49' }));
      } else if (ctx && typeof ctx.registerSlashCommand === 'function') {
        ctx.registerSlashCommand('dock', cb, [], '\u6253\u5f00/\u6536\u8d77 \u828b\u5706\u6536\u7eb3\u62bd\u5c49', true, true);
      } else if (typeof TOP.registerSlashCommand === 'function') {
        TOP.registerSlashCommand('dock', cb, [], '\u6253\u5f00/\u6536\u8d77 \u828b\u5706\u6536\u7eb3\u62bd\u5c49', true, true);
      }
    } catch (e) {}
    // 魔棒/扩展快捷菜单里放一个「芋圆收纳」按钮
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
        item.innerHTML = '<div class="fa-solid fa-inbox" style="width:1em;text-align:center;"></div><span>\u828b\u5706\u6536\u7eb3</span>';
        item.addEventListener('click', function () { try { TOP.__ycDockToggle && TOP.__ycDockToggle(); } catch (e) {} });
        menu.appendChild(item);
      } catch (e) {}
    })();
  }

  function boot() { injectSettings(); registerOpeners(); if (cfg.enabled) buildDock(); }
  if (DOC.readyState === 'loading') DOC.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
