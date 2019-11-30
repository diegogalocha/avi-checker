import { enableLiveReload } from 'electron-compile';
const electronDebug = require('electron-debug');

module.exports = function devtools () {
  	enableLiveReload();
  	electronDebug({ showDevTools: true });
};
