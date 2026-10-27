// Arma la carpeta www/ para el teléfono: la misma interfaz del escritorio + el puente de Android.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src', 'ui'), www, { recursive: true });
fs.copyFileSync(path.join(root, 'src', 'ytcore.js'), path.join(www, 'ytcore.js'));
// runtime de Capacitor sin empaquetador (registerPlugin y el puente con Android)
fs.copyFileSync(path.join(root, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js'), path.join(www, 'capacitor.js'));
for (const f of ['host.js', 'mobile.css', 'oauth-config.js']) {
  const src = path.join(root, 'src', 'mobile', f);
  if (!fs.existsSync(src)) throw new Error(`Falta src/mobile/${f}` + (f === 'oauth-config.js' ? ' (se genera desde el JSON del cliente de Google)' : ''));
  fs.copyFileSync(src, path.join(www, f));
}
let html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const put = (anchor, add, before = false) => {
  if (!html.includes(anchor)) throw new Error('No encontré ' + anchor);
  html = html.replace(anchor, before ? add + anchor : anchor + add);
};
put('<meta charset="utf-8">', '\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
put('<link rel="stylesheet" href="app.css">', '\n<link rel="stylesheet" href="mobile.css">');
put('<script src="app.js"></script>', '<script src="capacitor.js"></script>\n<script src="ytcore.js"></script>\n<script src="oauth-config.js"></script>\n<script src="host.js"></script>\n', true);
html = html.replace('<body class="nav-side">', '<body class="nav-cap mobile">');
fs.writeFileSync(path.join(www, 'index.html'), html);
console.log('www listo');
