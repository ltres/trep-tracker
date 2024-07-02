const { contextBridge, ipcRenderer, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electron', {
  readFile: (filePath) => {
    return fs.readFileSync(filePath, 'utf-8');
  },
  writeFile: (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf-8');
  },
  createFile: () => ipcRenderer.invoke('create-file'),
  openAppStatus: () => ipcRenderer.invoke('open-app-status'),

  onStoreAppStatusRequest: (callback) => ipcRenderer.on('store-app-status-request', callback),
  onOpenedAppStatus: (callback) => ipcRenderer.on('opened-app-status', callback),

  sendAppStatus: (status) => ipcRenderer.send('app-status-response', status),

  // sendAppStatus: (status) => ipcRenderer.send('app-status-response', status)
});