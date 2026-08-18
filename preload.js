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
  listEntries: () => ipcRenderer.invoke('diary:list'),
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  saveApiKey: (apiKey) => ipcRenderer.invoke('settings:saveApiKey', apiKey),
  // Disparado pelo main process ao fechar a janela pelo X (não ao minimizar
  // manualmente). Devolve uma função pra remover o listener no cleanup do effect.
  onResetRequest: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('app:reset-editor', handler)
    return () => ipcRenderer.removeListener('app:reset-editor', handler)
  }
})
