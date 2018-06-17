import { ipcRenderer, clipboard, remote, shell } from 'electron'
import path from 'path'

function openDirectory () {
  debugger;
  ipcRenderer.send('open-directory')
}

function showDialog (type, title, msg) {
  debugger;
  ipcRenderer.send('show-dialog', {type: type, title: title, message: msg})
}

function saveFile () {
  const image = document.getElementById('image-displayed').dataset.original
  const ext = path.extname(image)

  ipcRenderer.send('open-save-dialog', ext)
}

module.exports = {
  saveFile: saveFile,
  openDirectory: openDirectory
}