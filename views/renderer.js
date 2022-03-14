document.getElementById('content').textContent = `No of cpus: ${api.cpuNo}`;
const startBtn = document.getElementById('startSharing');
const stopBtn = document.getElementById('stopSharing');
const sourceSelectBtn = document.getElementById('sourceSelBtn');
const sourcesContainer = document.getElementById('sources');

sourceSelectBtn.onclick = async ()=>{
    sourcesContainer.innerHTML = '';

    const sources = await api.getSources();
    sources.forEach(source => {
        addThumbnails(source);
    });
    
}

/**
 * @param {Electron.DesktopCapturerSource} source
 */
function addThumbnails(source){
    const sourcesContainer = document.getElementById('sources');
    const thumbnailContainer = document.createElement('div');
    const thumbnailImage = document.createElement('img');
    const thumbnailTitle = document.createElement('p');
    const base64Img = api.getBase64(source);
    
    thumbnailContainer.classList.add('thumbnail');
    
    thumbnailTitle.textContent = source.name;

    thumbnailImage.classList.add('shareSource');
    thumbnailImage.src = `data:image/png;base64,${base64Img}`

    thumbnailContainer.appendChild(thumbnailImage);
    thumbnailContainer.appendChild(thumbnailTitle);

    thumbnailContainer.onclick = ()=>{selectSource(source.id)}

    sourcesContainer.appendChild(thumbnailContainer);
}

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
        console.log('Stream: ' + stream);
        vidElem.srcObject = stream;
        vidElem.onloadedmetadata = (e) => {
            console.log('Playing the video\nEvent ' + e);
            vidElem.play();
        }
    }catch(e){
        console.log(e);
    }
}