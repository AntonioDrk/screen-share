const { contextBridge, desktopCapturer, ipcRenderer } = require("electron");
const os = require('os');

// Separate context from renderer
contextBridge.exposeInMainWorld('api',{
    cpuNo: os.cpus().length,
    desktopCapturer,
    getSources,
});

// function bufferToBase64(buff){
//     return buff.toString('base64');
// }

// function getVideoSources(){
//     ipcRenderer.send('GET_SOURCES');
// }

// ipcRenderer.on('SET_SOURCES', async (event, sources) => {
//     const sourcesContainer = document.getElementById('sources');
//     sources.forEach(source => {
//         showThumbnail(source);
//     });
// });

// function showThumbnail(source){
//     const thumbnailDOM = document.createElement('a');
//     const base64Img = source.thumbnail.toJPEG().toString('base64');
//     thumbnailDOM.src = `data:image/jpeg;base64,${base64Img}`
//     sourcesContainer.appendChild(thumbnailDOM);
// }