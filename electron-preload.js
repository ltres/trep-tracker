const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electron', {
  readFile: (filePath) => {
    return fs.readFileSync(filePath, 'utf-8');
  },
  writeFile: (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf-8');
  },
  // Additional methods can be added here
});