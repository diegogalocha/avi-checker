'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

let win;

// Ejecutando órdenes cuando la aplicación está lista
app.on('ready', () => {
    win = new BrowserWindow({
        title: 'AVI Checker',
        center: true,
        show: false,
        icon: path.join(__dirname, 'assets', 'icons', 'main-icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    require('@electron/remote/main').enable(win.webContents);

    win.once('ready-to-show', () => {
        win.show();
    });

    // detectando el cierre de la ventana para cerrar la aplicación
    win.on('closed', () => {
        win = null;
    });

    win.maximize();
    win.loadURL(`file://${__dirname}/renderer/index.html`);
});
