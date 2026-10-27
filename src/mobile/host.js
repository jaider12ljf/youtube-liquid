// Puente de la app en Android (Capacitor): implementa la misma interfaz `window.host`
// que el preload de escritorio, así la interfaz (app.js) es la misma en los dos.
(() => {
  const C = window.Capacitor;
  const plugin = n => C.registerPlugin(n);
  const Browser = plugin('Browser'), Prefs = plugin('Preferences'), Share = plugin('Share');
  const App = plugin('App'), StatusBar = plugin('StatusBar'), Loopback = plugin('LoopbackAuth');
  const CLIENT = window.OAUTH_CLIENT;
  const SCOPE = 'https://www.googleapis.com/auth/youtube';

  // Barra de estado blanca con íconos oscuros, como el resto de la app
  StatusBar.setStyle({ style: 'LIGHT' }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

  // ---------- tokens (almacenamiento privado de la app) ----------
  const KEY = 'yt.tokens';
  let tokens = null;
  const loadTokens = async () => {
    if (!tokens) { const r = await Prefs.get({ key: KEY }); try { tokens = JSON.parse(r.value) || {}; } catch { tokens = {}; } }
    return tokens;
  };
  const saveTokens = () => Prefs.set({ key: KEY, value: JSON.stringify(tokens) });

  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));

  async function postForm(url, data) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error_description || j.error || `Error ${r.status}`); e.code = j.error; throw e; }
    return j;
  }

  // OAuth de app instalada: navegador del sistema + redirección a un servidor local de la app + PKCE
  async function signIn() {
    const verifier = random(48);
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = random(16);
    const { port } = await Loopback.listen();
    const redirect = `http://127.0.0.1:${port}`;
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    Object.entries({
      client_id: CLIENT.id, redirect_uri: redirect, response_type: 'code', scope: SCOPE,
      code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent',
    }).forEach(([k, v]) => auth.searchParams.set(k, v));
    await Browser.open({ url: auth.toString() });
    const { path } = await Loopback.result();
    Browser.close().catch(() => {});
    const q = new URL(path, redirect).searchParams;
    if (q.get('error')) throw new Error(q.get('error') === 'access_denied' ? 'Cancelaste el permiso en Google.' : 'Google no devolvió el código.');
    if (q.get('state') !== state || !q.get('code')) throw new Error('Google no devolvió el código.');
    const t = await postForm('https://oauth2.googleapis.com/token', {
      code: q.get('code'), client_id: CLIENT.id, client_secret: CLIENT.secret, redirect_uri: redirect,
      grant_type: 'authorization_code', code_verifier: verifier,
    });
    tokens = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
    await saveTokens();
  }

  let refreshing = null;
  async function accessToken(force = false) {
    const t = await loadTokens();
    if (!t.refresh_token) { const e = new Error('No has iniciado sesión.'); e.code = 'signed_out'; throw e; }
    if (!force && t.access_token && Date.now() < t.expires_at) return t.access_token;
    if (!refreshing) refreshing = (async () => {
      try {
        const r = await postForm('https://oauth2.googleapis.com/token', { client_id: CLIENT.id, client_secret: CLIENT.secret, refresh_token: t.refresh_token, grant_type: 'refresh_token' });
        t.access_token = r.access_token; t.expires_at = Date.now() + (r.expires_in - 60) * 1000;
        await saveTokens();
        return t.access_token;
      } catch (e) {
        if (e.code === 'invalid_grant') { tokens = {}; await saveTokens(); e.code = 'signed_out'; e.message = 'La sesión venció. Inicia sesión otra vez.'; }
        throw e;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  const yt = window.createYouTube({
    getToken: accessToken,
    store: {
      load: () => { try { return JSON.parse(localStorage.getItem('yt.cache')) || {}; } catch { return {}; } },
      save: d => { try { localStorage.setItem('yt.cache', JSON.stringify(d)); } catch {} },
      clear: () => localStorage.removeItem('yt.cache'),
    },
  });

  const ui = () => { try { return JSON.parse(localStorage.getItem('yt.ui')) || {}; } catch { return {}; } };

  let backHandler = null;
  App.addListener('backButton', () => { if (!(backHandler && backHandler())) App.minimizeApp(); });

  window.host = {
    mobile: true,
    win: async () => ({}),
    onWin: () => {},
    onBack: fn => { backHandler = fn; },
    auth: {
      status: async () => ({ hasClient: true, signedIn: !!(await loadTokens()).refresh_token }),
      importClient: async () => true,
      signIn,
      cancel: () => Loopback.cancel(),
      signOut: async () => {
        const t = await loadTokens();
        tokens = {}; await saveTokens(); yt.clearCache();
        if (t.refresh_token) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t.refresh_token), { method: 'POST' }).catch(() => {});
      },
      forgetClient: async () => {},
    },
    yt: (name, ...args) => {
      const fn = yt.fns[name];
      if (!fn) return Promise.reject(new Error('Función desconocida'));
      return fn(...args);
    },
    settings: {
      get: async () => ui(),
      set: async v => { const s = { ...ui(), ...v }; localStorage.setItem('yt.ui', JSON.stringify(s)); return s; },
    },
    open: url => Browser.open({ url }),
    copy: text => Share.share({ url: String(text) }),
    share: url => Share.share({ url, dialogTitle: 'Compartir video' }),
    guide: async () => {},
  };
})();
