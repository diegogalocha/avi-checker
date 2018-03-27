const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'Avi-checker-win32-ia32/'),
    authors: 'Diego Galocha',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'avi-checker-app.exe',
    setupExe: 'AviCheckerAppInstaller.exe',
    setupIcon: path.join(__dirname, 'assets', 'icon', 'main-icon.png')
  })
}