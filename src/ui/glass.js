// Liquid Glass para Chromium: refracción real con backdrop-filter: url(#svg).
// Cada elemento .lg recibe su propio mapa de desplazamiento (lente con bisel convexo)
// generado en canvas según su tamaño y radio; solo se regenera cuando cambia de tamaño.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  document.documentElement.appendChild(svg);

  const cache = new Map(); // "w|h|r|bezel" -> dataURL
  let uid = 0;

  // Perfil de superficie convexa tipo "squircle": altura en función de la distancia al borde.
  // La pendiente de esa altura es lo que desplaza (refracta) el fondo.
  const slope = t => { // t: 0 en el borde → 1 al terminar el bisel
    t = Math.min(Math.max(t, 0), 1);
    const h = u => Math.pow(1 - Math.pow(1 - u, 4), 0.25);
    const e = 0.002;
    return (h(Math.min(t + e, 1)) - h(Math.max(t - e, 0))) / (2 * e) * 0.25;
  };

  function sdRoundRect(px, py, w, h, r) {
    const qx = Math.abs(px - w / 2) - (w / 2 - r);
    const qy = Math.abs(py - h / 2) - (h / 2 - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function makeMap(w, h, r, bezel) {
    const key = `${w}|${h}|${r}|${bezel}`;
    if (cache.has(key)) return cache.get(key);
    // Se calcula a media resolución: el desplazamiento es suave y ahorra CPU.
    const s = 0.5, cw = Math.max(2, Math.round(w * s)), ch = Math.max(2, Math.round(h * s));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(cw, ch), d = img.data;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const px = (x + 0.5) / s, py = (y + 0.5) / s;
        const dist = -sdRoundRect(px, py, w, h, r); // >0 adentro
        let dx = 0, dy = 0;
        if (dist > 0 && dist < bezel) {
          const e = 0.75;
          const gx = sdRoundRect(px + e, py, w, h, r) - sdRoundRect(px - e, py, w, h, r);
          const gy = sdRoundRect(px, py + e, w, h, r) - sdRoundRect(px, py - e, w, h, r);
          const gl = Math.hypot(gx, gy) || 1;
          const m = slope(dist / bezel);
          // normal hacia afuera: el borde "jala" la imagen desde afuera hacia adentro (lente)
          dx = (gx / gl) * m; dy = (gy / gl) * m;
        }
        const i = (y * cw + x) * 4;
        d[i] = 128 + Math.max(-127, Math.min(127, dx * 127));
        d[i + 1] = 128 + Math.max(-127, Math.min(127, dy * 127));
        d[i + 2] = 128; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const url = c.toDataURL();
    cache.set(key, url);
    if (cache.size > 80) cache.delete(cache.keys().next().value);
    return url;
  }

  function build(el) {
    const rect = el.getBoundingClientRect();
    const w = Math.round(el.offsetWidth || rect.width), h = Math.round(el.offsetHeight || rect.height);
    if (!w || !h) return;
    const cs = getComputedStyle(el);
    const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2);
    const bezel = Math.min(parseFloat(el.dataset.bezel || 0) || Math.min(26, Math.max(10, Math.min(w, h) * 0.32)), Math.min(w, h) / 2);
    const scale = parseFloat(el.dataset.refract || 46);
    const key = `${w}|${h}|${r}|${bezel}|${scale}`;
    if (el._lgKey === key) return;
    el._lgKey = key;
    const id = el._lgId || (el._lgId = `lg${++uid}`);
    let f = svg.querySelector('#' + id);
    if (!f) { f = document.createElementNS(NS, 'filter'); f.id = id; svg.appendChild(f); }
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('primitiveUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.setAttribute('x', '0'); f.setAttribute('y', '0');
    f.setAttribute('width', w); f.setAttribute('height', h);
    const map = makeMap(w, h, r, bezel);
    const ab = el.dataset.chroma !== undefined ? parseFloat(el.dataset.chroma) : 0;
    // Aberración cromática opcional: R, G y B se desplazan un poco distinto (más caro: 3 pasadas).
    f.innerHTML = ab
      ? `<feImage href="${map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
         <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale * (1 + ab)}" xChannelSelector="R" yChannelSelector="G" result="dr"/>
         <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
         <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="dg"/>
         <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>
         <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale * (1 - ab)}" xChannelSelector="R" yChannelSelector="G" result="db"/>
         <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/>
         <feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>`
      : `<feImage href="${map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>
         <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
    const blur = el.dataset.blur ?? 7, sat = el.dataset.sat ?? 1.8, bright = el.dataset.bright ?? 1.05;
    el.style.backdropFilter = `url(#${id}) blur(${blur}px) saturate(${sat}) brightness(${bright})`;
  }

  const ro = new ResizeObserver(entries => entries.forEach(e => build(e.target)));
  const attach = el => { if (el._lgOn) return; el._lgOn = true; build(el); ro.observe(el); };
  const scan = root => (root.querySelectorAll ? root.querySelectorAll('.lg') : []).forEach(attach);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.classList.contains('lg')) attach(n);
    scan(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
  const start = () => scan(document);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  window.LiquidGlass = { refresh: el => { el._lgKey = null; build(el); }, attach };
})();
