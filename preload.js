const { contextBridge, ipcRenderer } = require('electron');
var sourcesArray = [];

// Separate context from renderer
contextBridge.exposeInMainWorld('api',{
    getSources,
    getBase64
});

// function bufferToBase64(buff){
//     return buff.toString('base64');
// }

async function getSources(){
    const sources = await ipcRenderer.invoke('GET_SOURCES');
    if(sources){
        sourcesArray = sources;
        return(sources);
    }
    return null;
}

/**
 * @param {Electron.DesktopCapturerSource} source 
 */
function getBase64(source){
    /**
     * @type {Electron.DesktopCapturerSource}
     */
    const elemFound = sourcesArray.find(elem => elem.id === source.id);
    if(elemFound){
        return elemFound.thumbnail.toPNG().toString('base64');
    }
    return '';
}