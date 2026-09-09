(function () {
  'use strict';
  function getTop() {
    try { var w = window; for (var i = 0; i < 6 && w.parent && w.parent !== w; i++) { try { void w.parent.document; w = w.parent; } catch (e) { break; } } return w; } catch (e) { return window; }
  }
  var TOP = getTop();
  var DOC = TOP.document;

  try {
    if (TOP.__ycDock) {
      var old = TOP.__ycDock;
      try { (old.observers || []).forEach(function (o) { try { o.disconnect(); } catch (e) {} }); } catch (e) {}
      try { (old.intervals || []).forEach(function (t) { try { clearInterval(t); } catch (e) {} }); } catch (e) {}
      try { (old.listeners || []).forEach(function (l) { try { l.t.removeEventListener(l.type, l.fn, l.opt); } catch (e) {} }); } catch (e) {}
      try { old.handle && old.handle.remove(); } catch (e) {}
      try { old.drawer && old.drawer.remove(); } catch (e) {}
    }
  } catch (e) {}

  var API = { observers: [], intervals: [], listeners: [], handle: null, drawer: null, balls: null };
  TOP.__ycDock = API;
  function on(t, type, fn, opt) { try { t.addEventListener(type, fn, opt); API.listeners.push({ t: t, type: type, fn: fn, opt: opt }); } catch (e) {} }
  function every(ms, fn) { var id = setInterval(fn, ms); API.intervals.push(id); return id; }

  var LS_KEY = 'yc_dock_v1';
  function loadState() { try { return JSON.parse(TOP.localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveState() { try { TOP.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  var state = loadState();
  state.docked = state.docked || {};
  state.open = !!state.open;

  var balls = {};
  API.balls = balls;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cssId(id) { try { return (TOP.CSS && CSS.escape) ? CSS.escape(id) : String(id).replace(/[^\w-]/g, '\\$&'); } catch (e) { return id; } }
  function isImg(s) { return /^(data:|https?:|\/\/|blob:)/.test(String(s || '')); }
  function vw() { return TOP.innerWidth || 360; }
  function vh() { return TOP.innerHeight || 640; }

  function guessIcon(el) {
    try {
      if (el.tagName === 'IMG' && el.src) return el.src;
      var im = el.querySelector && el.querySelector('img');
      if (im && im.src) return im.src;
      var bg = TOP.getComputedStyle(el).backgroundImage || '';
      var m = bg.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1]) return m[1];
      var t = (el.textContent || '').trim();
      if (t && t.length <= 2) return t;
    } catch (e) {}
    return '';
  }
  function foreignKey(el) {
    var cls = '';
    try { cls = (el.className && el.className.toString) ? el.className.toString().slice(0, 30) : ''; } catch (e) {}
    return 'foreign:' + (el.id || '') + '|' + cls;
  }
  function looksLikeBall(el) {
    try {
      if (!el || el.nodeType !== 1) return false;
      if (el === API.handle || el === API.drawer) return false;
      if (API.handle && API.handle.contains(el)) return false;
      if (API.drawer && API.drawer.contains(el)) return false;
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
    var deeper = [];
    pool.forEach(function (el) { try { Array.prototype.push.apply(deeper, el.children); } catch (e) {} });
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
    } else {
      if (docked) forceHide(b); else forceShow(b);
    }
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
      var mo = new MutationObserver(function () {
        if (!state.docked[b.id]) return;
        try { var cs = TOP.getComputedStyle(el); if (cs && cs.display !== 'none') el.style.setProperty('display', 'none', 'important'); } catch (e) {}
      });
      try { mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {}
      b.force.observer = mo; API.observers.push(mo);
    }
    if (!b.force.timer) {
      b.force.timer = every(1200, function () {
        if (!state.docked[b.id]) return;
        var cur = b.selector ? DOC.querySelector(b.selector) : b.el;
        if (cur && cur !== b.el) { b.el = cur; if (b.force.observer) { try { b.force.observer.disconnect(); b.force.observer.observe(cur, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {} } }
        if (cur) { try { var cs = TOP.getComputedStyle(cur); if (cs && cs.display !== 'none') cur.style.setProperty('display', 'none', 'important'); } catch (e) {} }
      });
    }
  }
  function forceShow(b) {
    if (b.force) {
      try { b.force.observer && b.force.observer.disconnect(); } catch (e) {}
      try { b.force.timer && clearInterval(b.force.timer); } catch (e) {}
      b.force = null;
    }
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null);
    if (el && el.style.display === 'none') el.style.removeProperty('display');
  }

  function findBallElement(t) {
    if (!t || t.nodeType !== 1) return null;
    if (API.handle && (t === API.handle || API.handle.contains(t))) return null;
    if (API.drawer && (t === API.drawer || API.drawer.contains(t))) return null;
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

  function buildUI() {
    var h = DOC.createElement('div');
    h.id = 'yc-dock-handle';
    h.title = '悬浮球收纳';
    h.innerHTML = '<span class="ycdk-grip"></span>';
    var d = DOC.createElement('div');
    d.id = 'yc-dock-drawer';
    d.innerHTML =
      '<div class="ycdk-hd"><span>悬浮球收纳</span><button class="ycdk-x" data-x>×</button></div>' +
      '<div class="ycdk-body"><div class="ycdk-list" data-list="docked"></div></div>' +
      '<button class="ycdk-all" data-all>一键收起全部</button>' +
      '<div class="ycdk-tip">把悬浮球拖到把手上＝单独收起</div>';
    DOC.documentElement.appendChild(h);
    DOC.documentElement.appendChild(d);
    API.handle = h; API.drawer = d;
    if (typeof state.handleTop === 'number') h.style.top = state.handleTop + '%';

    // 把手：拖动＝移动，轻点＝开/收抽屉
    var hp = { down: false, moved: false, startY: 0, startTop: 42 };
    on(h, 'pointerdown', function (e) {
      hp.down = true; hp.moved = false; hp.startY = e.clientY;
      hp.startTop = (typeof state.handleTop === 'number') ? state.handleTop : 42;
      try { h.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    on(h, 'pointermove', function (e) {
      if (!hp.down) return;
      var dy = e.clientY - hp.startY;
      if (Math.abs(dy) > 6) hp.moved = true;
      if (hp.moved) {
        var pct = hp.startTop + dy / vh() * 100;
        pct = Math.max(6, Math.min(88, pct));
        h.style.top = pct + '%'; state.handleTop = pct;
      }
    });
    on(h, 'pointerup', function () {
      if (!hp.down) return; hp.down = false;
      if (hp.moved) saveState(); else toggleDrawer();
    });
    on(h, 'pointercancel', function () { hp.down = false; });

    on(d, 'click', function (e) {
      var t = e.target;
      if (t.closest('[data-x]')) { toggleDrawer(false); return; }
      if (t.closest('[data-all]')) { collectAll(); flash(t.closest('[data-all]')); return; }
      var out = t.closest('[data-out]'); if (out) { var bo = balls[out.getAttribute('data-out')]; if (bo) setDock(bo, false); return; }
      var run = t.closest('[data-run]'); if (run) { var br = balls[run.getAttribute('data-run')]; if (br) runByBall(br); return; }
    });
    applyOpen();
  }

  function toggleDrawer(force) {
    state.open = (typeof force === 'boolean') ? force : !state.open;
    saveState(); applyOpen(); if (state.open) scheduleRender();
  }
  function applyOpen() {
    if (!API.drawer || !API.handle) return;
    API.drawer.classList.toggle('open', !!state.open);
    API.handle.classList.toggle('open', !!state.open);
  }
  function flash(el) { if (!el) return; el.classList.add('ycdk-flash'); setTimeout(function () { try { el.classList.remove('ycdk-flash'); } catch (e) {} }, 260); }

  // 运行一颗（收着的）球：合成一次原生 tap，让球自己的打开逻辑跑起来，球不放出
  function runByBall(b) {
    if (!b) return;
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null) || DOC.getElementById(b.id);
    if (!el) return;
    try {
      var mk = function (type) { return new MouseEvent(type, { bubbles: true, cancelable: true, view: TOP }); };
      el.dispatchEvent(mk('mousedown')); // 芋圆机 onDown / 汪星 fabBegin
      el.dispatchEvent(mk('mouseup'));   // 冒泡到 document → 芋圆机 onUp(openXhs) / 汪星 fabEnd
      el.dispatchEvent(mk('click'));     // 汪星等靠 click 打开的球
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
    if (!API.drawer || !state.open) return;
    var list = API.drawer.querySelector('[data-list="docked"]'); if (!list) return;
    var html = '';
    for (var id in balls) { var b = balls[id]; if (state.docked[b.id]) html += chipHTML(b); }
    list.innerHTML = html || '<div class="ycdk-empty">还没收起任何球</div>';
  }

  // 拖球到把手上＝收起（追手指位置，能拖/不能拖的球都收得进）
  function bindDragCollect() {
    var db = { el: null, active: false };
    on(DOC, 'pointerdown', function (e) {
      var ball = findBallElement(e.target);
      db.el = ball; db.active = !!ball;
    }, true);
    on(DOC, 'pointerup', function (e) {
      if (!db.active || !db.el) { db.active = false; db.el = null; return; }
      db.active = false;
      try {
        var r = API.handle.getBoundingClientRect(), pad = 26;
        var hit = e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad;
        if (hit) { collectElement(db.el); flash(API.handle); }
      } catch (er) {}
      db.el = null;
    }, true);
    on(DOC, 'pointercancel', function () { db.active = false; db.el = null; }, true);
  }

  function present() { try { TOP.dispatchEvent(new CustomEvent('ycdock:present')); } catch (e) {} }
  function bindHandshake() {
    on(TOP, 'ycdock:hello', function (e) { registerNative(e.detail || {}); });
    TOP.__ycDockPresent = true;
    present();
    [120, 400, 1200, 3000].forEach(function (ms) { setTimeout(present, ms); });
    every(5000, present);
    var moT = null;
    var mo = new MutationObserver(function () { clearTimeout(moT); moT = setTimeout(present, 500); });
    try { mo.observe(DOC.documentElement, { childList: true, subtree: false }); } catch (e) {}
    try { if (DOC.body) mo.observe(DOC.body, { childList: true, subtree: false }); } catch (e) {}
    API.observers.push(mo);
  }

  function reapplyForeign() {
    for (var id in state.docked) {
      var meta = state.docked[id];
      if (!meta || !meta.foreign) continue;
      var el = meta.selector ? DOC.querySelector(meta.selector) : null;
      if (!el) continue;
      var b = balls[id] || { id: id, type: 'foreign', el: el, selector: meta.selector, name: (el.id || '其他悬浮球'), icon: guessIcon(el) };
      b.el = el; balls[id] = b; forceHide(b);
    }
  }

  function boot() {
    buildUI(); bindDragCollect(); bindHandshake();
    [600, 1800].forEach(function (ms) { setTimeout(reapplyForeign, ms); });
    if (state.open) scheduleRender();
  }
  if (DOC.readyState === 'loading') on(DOC, 'DOMContentLoaded', boot); else boot();
})();
