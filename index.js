(function () {
  'use strict';
  function getTop() {
    try { var w = window; for (var i = 0; i < 6 && w.parent && w.parent !== w; i++) { try { void w.parent.document; w = w.parent; } catch (e) { break; } } return w; } catch (e) { return window; }
  }
  var TOP = getTop();
  var DOC = TOP.document;
  var YCDK_VER = '1.0.6';
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
  function loadCfg() { try { var c = JSON.parse(TOP.localStorage.getItem(CFG_KEY) || '{}') || {}; return { enabled: c.enabled !== false, hideHandle: c.hideHandle !== false }; } catch (e) { return { enabled: true, hideHandle: true }; } }
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
  function isOurs(el) { var h = H(), dr = DR(), settings = ROOT.settings && ROOT.settings.el; return el === h || el === dr || (h && h.contains(el)) || (dr && dr.contains(el)) || (settings && settings.contains(el)); }

  function svgIcon(svg) {
    var copy = svg.cloneNode(true);
    var sources = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll('*')));
    var copies = [copy].concat(Array.prototype.slice.call(copy.querySelectorAll('*')));
    var properties = ['color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'visibility'];
    sources.forEach(function (source, index) {
      var target = copies[index], style = TOP.getComputedStyle(source);
      properties.forEach(function (property) { target.style.setProperty(property, style.getPropertyValue(property)); });
      Array.prototype.slice.call(target.attributes).forEach(function (attribute) { if (/^on/i.test(attribute.name)) target.removeAttribute(attribute.name); });
    });
    Array.prototype.forEach.call(copy.querySelectorAll('script, foreignObject'), function (node) { node.remove(); });
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!copy.hasAttribute('viewBox')) {
      var rect = svg.getBoundingClientRect();
      if (rect.width && rect.height) copy.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
    }
    copy.setAttribute('width', '26'); copy.setAttribute('height', '26');
    copy.style.setProperty('width', '26px'); copy.style.setProperty('height', '26px');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new TOP.XMLSerializer().serializeToString(copy));
  }

  function fontIcon(el, pseudo) {
    var style = TOP.getComputedStyle(el, pseudo), content = style.content;
    if (!content || content === 'none' || content === 'normal') return null;
    if (!/^(["']).*\1$/.test(content)) return null;
    var text = content.slice(1, -1).replace(/\\([0-9a-f]{1,6})\s?/gi, function (match, code) { return String.fromCodePoint(parseInt(code, 16)); }).replace(/\\([\\"'])/g, '$1');
    if (!text.trim() || Array.from(text).length > 2) return null;
    return { text: text, family: style.fontFamily, weight: style.fontWeight, fontStyle: style.fontStyle, color: style.color };
  }

  function guessIcon(el) {
    try {
      if (el.tagName === 'IMG' && el.src) return el.currentSrc || el.src;
      var im = el.querySelector && el.querySelector('img'); if (im && im.src) return im.currentSrc || im.src;
      var svg = el.localName === 'svg' ? el : el.querySelector('svg'); if (svg) return svgIcon(svg);
      var nodes = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
      for (var index = 0; index < nodes.length; index++) {
        var bg = TOP.getComputedStyle(nodes[index]).backgroundImage || ''; var m = bg.match(/url\(["']?(.*?)["']?\)/); if (m && m[1]) return m[1];
      }
      for (var fontIndex = 0; fontIndex < nodes.length; fontIndex++) {
        var icon = fontIcon(nodes[fontIndex], '::before') || fontIcon(nodes[fontIndex], '::after'); if (icon) return icon;
      }
      var t = (el.textContent || '').trim(); if (t && t.length <= 2) return t;
    } catch (e) {}
    return '';
  }
  var foreignIds = new WeakMap(), foreignSequence = 0;
  function foreignKey(el) {
    if (el.id) return 'foreign:' + el.id;
    if (!foreignIds.has(el)) foreignIds.set(el, 'foreign:anonymous:' + (++foreignSequence));
    return foreignIds.get(el);
  }
  function ballElement(ball) {
    if (ball.el && ball.el.isConnected) return ball.el;
    var current = (ball.selector ? DOC.querySelector(ball.selector) : null) || DOC.getElementById(ball.id);
    return current || null;
  }
  function sameBall(ball, el) {
    var current = ballElement(ball);
    return !!(current && el && (current === el || current.contains(el) || el.contains(current)));
  }
  function registeredBall(el) {
    var match = null;
    for (var id in balls) {
      var ball = balls[id];
      if (!sameBall(ball, el)) continue;
      if (ball.type === 'native') return ball;
      if (!match || ball.el === el) match = ball;
    }
    return match;
  }
  function mergeBalls(primary, el) {
    var docked = !!state.docked[primary.id];
    Object.keys(balls).forEach(function (id) {
      var other = balls[id];
      if (other === primary || !sameBall(other, el)) return;
      docked = docked || !!state.docked[id];
      setDock(other, false, true);
      delete balls[id];
    });
    return docked;
  }

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
    var b = balls[info.id] || (el ? registeredBall(el) : null) || {};
    var wasDocked = !!state.docked[info.id] || !!state.docked[b.id];
    if (el) wasDocked = mergeBalls(b, el) || wasDocked;
    if (b.type === 'foreign') {
      setDock(b, false, true);
      delete balls[b.id];
      b.selector = '';
    }
    b.id = info.id; b.type = 'native';
    b.name = info.name || b.name || info.id;
    b.icon = info.icon || b.icon || (el ? guessIcon(el) : '');
    b.el = el || b.el || null;
    balls[info.id] = b;
    if (wasDocked) setDock(b, true, true);
    saveState();
    scheduleRender();
  }

  function setDock(b, docked, silent) {
    if (!b) return;
    var el = ballElement(b);
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
    if (!docked && !silent && b.type === 'foreign') revealForeign(b);
    if (!silent) { saveState(); scheduleRender(); }
  }

  function forceHide(b) {
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null);
    if (!el) return; b.el = el;
    if (!b.force) b.force = { display: el.style.getPropertyValue('display'), priority: el.style.getPropertyPriority('display') };
    el.style.setProperty('display', 'none', 'important');
    if (!b.force.observer) {
      var mo = new MutationObserver(function () { if (!state.docked[b.id]) return; try { var current = b.el; if (current && (current.style.display !== 'none' || current.style.getPropertyPriority('display') !== 'important')) current.style.setProperty('display', 'none', 'important'); } catch (e) {} });
      try { mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {}
      b.force.observer = mo; if (ROOT.dock) ROOT.dock.observers.push(mo);
    }
    if (!b.force.timer && ROOT.dock) {
      b.force.timer = every(ROOT.dock, 2500, function () {
        if (!state.docked[b.id]) return;
        var cur = b.selector ? DOC.querySelector(b.selector) : b.el;
        if (cur && cur !== b.el) { b.el = cur; b.force.display = cur.style.getPropertyValue('display'); b.force.priority = cur.style.getPropertyPriority('display'); if (b.force.observer) { try { b.force.observer.disconnect(); b.force.observer.observe(cur, { attributes: true, attributeFilter: ['style', 'class'] }); } catch (e) {} } }
        if (cur && cur.style.display !== 'none') cur.style.setProperty('display', 'none', 'important');
      });
    }
  }
  function forceShow(b) {
    var previous = b.force;
    if (b.force) { try { b.force.observer && b.force.observer.disconnect(); } catch (e) {} try { b.force.timer && clearInterval(b.force.timer); } catch (e) {} b.force = null; }
    var el = b.el || (b.selector ? DOC.querySelector(b.selector) : null);
    if (el && el.style.display === 'none') {
      if (previous && previous.display) el.style.setProperty('display', previous.display, previous.priority);
      else el.style.removeProperty('display');
    }
  }

  function revealForeign(ball) {
    var el = ballElement(ball);
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return;
    var viewport = TOP.visualViewport;
    var width = viewport ? viewport.width : vw(), height = viewport ? viewport.height : vh();
    var originX = viewport ? viewport.offsetLeft : 0, originY = viewport ? viewport.offsetTop : 0;
    var minLeft = originX + 12, minTop = originY + Math.min(80, height * 0.15);
    var maxLeft = Math.max(minLeft, originX + width - rect.width - 12);
    var maxTop = Math.max(minTop, originY + height - rect.height - 12);
    var outside = rect.left < originX + 4 || rect.top < originY + 4 || rect.right > originX + width - 4 || rect.bottom > originY + height - 4;
    var left = outside ? Math.max(minLeft, Math.min(maxLeft, rect.left)) : rect.left;
    var top = outside ? Math.max(minTop, Math.min(maxTop, rect.top)) : rect.top;
    var drawer = DR(), covered = drawer && state.open ? drawer.getBoundingClientRect() : null;
    if (covered && left < covered.right && left + rect.width > covered.left && top < covered.bottom && top + rect.height > covered.top) {
      var beside = covered.left - rect.width - 12;
      if (beside >= minLeft) left = Math.min(maxLeft, beside);
      else if (covered.bottom + 12 <= maxTop) top = covered.bottom + 12;
      else top = Math.max(minTop, covered.top - rect.height - 12);
    }
    if (Math.abs(left - rect.left) < 1 && Math.abs(top - rect.top) < 1) return;
    var style = TOP.getComputedStyle(el), cssLeft = parseFloat(style.left), cssTop = parseFloat(style.top);
    if (!Number.isFinite(cssLeft)) cssLeft = el.offsetLeft;
    if (!Number.isFinite(cssTop)) cssTop = el.offsetTop;
    var scaleX = el.offsetWidth ? rect.width / el.offsetWidth : 1;
    var scaleY = el.offsetHeight ? rect.height / el.offsetHeight : 1;
    el.style.setProperty('left', (cssLeft + (left - rect.left) / scaleX) + 'px', el.style.getPropertyPriority('left'));
    el.style.setProperty('top', (cssTop + (top - rect.top) / scaleY) + 'px', el.style.getPropertyPriority('top'));
    el.style.setProperty('right', 'auto', el.style.getPropertyPriority('right'));
    el.style.setProperty('bottom', 'auto', el.style.getPropertyPriority('bottom'));
  }

  function findBallElement(t) {
    if (!t || t.nodeType !== 1) return null;
    if (isOurs(t)) return null;
    var el = t, depth = 0, candidate = null;
    while (el && el !== DOC.body && el !== DOC.documentElement && el.nodeType === 1 && depth < 12) {
      var known = null;
      for (var id in balls) { if (ballElement(balls[id]) === el) { known = balls[id]; break; } }
      if (known && known.type === 'native') return el;
      if (known || grabbable(el)) candidate = el;
      el = el.parentNode; depth++;
    }
    return candidate;
  }
  function collectElement(el, silent) {
    el = findBallElement(el) || el;
    var existing = registeredBall(el);
    if (existing) {
      mergeBalls(existing, el);
      if (existing.el !== el && existing.type === 'foreign') {
        setDock(existing, false, true);
        existing.el = el; existing.selector = el.id ? '#' + cssId(el.id) : '';
        existing.icon = guessIcon(el) || existing.icon;
      }
      setDock(existing, true, silent);
      return;
    }
    var key = foreignKey(el);
    var b = balls[key] || { id: key, type: 'foreign', el: el, selector: el.id ? '#' + cssId(el.id) : '', name: (el.id || el.getAttribute('title') || '\u5176\u4ed6\u60ac\u6d6e\u7403'), icon: guessIcon(el) };
    b.el = el; balls[key] = b;
    setDock(b, true, silent);
  }
  function collectAll() {
    Object.keys(balls).forEach(function (id) { var ball = balls[id]; if (!ball) return; var el = ballElement(ball); if (el) collectElement(el, true); });
    scanForeign().forEach(function (el) { collectElement(el, true); });
    saveState(); render();
  }
  function runByBall(b) {
    if (!b) return;
    var el = ballElement(b);
    if (!el) return;
    try {
      var mk = function (type) { return new MouseEvent(type, { bubbles: true, cancelable: true, view: TOP }); };
      el.dispatchEvent(mk('mousedown')); el.dispatchEvent(mk('mouseup')); el.dispatchEvent(mk('click'));
    } catch (e) { try { el.click(); } catch (er) {} }
  }

  function chipHTML(b) {
    var icon = b.icon ? (typeof b.icon === 'object' ? '<span class="ycdk-font-icon"></span>' : (isImg(b.icon) ? '<img src="' + esc(b.icon) + '" alt="">' : '<span class="ycdk-emoji">' + esc(b.icon) + '</span>')) : '<span class="ycdk-letter">' + esc((b.name || '?').slice(0, 1)) + '</span>';
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
    Array.prototype.forEach.call(list.querySelectorAll('.ycdk-font-icon'), function (node) {
      var ball = balls[node.closest('[data-run]').getAttribute('data-run')], icon = ball.icon;
      node.textContent = icon.text;
      node.style.setProperty('font-family', icon.family, 'important');
      node.style.setProperty('font-weight', icon.weight, 'important');
      node.style.setProperty('font-style', icon.fontStyle, 'important');
      node.style.setProperty('color', icon.color, 'important');
    });
    applyDockPosition();
  }
  function flash(el) { if (!el) return; el.classList.add('ycdk-flash'); setTimeout(function () { try { el.classList.remove('ycdk-flash'); } catch (e) {} }, 260); }
  function toggleDrawer(force) { state.open = (typeof force === 'boolean') ? force : !state.open; saveState(); applyOpen(); if (state.open) scheduleRender(); }
  function applyOpen() { var h = H(), dr = DR(); if (!h || !dr) return; dr.classList.toggle('open', !!state.open); h.classList.toggle('open', !!state.open); h.setAttribute('aria-expanded', String(state.open)); applyDockPosition(); }
  function applyHideHandle() { var h = H(); if (h) h.style.setProperty('display', cfg.hideHandle ? 'none' : 'flex', 'important'); }
  function applyDockPosition(center) {
    var handle = H(), drawer = DR();
    if (!handle || !drawer) return;
    var height = vh(), half = Math.max(32, state.open ? drawer.getBoundingClientRect().height / 2 : 0);
    var preferred = Number.isFinite(state.dockTop) ? state.dockTop : (Number.isFinite(state.handleTop) ? state.handleTop + 28 / height * 100 : 50);
    if (typeof center !== 'number') center = preferred / 100 * height;
    var margin = Math.min(half + 8, height / 2);
    center = Math.max(margin, Math.min(height - margin, center));
    handle.style.setProperty('--ycdk-top', center + 'px');
    drawer.style.setProperty('--ycdk-top', center + 'px');
    return center;
  }

  function buildDock() {
    if (ROOT.dock) return;
    var D = ROOT.dock = mkBucket();
    var h = DOC.createElement('div'); h.id = 'yc-dock-handle'; h.title = '点击展开或收起，按住上下拖动'; h.innerHTML = '<span class="ycdk-grip" aria-hidden="true"></span>';
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    h.setAttribute('aria-label', '悬浮球收纳'); h.setAttribute('aria-controls', 'yc-dock-drawer');
    var d = DOC.createElement('div'); d.id = 'yc-dock-drawer';
    d.innerHTML =
      '<div class="ycdk-hd"><span>\u60ac\u6d6e\u7403\u6536\u7eb3</span><button class="ycdk-x" data-x>\u00d7</button></div>' +
      '<div class="ycdk-body"><div class="ycdk-list" data-list="docked"></div></div>' +
      '<button class="ycdk-all" data-all>\u4e00\u952e\u6536\u8d77\u5168\u90e8</button>';
    DOC.documentElement.appendChild(h); DOC.documentElement.appendChild(d);
    D.handle = h; D.drawer = d;
    applyHideHandle();
    applyDockPosition();
    on(D, h, 'keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (!e.repeat) toggleDrawer();
    });
    [h, d.querySelector('.ycdk-hd')].forEach(function (grip) {
      var drag = null;
      on(D, grip, 'pointerdown', function (e) {
        if (e.isPrimary === false || e.button !== 0 || e.target.closest('button')) return;
        drag = { id: e.pointerId, y: e.clientY, center: applyDockPosition(), moved: false, threshold: e.pointerType === 'touch' ? 10 : 6 };
        try { grip.setPointerCapture(e.pointerId); } catch (er) {}
        e.preventDefault();
      });
      on(D, grip, 'pointermove', function (e) {
        if (!drag || drag.id !== e.pointerId) return;
        var delta = e.clientY - drag.y;
        if (Math.abs(delta) > drag.threshold) drag.moved = true;
        if (drag.moved) state.dockTop = applyDockPosition(drag.center + delta) / vh() * 100;
      });
      function endDrag(e, cancelled) {
        if (!drag || drag.id !== e.pointerId) return;
        var moved = drag.moved; drag = null;
        try { grip.releasePointerCapture(e.pointerId); } catch (er) {}
        if (moved) saveState();
        else if (!cancelled && grip === h) toggleDrawer();
      }
      on(D, grip, 'pointerup', function (e) { endDrag(e, false); });
      on(D, grip, 'pointercancel', function (e) { endDrag(e, true); });
      on(D, grip, 'lostpointercapture', function (e) { endDrag(e, true); });
    });
    on(D, TOP, 'resize', function () { applyDockPosition(); });

    on(D, d, 'click', function (e) {
      var t = e.target;
      if (t.closest('[data-x]')) { toggleDrawer(false); return; }
      if (t.closest('[data-all]')) { collectAll(); flash(t.closest('[data-all]')); return; }
      var out = t.closest('[data-out]'); if (out) { var bo = balls[out.getAttribute('data-out')]; if (bo) setDock(bo, false); return; }
      var run = t.closest('[data-run]'); if (run) { var br = balls[run.getAttribute('data-run')]; if (br) runByBall(br); return; }
    });

    var pointerDrag = null, touchDrag = null, lastDrop = null;
    function startDrag(target, point, id) {
      var ball = findBallElement(target);
      return ball ? { ball: ball, id: id, x: point.clientX, y: point.clientY, rect: ball.getBoundingClientRect() } : null;
    }
    function finishDrag(drag, point) {
      if (!drag || Math.hypot(point.clientX - drag.x, point.clientY - drag.y) < 6) return;
      try {
        var targets = state.open ? [d] : [];
        if (!cfg.hideHandle) targets.push(h);
        var current = drag.ball.getBoundingClientRect(), initial = drag.rect;
        var moved = current.width > 0 && current.height > 0 && Math.hypot(current.left - initial.left, current.top - initial.top) > 2;
        var left = moved ? current.left : initial.left + point.clientX - drag.x;
        var top = moved ? current.top : initial.top + point.clientY - drag.y;
        var right = left + (moved ? current.width : initial.width), bottom = top + (moved ? current.height : initial.height);
        var target = targets.find(function (zone) {
          var rect = zone.getBoundingClientRect(), pad = zone === h ? 30 : 12;
          if (!(rect.width > 0 && rect.height > 0)) return false;
          var pointInside = point.clientX >= rect.left - pad && point.clientX <= rect.right + pad && point.clientY >= rect.top - pad && point.clientY <= rect.bottom + pad;
          var ballOverlaps = right > rect.left - pad && left < rect.right + pad && bottom > rect.top - pad && top < rect.bottom + pad;
          return pointInside || ballOverlaps;
        });
        if (!target) return;
        lastDrop = { ball: drag.ball, time: Date.now() };
        setTimeout(function () {
          if (ROOT.dock !== D || TOP.__ycDock !== ROOT || !cfg.enabled) return;
          var ball = drag.ball.isConnected ? drag.ball : (drag.ball.id ? DOC.getElementById(drag.ball.id) : null);
          if (!ball) return;
          collectElement(ball); flash(target);
        }, 0);
      } catch (er) {}
    }
    on(D, DOC, 'pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      pointerDrag = e.isPrimary !== false && e.button === 0 ? startDrag(e.target, e, e.pointerId) : null;
    }, true);
    on(D, DOC, 'pointerup', function (e) {
      if (!pointerDrag || pointerDrag.id !== e.pointerId) return;
      var drag = pointerDrag; pointerDrag = null; finishDrag(drag, e);
    }, true);
    on(D, DOC, 'pointercancel', function (e) {
      if (pointerDrag && pointerDrag.id === e.pointerId) pointerDrag = null;
    }, true);
    on(D, DOC, 'touchstart', function (e) {
      touchDrag = e.touches.length === 1 ? startDrag(e.target, e.touches[0], e.touches[0].identifier) : null;
    }, { capture: true, passive: true });
    function trackedTouch(touches) {
      if (!touchDrag) return null;
      for (var index = 0; index < touches.length; index++) { if (touches[index].identifier === touchDrag.id) return touches[index]; }
      return null;
    }
    on(D, DOC, 'touchmove', function (e) {
      var touch = trackedTouch(e.touches);
      if (touch && e.cancelable && Math.hypot(touch.clientX - touchDrag.x, touch.clientY - touchDrag.y) >= 6) e.preventDefault();
    }, { capture: true, passive: false });
    on(D, DOC, 'touchend', function (e) {
      var touch = trackedTouch(e.changedTouches);
      if (!touch) return;
      var drag = touchDrag; touchDrag = null; finishDrag(drag, touch);
    }, { capture: true, passive: true });
    on(D, DOC, 'touchcancel', function () { touchDrag = null; }, { capture: true, passive: true });
    on(D, TOP, 'blur', function () { pointerDrag = null; touchDrag = null; });
    on(D, DOC, 'click', function (e) {
      if (lastDrop && Date.now() - lastDrop.time < 500 && lastDrop.ball.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

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
    Object.keys(state.docked).forEach(function (id) {
      var meta = state.docked[id]; if (!meta || !meta.foreign) return;
      var el = meta.selector ? DOC.querySelector(meta.selector) : null; if (!el) return;
      delete state.docked[id];
      collectElement(el, true);
    });
    saveState(); scheduleRender();
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
