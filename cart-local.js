/* Local demo cart for the mirrored Nikey pages.
   The mirrored store has no Shopify back end, so the theme's "Add to cart"
   (which POSTs to /cart/add.js) fails. This intercepts those clicks and keeps
   a cart in localStorage instead, with a simple slide-in cart panel. Demo only
   — nothing is sent anywhere and no payment is taken. */
(function () {
  'use strict';
  var KEY = 'nikey-cart-v1';

  /* ---------------- store ---------------- */
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (_) {} render(); }
  function count(c) { return (c || load()).reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal(c) { return (c || load()).reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
  function money(v) { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v); } catch (_) { return '$' + Number(v).toFixed(2); } }

  function add(it) {
    var c = load(), k = it.title + '|' + it.size;
    var ex = c.filter(function (x) { return x.key === k; })[0];
    if (ex) ex.qty += 1; else c.push({ key: k, title: it.title, price: it.price, size: it.size, image: it.image, qty: 1 });
    save(c);
  }
  function removeAt(i) { var c = load(); c.splice(i, 1); save(c); fill(); }

  /* ---------------- read product off the page ---------------- */
  function priceOf(t) { var m = (t || '').match(/\$\s*([\d,]+(?:\.\d+)?)/); return m ? parseFloat(m[1].replace(/,/g, '')) : 0; }
  function text(el) { return el ? el.textContent.trim() : ''; }

  function grab(btn) {
    // Scene Rail / Hand Rail detail view
    var focus = btn.closest('.sr-focus') || document.querySelector('.sr-focus.sr-focus-open');
    if (focus) {
      var sel = focus.querySelector('.sr-pill[aria-pressed="true"]') || focus.querySelector('.sr-pill');
      var img = [].slice.call(focus.querySelectorAll('img')).filter(function (i) { return /\/cdn\/shop\//.test(i.currentSrc || i.src) && i.offsetParent; })[0];
      return {
        title: text(focus.querySelector('.sr-focus-name')) || 'Item',
        price: priceOf(text(focus.querySelector('.sr-focus-price'))),
        size: text(sel),
        image: img ? (img.currentSrc || img.src) : ''
      };
    }
    // Generic: nearest dialog / modal / product component
    var scope = btn.closest('dialog, [class*="modal"], product-component, [class*="product"], .shopify-section') || document;
    var titleEl = scope.querySelector('[class*="title"]:not([class*="price"]), h1, h2, h3, [class*="name"]');
    var priceEl = scope.querySelector('[class*="price"], .price, bdi');
    var selEl = scope.querySelector('[aria-pressed="true"], [aria-checked="true"], input:checked, .is-selected, .selected');
    var im = scope.querySelector && scope.querySelector('img[src*="/cdn/shop/"]');
    return {
      title: text(titleEl) || document.title.split('–')[0].trim() || 'Item',
      price: priceOf(priceEl ? priceEl.textContent : scope.textContent || ''),
      size: selEl ? (selEl.value || text(selEl)) : '',
      image: im ? (im.currentSrc || im.src) : ''
    };
  }

  function isAddBtn(el) {
    if (!el) return false;
    var l = (el.getAttribute && (el.getAttribute('aria-label') || '') || '') + ' ' + (el.textContent || '');
    return /add to (cart|bag)/i.test(l) && !el.closest('#nikey-cart');
  }

  /* intercept add-to-cart in capture phase, before the theme's failing POST */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('button, a, [role="button"]');
    if (!isAddBtn(btn)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { add(grab(btn)); } catch (_) {}
    var msg = document.querySelector('.sr-qa-msg'); if (msg) { msg.textContent = ''; msg.className = msg.className.replace(/sr-err/g, ''); }
    openCart();
  }, true);

  /* intercept the header cart icon -> open our panel (theme drawer is hidden) */
  document.addEventListener('click', function (e) {
    var ci = e.target.closest && e.target.closest('cart-icon, #cart-icon-bubble, a[href$="/cart"], [class*="cart-icon"], button[aria-label*="cart" i], a[aria-label*="cart" i]');
    if (!ci || isAddBtn(ci) || (e.target.closest && e.target.closest('#nikey-cart'))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openCart();
  }, true);

  /* ---------------- panel ---------------- */
  var el = null, listEl, totalEl;
  function build() {
    var s = document.createElement('style');
    s.textContent =
      '#nikey-cart{position:fixed;inset:0;z-index:2147483000;display:none;font-family:Helvetica,Arial,sans-serif}' +
      '#nikey-cart.open{display:block}' +
      '#nikey-cart .nc-scrim{position:absolute;inset:0;background:rgba(0,0,0,.38)}' +
      '#nikey-cart .nc-panel{position:absolute;top:0;right:0;height:100%;width:min(420px,92vw);background:#fff;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,.18);transform:translateX(8px);transition:transform .25s ease}' +
      '#nikey-cart .nc-panel>header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #eee}' +
      '#nikey-cart h2{margin:0;font-size:18px;font-weight:700}' +
      '#nikey-cart .nc-x{border:0;background:none;font-size:18px;cursor:pointer;line-height:1;padding:6px}' +
      '#nikey-cart .nc-items{flex:1;overflow:auto;padding:8px 22px}' +
      '#nikey-cart .nc-empty{color:#777;font-size:14px;padding:40px 0;text-align:center}' +
      '#nikey-cart .nc-row{display:grid;grid-template-columns:62px 1fr auto;gap:14px;align-items:center;padding:16px 0;border-bottom:1px solid #f0f0f0}' +
      '#nikey-cart .nc-row img{width:62px;height:76px;object-fit:contain;background:#f6f6f6}' +
      '#nikey-cart .nc-t{margin:0 0 4px;font-size:14px;font-weight:600}' +
      '#nikey-cart .nc-s{margin:0;font-size:12px;color:#777}' +
      '#nikey-cart .nc-p{margin:6px 0 0;font-size:13px;font-weight:600}' +
      '#nikey-cart .nc-rm{border:0;background:none;color:#999;font-size:15px;cursor:pointer;align-self:start;padding:4px}' +
      '#nikey-cart .nc-panel>footer{border-top:1px solid #eee;padding:18px 22px 22px}' +
      '#nikey-cart .nc-sub{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;font-size:14px}' +
      '#nikey-cart .nc-total{font-size:18px;font-weight:700}' +
      '#nikey-cart .nc-checkout{width:100%;height:50px;border:0;background:#111;color:#fff;font-size:15px;font-weight:700;cursor:pointer}' +
      '#nikey-cart .nc-note{margin:12px 0 0;font-size:11px;color:#999;text-align:center;line-height:1.5}' +
      'theme-drawer#cart-drawer{display:none!important}';
    document.head.appendChild(s);

    el = document.createElement('div'); el.id = 'nikey-cart';
    el.innerHTML =
      '<div class="nc-scrim"></div><aside class="nc-panel" role="dialog" aria-label="Cart">' +
      '<header><h2>Your cart</h2><button class="nc-x" aria-label="Close">✕</button></header>' +
      '<div class="nc-items"></div>' +
      '<footer><div class="nc-sub"><span>Subtotal</span><strong class="nc-total"></strong></div>' +
      '<button class="nc-checkout">Checkout</button>' +
      '<p class="nc-note">Demo cart — saved in your browser. No payment is taken.</p></footer></aside>';
    document.body.appendChild(el);
    listEl = el.querySelector('.nc-items'); totalEl = el.querySelector('.nc-total');
    el.querySelector('.nc-scrim').addEventListener('click', closeCart);
    el.querySelector('.nc-x').addEventListener('click', closeCart);
    el.querySelector('.nc-checkout').addEventListener('click', function () {
      alert('This is a demo store — checkout isn’t available.');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
  }

  function fill() {
    if (!el) return;
    var c = load();
    if (!c.length) { listEl.innerHTML = '<p class="nc-empty">Your cart is empty.</p>'; totalEl.textContent = money(0); return; }
    listEl.innerHTML = c.map(function (i, idx) {
      return '<div class="nc-row">' +
        (i.image ? '<img src="' + i.image + '" alt="">' : '<span></span>') +
        '<div><p class="nc-t">' + esc(i.title) + '</p><p class="nc-s">' + (i.size ? 'Size ' + esc(i.size) + ' · ' : '') + 'Qty ' + i.qty + '</p><p class="nc-p">' + money(i.price * i.qty) + '</p></div>' +
        '<button class="nc-rm" data-i="' + idx + '" aria-label="Remove">✕</button></div>';
    }).join('');
    totalEl.textContent = money(subtotal(c));
    [].forEach.call(listEl.querySelectorAll('.nc-rm'), function (b) { b.addEventListener('click', function () { removeAt(+b.dataset.i); }); });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function openCart() { if (!el) build(); fill(); el.classList.add('open'); try { document.documentElement.style.overflow = 'hidden'; } catch (_) {} }
  function closeCart() { if (el) { el.classList.remove('open'); try { document.documentElement.style.overflow = ''; } catch (_) {} } }

  /* ---------------- navigation router ----------------
     Catches any link to a store route — including ones the page scripts set at
     runtime (e.g. Nike Orbit's "View details", the wide-header "Sign In") — and
     sends it to the local equivalent so nothing hits the store/password page. */
  var PAGES = {
    '/pages/nike-orbit': './nike-orbit.html',
    '/pages/scene-rail': './hand-rail-pro.html',
    '/pages/shoe-atelier': './shoe-atelier.html',
    '/pages/runway': './index.html'
  };
  function mapLocal(p) {
    if (PAGES[p]) return PAGES[p];
    if (/^\/(account|customer_authentication)/.test(p))
      return './login.html?from=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html');
    return './home.html';   // products, search, collections, cart, root, other pages
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.closest('#nikey-cart')) return;
    var url; try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (url.hostname !== 'nike-makknzjs.myshopify.com' && url.origin !== location.origin) return;
    var p = url.pathname;
    if (/\.html$/.test(p) || p.indexOf('/cdn/') === 0) return;         // local page / asset
    if (!/^\/(products|collections|account|search|pages|cart|customer_authentication)(\/|$)/.test(p) && p !== '/') return;
    e.preventDefault(); e.stopImmediatePropagation();
    location.href = mapLocal(p);
  }, true);

  /* ---------------- header count ---------------- */
  function render() {
    var n = count();
    [].forEach.call(document.querySelectorAll('.cart-bubble__text-count, [data-testid="cart-bubble"], [data-cart-count], .cart-count-bubble'), function (e2) {
      e2.textContent = n;
      if (n > 0) e2.classList.remove('hidden'); else e2.classList.add('hidden');
    });
    if (el && el.classList.contains('open')) fill();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
