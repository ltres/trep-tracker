const { app, BrowserWindow, ipcMain  } = require('electron')
let path = require('path')
let win;

let relPath = "/dist/trep-tracker/browser"

require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules/.bin/electron.cmd'),
  hardResetMethod: 'exit'
});

function createWindow () {
  console.log(`path is file://${__dirname}${relPath}/index.html`)
  // Create the browser window.
  win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    },
    width: 1080, 
    height: 768,
    backgroundColor: '#161a24',
    icon: `file://${__dirname}${relPath}/assets/logo.png`
  })
  // win.setMenu(null)

  win.loadURL(`http://localhost:4200`)

  //// uncomment below to open the DevTools.
   win.webContents.openDevTools()

  // Event when the window is closed.
  win.on('closed', function () {
    win = null
  })
}

// Create window on electron intialization
app.on('ready', createWindow)

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