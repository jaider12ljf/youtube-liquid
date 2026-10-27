// YouTube (Liquid Glass) — interfaz.
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const host = window.host;
const body = document.body;

// ---------- formato ----------
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
function ago(iso) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  for (const [u, v] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]])
    if (Math.abs(s) >= v) return rtf.format(Math.round(s / v), u);
  return 'hace un momento';
}
const dec = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('es-CO', { maximumFractionDigits: d });
function count(n) {
  if (n >= 1e9) return Math.round(n / 1e6).toLocaleString('es-CO') + ' M';
  if (n >= 1e6) return dec(n / 1e6, n < 1e7 ? 1 : 0) + ' M';
  if (n >= 1e3) return dec(n / 1e3, n < 1e4 ? 1 : 0) + ' mil';
  return String(n);
}
const views = n => n >= 1e6 ? count(n) + ' de vistas' : count(n) + (n === 1 ? ' vista' : ' vistas');
function dur(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}
const hue = s => [...String(s || '?')].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;
const avatar = (name, url, cls = '') => `<div class="avatar ${cls}" style="background:linear-gradient(160deg,hsl(${hue(name)} 72% 64%),hsl(${(hue(name) + 38) % 360} 76% 50%))">${esc((name || '?').trim()[0] || '?').toUpperCase()}${url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</div>`;
const icon = window.icon;
const longDate = iso => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

// imágenes: aparecen suave y los avatares rotos vuelven a la inicial
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('ok'); }, true);
document.addEventListener('error', e => { const t = e.target; if (t.tagName !== 'IMG') return; if (t.closest('.avatar')) t.remove(); else if (t.dataset.fb && t.src !== t.dataset.fb) t.src = t.dataset.fb; }, true);

// ---------- estado ----------
const S = { me: null, subs: [], ui: {}, route: { name: 'home' }, lists: {}, listSeq: 0, tok: 0 };

// ---------- API ----------
async function api(name, ...args) {
  try { return await host.yt(name, ...args); }
  catch (e) {
    if (e.code === 'signed_out') { showOnb(await host.auth.status()); }
    else toast(e.message || 'Algo falló');
    throw e;
  }
}

// ---------- aviso ----------
let toastT;
function toast(msg, ms = 3200, action) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (action ? `<button class="t-act">${esc(action.label)}</button>` : '');
  t.style.pointerEvents = action ? 'auto' : 'none';
  if (action) $('.t-act', t).onclick = () => { action.fn(); t.style.pointerEvents = 'none'; Spring.animate(t, [{ opacity: 1 }, { opacity: 0 }], 'smooth'); };
  clearTimeout(toastT);
  Spring.animate(t, [{ transform: 'translate(-50%,-80px)', opacity: 0 }, { transform: 'translate(-50%,0)', opacity: 1 }], 'bouncy');
  toastT = setTimeout(() => Spring.animate(t, [{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-80px)', opacity: 0 }], 'smooth'), ms);
}

// ---------- brillo que sigue al puntero ----------
let rafP = 0, lastE;
document.addEventListener('pointermove', e => {
  lastE = e;
  if (rafP) return;
  rafP = requestAnimationFrame(() => {
    rafP = 0;
    const el = lastE.target.closest?.('.lg');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--lx', ((lastE.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--ly', ((lastE.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  });
}, { passive: true });

// ---------- ventana ----------
$('#winctl').addEventListener('click', e => { const b = e.target.closest('button'); if (b) host.win(b.dataset.w); });
$('.dragbar').addEventListener('dblclick', () => host.win('max'));
host.onWin((k, v) => { if (k === 'max') $('[data-w="max"] use').setAttribute('href', v ? '#i-restore' : '#i-max'); });

// ---------- navegación ----------
const navBtn = ([k, t, i]) => `<button data-go="${k}">${icon(i)}<span>${t}</span></button>`;
const PARENT = { channel: 'subs', playlist: 'lists' };
$('#nav').insertAdjacentHTML('beforeend', [['home', 'Inicio', 'home'], ['shorts', 'Shorts', 'shorts'], ['subs', 'Suscripciones', 'subs']].map(navBtn).join('')
  + `<hr><button data-go="you" class="you-h"><span>Tú</span>${icon('chevron')}</button>`
  + [['lists', 'Listas de reproducción', 'list'], ['likes', 'Videos que me gustan', 'thumb']].map(navBtn).join(''));
$('#tabs').insertAdjacentHTML('beforeend', [['home', 'Inicio', 'home'], ['shorts', 'Shorts', 'shorts'], ['subs', 'Suscripciones', 'subs'], ['you', 'Tú', 'user']].map(navBtn).join(''));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { go(g.dataset.go); return; }
  const c = e.target.closest('[data-chan]');
  if (c) { e.stopPropagation(); go('channel', { id: c.dataset.chan }); }
});

function setActive(name) {
  const key = PARENT[name] || name;
  for (const wrap of [$('#nav'), $('#tabs')]) {
    const pill = $('.pill', wrap);
    const btn = $(`[data-go="${key}"]`, wrap) || (['lists', 'likes'].includes(key) ? $('[data-go="you"]', wrap) : null);
    $$('button', wrap).forEach(b => b.classList.toggle('on', b === btn));
    if (!btn) { pill.style.opacity = 0; continue; }
    pill.style.opacity = 1;
    if (wrap.id === 'nav') pill.style.transform = `translateY(${btn.offsetTop}px)`;
    else { pill.style.width = btn.offsetWidth + 'px'; pill.style.transform = `translateX(${btn.offsetLeft}px)`; }
  }
}

function applyNavStyle(style, animate = false) {
  body.classList.toggle('nav-cap', style === 'cap');
  body.classList.toggle('nav-side', style !== 'cap');
  if (!animate) { body.classList.add('no-anim'); requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove('no-anim'))); }
  requestAnimationFrame(() => setActive(S.route.name));
}

// ---------- router ----------
let heroTimer = null;
async function go(name, params = {}) {
  if (S.watchOpen) closeWatch();
  closePop();
  clearInterval(heroTimer);
  S.route = { name, ...params };
  const tok = ++S.tok;
  setActive(name);
  const page = $('#page');
  page.innerHTML = ''; page.onclick = null;
  $('#scroll').scrollTop = 0;
  Spring.animate(page, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], 'smooth', { fill: 'backwards' });
  try { await PAGES[name](page, params, () => tok === S.tok); } catch (e) { console.error(e); }
}

// ---------- tarjetas ----------
function regList(videos) { const k = 'l' + (++S.listSeq); S.lists[k] = videos; return k; }
const thumbImg = v => `<img src="${esc(v.thumb)}" alt="" loading="lazy" decoding="async">`;
function card(v, l, i) {
  return `<div class="card" data-l="${l}" data-i="${i}">
    <div class="thumb">${thumbImg(v)}${v.live === 'live' ? '<span class="badge">EN VIVO</span>' : v.duration ? `<span class="dur">${dur(v.duration)}</span>` : ''}</div>
    <div class="meta-row"><button data-chan="${esc(v.channelId)}">${avatar(v.channelTitle, v.avatar)}</button><div>
      <div class="v-title" title="${esc(v.title)}">${esc(v.title)}</div>
      <div class="v-sub"><button data-chan="${esc(v.channelId)}">${esc(v.channelTitle)}</button></div><div class="v-sub">${v.views ? views(v.views) + ' • ' : ''}${ago(v.publishedAt)}</div>
    </div></div></div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('.card[data-l], .item[data-l]');
  if (!c || e.target.closest('[data-chan]')) return;
  const list = S.lists[c.dataset.l];
  if (list) play(list[+c.dataset.i], list, $('.thumb', c));
});
const skeleton = n => `<div class="grid">${Array.from({ length: n }, () => `<div class="card"><div class="thumb sk"></div><div class="sk sk-line" style="width:88%"></div><div class="sk sk-line" style="width:55%"></div></div>`).join('')}</div>`;
const empty = (ic, title, msg) => `<div class="empty"><div>${icon(ic)}<b>${esc(title)}</b>${esc(msg)}</div></div>`;

// cuadrícula con carga infinita
function pagedGrid(el, fetchPage, isLive, emptyHtml) {
  let next, busy = false, all = [];
  const grid = document.createElement('div'); grid.className = 'grid';
  const more = document.createElement('div'); more.className = 'more';
  el.append(grid, more);
  const l = regList(all);
  const load = async () => {
    if (busy || next === null) return;
    busy = true; more.innerHTML = '<i></i>';
    try {
      const r = await fetchPage(next);
      if (!isLive()) return;
      const start = all.length;
      all.push(...r.videos);
      grid.insertAdjacentHTML('beforeend', r.videos.map((v, k) => card(v, l, start + k)).join(''));
      next = r.next || null;
      if (!all.length && emptyHtml) grid.outerHTML = emptyHtml;
    } catch { next = null; }
    finally { busy = false; more.innerHTML = ''; }
    if (next !== null && more.getBoundingClientRect().top < innerHeight + 900) load();
  };
  new IntersectionObserver(es => { if (es[0].isIntersecting) load(); }, { root: $('#scroll'), rootMargin: '900px' }).observe(more);
  load();
  return all;
}

// ---------- páginas ----------
const PAGES = {};
const head = (title, kicker = '', actions = '') => `<header class="page-head"><div>${kicker ? `<div class="kicker">${kicker}</div>` : ''}<h1 class="h-large">${title}</h1></div><div class="head-actions">${actions}</div></header>`;

PAGES.home = async (el, p, live) => {
  el.innerHTML = `<div class="chips-row"><div class="chips"></div><button id="refresh" class="btn soft round" title="Actualizar">${icon('refresh')}</button></div><div class="hero sk"></div>` + skeleton(8);
  $('#refresh', el).onclick = async e => {
    const b = e.currentTarget; b.classList.add('spin');
    try { const r = await api('feed', true); if (live()) renderHome(el, r.videos); } finally { b.classList.remove('spin'); }
  };
  const cached = await host.yt('cachedFeed').catch(() => null);
  if (cached?.videos?.length && live()) renderHome(el, cached.videos);
  try {
    const r = await api('feed', false);
    if (live() && (!cached || r.t !== cached.t)) renderHome(el, r.videos, !!cached);
  } catch (e) { console.error(e); }
};
const CHIPS = [['all', 'Todos'], ['today', 'Hoy'], ['recent', 'Subidos recientemente'], ['week', 'Esta semana'], ['long', 'Videos'], ['live', 'En vivo']];
function renderHome(el, videos, keepScroll = false) {
  const sc = $('#scroll'), y = sc.scrollTop;
  $$('.hero, .grid, .empty', el).forEach(n => n.remove()); $('.chips', el).innerHTML = '';
  if (!videos.length) { $('.chips', el).innerHTML = ''; el.insertAdjacentHTML('beforeend', empty('subs', 'Todavía no hay videos', 'Cuando te suscribas a canales, lo nuevo aparece aquí.')); return; }
  const heroes = videos.filter(v => !v.short && v.live !== 'upcoming').slice(0, 5);
  const hl = regList(heroes);
  el.insertAdjacentHTML('beforeend', `<section class="hero">${heroes.map((v, i) => `
    <div class="slide${i ? '' : ' on'}"><img src="${esc(v.thumbHi || v.thumb)}" data-fb="${esc(v.thumb)}" alt="">
      <div class="info"><div class="kick">${v.live === 'live' ? 'En vivo' : 'Nuevo'} · ${esc(v.channelTitle)}</div><h2>${esc(v.title)}</h2>
      <p>${v.duration ? dur(v.duration) + ' · ' : ''}${ago(v.publishedAt)}${v.views ? ' · ' + views(v.views) : ''}</p>
      <div class="btns"><button class="cta primary" data-hero="${i}">${icon('play')}Reproducir</button>
      <button class="cta round lg dark" data-refract="22" data-chan="${esc(v.channelId)}" title="Ir al canal">${icon('subs')}</button></div></div></div>`).join('')}
    <div class="dots lg dark" data-refract="12">${heroes.map((_, i) => `<button data-dot="${i}" class="${i ? '' : 'on'}"></button>`).join('')}</div></section><div class="grid"></div>`);
  $('.chips', el).innerHTML = CHIPS.map(([k, t]) => `<button class="chip${k === (S.chip || 'all') ? ' on' : ''}" data-chip="${k}">${t}</button>`).join('');
  const hero = $('.hero', el);
  let hi = 0;
  const show = i => { hi = (i + heroes.length) % heroes.length; $$('.slide', hero).forEach((s, k) => s.classList.toggle('on', k === hi)); $$('[data-dot]', hero).forEach((d, k) => d.classList.toggle('on', k === hi)); };
  hero.onclick = e => {
    const d = e.target.closest('[data-dot]'); if (d) { show(+d.dataset.dot); restart(); return; }
    const b = e.target.closest('[data-hero]'); if (b) play(heroes[+b.dataset.hero], S.lists[hl], $('.slide.on img', hero));
  };
  const restart = () => { clearInterval(heroTimer); if (heroes.length > 1) heroTimer = setInterval(() => { if (!document.hidden && !S.watchOpen) show(hi + 1); }, 7000); };
  restart();
  const grid = $('.grid', el);
  const fill = () => {
    const k = S.chip || 'all', now = Date.now();
    const f = videos.filter(v => k === 'all' ? true : k === 'today' ? now - Date.parse(v.publishedAt) < 864e5 : k === 'week' ? now - Date.parse(v.publishedAt) < 7 * 864e5
      : k === 'long' ? !v.short : k === 'recent' ? now - Date.parse(v.publishedAt) < 3 * 864e5 : v.live === 'live');
    const l = regList(f);
    grid.innerHTML = f.length ? f.map((v, i) => card(v, l, i)).join('') : '';
    if (!f.length) grid.innerHTML = `<div style="grid-column:1/-1">${empty('sparkles', 'Nada por aquí', 'Prueba con otro filtro.')}</div>`;
  };
  $('.chips', el).onclick = e => {
    const c = e.target.closest('[data-chip]'); if (!c) return;
    S.chip = c.dataset.chip; $$('.chip', el).forEach(x => x.classList.toggle('on', x === c));
    fill(); Spring.animate(grid, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 'smooth', { fill: 'backwards' });
  };
  fill();
  if (keepScroll) sc.scrollTop = y;
}

PAGES.shorts = async (el, p, live) => {
  el.innerHTML = head('Shorts', 'De tus suscripciones') + '<div class="shorts"></div>';
  let r = await host.yt('cachedFeed').catch(() => null);
  if (!r) r = await api('feed', false);
  if (!live()) return;
  const list = r.videos.filter(v => v.short);
  const l = regList(list);
  $('.shorts', el).outerHTML = list.length
    ? `<div class="shorts">${list.map((v, i) => `<div class="card short" data-l="${l}" data-i="${i}"><div class="thumb">${thumbImg(v)}</div><div class="v-title">${esc(v.title)}</div><div class="v-sub">${views(v.views)}</div></div>`).join('')}</div>`
    : empty('shorts', 'No hay Shorts nuevos', 'Los Shorts de los canales a los que estás suscrito aparecen aquí.');
};

PAGES.you = async (el, p, live) => {
  const me = S.me || {};
  const sk = '<div class="card"><div class="thumb sk"></div></div>'.repeat(4);
  el.innerHTML = `<div class="you-head">${avatar(me.title, me.avatar)}<div><h1>${esc(me.title || 'Tú')}</h1><p>${esc(me.handle || '')}${me.id ? ` · <button class="link-btn" data-chan="${esc(me.id)}">Ver canal</button>` : ''}</p></div></div>
    <div class="section-h"><h2 class="h-sec">Listas de reproducción</h2><button class="btn soft" data-go="lists">Ver todo</button></div><div class="shelf" id="youLists">${sk}</div>
    <div class="section-h"><h2 class="h-sec">Videos que me gustan</h2><button class="btn soft" data-go="likes">Ver todo</button></div><div class="shelf" id="youLikes">${sk}</div>`;
  api('playlists').then(pls => { if (live()) $('#youLists').innerHTML = pls.length ? pls.slice(0, 10).map(plCard).join('') : '<p class="muted">Todavía no tienes listas.</p>'; }).catch(() => {});
  api('liked').then(r => { if (!live()) return; const l = regList(r.videos); $('#youLikes').innerHTML = r.videos.length ? r.videos.slice(0, 12).map((v, i) => card(v, l, i)).join('') : '<p class="muted">Aún no hay videos que te gusten.</p>'; }).catch(() => {});
  el.onclick = e => { const b = e.target.closest('[data-pl]'); if (b) go('playlist', { id: b.dataset.pl, title: b.dataset.title }); };
};

PAGES.subs = async (el, p, live) => {
  el.innerHTML = head('Suscripciones') + `<div class="chan-grid">${Array.from({ length: 12 }, () => `<div class="chan-tile"><div class="avatar sk" style="background:none"></div><div class="sk sk-line" style="width:80px"></div></div>`).join('')}</div>`;
  const subs = await api('subscriptions');
  if (!live()) return;
  S.subs = subs; renderChanList();
  const sorted = [...subs].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  el.innerHTML = head('Suscripciones', `${subs.length} canales`) + (subs.length ? `<div class="chan-grid">${sorted.map(s => `<button class="chan-tile" data-chan="${esc(s.channelId)}">${avatar(s.title, s.avatar)}<b>${esc(s.title)}</b>${s.newItems ? `<small>${s.newItems} nuevo${s.newItems > 1 ? 's' : ''}</small>` : ''}</button>`).join('')}</div>`
    : empty('subs', 'Sin suscripciones', 'Suscríbete a canales y aparecen aquí.'));
};

PAGES.channel = async (el, { id }, live) => {
  el.innerHTML = `<div class="banner sk"></div><div class="ch-head">${avatar(' ', '')}<div><div class="sk sk-line" style="width:240px;height:26px"></div></div></div>` + skeleton(4);
  const ch = await api('channel', id);
  if (!live()) return;
  el.innerHTML = `<div class="banner">${ch.banner ? `<img src="${esc(ch.banner)}" alt="">` : ''}</div>
    <div class="ch-head">${avatar(ch.title, ch.avatar)}<div><h1>${esc(ch.title)}</h1><p>${esc(ch.handle)}${ch.subs != null ? ' · ' + count(ch.subs) + ' de suscriptores' : ''} · ${ch.videos.toLocaleString('es-CO')} videos</p></div>
    <div class="head-actions"><button class="btn soft" id="chOpen">${icon('external')}YouTube</button><button class="btn dark" id="chSub">Suscribirme</button></div></div>
    <h2 class="h-sec" style="margin:0 0 14px">Videos</h2>`;
  $('#chOpen', el).onclick = () => host.open('https://www.youtube.com/channel/' + ch.id);
  subButton($('#chSub', el), ch.id, ch.title);
  pagedGrid(el, t => api('playlistVideos', ch.uploads, t), live, empty('subs', 'Sin videos', 'Este canal no tiene videos públicos.'));
};

PAGES.likes = async (el, p, live) => {
  el.innerHTML = head('Videos que me gustan', 'Tú');
  pagedGrid(el, t => api('liked', t), live, empty('heart', 'Aún no hay "me gusta"', 'Los videos que te gusten aparecen aquí.'));
};

const plCard = x => `<button class="pl card" data-pl="${esc(x.id)}" data-title="${esc(x.title)}"><div class="stack"><div class="thumb">${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy">` : ''}<span class="count">${icon('list')}${x.count}</span></div></div>
    <div class="v-title">${esc(x.title)}</div><div class="v-sub">Ver lista completa</div></button>`;

PAGES.lists = async (el, p, live) => {
  el.innerHTML = head('Listas de reproducción', 'Tú') + skeleton(4);
  const pls = await api('playlists');
  if (!live()) return;
  el.innerHTML = head('Listas de reproducción', 'Tú') + (pls.length ? `<div class="pl-grid">${pls.map(plCard).join('')}</div>`
    : empty('list', 'No tienes listas', 'Las listas que crees en YouTube aparecen aquí.'));
  el.onclick = e => { const b = e.target.closest('[data-pl]'); if (b) go('playlist', { id: b.dataset.pl, title: b.dataset.title }); };
};

PAGES.playlist = async (el, { id, title }, live) => {
  el.innerHTML = head(esc(title || 'Lista'), 'Lista', `<button class="btn dark" id="plPlay">${icon('play')}Reproducir</button>`);
  const all = pagedGrid(el, t => api('playlistVideos', id, t), live, empty('list', 'Lista vacía', 'Esta lista no tiene videos disponibles.'));
  $('#plPlay', el).onclick = () => { if (all.length) play(all[0], all, $('.card .thumb', el)); };
};

PAGES.search = async (el, { q }, live) => {
  el.innerHTML = head(`${esc(q)}`, 'Resultados de búsqueda');
  pagedGrid(el, t => api('search', q, t), live, empty('search', 'Sin resultados', 'Prueba con otras palabras.'));
};

// ---------- búsqueda ----------
const qIn = $('#q');
qIn.addEventListener('keydown', e => {
  if (e.key === 'Enter' && qIn.value.trim()) { qIn.blur(); go('search', { q: qIn.value.trim() }); }
  if (e.key === 'Escape') qIn.blur();
});
$('#tabSearch').onclick = () => { qIn.focus(); Spring.animate($('.searchcap'), [{ transform: 'scale(1.06)' }, { transform: 'none' }], 'bouncy', { fill: 'none' }); };

// ---------- suscripciones (lista lateral) ----------
function renderChanList() {
  $('#chanlist').innerHTML = S.subs.map(s => `<button class="chan" data-chan="${esc(s.channelId)}">${avatar(s.title, s.avatar)}<span>${esc(s.title)}</span>${s.newItems ? '<i></i>' : ''}</button>`).join('');
}
const subCache = new Map();
async function subButton(btn, channelId, title) {
  const set = id => { subCache.set(channelId, id); btn.classList.toggle('on', !!id); btn.textContent = id ? 'Suscrito' : 'Suscribirse'; };
  btn.disabled = true;
  try { set(subCache.has(channelId) ? subCache.get(channelId) : await api('subscriptionFor', channelId)); } catch {}
  btn.disabled = false;
  btn.onclick = async () => {
    const id = subCache.get(channelId);
    btn.disabled = true;
    try {
      if (id) { await api('unsubscribe', id); set(null); toast(`Ya no estás suscrito a ${title}`); }
      else { set(await api('subscribe', channelId)); toast(`Suscrito a ${title}`); }
      Spring.animate(btn, [{ transform: 'scale(.9)' }, { transform: 'none' }], 'bouncy', { fill: 'none' });
    } catch {}
    btn.disabled = false;
  };
}

// =====================================================================
// Reproductor
// =====================================================================
const ph = $('#ph'), poster = $('#poster'), watch = $('#watch'), stage = $('#stage');
let player = null, ytReady = null, queue = [], qi = 0, cur = null, mode = 'none', picked = false;

function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(res => { window.onYouTubeIframeAPIReady = res; });
  const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  return ytReady;
}

async function play(v, list, fromEl) {
  if (!v) return;
  queue = list && list.length ? list : [v];
  qi = queue.findIndex(x => x.id === v.id); if (qi < 0) { queue = [v, ...queue]; qi = 0; }
  const from = fromEl ? fromEl.getBoundingClientRect() : (mode === 'pip' ? ph.getBoundingClientRect() : null);
  cur = v; picked = true; ph.classList.remove('blocked');
  renderWatch(v);
  openWatch(from);
  await loadYT();
  if (!player) {
    player = new YT.Player('ytp', {
      width: '100%', height: '100%', videoId: v.id, host: 'https://www.youtube.com',
      playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, disablekb: 1, modestbranding: 1, origin: location.origin, hl: 'es', cc_lang_pref: 'es' },
      events: { onReady: onReady, onStateChange: onState, onError: onErr },
    });
  } else player.loadVideoById(v.id);
}

function onReady() {
  const vol = S.ui.volume ?? 100;
  player.setVolume(vol); $('#vol').value = vol;
  if (S.ui.muted) player.mute();
  setVolIcon();
  player.playVideo();
}
let state = -1;
function onState(e) {
  state = e.data;
  $('.c-play use').setAttribute('href', state === 1 || state === 3 ? '#i-pause' : '#i-play');
  if (state === 1) { poster.classList.add('off'); applyCaptions(); if (S.ui.rate && player.getPlaybackRate() !== S.ui.rate) player.setPlaybackRate(S.ui.rate); }
  if (state === 0 && S.ui.loop) { player.seekTo(0, true); player.playVideo(); return; }
  ph.classList.toggle('paused', state === 2 || state === 0);
  if (state === 1 || state === 3) ph.classList.remove('blocked');
  if (state === 2 || state === 0) showCtrls(true); else if (state === 1) poke();
  if (state === 0 && S.ui.autoplay !== false && qi < queue.length - 1) setTimeout(() => step(1), 600);
}
function onErr(e) {
  window.__ytErr = e.data;
  if (e.data === 101 || e.data === 150 || e.data === 153) { ph.classList.add('blocked'); showCtrls(false); }
  const msg = { 2: 'Ese video no es válido.', 5: 'Ese video no se puede reproducir aquí.', 100: 'Ese video ya no existe o es privado.', 101: 'Este video solo se puede ver en YouTube.', 150: 'Este video solo se puede ver en YouTube.', 153: 'YouTube rechazó el reproductor.' }[e.data] || 'No se pudo reproducir.';
  const id = cur?.id;
  if (!ph.classList.contains('blocked')) toast(msg, 6000, id ? { label: 'Abrir en YouTube', fn: () => host.open('https://www.youtube.com/watch?v=' + id) } : null);
  // si lo escogiste tú, se queda con el aviso; solo salta solo en reproducción automática
  if (!picked && S.ui.autoplay !== false && qi < queue.length - 1) setTimeout(() => step(1), 2500);
}
// Subtítulos: apagados salvo que se pidan con el botón CC (YouTube los activa solo en muchos videos)
function applyCaptions() {
  if (!player?.unloadModule) return;
  const on = !!S.ui.captions;
  try {
    if (on) { player.loadModule('captions'); if (S.ui.ccLang) setTimeout(() => { try { player.setOption('captions', 'track', { languageCode: S.ui.ccLang }); } catch {} }, 400); }
    else { player.unloadModule('captions'); player.unloadModule('cc'); }
  } catch {}
  $('.c-cc').classList.toggle('on', on);
}
$('#veil').addEventListener('click', () => { if (ph.classList.contains('blocked')) { if (cur) host.open('https://www.youtube.com/watch?v=' + cur.id); return; } if (!player) return; if (state === 0) player.seekTo(0, true); player.playVideo(); });

// ----- ajustes del video (engranaje) -----
const vset = $('#vset');
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const rateTxt = r => r === 1 ? 'Normal' : String(r).replace('.', ',') + '×';
function closeVset() { if (vset.hidden) return; vset.hidden = true; $('.c-gear').classList.remove('on'); }
async function toggleVset() {
  if (!vset.hidden) return closeVset();
  const rates = (player.getAvailablePlaybackRates?.() || RATES).filter(r => RATES.includes(r));
  const now = player.getPlaybackRate?.() || 1;
  // la lista de idiomas solo existe con el módulo de subtítulos cargado
  let tracks = [];
  try { player.loadModule('captions'); await new Promise(r => setTimeout(r, 350)); tracks = player.getOption('captions', 'tracklist') || []; } catch {}
  if (!S.ui.captions) { try { player.unloadModule('captions'); } catch {} }
  const ccOn = !!S.ui.captions;
  const active = ccOn ? (tracks.find(t => t.languageCode === S.ui.ccLang) || tracks[0]) : null;
  vset.innerHTML = `
    <div class="vs-h">Velocidad</div>
    <div class="vs-row">${rates.map(r => `<button data-rate="${r}" class="${r === now ? 'on' : ''}">${rateTxt(r)}</button>`).join('')}</div>
    <div class="vs-h">Subtítulos</div>
    <div class="vs-list"><button data-cc="" class="${ccOn ? '' : 'on'}">Desactivados</button>
      ${tracks.length ? tracks.map(t => `<button data-cc="${esc(t.languageCode)}" class="${t === active ? 'on' : ''}">${esc(t.displayName || t.languageName || t.languageCode)}</button>`).join('')
        : '<span class="vs-note">Este video no tiene subtítulos</span>'}</div>
    <div class="vs-line"><span>Repetir video</span><button class="toggle${S.ui.loop ? ' on' : ''}" data-loop><i></i></button></div>
    <div class="vs-line"><span>Calidad</span><span class="vs-note">Automática · la elige YouTube</span></div>`;
  vset.hidden = false; $('.c-gear').classList.add('on');
  Spring.animate(vset, [{ opacity: 0, transform: 'translateY(10px) scale(.94)' }, { opacity: 1, transform: 'none' }], 'bouncy', { fill: 'none' });
}
vset.addEventListener('click', e => {
  const r = e.target.closest('[data-rate]');
  if (r) { const v = +r.dataset.rate; player.setPlaybackRate(v); saveUi({ rate: v }); $$('[data-rate]', vset).forEach(b => b.classList.toggle('on', b === r)); return; }
  const c = e.target.closest('[data-cc]');
  if (c) { const code = c.dataset.cc; saveUi({ captions: !!code, ccLang: code || S.ui.ccLang }); applyCaptions(); $$('[data-cc]', vset).forEach(b => b.classList.toggle('on', b === c)); return; }
  const l = e.target.closest('[data-loop]');
  if (l) { saveUi({ loop: !S.ui.loop }); l.classList.toggle('on', !!S.ui.loop); }
});
document.addEventListener('pointerdown', e => { if (!vset.hidden && !vset.contains(e.target) && !e.target.closest('.c-gear')) closeVset(); });

function step(d) {
  const n = qi + d;
  if (n < 0 || n >= queue.length) return;
  if (d < 0 && player?.getCurrentTime?.() > 4) { player.seekTo(0, true); return; }
  qi = n; cur = queue[qi]; picked = false; ph.classList.remove('blocked');
  renderWatch(cur);
  poster.classList.remove('off');
  player?.loadVideoById(cur.id);
}

// ----- posición del reproductor (el iframe nunca se mueve en el DOM) -----
function target(m) {
  if (m === 'watch') { const r = $('#slot').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  const w = 356, h = 200;
  return { x: innerWidth - w - 20, y: innerHeight - h - 20, w, h };
}
function place(m, from, preset = 'sheet') {
  const r = target(m);
  Object.assign(ph.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  if (from && from.width !== undefined) from = { x: from.left, y: from.top, w: from.width, h: from.height };
  if (from && from.w) {
    const s = from.w / r.w;
    Spring.animate(ph, [{ transform: `translate(${from.x - r.x}px,${from.y - r.y}px) scale(${s},${from.h / r.h})`, borderRadius: `${18 / s}px` }, { transform: 'none' }], preset, { fill: 'none' });
  }
}
let rafPos = 0;
const follow = () => { if (rafPos) return; rafPos = requestAnimationFrame(() => { rafPos = 0; if (mode !== 'none' && !document.fullscreenElement) place(mode); }); };
stage.addEventListener('scroll', follow, { passive: true });
addEventListener('resize', follow);

function openWatch(from) {
  S.watchOpen = true; body.classList.add('watching');
  watch.classList.add('open'); watch.setAttribute('aria-hidden', 'false');
  stage.scrollTop = 0;
  const wasHidden = ph.hidden;
  ph.hidden = false; ph.classList.remove('pip');
  mode = 'watch';
  place('watch', from || (wasHidden ? null : undefined));
  if (wasHidden && !from) Spring.animate(ph, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], 'smooth', { fill: 'none' });
  showCtrls(true); poke();
}
function closeWatch() {
  if (!S.watchOpen) return;
  closeVset();
  S.watchOpen = false; body.classList.remove('watching');
  watch.classList.remove('open'); watch.setAttribute('aria-hidden', 'true');
  if (mode === 'watch') {
    const from = ph.getBoundingClientRect();
    mode = 'pip'; ph.classList.add('pip');
    place('pip', from, 'morph');
    ph.classList.remove('show-ctrls');
  }
}
function closePlayer() {
  const a = Spring.animate(ph, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.85)' }], 'snappy');
  a.onfinish = () => { a.cancel(); ph.hidden = true; mode = 'none'; };
  player?.stopVideo?.();
  cur = null;
}
$('#back').onclick = closeWatch;

// ----- controles -----
let hideT = 0, dragging = false;
function showCtrls(on) { if (!on && !vset.hidden) return; ph.classList.toggle('show-ctrls', on); }
function poke() {
  showCtrls(true); clearTimeout(hideT);
  hideT = setTimeout(() => { if (state === 1 && !dragging && vset.hidden && !$('#ctrls').matches(':hover')) showCtrls(false); }, 2600);
}
ph.addEventListener('mouseenter', poke);
ph.addEventListener('mousemove', poke);
ph.addEventListener('mouseleave', () => { clearTimeout(hideT); hideT = setTimeout(() => { if (state === 1 && !dragging) showCtrls(false); }, 700); });
// tras hacer clic en el video, el foco vuelve a la app para que funcionen los atajos
addEventListener('blur', () => setTimeout(() => { if (document.activeElement?.tagName === 'IFRAME') { document.activeElement.blur(); poke(); } }, 0));

$('#ctrls').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b || !player) return;
  const c = b.dataset.c;
  if (c === 'play') togglePlay();
  else if (c === 'next') step(1);
  else if (c === 'prev') step(-1);
  else if (c === 'mute') { player.isMuted() ? player.unMute() : player.mute(); setTimeout(setVolIcon, 50); saveUi({ muted: !player.isMuted() }); }
  else if (c === 'fs') toggleFs();
  else if (c === 'gear') toggleVset();
  else if (c === 'cc') { saveUi({ captions: !S.ui.captions }); applyCaptions(); toast(S.ui.captions ? 'Subtítulos activados' : 'Subtítulos desactivados', 1600); }
  else if (c === 'expand') play(cur, queue);
  else if (c === 'close') closePlayer();
});
$('.ph-hit').addEventListener('click', togglePlay);
function togglePlay() { if (!player) return; state === 1 || state === 3 ? player.pauseVideo() : player.playVideo(); }
function setVolIcon() { const m = player?.isMuted?.() || +$('#vol').value === 0; $('.c-vol use').setAttribute('href', m ? '#i-mute' : '#i-vol'); }
$('#vol').addEventListener('input', e => { if (!player) return; const v = +e.target.value; player.setVolume(v); if (v > 0) player.unMute(); setVolIcon(); saveUi({ volume: v, muted: false }); });
function toggleFs() { document.fullscreenElement ? document.exitFullscreen() : ph.requestFullscreen().catch(() => {}); }
document.addEventListener('fullscreenchange', () => { $('.c-fs use').setAttribute('href', document.fullscreenElement ? '#i-min' : '#i-expand'); setTimeout(() => place(mode), 60); });

const bar = $('#bar');
function frac(e) { const r = bar.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); }
function paintBar(f, buf) {
  $('.cur', bar).style.width = (f * 100) + '%'; $('.knob', bar).style.left = (f * 100) + '%';
  if (buf != null) $('.buf', bar).style.width = (buf * 100) + '%';
}
bar.addEventListener('pointerdown', e => { if (!player) return; dragging = true; bar.classList.add('drag'); bar.setPointerCapture(e.pointerId); paintBar(frac(e)); $('#tCur').textContent = dur(frac(e) * player.getDuration()); });
bar.addEventListener('pointermove', e => { if (dragging) { paintBar(frac(e)); $('#tCur').textContent = dur(frac(e) * player.getDuration()); } });
bar.addEventListener('pointerup', e => { if (!dragging) return; dragging = false; bar.classList.remove('drag'); player.seekTo(frac(e) * player.getDuration(), true); poke(); });

setInterval(() => {
  if (!player?.getDuration || mode === 'none' || dragging || !ph.classList.contains('show-ctrls')) return;
  const d = player.getDuration() || 0, t = player.getCurrentTime() || 0;
  $('#tCur').textContent = dur(t); $('#tDur').textContent = dur(d || cur?.duration);
  paintBar(d ? t / d : 0, player.getVideoLoadedFraction?.() || 0);
}, 250);

// ----- atajos -----
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === '/' ) { e.preventDefault(); qIn.focus(); return; }
  if (e.key === 'Escape') { if (!$('#pop').hidden) return closePop(); if (document.fullscreenElement) return; if (S.watchOpen) return closeWatch(); }
  if (!player || mode === 'none') return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'k') { e.preventDefault(); togglePlay(); }
  else if (k === 'arrowright' || k === 'l') player.seekTo(player.getCurrentTime() + (k === 'l' ? 10 : 5), true);
  else if (k === 'arrowleft' || k === 'j') player.seekTo(Math.max(0, player.getCurrentTime() - (k === 'j' ? 10 : 5)), true);
  else if (k === 'm') $('[data-c="mute"]').click();
  else if (k === 'f' && mode === 'watch') toggleFs();
  else if (k === 'n' && e.shiftKey) step(1);
  else return;
  poke();
});

// ----- vista del video -----
let likeState = 'none';
function renderWatch(v) {
  $('#ambImg').src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
  poster.src = v.thumbHi || v.thumb; poster.dataset.fb = v.thumb; poster.classList.remove('off');
  $('#veil').style.backgroundImage = `url("${v.thumb}")`;
  $('#wTitle').textContent = v.title;
  $('#tDur').textContent = dur(v.duration); $('#tCur').textContent = '0:00'; paintBar(0, 0);
  const wc = $('#wChan');
  wc.dataset.chan = v.channelId;
  wc.innerHTML = `${avatar(v.channelTitle, v.avatar)}<div><b>${esc(v.channelTitle)}</b><small>&nbsp;</small></div>`;
  api('channel', v.channelId).then(ch => { if (cur?.id === v.id) { $('small', wc).textContent = ch.subs != null ? count(ch.subs) + ' de suscriptores' : ' '; if (ch.avatar && !$('img', wc)) $('.avatar', wc).insertAdjacentHTML('beforeend', `<img src="${esc(ch.avatar)}" alt="">`); } }).catch(() => {});
  subButton($('#wSub'), v.channelId, v.channelTitle);
  // me gusta
  const lb = $('#wLike');
  const paintLike = () => { lb.classList.toggle('on', likeState === 'like'); $('#wDislike').classList.toggle('on', likeState === 'dislike'); $('span', lb).textContent = v.likes ? count(v.likes + (likeState === 'like' ? 1 : 0) - (v._liked ? 1 : 0)) : 'Me gusta'; };
  likeState = 'none'; paintLike();
  api('rating', v.id).then(r => { if (cur?.id === v.id) { likeState = r; v._liked = v._liked ?? r === 'like'; paintLike(); } }).catch(() => {});
  lb.onclick = async () => {
    const nv = likeState === 'like' ? 'none' : 'like';
    likeState = nv; paintLike();
    Spring.animate($('.ic', lb), [{ transform: 'scale(.6) rotate(-14deg)' }, { transform: 'none' }], 'bouncy', { fill: 'none' });
    try { await api('rate', v.id, nv); } catch { likeState = nv === 'like' ? 'none' : 'like'; paintLike(); }
  };
  $('#wDislike').onclick = async () => {
    const nv = likeState === 'dislike' ? 'none' : 'dislike';
    likeState = nv; paintLike();
    try { await api('rate', v.id, nv); } catch {}
  };
  $('#wShare').onclick = () => { host.copy('https://youtu.be/' + v.id); toast('Enlace copiado'); };
  // descripción
  const d = $('#wDesc');
  d.classList.remove('open');
  const text = esc(v.description || '').replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noreferrer">${u}</a>`);
  d.innerHTML = `<b>${v.views ? views(v.views) + ' · ' : ''}${longDate(v.publishedAt)}</b><div class="dtext">${text || '<span style="color:var(--label-2)">Sin descripción.</span>'}</div><span class="dmore">más</span>`;
  d.onclick = e => { if (!e.target.closest('a')) d.classList.toggle('open'); };
  // a continuación
  const l = regList(queue);
  $('#upList').innerHTML = queue.map((x, i) => `<button class="item${i === qi ? ' on' : ''}" data-l="${l}" data-i="${i}"><div class="thumb">${thumbImg(x)}${x.duration ? `<span class="dur">${dur(x.duration)}</span>` : ''}</div>
    <div><div class="v-title">${esc(x.title)}</div><div class="v-sub">${esc(x.channelTitle)}<br>${ago(x.publishedAt)}</div></div></button>`).join('');
  const on = $('#upList .item.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
const autoBtn = $('#autoplay');
autoBtn.onclick = () => { const v = !(S.ui.autoplay !== false); saveUi({ autoplay: v }); autoBtn.classList.toggle('on', v); };

// =====================================================================
// Ajustes
// =====================================================================
async function saveUi(v) { Object.assign(S.ui, v); try { await host.settings.set(v); } catch {} }
const pop = $('#pop');
function closePop() {
  if (pop.hidden) return;
  const a = Spring.animate(pop, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], 'snappy');
  a.onfinish = () => { pop.hidden = true; a.cancel(); };
}
function openPop(anchor) {
  if (!pop.hidden) return closePop();
  const me = S.me || {};
  pop.innerHTML = `<div class="who">${avatar(me.title, me.avatar)}<div><b>${esc(me.title || 'Tu cuenta')}</b><small>${esc(me.handle || 'Cuenta de Google')}</small></div></div>
    <div class="row">Navegación<div class="seg2"><button data-nav="side" class="${S.ui.nav !== 'cap' ? 'on' : ''}">Barra lateral</button><button data-nav="cap" class="${S.ui.nav === 'cap' ? 'on' : ''}">Cápsula</button></div></div>
    <div class="row">Reproducción automática<button class="toggle${S.ui.autoplay !== false ? ' on' : ''}" data-auto><i></i></button></div>
    <button class="item2" data-act="refresh">${icon('refresh')}Actualizar suscripciones</button>
    <button class="item2" data-act="yt">${icon('external')}Abrir YouTube en el navegador</button>
    <button class="item2 red" data-act="out">${icon('logout')}Cerrar sesión</button>`;
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  if (S.ui.nav === 'cap') { pop.style.left = (r.right - 300) + 'px'; pop.style.top = (r.bottom + 10) + 'px'; pop.style.bottom = ''; pop.style.setProperty('--ox', '90%'); pop.style.setProperty('--oy', '0%'); }
  else { pop.style.left = r.left + 'px'; pop.style.top = ''; pop.style.bottom = (innerHeight - r.top + 10) + 'px'; pop.style.setProperty('--ox', '15%'); pop.style.setProperty('--oy', '100%'); }
  Spring.animate(pop, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], 'bouncy', { fill: 'none' });
}
pop.addEventListener('click', async e => {
  const n = e.target.closest('[data-nav]');
  if (n) { $$('[data-nav]', pop).forEach(b => b.classList.toggle('on', b === n)); saveUi({ nav: n.dataset.nav }); applyNavStyle(n.dataset.nav, true); setTimeout(closePop, 250); return; }
  const t = e.target.closest('[data-auto]');
  if (t) { const v = !(S.ui.autoplay !== false); saveUi({ autoplay: v }); t.classList.toggle('on', v); autoBtn.classList.toggle('on', v); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  closePop();
  if (a.dataset.act === 'yt') host.open('https://www.youtube.com/');
  if (a.dataset.act === 'refresh') { S.subs = await api('subscriptions', true); renderChanList(); toast('Suscripciones actualizadas'); }
  if (a.dataset.act === 'out') { await host.auth.signOut(); if (mode !== 'none') closePlayer(); closeWatch(); showOnb(await host.auth.status()); }
});
document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('#meCard, #meTop')) closePop(); });
$('#meCard').onclick = e => openPop(e.currentTarget);
$('#meTop').onclick = e => openPop(e.currentTarget);
function renderMe() {
  const me = S.me || {};
  $('#meCard').innerHTML = `${avatar(me.title, me.avatar)}<div>${esc(me.title || 'Tu cuenta')}<small>${esc(me.handle || 'Cuenta de Google')}</small></div>${icon('gear')}`;
  $('#meTop').innerHTML = avatar(me.title, me.avatar);
}

// =====================================================================
// Bienvenida e inicio de sesión
// =====================================================================
const onb = $('#onb');
function showOnb(st) {
  onb.hidden = false;
  const steps = $('#onbSteps');
  const draw = (err = '', waiting = false) => {
    steps.innerHTML = `
      <div class="step${st.hasClient ? ' done' : ''}"><span class="n">${st.hasClient ? '✓' : '1'}</span><div>Llave de Google<small>${st.hasClient ? 'Guardada y cifrada en este PC' : 'El archivo client_secret….json de tu proyecto'}</small></div>
        ${st.hasClient ? '<button class="link" data-o="change" style="margin:0">Cambiar</button>' : ''}</div>
      ${st.hasClient ? `<button class="big-btn" data-o="signin" ${waiting ? 'disabled' : ''}>${waiting ? 'Termina en el navegador…' : `${icon('key')}Iniciar sesión con Google`}</button>
        ${waiting ? '<button class="link" data-o="cancel">Cancelar</button>' : ''}`
      : `<button class="big-btn" data-o="import">${icon('key')}Elegir archivo .json</button><button class="link" data-o="guide">¿Cómo lo consigo? Ver la guía paso a paso</button>`}
      ${err ? `<div class="err">${esc(err)}</div>` : ''}`;
  };
  draw();
  steps.onclick = async e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    const o = b.dataset.o;
    try {
      if (o === 'guide') return host.guide();
      if (o === 'import' || o === 'change') { if (await host.auth.importClient()) { st = await host.auth.status(); draw(); } return; }
      if (o === 'cancel') { await host.auth.cancel(); return; }
      if (o === 'signin') {
        draw('', true);
        await host.auth.signIn();
        st = await host.auth.status();
        hideOnb(); boot();
      }
    } catch (err) { draw(err.message === 'cancelado' ? '' : err.message); }
  };
  Spring.animate($('.onb-card'), [{ opacity: 0, transform: 'scale(.92) translateY(14px)' }, { opacity: 1, transform: 'none' }], 'bouncy', { fill: 'backwards' });
}
function hideOnb() {
  const a = Spring.animate(onb, [{ opacity: 1 }, { opacity: 0 }], 'smooth');
  Spring.animate($('.onb-card'), [{ transform: 'none' }, { transform: 'scale(1.06)' }], 'smooth');
  a.onfinish = () => { onb.hidden = true; a.cancel(); };
}

// =====================================================================
// Arranque
// =====================================================================
async function boot() {
  S.ui = await host.settings.get().catch(() => ({})) || {};
  applyNavStyle(S.ui.nav);
  autoBtn.classList.toggle('on', S.ui.autoplay !== false);
  const st = await host.auth.status();
  if (!st.signedIn) return showOnb(st);
  go('home');
  try { S.me = await api('me'); } catch { S.me = null; }
  renderMe();
  api('subscriptions').then(s => { S.subs = s; renderChanList(); }).catch(() => {});
  loadYT();
}
renderMe();
boot();
})();
