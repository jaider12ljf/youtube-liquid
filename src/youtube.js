// Capa de YouTube Data API v3. Todo pasa por aquí (proceso principal): el token nunca llega a la interfaz.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');

const API = 'https://www.googleapis.com/youtube/v3/';
const CACHE = () => path.join(app.getPath('userData'), 'cache.json');
let disk = null;
const loadDisk = () => { if (!disk) { try { disk = JSON.parse(fs.readFileSync(CACHE(), 'utf8')); } catch { disk = {}; } } return disk; };
let saveTimer;
const saveDisk = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFile(CACHE(), JSON.stringify(disk), () => {}), 500); };

const friendly = (status, reason, msg) => {
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return 'Se acabó el cupo diario de la API de YouTube. Mañana se renueva.';
  if (reason === 'accessNotConfigured' || /has not been used|is disabled/.test(msg)) return 'Falta habilitar "YouTube Data API v3" en tu proyecto de Google Cloud.';
  if (reason === 'youtubeSignupRequired') return 'Esta cuenta de Google no tiene canal de YouTube.';
  if (status === 403 && reason === 'forbidden') return 'YouTube no permite eso para este video o canal.';
  return msg || `Error ${status}`;
};

async function call(endpoint, params = {}, method = 'GET', body) {
  const url = new URL(API + endpoint);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await auth.accessToken(attempt > 0);
    const r = await fetch(url, {
      method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401 && attempt === 0) continue;
    if (r.status === 204) return {};
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const reason = j.error?.errors?.[0]?.reason;
      const e = new Error(friendly(r.status, reason, j.error?.message)); e.code = reason; e.status = r.status; throw e;
    }
    return j;
  }
}

// ---------- normalización ----------
const iso = d => { // PT1H2M3S → segundos
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '') || [];
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
};
const bestThumb = t => (t?.maxres || t?.standard || t?.high || t?.medium || t?.default || {}).url || '';
const chanAvatars = new Map();

function normVideo(v) {
  const s = v.snippet || {}, c = v.contentDetails || {}, st = v.statistics || {};
  const dur = iso(c.duration);
  return {
    id: v.id, title: s.title, channelId: s.channelId, channelTitle: s.channelTitle, publishedAt: s.publishedAt,
    description: s.description || '', thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, thumbHi: bestThumb(s.thumbnails),
    duration: dur, views: +st.viewCount || 0, likes: +st.likeCount || 0,
    live: s.liveBroadcastContent || 'none',
    short: dur > 0 && (dur <= 60 || (dur <= 180 && /#shorts?\b/i.test(s.title + ' ' + (s.description || '')))),
    avatar: chanAvatars.get(s.channelId) || '',
  };
}

async function videosById(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await call('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(','), maxResults: 50 });
    out.push(...(j.items || []));
  }
  const byId = new Map(out.map(v => [v.id, v]));
  await fillAvatars(out.map(v => v.snippet?.channelId));
  return ids.map(id => byId.get(id)).filter(Boolean).map(normVideo);
}

async function fillAvatars(channelIds) {
  const need = [...new Set(channelIds.filter(id => id && !chanAvatars.has(id)))];
  for (let i = 0; i < need.length; i += 50) {
    const j = await call('channels', { part: 'snippet', id: need.slice(i, i + 50).join(','), maxResults: 50 });
    for (const c of j.items || []) chanAvatars.set(c.id, c.snippet?.thumbnails?.default?.url || '');
  }
}

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch { out[k] = null; } }
  }));
  return out;
}

// ---------- endpoints que usa la interfaz ----------
async function me() {
  const j = await call('channels', { part: 'snippet,statistics', mine: true });
  const c = j.items?.[0];
  if (!c) return { title: 'Tu cuenta', avatar: '' };
  return { id: c.id, title: c.snippet.title, avatar: c.snippet.thumbnails?.default?.url || '', handle: c.snippet.customUrl || '' };
}

async function subscriptions(force = false) {
  const d = loadDisk();
  if (!force && d.subs && Date.now() - d.subs.t < 6 * 3600e3) { d.subs.list.forEach(s => chanAvatars.set(s.channelId, s.avatar)); return d.subs.list; }
  const list = []; let pageToken;
  do {
    const j = await call('subscriptions', { part: 'snippet,contentDetails', mine: true, maxResults: 50, order: 'relevance', pageToken });
    for (const s of j.items || []) {
      const sn = s.snippet;
      list.push({ subId: s.id, channelId: sn.resourceId.channelId, title: sn.title, avatar: sn.thumbnails?.default?.url || '', newItems: s.contentDetails?.newItemCount || 0, rank: list.length });
    }
    pageToken = j.nextPageToken;
  } while (pageToken && list.length < 1000);
  list.forEach(s => chanAvatars.set(s.channelId, s.avatar));
  d.subs = { t: Date.now(), list }; saveDisk();
  return list;
}

// "Inicio": lo último de tus suscripciones (la API no da el feed de recomendaciones).
async function feed(force = false) {
  const d = loadDisk();
  if (!force && d.feed && Date.now() - d.feed.t < 20 * 60e3) return { videos: d.feed.videos, t: d.feed.t };
  const subs = await subscriptions(force);
  const top = subs.slice(0, 120); // las 120 más relevantes según YouTube
  const per = await pool(top, 8, async s => {
    const j = await call('playlistItems', { part: 'contentDetails', playlistId: 'UU' + s.channelId.slice(2), maxResults: 6 });
    return (j.items || []).map(i => ({ id: i.contentDetails.videoId, at: i.contentDetails.videoPublishedAt || '' }));
  });
  const recent = per.flat().filter(Boolean).filter(x => x.at).sort((a, b) => b.at.localeCompare(a.at));
  const ids = [...new Set(recent.map(x => x.id))].slice(0, 150);
  const videos = (await videosById(ids)).filter(v => v.live !== 'upcoming');
  d.feed = { t: Date.now(), videos }; saveDisk();
  return { videos, t: d.feed.t };
}
const cachedFeed = () => { const d = loadDisk(); return d.feed ? { videos: d.feed.videos, t: d.feed.t, stale: true } : null; };

async function liked(pageToken) {
  const j = await call('videos', { part: 'snippet,contentDetails,statistics', myRating: 'like', maxResults: 40, pageToken });
  await fillAvatars((j.items || []).map(v => v.snippet?.channelId));
  return { videos: (j.items || []).map(normVideo), next: j.nextPageToken || null };
}

async function playlists() {
  const out = []; let pageToken;
  do {
    const j = await call('playlists', { part: 'snippet,contentDetails', mine: true, maxResults: 50, pageToken });
    for (const p of j.items || []) out.push({ id: p.id, title: p.snippet.title, count: p.contentDetails.itemCount, thumb: bestThumb(p.snippet.thumbnails), description: p.snippet.description });
    pageToken = j.nextPageToken;
  } while (pageToken && out.length < 300);
  return out;
}

async function playlistVideos(id, pageToken) {
  const j = await call('playlistItems', { part: 'contentDetails', playlistId: id, maxResults: 50, pageToken });
  const ids = (j.items || []).map(i => i.contentDetails.videoId);
  return { videos: await videosById(ids), next: j.nextPageToken || null, total: j.pageInfo?.totalResults };
}

async function search(q, pageToken) {
  const j = await call('search', { part: 'snippet', type: 'video', q, maxResults: 30, pageToken, regionCode: 'CO', relevanceLanguage: 'es', safeSearch: 'none' });
  const ids = (j.items || []).map(i => i.id.videoId).filter(Boolean);
  return { videos: await videosById(ids), next: j.nextPageToken || null };
}

async function channel(id) {
  const j = await call('channels', { part: 'snippet,statistics,brandingSettings,contentDetails', id });
  const c = j.items?.[0];
  if (!c) throw new Error('No encontré ese canal.');
  chanAvatars.set(c.id, c.snippet.thumbnails?.default?.url || '');
  return {
    id: c.id, title: c.snippet.title, handle: c.snippet.customUrl || '', description: c.snippet.description || '',
    avatar: c.snippet.thumbnails?.high?.url || c.snippet.thumbnails?.default?.url || '',
    banner: c.brandingSettings?.image?.bannerExternalUrl ? c.brandingSettings.image.bannerExternalUrl + '=w2120' : '',
    subs: c.statistics?.hiddenSubscriberCount ? null : +c.statistics?.subscriberCount || 0,
    videos: +c.statistics?.videoCount || 0,
    uploads: c.contentDetails?.relatedPlaylists?.uploads || 'UU' + c.id.slice(2),
  };
}

async function subscriptionFor(channelId) {
  const j = await call('subscriptions', { part: 'id', mine: true, forChannelId: channelId });
  return j.items?.[0]?.id || null;
}
async function subscribe(channelId) {
  const j = await call('subscriptions', { part: 'snippet' }, 'POST', { snippet: { resourceId: { kind: 'youtube#channel', channelId } } });
  if (loadDisk().subs) loadDisk().subs.t = 0;
  return j.id;
}
async function unsubscribe(subId) {
  await call('subscriptions', { id: subId }, 'DELETE');
  if (loadDisk().subs) loadDisk().subs.t = 0;
}
async function rating(id) { const j = await call('videos/getRating', { id }); return j.items?.[0]?.rating || 'none'; }
async function rate(id, value) { await call('videos/rate', { id, rating: value }, 'POST'); return value; }
async function video(id) { return (await videosById([id]))[0] || null; }

function clearCache() { disk = {}; chanAvatars.clear(); try { fs.unlinkSync(CACHE()); } catch {} }

module.exports = {
  fns: { me, subscriptions, feed, cachedFeed, liked, playlists, playlistVideos, search, channel, subscriptionFor, subscribe, unsubscribe, rating, rate, video },
  clearCache,
};
