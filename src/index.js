'use strict';

// instanciando los objetos app y BrowserWindow
import { app, BrowserWindow, ipcMain, ipcRenderer, dialog } from 'electron';
import devtools from './devtools';
import path from 'path';
import { download } from 'electron-dl';

// require('electron-dl')();

if (process.env.NODE_ENV === 'development') {
    devtools();
}

let win;

// Ejecutando órdenes cuando la aplicación está lista
app.on('ready', () => {
    win = new BrowserWindow({
        title: 'AVI Checker',
        center: true,
        show: false,
        icon: path.join(__dirname, 'assets', 'icon', 'main-icon.png')
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    // detectando el cierre de la ventana para cerrar la aplicación
    win.on('close', () => {
        win = null;
        app.quit();
    });

    win.maximize();
    win.loadURL(`file://${__dirname}/renderer/index.html`);
    ipcMain.on("download", (event, info) => {
        download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
            .then(dl => window.webContents.send("download complete", dl.getSavePath()));
    });

    // win.toggleDevTools();
});