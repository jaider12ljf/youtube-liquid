const { contextBridge, ipcRenderer } = require('electron');

const inv = async (ch, ...a) => {
  const r = await ipcRenderer.invoke(ch, ...a);
  if (!r.ok) { const e = new Error(r.error); e.code = r.code; throw e; }
  return r.data;
};

contextBridge.exposeInMainWorld('host', {
  win: cmd => inv('win', cmd),
  onWin: fn => { ipcRenderer.on('win:max', (_, v) => fn('max', v)); ipcRenderer.on('win:fs', (_, v) => fn('fs', v)); },
  auth: {
    status: () => inv('auth:status'),
    importClient: () => inv('auth:importClient'),
    signIn: () => inv('auth:signIn'),
    cancel: () => inv('auth:cancel'),
    signOut: () => inv('auth:signOut'),
    forgetClient: () => inv('auth:forgetClient'),
  },
  yt: (name, ...args) => inv('yt', name, ...args),
  settings: { get: () => inv('settings:get'), set: v => inv('settings:set', v) },
  open: url => inv('open', url),
  copy: text => inv('copy', text),
  guide: () => inv('guide'),
});
