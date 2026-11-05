(() => {
'use strict';

const CATALOG = __CATALOG__;
const BAG_KEY = 'runway-styling-bag-v3';
const SHOP_HOST = 'nike-makknzjs.myshopify.com';
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrapN = (v, N) => ((v % N) + N) % N;
const money = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const FEELS = { balanced: { k: 95, lag: 0.04 } };
const CLASSIC = {
  phone: { ax: .3, ay: 22, sx: .32, sy: 22, sr: .76, ex: .55, d: 4 },
  desk:  { ax: .4, ay: 36, sx: .125, sy: 58, sr: .76, ex: .38, d: 5 },
};

/* ================= Styling bag ================= */
const Bag = (() => {
  let catalog = null, toastTimer = 0;
  let entries = load();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(BAG_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(e => e && Number.isSafeInteger(e.id) && Number.isSafeInteger(e.quantity) && e.quantity >= 1 && e.quantity <= 20)
        .slice(0, 50).map(e => ({ id: e.id, quantity: e.quantity }));
    } catch (_) { return []; }
  }
  function save() { try { localStorage.setItem(BAG_KEY, JSON.stringify(entries)); } catch (_) {} }
  function valid(d) {
    return d && Array.isArray(d.items) && d.items.every(it =>
      typeof it.id === 'string' && typeof it.name === 'string' && Number.isFinite(it.price) && it.price >= 0 &&
      Array.isArray(it.variants) && it.variants.every(v => Number.isSafeInteger(v.id) && typeof v.a === 'boolean' &&
        Array.isArray(v.o) && v.o.every(x => typeof x === 'string')));
  }
  async function getCatalog() {
    if (catalog) return catalog;
    let data;
    try { data = JSON.parse(JSON.stringify(CATALOG)); } catch (_) { throw new Error('The product list could not load.'); }
    if (!valid(data)) throw new Error('The product list is unavailable.');
    return (catalog = data);
  }
  function find(cat, vid) {
    for (const item of cat.items) {
      const variant = item.variants.find(v => v.id === vid);
      if (variant) return { item, variant };
    }
    return null;
  }
  async function add(items) {
    const cat = await getCatalog();
    for (const { id } of items) {
      const f = find(cat, id);
      if (!f || !f.variant.a) throw new Error('Please choose an available size.');
    }
    for (const { id, quantity } of items) {
      const q = quantity || 1, e = entries.find(x => x.id === id);
      if (e) e.quantity = Math.min(20, e.quantity + q);
      else if (entries.length < 50) entries.push({ id, quantity: q });
    }
    save();
    await render();
    toast(items.length > 1 ? 'Look saved to your styling bag' : 'Piece saved to your styling bag');
  }
  function count() {
    const n = entries.reduce((s, e) => s + e.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = String(n); });
  }
  function toast(msg) {
    const el = document.getElementById('bag-status');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2500);
  }
  const h = (tag, props = {}, kids = []) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    kids.forEach(k => el.append(k));
    return el;
  };
  async function render() {
    count();
    const list = document.getElementById('bag-items');
    const totalEl = document.getElementById('bag-total');
    const exp = document.getElementById('export-bag');
    if (!list) return;
    let cat;
    try { cat = await getCatalog(); } catch (err) {
      list.replaceChildren(h('p', { className: 'bag-note', textContent: err.message }));
      return;
    }
    list.replaceChildren();
    let total = 0;
    if (!entries.length) {
      list.append(h('p', { className: 'bag-note', textContent: 'Your styling bag is empty. Choose a size beside a piece to save it.' }));
    }
    for (const e of entries) {
      const f = find(cat, e.id);
      if (!f) continue;
      const { item, variant } = f;
      const url = new URL(item.url);
      if (url.hostname !== SHOP_HOST) throw new Error('Unexpected product link.');
      total += item.price * e.quantity;
      const remove = h('button', { type: 'button', textContent: '×' });
      remove.setAttribute('aria-label', 'Remove ' + item.name);
      remove.addEventListener('click', () => {
        entries = entries.filter(x => x.id !== e.id);
        save(); render();
      });
      const link = h('a', { href: url.href, target: '_blank', rel: 'noopener noreferrer', textContent: 'View original piece ↗' });
      list.append(h('div', { className: 'bag-row' }, [
        h('img', { src: item.image, alt: item.name, width: 60, height: 80, loading: 'lazy' }),
        h('div', {}, [
          h('h3', { textContent: item.name }),
          h('p', { textContent: `Size ${variant.o.join(' / ')} · Quantity ${e.quantity} · ${money(item.price * e.quantity)}` }),
          link,
        ]),
        remove,
      ]));
    }
    if (totalEl) totalEl.textContent = entries.length ? 'Reference subtotal ' + money(total) : '';
    if (exp) exp.disabled = !entries.length;
  }
  async function exportText() {
    const cat = await getCatalog();
    const parts = ['RUNWAY — STYLING SHORTLIST', 'Reference prices; no order or payment has been placed.', ''];
    for (const e of entries) {
      const f = find(cat, e.id);
      if (!f) continue;
      parts.push(`${f.item.name} · Size ${f.variant.o.join(' / ')} · Quantity ${e.quantity}\n${f.item.url}`);
    }
    const blob = new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'runway-outfit-shortlist.txt';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function wire() {
    const dialog = document.getElementById('bag-dialog');
    const openBtn = document.getElementById('open-bag');
    if (openBtn && dialog) openBtn.addEventListener('click', async () => {
      try { await render(); } catch (_) {}
      if (!dialog.open) dialog.showModal();
    });
    document.getElementById('close-bag')?.addEventListener('click', () => dialog.close());
    dialog?.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    document.getElementById('export-bag')?.addEventListener('click', () => { if (entries.length) exportText(); });
    count();
  }
  return { add, render, wire };
})();

/* ================= <runway-section> ================= */
class RunwaySection extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.setup();
  }
  disconnectedCallback() { this.teardown(); }

  /* ---------- setup ---------- */
  setup() {
    const q = s => this.querySelector(s), qa = s => [...this.querySelectorAll(s)];
    this.reduced = RM.matches;
    this.stage = q('[data-rw-stage]');
    this.actors = q('[data-rw-actors]');
    this.heroes = qa('[data-rw-hero]');
    this.ticks = qa('[data-rw-tick]');
    this.panels = qa('[data-rw-panel]');
    this.live = q('[data-rw-live]');
    this.piecesEl = q('[data-rw-pieces]');
    this.lb = q('[data-rw-lb]');
    this.lbStage = q('[data-rw-lb-stage]');
    this.autoBtn = q('[data-rw-auto]');
    this.cursor = q('[data-rw-cursor]');
    this.panelEl = q('.rw__panel');
    this.n = this.heroes.length;

    const feel = FEELS[this.dataset.feel] || FEELS.balanced;
    this.K = feel.k; this.C = 2 * Math.sqrt(this.K); this.lag = feel.lag;
    this.speed = +this.dataset.speed || 5000;
    this.blurOn = this.dataset.blur !== 'false';

    // Clone queue bodies so the ring always has 12 figures
    const originals = qa('[data-rw-model]');
    this.N = this.n * Math.ceil(8 / this.n);
    for (let a = this.n; a < this.N; a++) {
      const c = originals[a % this.n].cloneNode(true);
      c.dataset.index = a;
      c.setAttribute('data-rw-clone', '');
      c.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; img.classList.remove('is-decoded'); });
      this.actors.append(c);
    }
    this.bodies = qa('[data-rw-model]').map((el, a) => ({
      el, a, w: 0, hit: el.querySelector('.rw__hit'), blur: -1,
      x: 0, v: 0, g: 0, goal: a, trip: false, from: 0,
    }));
    qa('img[data-model-image]').forEach(img => this.decode(img));

    this.start = this.reduced ? 0 : 1.15;
    this.index = 0; this.target = 0; this.cur = -this.start; this.vel = 0;
    this.bodies.forEach(s => { s.x = s.g = s.a + this.start; });
    this.still = false; this.visible = false; this.playing = false; this.engaged = false;
    this.panelHover = false; this.zoomed = false; this.dragging = false;
    this.raf = 0; this.timer = 0; this.suppressUntil = 0; this.sheet = null;

    // Cards
    qa('[data-rw-card]').forEach(card => {
      card._picker = card.querySelector('[data-rw-picker]');
      card._add = card.querySelector('[data-rw-add]');
      card._picker._card = card;
      try { card._variants = JSON.parse(card.querySelector('[data-rw-variants]').textContent); } catch (_) { card._variants = []; }
      this.updateOptions(card, true);
    });

    // Bound handlers
    this.frame = this.frame.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onTimer = this.onTimer.bind(this);
    this.onResize = () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.measure(), 120); };
    this.onVis = () => { if (document.hidden) this.stop(); else { this.kick(); this.restartBar(); } };

    this.addEventListener('click', this.onClick);
    this.addEventListener('change', this.onChange);
    this.addEventListener('keydown', this.onKey);
    this.stage.addEventListener('click', e => {
      if (performance.now() < this.suppressUntil) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    this.stage.addEventListener('keydown', e => {
      if (e.target !== this.stage) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
    });
    this.setupDrag();
    this.setupWheel();
    this.setupPanel();
    this.setupCursor();

    addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVis);
    let roPending = 0;
    this.ro = new ResizeObserver(() => {
      cancelAnimationFrame(roPending);
      roPending = requestAnimationFrame(() => this.measure());
    });
    this.ro.observe(this.stage);
    this.io = new IntersectionObserver(es => {
      this.visible = es.some(e => e.isIntersecting);
      if (this.visible) { this.kick(); this.restartBar(); } else this.stop();
    }, { threshold: 0 });
    this.io.observe(this);

    // Intro reveal
    this.classList.add('rw--js');
    if (this.reduced) this.classList.add('is-revealed');
    else {
      this.revealIo = new IntersectionObserver(es => {
        if (!es.some(e => e.isIntersecting)) return;
        this.revealIo.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => this.classList.add('is-revealed')));
      }, { threshold: 0, rootMargin: '0px 0px -22% 0px' });
      this.revealIo.observe(this);
    }

    this.measure();
    this.setIndex(0, true);
    this.renderAll();
    this.probeFeet();

    const design = window.Shopify && window.Shopify.designMode;
    if (design) this.classList.add('rw--design');
    if (this.dataset.autoplay === 'true' && !this.reduced && !design) this.play(true);
  }

  teardown() {
    this.stop();
    clearTimeout(this.timer); clearTimeout(this._rz); clearTimeout(this._lbT);
    cancelAnimationFrame(this._curRaf);
    this.ro && this.ro.disconnect();
    this.io && this.io.disconnect();
    this.revealIo && this.revealIo.disconnect();
    removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    this.closeSheet();
    this._ready = false;
  }

  decode(img) {
    const done = () => img.classList.add('is-decoded');
    img.addEventListener('load', () => {
      if (img.decode) img.decode().then(done, done); else done();
    }, { once: true });
    if (img.complete && img.naturalWidth) {
      if (img.decode) img.decode().then(done, () => { if (img.naturalWidth) done(); }); else done();
    }
  }

  headerH() {
    let h = 0;
    document.querySelectorAll('.shopify-section-group-header-group, #shopify-section-header, #shopify-section-announcement-bar').forEach(el => {
      if (el.contains(this)) return;
      const r = el.getBoundingClientRect();
      if (r.height && getComputedStyle(el).display !== 'none') h += r.height;
    });
    return h;
  }

  /* ---------- measure ---------- */
  measure() {
    const mobile = innerWidth <= 749;
    const switched = this.mobile !== undefined && mobile !== this.mobile;
    this.mobile = mobile;
    this.ring = (mobile ? this.dataset.mstyle : this.dataset.style) === 'ring';
    if (switched && !mobile) this.closeSheet(true);

    let frameH;
    if (mobile) {
      const w = innerWidth, hh = innerHeight;
      if (!this._vh || w !== this._vw || Math.abs(hh - this._vh) >= 160) { this._vw = w; this._vh = hh; }
      const pct = this.dataset.mheightMode === 'custom' ? clamp(+this.dataset.mheightVh || 100, 50, 120) : 100;
      frameH = this._vh * pct / 100;
    } else {
      frameH = this.dataset.fit === 'true' ? Math.max(380, innerHeight - this.headerH()) : innerHeight;
    }
    this.style.setProperty('--rw-frame-h', Math.round(frameH) + 'px');

    const r = this.stage.getBoundingClientRect();
    this.W = r.width; this.H = r.height;
    this.fs = this.ring ? 1.08 : 1;
    this.style.setProperty('--rw-fs', this.fs);
    this.cls = mobile ? CLASSIC.phone : CLASSIC.desk;
    const modelH = this.ring
      ? Math.max(200, Math.round((this.H - 34 - 18) / 1.08))
      : Math.max(200, Math.round(this.H - (mobile ? 24 : 36) - 18));
    this.stage.style.setProperty('--rw-model-h', modelH + 'px');
    const hx = this.ring ? .5 * this.W : this.cls.ax * this.W;
    const hy = this.ring ? 34 : this.cls.ay;
    this.stage.style.setProperty('--rw-hx', hx + 'px');
    this.stage.style.setProperty('--rw-hy', hy + 'px');
    this.style.setProperty('--rw-ax', (this.W ? hx / this.W * 100 : 40).toFixed(2) + '%');
    this.bodies.forEach(s => { s.w = s.el.offsetWidth; });
    this.unit = this.ring
      ? Math.max(mobile ? 90 : 120, .3 * this.W)
      : Math.max(90, this.W * this.cls.sx * 1.6);
    this.updateRanks();
    this.renderAll();
    this.kick();
  }

  /* ---------- rendering ---------- */
  put(s, x, b, sc, op, bl, z) {
    const hw = s.w * sc / 2;
    if (x + hw < -4 || x - hw > this.W + 4) op = 0;
    const st = s.el.style;
    st.transform = `translate3d(${x.toFixed(2)}px,${(-b).toFixed(2)}px,0) translateX(-50%) scale(${sc.toFixed(4)})`;
    st.opacity = op.toFixed(3);
    st.zIndex = z;
    st.visibility = op < .01 ? 'hidden' : 'visible';
    st.pointerEvents = op < .5 ? 'none' : '';
    const bb = this.blurOn ? Math.round(bl * 10) / 10 : 0;
    if (bb !== s.blur) { s.blur = bb; st.filter = bb > .05 ? `blur(${bb}px)` : ''; }
  }

  renderAll() {
    if (!this.W) return;
    if (this.ring) this.renderRing(); else this.renderClassic();
  }

  renderRing() {
    const W = this.W, H = this.H, m = this.mobile;
    const cx = .5 * W, R = (m ? .72 : .62) * W, P = (m ? 1.9 : 1.65) * W;
    const floor = H - 34, hor = .36 * H, step = TAU / this.N, fs = this.fs;
    for (const s of this.bodies) {
      let phi = ((s.a - this.cur) * step) % TAU;
      if (phi > Math.PI) phi -= TAU;
      if (phi <= -Math.PI) phi += TAU;
      const z = R * (1 - Math.cos(phi)), persp = P / (P + z), sl = Math.abs(phi) / step;
      const sc = persp * (1 + (fs - 1) * clamp(1 - sl, 0, 1));
      const x = cx + R * Math.sin(phi) * persp;
      const feet = hor + (floor - hor) * persp;
      const bl = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);
      let op = clamp((Math.cos(phi) + .55) / .3, 0, 1);
      if (this.still && sl < .02) op = 0;
      this.put(s, x, H - feet, sc, op, bl, Math.round(sc * 1000));
    }
  }

  renderClassic() {
    const c = this.cls, W = this.W;
    for (const s of this.bodies) {
      let k = s.x, e = -1;
      if (s.trip) {
        const span = Math.abs(s.goal - s.from) || 1;
        const u = clamp(Math.abs(s.x - s.from) / span, 0, 1);
        if (s.goal > s.from) { if (u < .5) e = 2 * u * 1.4; else k = s.goal + 2 * (1 - u); }
        else { if (u < .5) k = s.from + 2 * u; else e = 2 * (1 - u) * 1.4; }
      } else if (k < 0) e = Math.min(-k, 1.4);
      if (e >= 0) {
        this.put(s, W * (c.ax - c.ex * e), c.ay - 22 * e, 1 + .14 * e, Math.max(0, 1 - 1.05 * e), 4 * Math.min(e, 1), 1100);
        continue;
      }
      let op = k <= c.d - 1 ? 1 - .13 * k : Math.max(0, .61 * (c.d - k));
      if (this.still && Math.abs(k) < .02) op = 0;
      this.put(s, W * (c.ax + c.sx * k), c.ay + c.sy * k, Math.pow(c.sr, k), clamp(op, 0, 1), Math.min(.9 * k, 3.2), 1000 - Math.round(10 * k));
    }
  }

  /* ---------- loop ---------- */
  kick() {
    if (this.raf || !this.visible || document.hidden) return;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

  frame(t) {
    this.raf = 0;
    const dt = this.last ? Math.min(.034, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    const moving = this.ring ? this.stepRing(dt) : this.stepClassic(dt);
    if (moving || this.dragging) {
      this.setStill(false);
      this.renderAll();
      if (this.visible && !document.hidden) this.raf = requestAnimationFrame(this.frame);
    } else {
      this.setStill(true);
      this.renderAll();
    }
  }

  stepRing(dt) {
    if (this.reduced) { this.cur = this.target; this.vel = 0; return false; }
    const h = dt / 3;
    for (let i = 0; i < 3; i++) {
      const acc = -this.K * (this.cur - this.target) - this.C * this.vel;
      this.vel += acc * h;
      this.cur += this.vel * h;
    }
    if (Math.abs(this.cur - this.target) <= .0005 && Math.abs(this.vel) <= .0005) {
      this.cur = this.target; this.vel = 0;
      return false;
    }
    return true;
  }

  stepClassic(dt) {
    let moving = false;
    const N = this.N, h = dt / 3;
    this.cur = this.target;
    for (const s of this.bodies) {
      const goal = wrapN(s.a - this.target, N);
      if (Math.abs(goal - s.goal) > N / 2) { s.trip = true; s.from = s.x; }
      s.goal = goal;
      if (this.reduced) { s.x = s.g = goal; s.v = 0; s.trip = false; continue; }
      const tau = this.dragging ? .016 : s.trip ? .1 : .03 + this.lag * Math.min(goal, 4);
      s.g += (goal - s.g) * (1 - Math.exp(-dt / tau));
      for (let i = 0; i < 3; i++) {
        const acc = -this.K * (s.x - s.g) - this.C * s.v;
        s.v += acc * h;
        s.x += s.v * h;
      }
      if (s.trip && Math.abs(s.x - goal) < .02) s.trip = false;
      if (Math.abs(s.x - goal) <= .0006 && Math.abs(s.v) <= .0006 && Math.abs(s.g - goal) <= .0006) {
        s.x = s.g = goal; s.v = 0; s.trip = false;
      } else moving = true;
    }
    return moving;
  }

  setStill(v) {
    if (v === this.still) return;
    this.still = v;
    this.classList.toggle('rw--still', v);
  }

  /* ---------- index ---------- */
  rank(a) {
    let k = wrapN(a - Math.round(this.target), this.N);
    if (this.ring && k > this.N / 2) k -= this.N;
    return k;
  }

  updateRanks() {
    const lim = this.ring ? 2 : 3;
    for (const s of this.bodies) {
      const k = this.rank(s.a), on = k !== 0 && Math.abs(k) <= lim;
      s.hit.tabIndex = on ? 0 : -1;
      if (on) s.el.removeAttribute('aria-hidden'); else s.el.setAttribute('aria-hidden', 'true');
    }
  }

  setIndex(i, silent) {
    i = wrapN(i, this.n);
    const prevI = this.index;
    const changed = silent || i !== prevI;
    this.index = i;
    this.updateRanks();
    this.kick();
    if (!changed) return;
    if (!silent) { this.closeZoom(); if (this.mobile) this.closeSheet(); }
    this.style.setProperty('--rw-progress', ((i + 1) / this.n).toFixed(3));
    this.heroes.forEach((h, j) => {
      const on = j === i;
      h.classList.toggle('is-on', on);
      h.classList.toggle('was', !silent && j === prevI && !on);
      h.setAttribute('aria-hidden', on ? 'false' : 'true');
      const z = h.querySelector('[data-rw-zoom]');
      if (z) z.tabIndex = on ? 0 : -1;
    });
    if (!silent) {
      this.sweep();
      if (this.live) this.live.textContent = this.heroes[i].dataset.label;
    }
    this.ticks.forEach((t, j) => {
      t.setAttribute('aria-current', j === i ? 'true' : 'false');
      t.classList.toggle('is-past', j < i);
    });
    this.panels.forEach((p, j) => { p.hidden = j !== i; if (!silent) p.classList.remove('is-in'); });
    if (!silent) { void this.panels[i].offsetWidth; this.panels[i].classList.add('is-in'); }
    const tpl = this.panels[i].querySelector('template[data-rw-pieces-text]');
    if (tpl && this.piecesEl) {
      this.piecesEl.textContent = tpl.content.textContent.trim();
      if (!silent) { this.piecesEl.classList.remove('is-swap'); void this.piecesEl.offsetWidth; this.piecesEl.classList.add('is-swap'); }
    }
    this.clearHot();
    this.restartBar();
  }

  moveTo(T) {
    this.target = T;
    this.setStill(false);
    this.renderAll();
    this.setIndex(T);
  }
  next() { this.moveTo(Math.round(this.target) + 1); }
  prev() { this.moveTo(Math.round(this.target) - 1); }
  go(i) {
    let d = wrapN(i - this.index, this.n);
    if (d > this.n / 2) d -= this.n;
    this.moveTo(Math.round(this.target) + d);
  }

  sweep() {
    if (this.reduced) return;
    this.stage.classList.remove('is-sweep');
    void this.stage.offsetWidth;
    this.stage.classList.add('is-sweep');
  }

  /* ---------- autoplay ---------- */
  play(on) {
    this.playing = on;
    this.classList.toggle('is-playing', on);
    if (this.autoBtn) this.autoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.restartBar();
  }
  restartBar() {
    this.ticks.forEach(t => t.classList.remove('is-run'));
    clearTimeout(this.timer);
    if (!this.playing) return;
    void this.offsetWidth;
    this.ticks[this.index] && this.ticks[this.index].classList.add('is-run');
    this.timer = setTimeout(this.onTimer, this.speed);
  }
  onTimer() {
    if (this.playing && this.visible && !this.dragging && !document.hidden && !this.panelHover && !this.zoomed && !this.engaged) this.next();
    else this.restartBar();
  }
  engage() {
    this.engaged = true;
    if (this.playing) this.play(false);
  }

  /* ---------- drag / wheel ---------- */
  setupDrag() {
    const st = this.stage;
    st.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.zoomed) return;
      this.ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: this.target, type: e.pointerType, drag: false, samples: [{ x: e.clientX, time: e.timeStamp }] };
    });
    st.addEventListener('pointermove', e => {
      const p = this.ptr;
      if (!p || e.pointerId !== p.id) return;
      if (p.type === 'mouse' && e.buttons === 0) { this.endDrag(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (!p.drag) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > 1.2 * Math.abs(dy)) {
          p.drag = true;
          this.dragging = true;
          this.classList.add('is-dragging');
          try { st.setPointerCapture(p.id); } catch (_) {}
          this.setStill(false);
        } else {
          if (Math.abs(dy) > 10) this.ptr = null;
          return;
        }
      }
      p.samples.push({ x: e.clientX, time: e.timeStamp });
      if (p.samples.length > 6) p.samples.shift();
      this.target = p.t - dx / this.unit;
      this.renderAll();
      this.kick();
    });
    const up = e => this.endDrag(e);
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
  }

  endDrag(e) {
    const p = this.ptr;
    this.ptr = null;
    if (!p || !p.drag) return;
    this.dragging = false;
    this.classList.remove('is-dragging');
    this.suppressUntil = performance.now() + 60;
    const s = p.samples, f = s[0], l = s[s.length - 1];
    const vx = l.time - f.time > 0 ? (l.x - f.x) / (l.time - f.time) : 0;
    const dx = e.clientX - p.x, sign = -1, from = Math.round(p.t);
    if (this.mobile) {
      if (Math.abs(dx) > 30 || Math.abs(vx) > .3) this.moveTo(from + sign * (dx > 0 ? 1 : -1));
      else this.moveTo(from);
    } else {
      let i = Math.round(this.target + sign * vx * 160 / this.unit);
      if (i === from && Math.abs(vx) > .3) i = from + sign * (vx > 0 ? 1 : -1);
      i = clamp(i, from - 2, from + 2);
      this.moveTo(i);
    }
    this.restartBar();
  }

  setupWheel() {
    let acc = 0, lockUntil = 0;
    this.stage.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (performance.now() < lockUntil) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 45) {
        if (acc > 0) this.next(); else this.prev();
        acc = 0;
        lockUntil = performance.now() + 520;
      }
    }, { passive: false });
  }

  /* ---------- keyboard ---------- */
  onKey(e) {
    if (e.key !== 'Escape') return;
    if (this.sheet) {
      const add = this.sheet.card._add;
      this.closeSheet();
      add && add.focus({ preventScroll: true });
    } else if (this.zoomed) this.closeZoom();
  }

  /* ---------- clicks ---------- */
  onClick(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const c = s => t.closest(s);
    let el;
    if ((el = c('[data-rw-pick-close]'))) {
      const picker = el.closest('[data-rw-picker]') || (this.sheet && this.sheet.picker);
      if (picker) this.closePicker(picker._card, true);
      return;
    }
    if (c('[data-rw-zoom-close]')) { this.closeZoom(); return; }
    if (this.zoomed && (t === this.lb || (c('[data-rw-lb-stage]') && !c('.rw__lb-model')))) { this.closeZoom(); return; }
    if (c('[data-rw-zoom]')) { this.openZoom(); return; }
    if (c('[data-rw-next]')) { this.next(); return; }
    if (c('[data-rw-prev]')) { this.prev(); return; }
    if ((el = c('[data-rw-tick]'))) { this.go(+el.dataset.rwTick); return; }
    if (c('[data-rw-auto]')) { if (!this.playing) this.engaged = false; this.play(!this.playing); return; }
    if ((el = c('[data-rw-pin]'))) { this.engage(); this.hot(+el.dataset.rwPin, true); return; }
    if ((el = c('[data-rw-go]'))) {
      const body = el.closest('[data-rw-model]');
      const k = this.rank(+body.dataset.index);
      if (k !== 0 && Math.abs(k) < 6) this.moveTo(Math.round(this.target) + k);
      else if (k === 0) this.openZoom();
      return;
    }
    if ((el = c('[data-rw-confirm]'))) { this.confirm(el); return; }
    if ((el = c('[data-rw-add]'))) { this.togglePicker(el.closest('[data-rw-card]')); return; }
    if (c('[data-rw-all]')) { this.addAll(); return; }
  }

  onChange(e) {
    const picker = e.target.closest && e.target.closest('[data-rw-picker]');
    if (!picker) return;
    this.engage();
    this.updateOptions(picker._card, false);
  }

  /* ---------- panel / hot linking ---------- */
  setupPanel() {
    const p = this.panelEl;
    p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') this.panelHover = true; });
    p.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { this.panelHover = false; this.restartBar(); } });
    p.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('button, a, input, select, label')) this.engage();
    });
    p.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const card = e.target.closest('[data-rw-card]');
      if (card && card !== this._hoverCard) { this._hoverCard = card; this.hot(+card.dataset.rwCard, false); }
    });
    p.addEventListener('pointerout', e => {
      if (e.pointerType !== 'mouse') return;
      const card = e.target.closest('[data-rw-card]');
      if (card && !card.contains(e.relatedTarget)) { this._hoverCard = null; this.clearHot(); }
    });
  }

  hot(n, scroll) {
    this.clearHot();
    const root = this.zoomed ? this.lb : this.heroes[this.index];
    const pin = root.querySelector(`[data-rw-pin="${n}"]`);
    if (pin) pin.classList.add('is-hot');
    const card = this.panels[this.index].querySelector(`[data-rw-card="${n}"]`);
    if (card) { card.classList.add('is-hot'); if (scroll) this.reveal(card); }
  }
  clearHot() { this.querySelectorAll('.is-hot').forEach(el => el.classList.remove('is-hot')); }

  reveal(card) {
    const list = card.closest('.rw__items');
    const behavior = this.reduced ? 'auto' : 'smooth';
    if (!list) return;
    if (list.scrollWidth > list.clientWidth + 1) {
      const cr = card.getBoundingClientRect(), lr = list.getBoundingClientRect();
      list.scrollTo({ left: list.scrollLeft + cr.left - lr.left - 20, behavior });
    } else if (list.scrollHeight > list.clientHeight + 1) {
      list.scrollTo({ top: card.offsetTop - list.offsetTop - 12, behavior });
    } else {
      const r = card.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight - 140) window.scrollBy({ top: r.top - .3 * innerHeight, behavior });
    }
  }

  /* ---------- pickers ---------- */
  updateOptions(card, initial) {
    const p = card._picker;
    const sets = [...p.querySelectorAll('fieldset.rw__opt')];
    const sel = sets.map(f => { const r = f.querySelector('input:checked'); return r ? r.value : null; });
    const vs = card._variants;
    const match = vs.find(v => v.o.every((o, i) => o === sel[i]));
    sets.forEach((f, i) => f.querySelectorAll('input').forEach(inp => {
      const ok = vs.some(v => v.a && v.o[i] === inp.value && v.o.every((o, j) => j === i || o === sel[j]));
      inp.closest('.rw__pill').classList.toggle('is-unavailable', !ok);
    }));
    const conf = p.querySelector('[data-rw-confirm]');
    const lab = conf.querySelector('[data-rw-confirm-label]');
    const avail = !!(match && match.a);
    conf.disabled = !avail;
    lab.textContent = avail ? lab.dataset.add : (this.dataset.msgSoldout || 'Sold out');
    if (avail) card.dataset.selected = match.id; else delete card.dataset.selected;
    if (!initial) card.dataset.touched = '1';
  }

  isOpen(card) { return card.classList.contains('is-picking'); }

  togglePicker(card) {
    if (!card || card.classList.contains('is-added') || card.classList.contains('is-loading')) return;
    if (this.isOpen(card)) this.closePicker(card, false);
    else this.openPicker(card, true);
  }

  openPicker(card, revealIt) {
    const p = card._picker;
    if (this.mobile) {
      if (this.sheet && this.sheet.card === card) return;
      this.closeSheet();
      this.openSheet(card);
    } else {
      p.hidden = false;
      if (revealIt) this.reveal(card);
    }
    card.classList.add('is-picking');
    card._add.setAttribute('aria-expanded', 'true');
    const r = p.querySelector('input:checked') || p.querySelector('input');
    if (r) r.focus({ preventScroll: true });
  }

  closePicker(card, focusAdd) {
    if (!card) return;
    if (this.sheet && this.sheet.card === card) { this.closeSheet(); }
    else { card._picker.hidden = true; }
    card.classList.remove('is-picking');
    if (!card.classList.contains('is-added')) card._add.setAttribute('aria-expanded', 'false');
    if (focusAdd) card._add.focus({ preventScroll: true });
  }

  openSheet(card) {
    const p = card._picker;
    const host = document.createElement('div');
    host.className = 'rw-sheet-host';
    const cs = getComputedStyle(this);
    ['--rw-panel', '--rw-text', '--rw-muted', '--rw-line', '--rw-accent', '--rw-on-accent', '--rw-btn-bg', '--rw-btn-fg', '--rw-btn-radius',
      '--rw-pill-radius', '--rw-bar-r', '--rw-thumb-radius', '--rw-pt-size', '--rw-price', '--rw-opt', '--rw-ease', '--rw-ease-sheet', '--rw-ease-spring']
      .forEach(k => host.style.setProperty(k, cs.getPropertyValue(k).trim()));
    host.style.fontFamily = cs.fontFamily;
    host.style.color = cs.color;
    const scrim = document.createElement('button');
    scrim.type = 'button';
    scrim.className = 'rw__pick-scrim';
    scrim.setAttribute('data-rw-pick-close', '');
    scrim.tabIndex = -1;
    scrim.setAttribute('aria-hidden', 'true');
    host.append(scrim, p);
    document.body.append(host);
    p.hidden = false;
    host.addEventListener('click', this.onClick);
    host.addEventListener('change', this.onChange);
    host.addEventListener('keydown', this.onKey);
    this.sheet = { host, picker: p, card };
    this.classList.add('rw--picking');
    requestAnimationFrame(() => host.classList.add('is-open'));
  }

  closeSheet(redockAll) {
    if (this.sheet) {
      const { host, picker, card } = this.sheet;
      this.sheet = null;
      picker.hidden = true;
      card.append(picker);
      host.remove();
      card.classList.remove('is-picking');
      if (!card.classList.contains('is-added')) card._add.setAttribute('aria-expanded', 'false');
      this.classList.remove('rw--picking');
    }
    if (redockAll) this.querySelectorAll('[data-rw-card]').forEach(c => { if (c._picker.parentNode !== c) c.append(c._picker); });
  }

  confirm(btn) {
    const picker = btn.closest('[data-rw-picker]');
    const card = picker && picker._card;
    if (!card || card.classList.contains('is-added') || card.classList.contains('is-loading')) return;
    card.dataset.touched = '1';
    if (!card.dataset.selected) return;
    this.addCards([card], null, card.closest('[data-rw-panel]'));
  }

  async addCards(cards, cta, panel) {
    cards.forEach(c => c.classList.add('is-loading'));
    if (cta) cta.classList.add('is-loading');
    try {
      await Bag.add(cards.map(c => ({ id: +c.dataset.selected, quantity: 1 })));
      cards.forEach(c => this.markAdded(c));
    } catch (_) {
      cards.forEach(c => c.classList.remove('is-loading'));
      this.setMsg(panel, this.dataset.msgError);
    } finally {
      if (cta) cta.classList.remove('is-loading');
    }
    this.checkComplete(panel);
  }

  markAdded(card) {
    card.classList.remove('is-loading');
    this.closePicker(card, false);
    card.classList.add('is-added');
    card._add.setAttribute('aria-label', card._add.dataset.addedLabel);
    card._add.removeAttribute('aria-expanded');
    if (this.mobile && !this.reduced && navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  }

  setMsg(panel, text) {
    const el = panel && panel.querySelector('[data-rw-msg]');
    if (el) el.textContent = text || '';
  }

  checkComplete(panel) {
    if (!panel) return;
    const cards = [...panel.querySelectorAll('[data-rw-card]')];
    if (cards.length >= 2 && cards.every(c => c.classList.contains('is-added'))) {
      panel.classList.add('is-complete');
      this.setMsg(panel, '');
    }
  }

  async addAll() {
    const panel = this.panels[this.index];
    const cta = panel.querySelector('[data-rw-all]');
    if (panel.classList.contains('is-complete') || cta.classList.contains('is-loading')) return;
    this.setMsg(panel, '');
    const cards = [...panel.querySelectorAll('[data-rw-card]')].filter(c => !c.classList.contains('is-added') && !c.classList.contains('is-soldout') && !c.classList.contains('is-loading'));
    const ready = cards.filter(c => c.dataset.variantId || (c.dataset.touched && c.dataset.selected));
    const pending = cards.filter(c => !ready.includes(c));
    if (ready.length) await this.addCards(ready, cta, panel);
    if (pending.length) {
      (this.mobile ? [pending[0]] : pending).forEach(c => { if (!this.isOpen(c)) this.openPicker(c, false); });
      if (!this.mobile) this.reveal(pending[0]);
      const tpl = this.dataset.msgChoose || 'Pick a size for: [items]';
      this.setMsg(panel, tpl.replace('[items]', pending.map(c => c.dataset.title).join(', ')));
    }
  }

  /* ---------- View look popup ---------- */
  openZoom() {
    if (this.zoomed) return;
    this.engage();
    this.clearHot();
    clearTimeout(this._lbT);
    const hero = this.heroes[this.index];
    const src = hero.querySelector('.rw__morph');
    const wrap = document.createElement('div');
    wrap.className = 'rw__lb-model';
    const shadow = src.querySelector('.rw__shadow').cloneNode(true);
    const fig = src.querySelector('.rw__figure').cloneNode(true);
    const z = fig.querySelector('[data-rw-zoom]');
    if (z) z.remove();
    fig.querySelectorAll('[data-rw-pin]').forEach(p => { p.tabIndex = 0; });
    const foot = hero.style.getPropertyValue('--rw-foot');
    if (foot) wrap.style.setProperty('--rw-foot', foot);
    wrap.append(shadow, fig);
    this.lbStage.replaceChildren(wrap);
    const r = this.lbStage.getBoundingClientRect();
    const h = Math.max(160, Math.min(r.height, r.width / .5625));
    wrap.style.setProperty('--rw-model-h', h + 'px');
    fig.querySelectorAll('img').forEach(img => {
      img.loading = 'eager';
      img.sizes = Math.round(h * .5625) + 'px';
      this.decode(img);
    });
    const word = this.lb.dataset.word || 'Look';
    this.lb.querySelector('[data-rw-lb-kicker]').textContent = `${word} ${String(this.index + 1).padStart(2, '0')}`;
    this.lb.querySelector('[data-rw-lb-name]').textContent = hero.dataset.name;
    this.zoomed = true;
    this.classList.add('rw--zoom');
    this.lb.setAttribute('aria-hidden', 'false');
    this._lbAt = '';
    if (!this.reduced) {
      const a = hero.querySelector('.rw__figure').getBoundingClientRect();
      const b = fig.getBoundingClientRect();
      if (a.height && b.height) {
        this._lbAt = `translate3d(${a.left - b.left}px,${a.bottom - b.bottom}px,0) scale(${a.height / b.height})`;
        wrap.style.transformOrigin = '0 100%';
        wrap.style.transition = 'none';
        wrap.style.transform = this._lbAt;
        void wrap.offsetWidth;
        wrap.style.transition = '';
        wrap.style.transform = '';
      }
    }
    this.lb.querySelector('[data-rw-zoom-close]').focus({ preventScroll: true });
  }

  closeZoom() {
    if (!this.zoomed) return;
    this.zoomed = false;
    const wrap = this.lbStage.firstElementChild;
    if (wrap && this._lbAt && !this.reduced) wrap.style.transform = this._lbAt;
    this.classList.remove('rw--zoom');
    this.lb.setAttribute('aria-hidden', 'true');
    const hadFocus = this.lb.contains(document.activeElement);
    this._lbT = setTimeout(() => { if (!this.zoomed) this.lbStage.replaceChildren(); }, 950);
    if (hadFocus) this.stage.focus({ preventScroll: true });
    this.restartBar();
  }

  /* ---------- custom cursor ---------- */
  setupCursor() {
    if (!this.cursor) return;
    if (!FINE.matches) { this.cursor.remove(); this.cursor = null; return; }
    this.classList.add('rw--cursor');
    const cur = this.cursor;
    let x = 0, y = 0, tx = 0, ty = 0, on = false;
    const loop = () => {
      const f = this.reduced ? 1 : .18;
      x += (tx - x) * f; y += (ty - y) * f;
      if (Math.abs(tx - x) < .2 && Math.abs(ty - y) < .2) { x = tx; y = ty; this._curRaf = 0; }
      else this._curRaf = requestAnimationFrame(loop);
      cur.style.transform = `translate3d(${x}px,${y}px,0)`;
    };
    this.stage.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = this.stage.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (!on) { on = true; x = tx; y = ty; cur.classList.add('is-on'); }
      const t = e.target instanceof Element ? e.target : null;
      cur.classList.toggle('is-view', !this.dragging && !!(t && t.closest('[data-rw-zoom]')));
      cur.classList.toggle('is-link', !this.dragging && !!(t && t.closest('[data-rw-pin], .rw__hit')));
      if (!this._curRaf) this._curRaf = requestAnimationFrame(loop);
    });
    this.stage.addEventListener('pointerleave', () => {
      on = false;
      cur.classList.remove('is-on', 'is-link', 'is-view');
    });
  }

  /* ---------- feet detection ---------- */
  probeFeet() {
    this.heroes.forEach((hero, i) => {
      const url = hero.dataset.probe;
      if (!url) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        try {
          const w = 48, h = Math.max(1, Math.round(img.naturalHeight * w / img.naturalWidth));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          let last = -1;
          for (let yy = h - 1; yy >= 0 && last < 0; yy--) {
            for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 40) { last = yy; break; }
          }
          if (last < 0) return;
          const f = clamp((h - 1 - last) / h, 0, .4).toFixed(4);
          hero.style.setProperty('--rw-foot', f);
          this.bodies.forEach(s => { if (s.a % this.n === i) s.el.style.setProperty('--rw-foot', f); });
        } catch (_) { /* tainted canvas: keep offset 0 */ }
      };
      img.src = url;
    });
  }
}

if (!customElements.get('runway-section')) customElements.define('runway-section', RunwaySection);
Bag.wire();
})();
