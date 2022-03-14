const { contextBridge, desktopCapturer } = require("electron");
const os = require('os');

// Separate context from renderer
contextBridge.exposeInMainWorld('api',{
    cpuNo: os.cpus().length,
    desktopCapturer: desktopCapturer,
    bufferToBase64,
});

function bufferToBase64(buff){
    return buff.toString('base64');
}