const { contextBridge, ipcRenderer, ipcMain } = require('electron');
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

let serviceAccount = JSON.parse(readFileSync('serviceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

var sourcesArray = [];
const servers = {
  iceServers: [
    {
      urls: 'stun:openrelay.metered.ca:80'
    },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

const pc = new RTCPeerConnection(servers);

pc.addEventListener(
  'connectionstatechange',
  (event) => {
    console.warn('Connection state changed to : ' + pc.connectionState);
    var notifText;
    switch (pc.connectionState) {
      case 'connecting':
        break;
      case 'connected':
        notifText = 'Succesfully connected to room';
        break;
      case 'disconnected':
        notifText = 'Disconnected from room';
        break;
      case 'new':
        break;
      case 'failed':
        notifText = 'Could not connect to the room';
        break;
      case 'closed':
        notifText = 'Could not connect to the room';
        break;
      default:
        console.error('Unhandled connection state ' + pc.connectionState);
        break;
    }
    if (notifText) {
      new Notification('Screen-share', { body: notifText });
    }
    console.warn(pc);
  },
  false
);

function getPeerConnectionObj() {
  return pc;
}

/**
 * @type MediaStream
 */
let localStream = null;
/**
 * @type MediaStream
 */
let remoteStream = null;

// Pull tracks from remote stream, add to video stream
pc.ontrack = (event) => {
  console.warn('Received track from peer!');
  event.streams[0].getTracks().forEach((track) => {
    remoteStream.addTrack(track);
  });
  // Signal back to the frontend that we received new streams from peers
  onStreamReceived(remoteStream);
};

var onRoomCreatedCallback = function (roomId) {
  document.getElementById('roomTextIndetifierId').innerText = roomId;
  console.log('Room created with id ' + roomId);
};

// Constraints for the mediaDevice
async function startStream(constraints) {
  // IDK why but we need to get again the media device, can't seem to pass it as a param
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log(localStream);
  remoteStream = new MediaStream();
  // Push tracks from local stream to peer conn
  localStream.getVideoTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  const remoteVideo = document.getElementById('remoteVideoId');
  remoteVideo.srcObject = remoteStream;
  remoteVideo.onloadedmetadata = (e) => {
    remoteVideo.classList.remove('is-hidden');
    remoteVideo.play();
  };
}

/**
 * @param {MediaStream} remoteStream 
 */
function onStreamReceived(remoteStream) {
  console.log('Received stream from someone else!?');
  // Add the remote stream to video element
}

// Called once the button is pressed
async function createRoom() {
  console.log('Creating a room');

  const callDoc = db.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');

  // Send the id of the created room
  onRoomCreatedCallback(callDoc.id);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      offerCandidates.add(event.candidate.toJSON());
    }
  };

  // Create the offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type
  };

  await callDoc.set({ offer });

  // Signal main thread
  ipcRenderer.send('ROOM_CREATED', callDoc.id);
}

async function joinRoom(roomId) {
  const callDoc = db.collection('calls').doc(roomId);
  const answerCandidates = callDoc.collection('answerCandidates');

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('A new answerCandidate has joined');
      answerCandidates.add(event.candidate.toJSON());
    }
  };
  console.log('Getting call data');
  const callData = await ipcRenderer.invoke('GET_DOCBYID', roomId);
  console.log('Checking offer description');
  const offerDescription = callData.offer;
  console.log('Setting remote description');
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  console.log('Creating answer');
  const answerDescription = await pc.createAnswer();
  console.log('Setting local description');
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp
  };
  console.log('Updating the callDoc');
  await callDoc.update({ answer });

  console.log('Sending ROOM_JOIN signal');
  ipcRenderer.send('ROOM_JOIN', roomId);
}

ipcRenderer.on('ADD_ANSWER_DESCRIPTION', (_, answer) => {
  console.log('Received ADD_ANSWER_DESCRIPTION signal');
  if (!pc.currentRemoteDescription && answer) {
    console.log('Adding answer description');
    const answerDescription = new RTCSessionDescription(answer);
    pc.setRemoteDescription(answerDescription);
  }
});

ipcRenderer.on('ADD_ICE_CANDIDATE', (_, docData) => {
  const candidate = new RTCIceCandidate(docData);
  pc.addIceCandidate(candidate);
});

ipcRenderer.on('OFFER_CANDIDATES_CHANGE', (_, change) => {
  console.log(change);
  if (change.type === 'added') {
    let data = change.doc.data();
    pc.addIceCandidate(new RTCIceCandidate(data));
  }
});

async function getSources() {
  const sources = await ipcRenderer.invoke('GET_SOURCES');
  if (sources) {
    sourcesArray = sources;
    return sources;
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
  const elemFound = sourcesArray.find((elem) => elem.id === source.id);
  if (elemFound) {
    return elemFound.thumbnail.toPNG().toString('base64');
  }
  return '';
}

// Gets called when the user toggles a fullscreen mode on one of the videos
function onFullscreenToggle(isFullscreen) {
  ipcRenderer.send('FULLSCREEN_TOGGLE', isFullscreen);
}

// Separate context from renderer
contextBridge.exposeInMainWorld('api', {
  getSources,
  getBase64,
  startStream,
  createRoom,
  joinRoom,
  onRoomCreatedCallback,
  getPeerConnectionObj, // Debug purposes only
  onFullscreenToggle
});
