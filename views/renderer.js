document.getElementById('content').textContent = `No of cpus: ${api.cpuNo}`;
const startBtn = document.getElementById('startSharing');
const stopBtn = document.getElementById('stopSharing');
const sourceSelectBtn = document.getElementById('sourceSelBtn');
const sourcesContainer = document.getElementById('sources');

sourceSelectBtn.onclick = getVideoSources;

async function getVideoSources(){
    const inputSources = await desktopCapturer.getSources({
        types: ['window', 'screen'] 
    });

    inputSources.forEach(source => {
        displaySource(source);
    });
}

function displaySource(source){
    const thumbnailDOM = document.createElement('a');
    const base64Img = bufferToBase64(source.thumbnail.toJPEG());
    thumbnailDOM.src = `data:image/jpeg;base64,${base64Img}`
    sourcesContainer.appendChild(thumbnailDOM);
}