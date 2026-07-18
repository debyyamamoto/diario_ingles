// ============================================================
// PRELOAD
// Ponte segura entre o main process e o React.
// Só o que for exposto aqui fica visível pro renderer (window.electronAPI).
// Isso evita que o React tenha acesso livre ao Node/sistema de arquivos.
// ============================================================

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  correctText: (text) => ipcRenderer.invoke('diary:correct', text),
  saveEntry: (entry) => ipcRenderer.invoke('diary:save', entry),
  listEntries: () => ipcRenderer.invoke('diary:list')
})
