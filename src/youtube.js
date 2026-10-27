// Capa de YouTube Data API v3 para el escritorio. Todo pasa por aquí (proceso principal): el token nunca llega a la interfaz.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');
const createYouTube = require('./ytcore');

const CACHE = () => path.join(app.getPath('userData'), 'cache.json');
module.exports = createYouTube({
  getToken: force => auth.accessToken(force),
  store: {
    load: () => { try { return JSON.parse(fs.readFileSync(CACHE(), 'utf8')); } catch { return {}; } },
    save: d => fs.writeFile(CACHE(), JSON.stringify(d), () => {}),
    clear: () => { try { fs.unlinkSync(CACHE()); } catch {} },
  },
});
