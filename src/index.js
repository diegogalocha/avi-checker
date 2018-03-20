'use strict'

// instanciando los objetos app y BrowserWindow
import { app, BrowserWindow, ipcMain } from 'electron'
import devtools from './devtools'

const {download} = require("electron-dl");

if (process.env.NODE_ENV === 'development') {
  devtools()
}

// Ejecutando órdenes cuando la aplicación está lista
app.on('ready', () => {
  let win = new BrowserWindow({
    title: 'AVI Checker',
    center: true,
    show: false
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  // detectando el cierre de la ventana para cerrar la aplicación
  win.on('close', () => {
    win = null
    app.quit()
  })

  ipcMain.on('download', (event, info) => {
        download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
            .then(dl => window.webContents.send('download complete', dl.getSavePath()));
    });

  win.maximize();
  win.loadURL(`file://${__dirname}/renderer/index.html`);
  win.toggleDevTools();
})
