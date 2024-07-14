import { app, BrowserWindow, dialog, ipcMain, Menu  } from 'electron'
import contextMenu from 'electron-context-menu';
import { createRequire } from "module";
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

let path = require('path')
const fs = require('fs');

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory



let win;

let relPath = "/dist/trep-tracker/browser"



require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules/.bin/electron.cmd')
});

function createWindow () {
  console.log(`path is file://${__dirname}${relPath}/index.html`)
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

  let template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open status file',
          click: async () => {
            console.log('open-app-status');

            let filePath = await getStatusFilePath();
            console.log('open-app-status', filePath);

            if( filePath ){
              console.log('open-app-status', filePath);
              win.webContents.send('opened-app-status', filePath);
            }
          }
        },
        {
          label: 'Save status as..',
          click: () => {
            win.webContents.send('store-app-status-request');
          }
        }
      ]
    },
    {
      label: 'Dev',
      submenu: [
        {
          label: 'Reload',
          click: async () => {
            win.reload();
          }
        }
      ]
    },
    // ... other menu items ...
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // win.setMenu(Menu);

  win.loadURL(`http://localhost:4200`)
  // win.loadURL(`file://${__dirname}${relPath}/index.html`)



  //// uncomment below to open the DevTools.
   win.webContents.openDevTools()

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

ipcMain.on('open-file-stuff', () => {
  dialog.showOpenDialog({ 
    properties: [ 'openFile' ] }, function ( filename ) {
      console.log( filename.toString() );
    }
  );
})

ipcMain.on('read-file', (event, filePath) => {
  console.log(filePath);
});

ipcMain.on('write-file', (event, { filePath, content }) => {
  console.log(filePath, content);
});

async function createStatusFile( fileContent ){
  let extension = 'trptrk';
  const { filePath } = await dialog.showSaveDialog({
    title: 'Create trep-tracker status File',
    buttonLabel: 'Create',
    filters: [{ name: 'trep-tracker status file', extensions: [extension] }],
    // You can set default path, filters, etc. here
  });

  if (filePath) {
    fs.writeFileSync( filePath, fileContent ?? '{}', 'utf-8');
    return filePath;
  }
  return null;
}

async function getStatusFilePath( fileContent ){
  let extension = 'trptrk';
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Open trep-tracker status File',
    buttonLabel: 'Open',
    filters: [{ name: 'trep-tracker status file', extensions: [extension] }],
    // You can set default path, filters, etc. here
  });

  if (filePaths && filePaths[0]) {
    return filePaths[0];
  }
  return null;
}

ipcMain.handle('create-file', async (event) => {
  console.log('Creating file..:');
  return await createStatusFile( "{}" );
});

ipcMain.handle('open-app-status', async (event) => {
  console.log('open-app-status..:');
  let path = await getStatusFilePath();
  if( path ){
    return {path, content:fs.readFileSync( path, 'utf-8')};
  }else{
    return null;
  }
});



ipcMain.on('app-status-response', async (event, status) => {
  console.log('Received app status:', status);
  return await createStatusFile( status );
});

ipcMain.handle('store-app-status-request',  async (event) => {
  console.log('store-app-status-request', status);
})