// Builds ../index.html from style.css, runway.js, the catalog and the font.
// Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(here, f));
const A = 'https://reel-ref-try-the-look.vercel.app/assets/';
const SID = 'template--28035983671601__the_runway_wdM8BG';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = v => '$' + v.toFixed(2);

// ---- Catalog (images rewritten to absolute URLs) ----
const catalog = JSON.parse(read('native-catalog.json'));
catalog.looks.forEach(l => { l.image = A + l.image.replace(/^assets\//, ''); });
catalog.items.forEach(i => { i.image = A + i.image.replace(/^assets\//, ''); });
const byId = Object.fromEntries(catalog.items.map(i => [i.id, i]));

// Panel-only product details
const P = {
  'tatum-5-orbit-copy':       { vendor: 'Nikey | Password: 1', legend: 'Shoe size', h: 400, h160: 160 },
  'tatum-5-orbit':            { vendor: 'Nikey | Password: 1', legend: 'Shoe size', h: 400, h160: 160 },
  'air-jordan-12-retro-copy': { vendor: 'Nikey | Password: 1', legend: 'Shoe size', h: 400, h160: 160 },
  'tshirt':          { vendor: 'Nike', legend: 'Size', h: 563, h160: 225 },
  'sweatshirt':      { vendor: 'Nike', legend: 'Size', h: 581, h160: 232 },
  'sweatshirt-plus': { vendor: 'Nike', legend: 'Size', h: 610, h160: 244 },
  'hoodie':          { vendor: 'Nike', legend: 'Size', h: 555, h160: 222 },
  'hoodie-black':    { vendor: 'Nike', legend: 'Size', h: 536, h160: 214 },
};

const PIN_A = [[47, 27], [48, 58], [45, 96]];
const PIN_B = [[50, 28], [48, 58], [45, 88]];
const LOOKS = [
  { name: 'The City Edit',   key: 'bndthK', model: 1, pins: PIN_A, tags: {} },
  { name: 'Gallery Opening', key: 'XckgG6', model: 5, pins: PIN_B, tags: { 2: 'New' } },
  { name: 'Gallery Opening', key: 'rLfAhC', model: 4, pins: PIN_B, tags: { 2: 'New' } },
  { name: 'Studio Day',      key: 'FKg67q', model: 6, pins: PIN_B, tags: {} },
  { name: 'Studio Day',      key: '8KREEE', model: 3, pins: PIN_B, tags: {} },
  { name: 'Studio Day',      key: 'N3bfm9', model: 2, pins: PIN_B, tags: {} },
].map((l, i) => ({ ...l, products: catalog.looks[i].products }));

const SIZES = '(min-width: 1800px) 540px, (min-width: 750px) 420px, 320px';
const modelImg = (l) => {
  const s = `${A}model-${l.model}-640.webp`, o = `${A}original-look-${l.model}.webp`;
  return `<img src="${s}" srcset="${s} 640w, ${o} 1080w" sizes="${SIZES}" loading="eager" decoding="async" width="1100" height="1956" draggable="false" data-model-image alt="${esc(l.name)}">`;
};
const label = (l, i) => `Look ${i + 1}: ${l.name}`;
const pad = i => String(i + 1).padStart(2, '0');

const svgArrowL = '<svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M25 7H1M7 1L1 7l6 6"/></svg>';
const svgArrowR = '<svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 7h24M19 1l6 6-6 6"/></svg>';
const svgX = (w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>`;

// ---- Queue bodies ----
const bodies = LOOKS.map((l, i) => `
<div class="rw__model" data-rw-model data-index="${i}" aria-hidden="true"><span class="rw__shadow"></span><div class="rw__figure" style="--rw-ar: 0.5625"><div class="rw__art">${modelImg(l)}<button type="button" class="rw__hit" data-rw-go="${i}" aria-label="${esc(label(l, i))}" tabindex="-1"></button></div></div></div>`).join('');

// ---- Heroes ----
const heroes = LOOKS.map((l, i) => {
  const pins = l.pins.map(([x, y], k) => {
    const n = k + 1, name = byId[l.products[k]].name;
    return `<button type="button" class="rw__pin" data-rw-pin="${n}" data-tip="${esc(name)}" style="left:${x}%; top:${y}%; --pi:${n}" aria-label="${n}: ${esc(name)}" tabindex="-1"><span class="rw__pin-dot">${n}</span></button>`;
  }).join('');
  return `
<div class="rw__hero${i === 0 ? ' is-on' : ''}" data-rw-hero data-index="${i}" data-name="${esc(l.name)}" data-label="${esc(label(l, i))}" data-probe="${A}model-${l.model}-640.webp" aria-hidden="${i === 0 ? 'false' : 'true'}"><div class="rw__morph"><span class="rw__shadow"></span><div class="rw__figure" style="--rw-ar: 0.5625"><div class="rw__art">${modelImg(l)}<button type="button" class="rw__zoom" data-rw-zoom aria-label="View look: ${esc(l.name)}" tabindex="${i === 0 ? 0 : -1}"></button><div class="rw__pins">${pins}</div></div></div></div></div>`;
}).join('');

// ---- Ticks ----
const ticks = LOOKS.map((l, i) => `
<button type="button" class="rw__tick" data-rw-tick="${i}" aria-current="${i === 0}" aria-label="${esc(label(l, i))}"><span class="rw__tick-bar"></span><span class="rw__tick-label">${pad(i)}<span class="rw__tick-name">&nbsp;&nbsp;${esc(l.name)}</span></span></button>`).join('');

// ---- Panels ----
const item = (l, k) => {
  const n = k + 1, it = byId[l.products[k]], d = P[it.id];
  const pid = `Picker-${SID}-look_${l.key}-${n}`, rname = `Opt-${SID}-look_${l.key}-${n}-1`;
  const tag = l.tags[n] ? `<span class="rw__tag"><span class="rw__tag-text">${l.tags[n]}</span></span>` : '';
  const pills = it.sizes.map((s, j) => `<label class="rw__pill"><input type="radio" name="${rname}" value="${esc(s)}" data-rw-option="0"${j === 0 ? ' checked' : ''}><span class="rw__pill-label">${esc(s)}</span></label>`).join('');
  const variants = JSON.stringify(it.variants.map(v => ({ id: v.id, a: v.a, o: v.o })));
  return `
<li class="rw__item" data-rw-card="${n}" style="--i:${n}" data-title="${esc(it.name)}">${tag}
<a class="rw__media" href="${it.url}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="${it.image}" loading="lazy" decoding="async" alt="" width="400" height="${d.h}"><span class="rw__num">${n}</span></a>
<div class="rw__info"><span class="rw__type">${esc(d.vendor)}</span><a class="rw__name" href="${it.url}" target="_blank" rel="noopener noreferrer">${esc(it.name)}</a><span class="rw__price"><span>${money(it.price)}</span></span></div>
<button type="button" class="rw__add" data-rw-add aria-expanded="false" aria-controls="${pid}" aria-label="Add to bag: ${esc(it.name)}" data-added-label="Added to bag: ${esc(it.name)}"><svg class="rw__add-plus" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg><svg class="rw__add-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7"/></svg><svg class="rw__add-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg></button>
<div class="rw__picker" id="${pid}" data-rw-picker hidden>
<div class="rw__picker-head"><img class="rw__picker-thumb" src="${it.image}" loading="lazy" decoding="async" alt="" width="160" height="${d.h160}"><div class="rw__picker-meta"><span class="rw__picker-title">${esc(it.name)}</span><span class="rw__picker-price">${money(it.price)}</span></div><button type="button" class="rw__pick-close" data-rw-pick-close aria-label="Close size picker">${svgX(18)}</button></div>
<fieldset class="rw__opt"><legend class="rw__opt-name">${d.legend}</legend><div class="rw__values">${pills}</div></fieldset>
<button type="button" class="rw__confirm" data-rw-confirm><span data-rw-confirm-label data-add="Add to bag">Add to bag</span><span class="rw__sr"> — ${esc(it.name)}</span></button>
<script type="application/json" data-rw-variants>${variants}</script>
</div>
</li>`;
};

const panels = LOOKS.map((l, i) => {
  const total = l.products.reduce((s, id) => s + byId[id].price, 0);
  const bundle = Math.round(total * 0.9 * 100) / 100;
  return `
<div class="rw__look-panel${i === 0 ? ' is-in' : ''}" data-rw-panel="${i}"${i === 0 ? '' : ' hidden'}>
<div class="rw__mhead"><span class="rw__mhead-title">${esc(l.name)}</span><span class="rw__label">${l.products.length} pieces</span></div>
<ul class="rw__items" role="list">${l.products.map((_, k) => item(l, k)).join('')}
</ul>
<div class="rw__bundle has-rule">
<p class="rw__msg" data-rw-msg role="status" aria-live="polite"></p>
<div class="rw__bundle-row"><div class="rw__bundle-copy"><span class="rw__bundle-title">Complete the look</span><span class="rw__bundle-note">Bundle all ${l.products.length} and save 10%</span></div><div class="rw__bundle-price"><s>${money(total)}</s><strong>${money(bundle)}</strong></div></div>
<button type="button" class="rw__cta" data-rw-all><span class="rw__cta-add">Add full look to bag</span><span class="rw__cta-m">Add full look — ${money(bundle)}</span><span class="rw__cta-done">Full look in your bag</span><svg class="rw__cta-arrow" width="22" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 7h24M19 1l6 6-6 6"/></svg><svg class="rw__cta-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg></button>
</div>
<template data-rw-pieces-text>${l.products.length} pieces</template>
</div>`;
}).join('');

const tokens = `--rw-c-stage: #ffffff; --rw-c-panel: #ffffff; --rw-c-text: #151413; --rw-c-muted: #66625c; --rw-c-accent: #0e0e0e; --rw-c-on-accent: #ffffff; --rw-c-line: #c8c8c8; --rw-card: #DFDFDF; --rw-hf: var(--font-heading--family, inherit); --rw-hw: 400; --rw-h-d: 46px; --rw-h-m: 24px; --rw-sub-d: 12px; --rw-sub-m: 12px; --rw-eyebrow-d: 11px; --rw-eyebrow-m: 10px; --rw-label-d: 10px; --rw-label-m: 9px; --rw-chip-d: 17px; --rw-chip-m: 18px; --rw-ph-d: 18px; --rw-ph-m: 16px; --rw-pt-size-d: 13px; --rw-pt-size-m: 12px; --rw-price-d: 12px; --rw-price-m: 12px; --rw-opt-d: 11px; --rw-opt-m: 11px; --rw-total-d: 16px; --rw-total-m: 16px; --rw-thumb-d: 92px; --rw-thumb-m: 62px; --rw-tag-top: 18px; --rw-tag-left: 0px; --rw-thumb-radius: 0px; --rw-morph: 900ms; --rw-bar-r: 20px; --rw-panel-w: 380px; --rw-panel-pad-d: 32px; --rw-radius: 0px; --rw-max: none; --rw-speed: 5s; --rw-ax: 40%; --rw-btn-radius: 0px; --rw-pill-radius: 30px; --rw-add-radius: 20px;`;

const css = read('style.css').toString().replace('__INTER__', 'data:font/woff2;base64,' + read('inter-600.woff2').toString('base64'));
const js = read('runway.js').toString().replace('__CATALOG__', JSON.stringify(catalog));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#ffffff">
<title>Try the Look — Runway</title>
<meta name="description" content="Six looks, styled head to toe. Explore the runway, isolate a look, and tap a pin to see the piece.">
<link rel="preload" as="image" href="${A}model-1-640.webp" fetchpriority="high">
<style>
${css}
</style>
</head>
<body>
<header class="site-header shopify-section-group-header-group">
<a href="./" class="brand" aria-label="Runway home"><img src="${A}nike-logo.svg" width="68" height="24" alt="Nike"></a>
<nav aria-label="Main navigation"><a href="./">Home</a><a href="https://nike-makknzjs.myshopify.com/pages/nike-orbit" target="_blank" rel="noopener noreferrer">Nike Orbit</a><a href="https://nike-makknzjs.myshopify.com/pages/scene-rail" target="_blank" rel="noopener noreferrer">Hand Rail Pro</a><a href="./" aria-current="page">Runway</a></nav>
<button type="button" id="open-bag" aria-label="Open styling bag"><svg width="22" height="24" viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 8h16l1 16H3L4 8zM8 8V6a4 4 0 0 1 8 0v2"/></svg><span data-cart-count>0</span></button>
</header>
<main>
<runway-section id="Runway-${SID}" class="rw rw--add-icon rw--popup rw--list has-dividers has-border" data-feel="balanced" data-blur="true" data-mblur="true" data-style="ring" data-mstyle="classic" data-fit="true" data-height-mode="original" data-height-vh="100" data-mheight-mode="custom" data-mheight-vh="109" data-reflect="false" data-autoplay="true" data-speed="5000" data-after-add="stay" data-bundle-code="" data-msg-choose="Pick a size for: [items]" data-msg-error="Couldn’t add to bag. Please try again." data-msg-soldout="Sold out" style="${tokens}">
<div class="rw__sticky"><div class="rw__grid">
<div class="rw__left">
<div class="rw__head"><div class="rw__intro"><h2 class="rw__title">Try the Look.</h2><p class="rw__sub">Six looks, styled head to toe. Tap a pin to see the piece.</p></div><span class="rw__sr" aria-live="polite" aria-atomic="true" data-rw-live></span></div>
<div class="rw__stage" data-rw-stage tabindex="0" role="region" aria-roledescription="carousel" aria-label="Try the Look. — use arrow keys or swipe to change look">
<div class="rw__actors" data-rw-actors>${bodies}
</div>
<div class="rw__heroes" data-rw-heroes>${heroes}
</div>
<span class="rw__sweep"></span>
<span class="rw__cursor" data-rw-cursor><span class="rw__cursor-in"><span class="rw__cursor-label rw__cursor-drag">Drag</span><span class="rw__cursor-label rw__cursor-view">View</span></span></span>
<span class="rw__walk"><span class="rw__walk-line"></span></span>
</div>
<div class="rw__controls">
<button type="button" class="rw__icon" data-rw-prev aria-label="Previous look">${svgArrowL}</button>
<div class="rw__ticks">${ticks}
</div>
<button type="button" class="rw__icon rw__auto" data-rw-auto aria-pressed="false" aria-label="Autoplay"><svg class="rw__ico-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg><svg class="rw__ico-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z"/></svg></button>
<button type="button" class="rw__icon" data-rw-next aria-label="Next look">${svgArrowR}</button>
</div>
<div class="rw__lb" data-rw-lb data-word="Look" role="region" aria-label="View look" aria-hidden="true">
<div class="rw__lb-stage" data-rw-lb-stage></div>
<div class="rw__lb-top"><p class="rw__lb-cap"><span class="rw__lb-kicker" data-rw-lb-kicker></span><span class="rw__lb-name" data-rw-lb-name></span></p><button type="button" class="rw__lb-close" data-rw-zoom-close aria-label="Close">${svgX(16)}</button></div>
<p class="rw__lb-hint">Tap a dot to shop the piece</p>
</div>
</div>
<div class="rw__panel has-rule"><div class="rw__panel-inner">
<div class="rw__panel-head"><h3 class="rw__panel-title">In this look</h3><span class="rw__label" data-rw-pieces>3 pieces</span></div>${panels}
</div></div>
</div></div>
</runway-section>
</main>
<dialog id="bag-dialog" aria-labelledby="bag-title">
<div class="bag-heading"><h2 id="bag-title">Your styling bag</h2><button type="button" id="close-bag" aria-label="Close styling bag">×</button></div>
<p class="bag-note">A local outfit shortlist. No payment or order is collected here. Open a piece on the original demo to continue.</p>
<div id="bag-items"></div>
<p id="bag-total"></p>
<button type="button" id="export-bag">Download outfit shortlist</button>
</dialog>
<div id="bag-status" role="status" aria-live="polite"></div>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
</body>
</html>
`;

writeFileSync(join(here, '..', 'index.html'), html);
console.log('index.html written:', (html.length / 1024).toFixed(1), 'KB');
