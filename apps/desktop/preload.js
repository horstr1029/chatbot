const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mstDesktop', {
  minimize: () => ipcRenderer.send('window:minimize'),
  hide: () => ipcRenderer.send('window:hide'),
})
