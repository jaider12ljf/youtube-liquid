// Resortes con los parámetros de SwiftUI (response, dampingFraction), convertidos
// en curvas CSS linear() para usarlos en transiciones y en Web Animations.
(() => {
  function solve(response, damping, v0 = 0) {
    const w0 = 2 * Math.PI / response, z = damping;
    return t => {
      if (z < 1) {
        const wd = w0 * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0 - v0) / wd) * Math.sin(wd * t));
      }
      return 1 - Math.exp(-w0 * t) * (1 + (w0 - v0) * t);
    };
  }
  const memo = new Map();
  function spring(response = 0.5, damping = 0.825) {
    const k = response + '|' + damping;
    if (memo.has(k)) return memo.get(k);
    const f = solve(response, damping);
    // duración hasta que el resorte se asienta (<0.1%)
    let T = 0.05; while (T < 4) { let ok = true; for (let t = T; t < T + 0.25; t += 0.01) if (Math.abs(1 - f(t)) > 0.001) { ok = false; break; } if (ok) break; T += 0.02; }
    const n = 48, pts = [];
    for (let i = 0; i <= n; i++) pts.push(+f(T * i / n).toFixed(4));
    pts[n] = 1;
    const out = { easing: `linear(${pts.join(',')})`, duration: Math.round(T * 1000) };
    memo.set(k, out);
    return out;
  }
  // Presets equivalentes a los de SwiftUI
  const presets = {
    smooth: spring(0.5, 1), snappy: spring(0.4, 0.82), bouncy: spring(0.5, 0.68),
    interactive: spring(0.15, 0.86), sheet: spring(0.55, 0.86), morph: spring(0.42, 0.78),
  };
  // Define variables CSS para usarlas en transiciones: var(--spring-snappy) + duración
  const root = document.documentElement.style;
  for (const [name, s] of Object.entries(presets)) {
    root.setProperty(`--ease-${name}`, s.easing);
    root.setProperty(`--dur-${name}`, s.duration + 'ms');
  }
  function animate(el, keyframes, preset = 'snappy', extra = {}) {
    const s = typeof preset === 'string' ? presets[preset] : spring(...preset);
    return el.animate(keyframes, { duration: s.duration, easing: s.easing, fill: 'both', ...extra });
  }
  window.Spring = { spring, presets, animate };
})();
