'use strict';

import { app, BrowserWindow } from 'electron';
import devtools from './devtools';
import path from 'path';

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
    // win.toggleDevTools();
});
