// OAuth 2.0 para apps de escritorio (Google): navegador del sistema + redirección loopback + PKCE.
// Las llaves (cliente y tokens) se guardan cifradas con safeStorage (DPAPI de Windows) en userData.
const { app, safeStorage, shell } = require('electron');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/youtube'];
const FILE = () => path.join(app.getPath('userData'), 'llaves.bin');
const b64url = buf => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let store = null; // { client: {id, secret}, tokens: {access_token, refresh_token, expires_at} }

function load() {
  if (store) return store;
  try {
    const raw = fs.readFileSync(FILE());
    store = JSON.parse(safeStorage.decryptString(raw));
  } catch { store = {}; }
  return store;
}
function save() {
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), safeStorage.encryptString(JSON.stringify(store)));
}

function setClientFromJson(text) {
  let j;
  try { j = JSON.parse(text); } catch { throw new Error('Ese archivo no es un JSON válido.'); }
  const c = j.installed || j.web;
  if (!c || !c.client_id) throw new Error('Ese JSON no es una llave de OAuth de Google.');
  if (j.web) throw new Error('Esa llave es de tipo "Aplicación web". Crea una de tipo "App de escritorio".');
  load();
  store.client = { id: c.client_id, secret: c.client_secret || '' };
  delete store.tokens;
  save();
}

const page = (title, msg) => `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>html,body{height:100%;margin:0}body{display:grid;place-items:center;font-family:'Segoe UI Variable Display','Segoe UI',system-ui;background:#fff;color:#1d1d1f}
.c{padding:40px 48px;border-radius:32px;box-shadow:0 0 0 .5px rgba(0,0,0,.08),0 20px 50px -20px rgba(0,0,0,.25);text-align:center}
h1{font-size:26px;letter-spacing:-.02em;margin:0 0 8px}p{color:#6e6e73;margin:0;font-size:15px}</style>
<div class="c"><h1>${title}</h1><p>${msg}</p></div>`;

async function postForm(url, data) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error_description || j.error || `Error ${r.status}`);
    e.code = j.error; throw e;
  }
  return j;
}

let pending = null;
async function signIn() {
  load();
  if (!store.client) throw new Error('Falta la llave de Google (archivo .json).');
  if (pending) { pending.cancel(); pending = null; }
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  const server = http.createServer();
  await new Promise((res, rej) => server.listen(0, '127.0.0.1', res).on('error', rej));
  const redirect = `http://127.0.0.1:${server.address().port}`;

  const codeP = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error('Se acabó el tiempo para iniciar sesión.')); server.close(); }, 5 * 60 * 1000);
    pending = { cancel: () => { clearTimeout(timer); server.close(); reject(new Error('cancelado')); } };
    server.on('request', (req, res) => {
      const u = new URL(req.url, redirect);
      if (u.pathname !== '/') { res.writeHead(404); res.end(); return; }
      const err = u.searchParams.get('error');
      const ok = !err && u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ok ? page('Listo', 'Ya puedes volver a YouTube.') : page('No se pudo', 'Cierra esta pestaña y vuelve a intentarlo desde la app.'));
      clearTimeout(timer); server.close();
      ok ? resolve(u.searchParams.get('code')) : reject(new Error(err === 'access_denied' ? 'Cancelaste el permiso en Google.' : 'Google no devolvió el código.'));
    });
  });

  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  Object.entries({
    client_id: store.client.id, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '),
    code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent',
  }).forEach(([k, v]) => auth.searchParams.set(k, v));
  await shell.openExternal(auth.toString());

  try {
    const code = await codeP;
    const t = await postForm('https://oauth2.googleapis.com/token', {
      code, client_id: store.client.id, client_secret: store.client.secret, redirect_uri: redirect,
      grant_type: 'authorization_code', code_verifier: verifier,
    });
    store.tokens = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
    save();
  } finally { pending = null; }
}

let refreshing = null;
async function accessToken(force = false) {
  load();
  const t = store.tokens;
  if (!t) { const e = new Error('No has iniciado sesión.'); e.code = 'signed_out'; throw e; }
  if (!force && t.access_token && Date.now() < t.expires_at) return t.access_token;
  if (!refreshing) refreshing = (async () => {
    try {
      const r = await postForm('https://oauth2.googleapis.com/token', {
        client_id: store.client.id, client_secret: store.client.secret, refresh_token: t.refresh_token, grant_type: 'refresh_token',
      });
      t.access_token = r.access_token; t.expires_at = Date.now() + (r.expires_in - 60) * 1000;
      save();
      return t.access_token;
    } catch (e) {
      if (e.code === 'invalid_grant') { delete store.tokens; save(); e.code = 'signed_out'; e.message = 'La sesión venció. Inicia sesión otra vez.'; }
      throw e;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

async function signOut() {
  load();
  const t = store.tokens;
  delete store.tokens; save();
  if (t?.refresh_token) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t.refresh_token), { method: 'POST' }).catch(() => {});
}

function status() { load(); return { hasClient: !!store.client, signedIn: !!store.tokens?.refresh_token }; }
function forgetClient() { load(); store = {}; save(); }
function cancel() { if (pending) pending.cancel(); }

module.exports = { setClientFromJson, signIn, signOut, accessToken, status, forgetClient, cancel };
