// MAKE script
import { app, BrowserWindow, ipcMain  } from 'electron'
import contextMenu from 'electron-context-menu';
import { createRequire } from "module";
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);

let path = require('path')

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

let win;

let relPath = "/dist/trep-tracker/browser"

/*
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules/.bin/electron.cmd'),
  hardResetMethod: 'exit'
});
*/
function createWindow () {
  //console.log(`path is file://${__dirname}${relPath}/index.html`)
  // Create the browser window.
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: true,
      contextIsolation: true
    },
    // icon: __dirname + '/src/assets/favicon.ico',
    width: 1080, 
    height: 768,
    backgroundColor: '#161a24',
    icon: `${__dirname}/src/assets/icon/web/favicon.ico`
  })
  // win.setMenu(null)

  win.loadURL(`file://${__dirname}${relPath}/index.html`)

  //// uncomment below to open the DevTools.
  /// win.webContents.openDevTools()

  // Event when the window is closed.
  win.on('closed', function () {
    win = null
  })
}

// Create window on electron intialization
app.on('ready', () => {
  createWindow();
  contextMenu({
    showSaveImageAs: true
  });
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {

  // On macOS specific close process
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // macOS specific close process
  if (win === null) {
    createWindow()
  }
})

ipcMain.on('read-file', (event, filePath) => {
  console.log(filePath);
});

ipcMain.on('write-file', (event, { filePath, content }) => {
  console.log(filePath, content);
});