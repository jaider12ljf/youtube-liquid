// Datos de ejemplo para probar la interfaz sin cuenta (YTG_DEMO=1). No se empaqueta en uso normal.
const V = [
  ['M7lc1UVf-VE', 'YouTube Developers Live: Embedded Web Player Customization', 'Google for Developers', 1344, 2.1e6],
  ['dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up (Official Video)', 'Rick Astley', 213, 1.7e9],
  ['fJ9rUzIMcZQ', 'Queen – Bohemian Rhapsody (Official Video Remastered)', 'Queen Official', 359, 1.9e9],
  ['OPf0YbXqDm0', 'Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars', 'Mark Ronson', 271, 5.3e9],
  ['hT_nvWreIhg', 'OneRepublic - Counting Stars', 'OneRepublic', 283, 4.1e9],
  ['YQHsXMglC9A', 'Adele - Hello (Official Music Video)', 'Adele', 367, 3.2e9],
  ['60ItHLz5WEA', 'Alan Walker - Faded', 'Alan Walker', 213, 3.7e9],
  ['kJQP7kiw5Fk', 'Luis Fonsi - Despacito ft. Daddy Yankee', 'Luis Fonsi', 282, 8.8e9],
  ['RgKAFK5djSk', 'Wiz Khalifa - See You Again ft. Charlie Puth', 'Wiz Khalifa Music', 238, 6.4e9],
  ['JGwWNGJdvx8', 'Ed Sheeran - Shape of You (Official Music Video)', 'Ed Sheeran', 264, 6.6e9],
  ['CevxZvSJLk8', 'Katy Perry - Roar (Official)', 'Katy Perry', 270, 4.1e9],
  ['lp-EO5I60KA', 'Ed Sheeran - Thinking Out Loud (Official Music Video)', 'Ed Sheeran', 297, 3.9e9],
  ['9bZkp7q19f0', 'PSY - GANGNAM STYLE(강남스타일) M/V', 'officialpsy', 253, 5.4e9],
];
const hours = [2, 5, 20, 26, 50, 75, 80, 100, 130, 150, 170, 200];
const vid = (v, i) => ({
  id: v[0], title: v[1], channelId: 'UC' + v[2].replace(/\W/g, '').padEnd(22, 'x'), channelTitle: v[2],
  publishedAt: new Date(Date.now() - hours[i % 12] * 3600e3).toISOString(), description: 'Video de ejemplo para probar la app.\nhttps://www.youtube.com/watch?v=' + v[0],
  thumb: `https://i.ytimg.com/vi/${v[0]}/hqdefault.jpg`, thumbHi: `https://i.ytimg.com/vi/${v[0]}/maxresdefault.jpg`,
  duration: v[3], views: v[4], likes: Math.round(v[4] / 120), live: 'none', short: false, avatar: '',
});
const videos = V.map(vid);
const subs = [...new Set(V.map(v => v[2]))].map((t, i) => ({ subId: 's' + i, channelId: 'UC' + t.replace(/\W/g, '').padEnd(22, 'x'), title: t, avatar: '', newItems: i < 3 ? 2 : 0, rank: i }));
const wait = ms => new Promise(r => setTimeout(r, ms));
let rated = {};
module.exports = {
  clearCache() {},
  fns: {
    async me() { return { title: 'Jaider Silva', avatar: '', handle: '@jaider' }; },
    async subscriptions() { return subs; },
    async feed() { await wait(300); return { videos: videos.concat(videos.slice(0, 8).map((v, i) => ({ ...v, publishedAt: new Date(Date.now() - (220 + i * 20) * 3600e3).toISOString() }))), t: Date.now() }; },
    async cachedFeed() { return null; },
    async liked() { await wait(200); return { videos: videos.slice(3, 11), next: null }; },
    async playlists() { return [{ id: 'p1', title: 'Alabanza para el culto', count: 24, thumb: videos[4].thumbHi }, { id: 'p2', title: 'Ensayo del domingo', count: 9, thumb: videos[1].thumbHi }, { id: 'p3', title: 'Para los niños', count: 15, thumb: videos[9].thumbHi }]; },
    async playlistVideos() { return { videos: videos.slice(0, 9), next: null, total: 9 }; },
    async search(q) { await wait(300); return { videos: videos.filter((v, i) => i % 2 === 0 || v.title.toLowerCase().includes(q.toLowerCase())), next: null }; },
    async channel(id) { const s = subs.find(x => x.channelId === id) || subs[0]; return { id, title: s.title, handle: '@' + s.title.replace(/\W/g, '').toLowerCase(), description: 'Canal de ejemplo.', avatar: '', banner: '', subs: 4.9e6, videos: 230, uploads: 'p1' }; },
    async subscriptionFor() { return 's1'; },
    async subscribe() { return 's1'; },
    async unsubscribe() {},
    async rating(id) { return rated[id] || 'none'; },
    async rate(id, v) { rated[id] = v; return v; },
    async video(id) { return videos.find(v => v.id === id); },
  },
};
