const { contextBridge, ipcRenderer } = require('electron');
const URL = require('url');
const os = require('os');
const { url } = require('inspector');

var sourcesArray = [];

// Separate context from renderer
contextBridge.exposeInMainWorld('api',{
    cpuNo: os.cpus().length,
    getSources,
    getBase64,
    selectSource
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
    const elemFound = sourcesArray.find(elem => elem.id === source.id);
    if(elemFound){
        return elemFound.thumbnail.toPNG().toString('base64');
    }
    return '';
}

// /**
//  * @param {Electron.DesktopCapturerSource} source 
//  */
// function showThumbnailCard(source){
//     const sourcesContainer = document.getElementById('sources');
//     const thumbnailContainer = document.createElement('div');
//     const thumbnailImage = document.createElement('img');
//     const thumbnailTitle = document.createElement('p');
//     const base64Img = source.thumbnail.toPNG().toString('base64');
    
//     thumbnailContainer.classList.add('thumbnail');
    
//     thumbnailTitle.textContent = source.name;

//     thumbnailImage.classList.add('shareSource');
//     thumbnailImage.src = `data:image/png;base64,${base64Img}`

//     thumbnailContainer.appendChild(thumbnailImage);
//     thumbnailContainer.appendChild(thumbnailTitle);

//     thumbnailContainer.onclick = ()=>{selectSource(source.id)}

//     sourcesContainer.appendChild(thumbnailContainer);
// }

async function selectSource(sourceId){
    document.getElementById('sources').innerHTML = '';
    //document.getElementById('title').textContent = 'Sharing ' + source.name;
    const vidElem = document.querySelector('video');

    const constraints = {
        audio: false,
        video:{
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720
            }
            
        }
    }

    // Create stream
    try{
        console.log(navigator.mediaDevices.getSupportedConstraints());
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        vidElem.srcObject = stream;
        vidElem.onloadmetadata = (e) => vidElem.play();
    }catch(e){
        console.log(e);
    }
}