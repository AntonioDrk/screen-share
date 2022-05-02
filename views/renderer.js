const MAX_TITLE_LENGTH = 25;

const stopBtn = document.getElementById('stopShare');
const sourceSelectBtn = document.getElementById('sourceSelBtn');
const sourcesContainer = document.getElementById('sources');
const createRoomBtn = document.getElementById('createRoomBtnId');
const joinRoomBtn = document.getElementById('joinRoomBtnId');
const roomIdInput = document.getElementById('roomInputId');
const localVideo = document.getElementById('localVideoId');
const remoteVideo = document.getElementById('remoteVideoId');

localVideo.parentElement.addEventListener('mouseenter', (e) => {
    toggleControlBar(e, true);
});
remoteVideo.parentElement.addEventListener('mouseenter', (e) => {
    toggleControlBar(e, true);
});

localVideo.parentElement.addEventListener('mouseleave', (e) => {
    toggleControlBar(e, false);
});
remoteVideo.parentElement.addEventListener('mouseleave', (e) => {
    toggleControlBar(e, false);
});

function toggleControlBar(e, isVisible) {
    // If the video element is hidden, ignore this event
    if (e.currentTarget.classList.contains('is-hidden')) {
        return;
    }

    const vidElem = e.currentTarget.querySelector('video');

    // The div that appears on a screen share
    const contBar = getControlBarElementForVideoId(vidElem.id);
    if (contBar) {
        if (isVisible) {
            contBar.classList.remove('is-hidden');
        } else {
            contBar.classList.add('is-hidden');
        }
    }
}

// Get all maximize buttons and attach handlers
document.querySelectorAll('.control-bar > #maximizeBtnId').forEach((el) => {
    el.addEventListener('click', maximizeWindow);
});

/**
 * 
 * @param {EventListenerOrEventListenerObject} e 
 */
function maximizeWindow(e) {
    // Gets first parent which has the class = control-bar-parent
    let parent = e.currentTarget;
    while (parent && !parent.classList.contains('control-bar-parent')) {
        parent = parent.parentElement;
    }

    if (parent) {
        let isFullscreen = true;
        if (parent.classList.contains('fullscreen')) {
            isFullscreen = false;
            parent.classList.remove('fullscreen');
            document.querySelector('html').classList.remove('hide-scrollbars');
        } else {
            parent.classList.add('fullscreen');
            document.querySelector('html').classList.add('hide-scrollbars');
        }
        api.onFullscreenToggle(isFullscreen);
    }
}

function getControlBarElementForVideoId(id) {
    const controlBars = document.querySelectorAll('.control-bar-parent');
    let rez = null;
    controlBars.forEach((elem) => {
        const videoElement = elem.querySelector('#' + id);
        if (videoElement) {
            rez = elem.querySelector('.control-bar');
        }
    });
    return rez;
}

createRoomBtn.addEventListener('click', (_) => {
    console.log('Btn clicked');
    api.createRoom();
});

stopBtn.onclick = stopShare;

sourceSelectBtn.onclick = async () => {
    sourcesContainer.innerHTML = '';

    const sources = await api.getSources();
    sources.forEach((source) => {
        addThumbnails(source);
    });
};

/**
 * @param {Electron.DesktopCapturerSource} source
 */
function addThumbnails(source) {
    const sourcesContainer = document.getElementById('sources');
    const thumbnailContainer = document.createElement('div');
    const thumbnailImage = document.createElement('img');
    const thumbnailTitle = document.createElement('p');
    const base64Img = api.getBase64(source);

    thumbnailContainer.classList.add('thumbnail', 'card', 'column', 'm-3');

    thumbnailTitle.textContent =
        source.name.trim().slice(0, MAX_TITLE_LENGTH + 1) + (source.name.length > MAX_TITLE_LENGTH ? '...' : '');
    thumbnailTitle.classList.add('title', 'is-4');

    thumbnailImage.classList.add('share-card-img', 'card-image');
    thumbnailImage.src = `data:image/png;base64,${base64Img}`;

    thumbnailContainer.appendChild(thumbnailImage);
    thumbnailContainer.appendChild(thumbnailTitle);

    thumbnailContainer.onclick = () => {
        selectSource(source.id);
    };

    sourcesContainer.appendChild(thumbnailContainer);
}

joinRoomBtn.addEventListener('click', async () => {
    if (roomIdInput.value) {
        console.log('Trying to join ' + roomIdInput.value);
        await api.joinRoom(roomIdInput.value);
    } else {
        alert('A Room ID must be provieded!');
    }
});

function onCreateRoomBtnClick() {
    api.createRoom();
}

async function selectSource(sourceId) {
    document.getElementById('sources').innerHTML = '';

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
            }
        }
    };

    // Create stream
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = stream;
        localVideo.onloadedmetadata = (e) => {
            localVideo.classList.remove('is-hidden');
            localVideo.play();
        };
        api.startStream(constraints);
    } catch (e) {
        console.log(e);
    }
}

function stopShare() {
    if (localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach((track) => {
            track.stop();
        });
    }
    localVideo.classList.add('is-hidden');
}
