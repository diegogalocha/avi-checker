'use strict'

// instanciando los objetos app y BrowserWindow
import { app, BrowserWindow } from 'electron'
import devtools from './devtools'

if (process.env.NODE_ENV === 'development') {
  devtools()
}

// imprimiendo un mensaje en la consola antes de salir
app.on('before-quit', () => {
  console.log('Saliendo')
})

// Ejecutando órdenes cuando la aplicación está lista
app.on('ready', () => {
  let win = new BrowserWindow({
    title: 'Hola Diego',
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

  win.maximize()
  win.loadURL(`file://${__dirname}/renderer/index.html`)
  win.toggleDevTools()
})
