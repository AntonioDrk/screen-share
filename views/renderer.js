const MAX_TITLE_LENGTH = 25;


const stopBtn = document.getElementById('stopShare');
const sourceSelectBtn = document.getElementById('sourceSelBtn');
const sourcesContainer = document.getElementById('sources');

stopBtn.onclick = stopShare;

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
    
    thumbnailContainer.classList.add('thumbnail', 'card', 'column', 'm-3');
    
    thumbnailTitle.textContent = source.name.trim().slice(0,MAX_TITLE_LENGTH+1) + (source.name.length > MAX_TITLE_LENGTH ? '...' : '');
    thumbnailTitle.classList.add('title', 'is-4');

    thumbnailImage.classList.add('share-card-img', 'card-image');
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
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        vidElem.srcObject = stream;
        vidElem.onloadedmetadata = (e) => {
            vidElem.classList.remove('is-hidden');
            vidElem.play();
        }
    }catch(e){
        console.log(e);
    }
}

function stopShare(){
    const vidElem = document.querySelector('video');
    vidElem.srcObject.getTracks().forEach(track=>{
        track.stop();
    })
    vidElem.classList.add('is-hidden');
}