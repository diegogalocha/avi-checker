const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller;
const path = require('path');

getInstallerConfig()
    .then(createWindowsInstaller)
    .catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });

function getInstallerConfig () {
    console.log('creating windows installer');
    const rootPath = path.join('./');
    const outPath = path.join(rootPath, 'out');

    return Promise.resolve({
        appDirectory: path.join(outPath, 'avi-checker-win32-ia32/'),
        authors: 'Diego Galocha',
        noMsi: true,
        outputDirectory: path.join(outPath, 'windows-installer'),
        exe: 'avi-checker.exe',
        setupExe: 'AviCheckerAppInstaller.exe',
        setupIcon: path.join(rootPath, 'src', 'assets', 'icons', 'main-icon.ico')
    });
}
