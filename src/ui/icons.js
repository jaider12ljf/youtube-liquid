// Íconos de trazo redondeado al estilo SF Symbols (dibujados a mano, 24×24).
(() => {
  const s = {
    home: '<path d="M3.5 10.6 12 3.8l8.5 6.8"/><path d="M5.6 9v9.4c0 1 .8 1.8 1.8 1.8h2.8v-5.4c0-.6.4-1 1-1h1.6c.6 0 1 .4 1 1v5.4h2.8c1 0 1.8-.8 1.8-1.8V9"/>',
    subs: '<rect x="3" y="7.2" width="18" height="13" rx="3.4"/><path d="M6 4.2h12"/><path d="m10.4 11.2 4 2.5-4 2.5z" fill="currentColor"/>',
    library: '<rect x="3.6" y="4" width="4" height="16" rx="1.4"/><rect x="9.6" y="4" width="4" height="16" rx="1.4"/><path d="m16.1 5.2 3.6-.9 3 14.6-3.7.9z" transform="translate(-1.6 .2)"/>',
    search: '<circle cx="10.6" cy="10.6" r="6.6"/><path d="m15.6 15.6 4.9 4.9"/>',
    heart: '<path d="M12 20.2s-7.8-4.6-7.8-10.4A4.5 4.5 0 0 1 12 7.1a4.5 4.5 0 0 1 7.8 2.7c0 5.8-7.8 10.4-7.8 10.4z"/>',
    thumb: '<path d="M7.4 10.4v9.6H4.6a1 1 0 0 1-1-1v-7.6a1 1 0 0 1 1-1zM7.4 10.4l3.8-6.6c1.5 0 2.6 1.3 2.3 2.8l-.6 3.2h5.3c1.4 0 2.4 1.3 2.1 2.7l-1.4 6.2a2.2 2.2 0 0 1-2.1 1.7H7.4"/>',
    list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.2" cy="6.5" r=".9" fill="currentColor"/><circle cx="4.2" cy="12" r=".9" fill="currentColor"/><circle cx="4.2" cy="17.5" r=".9" fill="currentColor"/>',
    play: '<path d="M7.5 4.8v14.4c0 .8.9 1.3 1.6.9l11.5-7.2c.6-.4.6-1.3 0-1.7L9.1 3.9c-.7-.4-1.6.1-1.6.9z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.3" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.3" fill="currentColor" stroke="none"/>',
    next: '<path d="M4.5 6v12c0 .7.8 1.1 1.4.7l8.4-6c.5-.4.5-1.1 0-1.4l-8.4-6c-.6-.4-1.4 0-1.4.7z" fill="currentColor" stroke="none"/><rect x="16.6" y="5.2" width="3" height="13.6" rx="1.2" fill="currentColor" stroke="none"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    min: '<path d="M6 12h12"/>',
    shorts: '<path d="M15.6 3.6c1.9-1 4.2-.3 5.2 1.6s.3 4.2-1.6 5.2l-1.5.8c1.4.4 2.5 1.6 2.6 3.2.2 1.7-.7 3.3-2.2 4l-7.6 4c-1.9 1-4.2.3-5.2-1.6s-.3-4.2 1.6-5.2l1.5-.8a3.7 3.7 0 0 1-.4-7.2z"/><path d="m10.2 9.4 4.6 2.6-4.6 2.6z" fill="currentColor"/>',
    user: '<circle cx="12" cy="8.6" r="4"/><path d="M4.6 20.2c.8-3.6 3.8-5.8 7.4-5.8s6.6 2.2 7.4 5.8"/>',
    restore: '<rect x="5" y="8" width="11" height="11" rx="2.3"/><path d="M8.5 5h8a2.5 2.5 0 0 1 2.5 2.5v8"/>',
    max: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
    sidebar: '<rect x="3" y="4.5" width="18" height="15" rx="3.5"/><path d="M9.5 4.5v15"/>',
    share: '<path d="M12 15V3.8M8 7.6l4-3.8 4 3.8"/><path d="M8.5 10.5H7a2 2 0 0 0-2 2v6.2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.2a2 2 0 0 0-2-2h-1.5"/>',
    bell: '<path d="M6.2 16.8V11a5.8 5.8 0 0 1 11.6 0v5.8l1.6 1.6H4.6z"/><path d="M10 20.4a2.2 2.2 0 0 0 4 0"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 2"/>',
    sparkles: '<path d="M10 3.5 11.6 8a3 3 0 0 0 1.9 1.9l4.5 1.6-4.5 1.6a3 3 0 0 0-1.9 1.9L10 19.5 8.4 15a3 3 0 0 0-1.9-1.9L2 11.5l4.5-1.6A3 3 0 0 0 8.4 8z"/><path d="M18.5 3v4M16.5 5h4"/>',
    logout: '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 8 6 12l4 4M6 12h9.5"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.6 4.2v4.2h-4.2"/>',
    vol: '<path d="M4.5 9.2h3l4.6-3.9c.5-.4 1.2 0 1.2.6v12.2c0 .6-.7 1-1.2.6l-4.6-3.9h-3a1 1 0 0 1-1-1V10.2a1 1 0 0 1 1-1z"/><path d="M16.4 9a4.2 4.2 0 0 1 0 6M18.9 6.5a7.8 7.8 0 0 1 0 11"/>',
    mute: '<path d="M4.5 9.2h3l4.6-3.9c.5-.4 1.2 0 1.2.6v12.2c0 .6-.7 1-1.2.6l-4.6-3.9h-3a1 1 0 0 1-1-1V10.2a1 1 0 0 1 1-1z"/><path d="m16.5 9.5 5 5M21.5 9.5l-5 5"/>',
    key: '<circle cx="8" cy="15.5" r="4.2"/><path d="m11 12.5 8.5-8.5M16.5 7l2.5 2.5M14.5 9l2 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    external: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/><path d="M17.5 13.5v4a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h4"/>',
    expand: '<path d="M14.5 4.5h5v5M9.5 19.5h-5v-5M19.5 4.5l-6 6M4.5 19.5l6-6"/>',
  };
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${Object.entries(s).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</svg>`;
  (document.body || document.documentElement).insertAdjacentHTML('afterbegin', sprite);
  window.icon = (name, cls = '') => `<svg class="ic ${cls}"><use href="#i-${name}"/></svg>`;
})();
