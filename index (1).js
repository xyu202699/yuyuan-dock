/* 芋圆收纳 · 悬浮球收纳栏  v1.0.0  作者：小芋
 *
 * 自有事件协议（不是任何第三方的接口，纯自己的一套）：
 *   ycdock:present  收纳栏 → 全局，宣告"我在场"（加载时、DOM 变动时、定时各发一次）
 *   ycdock:hello    悬浮球 → 收纳栏，报到 { detail:{ id, name, icon, el } }
 *   ycdock:cmd      收纳栏 → 某个球元素，指令 { detail:{ action:'dock'|'free' } }（可选，球想自己处理就监听）
 * 被收起来的球会被打上 data-ycdock="docked"（被动标记，供球自己的自愈让路）。
 *
 * 两类球：
 *   native  = 自己人（芋圆机 / 汪星来报，贴了对接件、会 hello 报到）→ 事件收纳，干净、不闪
 *   foreign = 别人的球（改不了它的代码，靠扫描发现）→ 强制模式，能收但可能闪
 */
(function () {
  'use strict';

  // ---- 顶层窗口（酒馆常把页面塞进 iframe/transform，跟芋圆机同款处理）----
  function getTop() {
    try { var w = window; for (var i = 0; i < 6 && w.parent && w.parent !== w; i++) { try { void w.parent.document; w = w.parent; } catch (e) { break; } } return w; } catch (e) { return window; }
  }
  var TOP = getTop();
  var DOC = TOP.document;

  // ---- 先拆掉上一版实例（酒馆热重载不刷页面，旧定时器/监听会残留、跟新版打架）----
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

  // ---- 存档 ----
  var LS_KEY = 'yc_dock_v1';
  function loadState() { try { return JSON.parse(TOP.localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveState() { try { TOP.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  var state = loadState();
  state.docked = state.docked || {};   // id -> { foreign:bool, selector:'' }  记住哪些球是收起来的
  state.open = !!state.open;           // 抽屉是否展开

  // ---- 已知的球 ----  id -> { id, name, icon, el, type, selector?, freePos?, force? }
  var balls = {};
  API.balls = balls;

  // ================= 工具 =================
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
      if (t && t.length <= 2) return t; // 单字/emoji 当图标
    } catch (e) {}
    return '';
  }

  function foreignKey(el) {
    var cls = '';
    try { cls = (el.className && el.className.toString) ? el.className.toString().slice(0, 30) : ''; } catch (e) {}
    return 'foreign:' + (el.id || '') + '|' + cls;
  }

  // 一个元素"像不像悬浮球"（用来发现第三方的球）
  function looksLikeBall(el) {
    try {
      if (!el || el.nodeType !== 1) return false;
      if (el === API.handle || el === API.drawer) return false;
      if (API.handle && API.handle.contains(el)) return false;
      if (API.drawer && API.drawer.contains(el)) return false;
      for (var k in balls) { if (balls[k].el === el) return false; } // 已知的原生球不算 foreign
      var cs = TOP.getComputedStyle(el);
      if (!cs || cs.position !== 'fixed') return false;
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') < 0.2) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 20 || r.width > 110 || r.height < 20 || r.height > 110) return false;
      if (Math.abs(r.width - r.height) > Math.max(r.width, r.height) * 0.7) return false; // 大致方/圆
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
    pool.forEach(function (el) { try { Array.prototype.push.apply(deeper, el.children); } catch (e) {} }); // 再深一层（有的球包 wrapper）
    Array.prototype.push.apply(pool, deeper);
    pool.forEach(function (el) {
      if (seen.has(el)) return; seen.add(el);
      if (looksLikeBall(el)) out.push(el);
    });
    return out;
  }

  // ================= 报到 / 注册 =================
  function registerNative(info) {
    if (!info || !info.id) return;
    var el = info.el || DOC.getElementById(info.id) || null;
    var b = balls[info.id] || {};
    b.id = info.id;
    b.type = 'native';
    b.name = info.name || b.name || info.id;
    b.icon = info.icon || b.icon || (el ? guessIcon(el) : '');
    b.el = el || b.el || null;
    balls[info.id] = b;
    // 上次会话它是收起的 → 报到就自动收回抽屉
    if (state.docked[b.id]) setDock(b, true, true);
    scheduleRender();
  }

  // ================= 收 / 放 =================
  function setDock(b, docked, silent) {
    if (!b) return;
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null) || DOC.getElementById(b.id);
    b.el = el || b.el;
    if (b.type === 'native') {
      if (el) {
        if (docked) {
          if (typeof b.prevDisplay !== 'string') b.prevDisplay = el.style.getPropertyValue('display') || ''; // 记住原来的 display，放出时原样还回
          el.setAttribute('data-ycdock', 'docked');
          try { el.dispatchEvent(new CustomEvent('ycdock:cmd', { bubbles: false, detail: { action: 'dock' } })); } catch (e) {}
          el.style.setProperty('display', 'none', 'important'); // 兜底：球没自己处理也照样藏
        } else {
          el.removeAttribute('data-ycdock');
          el.style.removeProperty('display'); // 撤掉我们加的 none
          if (b.prevDisplay) el.style.display = b.prevDisplay; // 还原原来的 display —— 不碰 left/top，位置交还给球自己（保住球自带的拖动）
          b.prevDisplay = undefined;
          try { el.dispatchEvent(new CustomEvent('ycdock:cmd', { bubbles: false, detail: { action: 'free' } })); } catch (e) {}
        }
      }
    } else {
      if (docked) forceHide(b); else forceShow(b);
    }
    if (docked) state.docked[b.id] = { foreign: b.type === 'foreign', selector: b.selector || '' };
    else delete state.docked[b.id];
    saveState();
    if (!silent) scheduleRender();
  }

  // 第三方球：强制藏 + 盯着它的自愈，被 un-hide 就再压一次（用 observer 少闪，定时器兜底）
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
      b.force.timer = every(1200, function () { // 有的球会整个重建元素，observer 会失联 → 低频重新找+压回
        if (!state.docked[b.id]) return;
        var cur = b.selector ? DOC.querySelector(b.selector) : b.el;
        if (cur && cur !== b.el) {
          b.el = cur;
          if (b.force.observer) { try { b.force.observer.disconnect(); b.force.observer.observe(cur, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {} }
        }
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

  // 从点击目标往上找到"是球"的那个元素
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
  function collectElement(el) {
    for (var k in balls) { if (balls[k].el === el && balls[k].type === 'native') { setDock(balls[k], true); return; } }
    var key = foreignKey(el);
    var b = balls[key] || { id: key, type: 'foreign', el: el, selector: el.id ? '#' + cssId(el.id) : '', name: (el.id || el.getAttribute('title') || '其他悬浮球'), icon: guessIcon(el) };
    b.el = el; balls[key] = b;
    setDock(b, true);
  }

  // ================= 界面 =================
  function buildUI() {
    // 侧边把手
    var h = DOC.createElement('div');
    h.id = 'yc-dock-handle';
    h.title = '悬浮球收纳';
    h.innerHTML = '<span class="ycdk-grip"></span>';
    // 抽屉
    var d = DOC.createElement('div');
    d.id = 'yc-dock-drawer';
    d.innerHTML =
      '<div class="ycdk-hd"><span>悬浮球收纳</span><button class="ycdk-x" data-x>×</button></div>' +
      '<div class="ycdk-body">' +
      '<div class="ycdk-sec" data-sec="docked"><div class="ycdk-sec-t">已收纳</div><div class="ycdk-list" data-list="docked"></div></div>' +
      '<div class="ycdk-sec" data-sec="free"><div class="ycdk-sec-t">可收纳 <button class="ycdk-rescan" data-rescan>扫描</button></div><div class="ycdk-list" data-list="free"></div></div>' +
      '</div>' +
      '<div class="ycdk-tip">长按任意悬浮球也能收起 · 带 ⚠ 的是别人的球，收起可能闪</div>';
    // 挂在 <html> 上，躲开 body 的 transform（跟芋圆机 v1018 同一个教训）
    DOC.documentElement.appendChild(h);
    DOC.documentElement.appendChild(d);
    API.handle = h; API.drawer = d;

    on(h, 'click', function (e) { e.stopPropagation(); toggleDrawer(); });
    on(d, 'click', function (e) {
      var t = e.target;
      if (t.closest('[data-x]')) { e.stopPropagation(); toggleDrawer(false); return; }
      if (t.closest('[data-rescan]')) { e.stopPropagation(); scheduleRender(); flash(t.closest('[data-rescan]')); return; }
      var chip = t.closest('.ycdk-chip');
      if (chip) {
        e.stopPropagation();
        var id = chip.getAttribute('data-id');
        var mode = chip.getAttribute('data-mode');
        var b = balls[id];
        if (!b && mode === 'free') { // 来自扫描、还没入库的 foreign
          var el = foreignCache[id];
          if (el) collectElement(el);
        } else if (b) {
          setDock(b, mode !== 'docked');
        }
      }
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

  var foreignCache = {}; // 本次渲染发现的、还没入库的第三方球： id -> el
  function chipHTML(id, name, icon, type, mode) {
    var ic = icon ? (isImg(icon) ? '<img src="' + esc(icon) + '" alt="">' : '<span class="ycdk-emoji">' + esc(icon) + '</span>') : '<span class="ycdk-letter">' + esc((name || '?').slice(0, 1)) + '</span>';
    var warn = type === 'foreign' ? ' <span class="ycdk-warn" title="别人的球，收起可能闪">⚠</span>' : '';
    return '<button class="ycdk-chip" data-id="' + esc(id) + '" data-mode="' + mode + '" data-type="' + type + '">' +
      '<span class="ycdk-ic">' + ic + '</span>' +
      '<span class="ycdk-nm">' + esc(name) + warn + '</span>' +
      '<span class="ycdk-act">' + (mode === 'docked' ? '放出' : '收起') + '</span></button>';
  }

  var _renderT = null;
  function scheduleRender() { clearTimeout(_renderT); _renderT = setTimeout(render, 60); }
  function render() {
    if (!API.drawer || !state.open) return;
    var dockedList = API.drawer.querySelector('[data-list="docked"]');
    var freeList = API.drawer.querySelector('[data-list="free"]');
    if (!dockedList || !freeList) return;
    var dockedHTML = '', freeHTML = '';
    // 已收纳
    for (var id in balls) {
      var b = balls[id];
      if (state.docked[b.id]) dockedHTML += chipHTML(b.id, b.name, b.icon, b.type, 'docked');
    }
    // 可收纳：已注册但没收起的 native
    for (var id2 in balls) {
      var b2 = balls[id2];
      if (b2.type === 'native' && !state.docked[b2.id]) freeHTML += chipHTML(b2.id, b2.name, b2.icon, 'native', 'free');
    }
    // 可收纳：扫描到的 foreign（去掉已经入库/已收起的）
    foreignCache = {};
    scanForeign().forEach(function (el) {
      var key = foreignKey(el);
      if (state.docked[key] || (balls[key] && state.docked[key])) return;
      foreignCache[key] = el;
      freeHTML += chipHTML(key, (el.id || el.getAttribute('title') || '其他悬浮球'), guessIcon(el), 'foreign', 'free');
    });
    dockedList.innerHTML = dockedHTML || '<div class="ycdk-empty">还没收起任何球</div>';
    freeList.innerHTML = freeHTML || '<div class="ycdk-empty">没发现可收的球</div>';
  }

  // ================= 长按收纳 =================
  var lp = { timer: null, x: 0, y: 0, fired: false };
  function bindLongPress() {
    on(DOC, 'pointerdown', function (e) {
      try {
        var ball = findBallElement(e.target);
        if (!ball) return;
        lp.x = e.clientX; lp.y = e.clientY; lp.fired = false;
        clearTimeout(lp.timer);
        lp.timer = setTimeout(function () {
          lp.fired = true; lp.timer = null;
          collectElement(ball);
          toggleDrawer(true); flash(API.handle);
        }, 480);
      } catch (err) {}
    }, true);
    on(DOC, 'pointermove', function (e) {
      if (!lp.timer) return;
      if (Math.abs(e.clientX - lp.x) > 10 || Math.abs(e.clientY - lp.y) > 10) { clearTimeout(lp.timer); lp.timer = null; }
    }, true);
    var end = function () { clearTimeout(lp.timer); lp.timer = null; };
    on(DOC, 'pointerup', end, true);
    on(DOC, 'pointercancel', end, true);
    // 长按触发后，吞掉紧接着的那次 click（否则会顺手把球/手机点开）
    on(DOC, 'click', function (e) { if (lp.fired) { lp.fired = false; e.preventDefault(); e.stopPropagation(); } }, true);
  }

  // ================= 握手 =================
  function present() { try { TOP.dispatchEvent(new CustomEvent('ycdock:present')); } catch (e) {} }
  function bindHandshake() {
    on(TOP, 'ycdock:hello', function (e) { registerNative(e.detail || {}); });
    TOP.__ycDockPresent = true; // 让球即使没监听事件，也能同步查到收纳栏在场
    present();
    [120, 400, 1200, 3000].forEach(function (ms) { setTimeout(present, ms); });
    every(5000, present); // 便宜的兜底：晚加载的球也能挂上（已注册的会去重）
    // DOM 有大变动时也吆喝一声 + 重扫（防抖）
    var moT = null;
    var mo = new MutationObserver(function () { clearTimeout(moT); moT = setTimeout(function () { present(); if (state.open) scheduleRender(); }, 500); });
    try { mo.observe(DOC.documentElement, { childList: true, subtree: false }); } catch (e) {}
    try { if (DOC.body) mo.observe(DOC.body, { childList: true, subtree: false }); } catch (e) {}
    API.observers.push(mo);
  }

  // 上次会话收起的第三方球，本次进来重新找回并压住
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

  // ================= 启动 =================
  function boot() {
    buildUI();
    bindLongPress();
    bindHandshake();
    [600, 1800].forEach(function (ms) { setTimeout(reapplyForeign, ms); });
    if (state.open) scheduleRender();
  }
  if (DOC.readyState === 'loading') on(DOC, 'DOMContentLoaded', boot); else boot();
})();
