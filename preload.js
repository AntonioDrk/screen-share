const { contextBridge, ipcRenderer } = require('electron');
var sourcesArray = [];

// Separate context from renderer
contextBridge.exposeInMainWorld('api', {
    getSources,
    getBase64,
    startStream,
    createRoom,
    onRoomCreatedCallback
});

// function bufferToBase64(buff){
//     return buff.toString('base64');
// }

/**
 * 
 * @param {MediaStream} stream 
 */
function startStream(stream) {
    ipcRenderer.invoke('START_STREAM', stream);
}

function createRoom() {
    ipcRenderer.invoke('ROOM_CREATE');
}

ipcRenderer.on('ROOM_CREATED', (_, roomId) => {
    onRoomCreatedCallback(roomId);
});

async function getSources() {
    const sources = await ipcRenderer.invoke('GET_SOURCES');
    if (sources) {
        sourcesArray = sources;
        return (sources);
    }
    return null;
}

/**
 * @param {Electron.DesktopCapturerSource} source 
 */
function getBase64(source) {
    /**
     * @type {Electron.DesktopCapturerSource}
     */
    const elemFound = sourcesArray.find(elem => elem.id === source.id);
    if (elemFound) {
        return elemFound.thumbnail.toPNG().toString('base64');
    }
    return '';
}