const { contextBridge, ipcRenderer } = require('electron');
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

let serviceAccount = JSON.parse(readFileSync('serviceAccount.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
var onRoomCreatedCallback = function (roomId) {
    console.log('Room created with id ' + roomId);
};


var sourcesArray = [];
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

/**
 * @type MediaStream
 */
let localStream = null;
/**
 * @type MediaStream
 */
let remoteStream = null;

// Constraints for the mediaDevice
async function startStream(constraints) {
    // IDK why but we need to get again the media device, can't seem to pass it as a param
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log(stream);
    localStream = stream;
    remoteStream = new MediaStream();
    // Push tracks from local stream to peer conn
    localStream.getVideoTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
        // Signal back to the frontend that we received new streams from peers
        onStreamReceived(remoteStream);
    };
}

/**
 * @param {MediaStream} remoteStream 
 */
function onStreamReceived(remoteStream) {
    console.log('Received stream from someone else!?');
    // Add the remote stream to video element
}


async function createRoom() {
    console.log('Creating a room');

    const callDoc = db.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');

    // Send the id of the created room
    onRoomCreatedCallback(callDoc.id);

    pc.onicecandidate = event => {
        if (event.candidate) {
            offerCandidates.add(event.candidate.toJSON());
        }
    };

    // Create the offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    };

    await callDoc.set({ offer });

    // Start listening
    ipcRenderer.send('ROOM_CREATED');

    /*snapshot => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data && data.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
        }
    }, (firebaseError) => {
        console.error(firebaseError.message);
    }*/

    // When answered, add candidates to peer connection
    // answerCandidates.onSnapshot(snapshot => {
    //     snapshot.docChanges().forEach(change => {
    //         if (change.type === 'added') {
    //             const candidate = new RTCIceCandidate(change.doc.data());
    //             pc.addIceCandidate(candidate);
    //         }
    //     }, (err) => {
    //         console.error(err.message);
    //     });
    // });
}

async function joinRoom(roomId) {
    const callDoc = db.collection('calls').doc(roomId);
    const answerCandidates = callDoc.collection('answerCandidates');

    pc.onicecandidate = event => {
        if (event.candidate) {
            answerCandidates.add(event.candidate.toJSON());
        }
    };

    const callData = (await callDoc.get()).data();

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    ipcRenderer.send('ROOM_JOIN');
}

ipcRenderer.on('ON_DOC_CHANGE', (_, data) => {
    if (!pc.currentRemoteDescription && data && data.answer) {
        console.log('Adding answer description');
        const answerDescription = new RTCSessionDescription(data.answer);
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

// Separate context from renderer
contextBridge.exposeInMainWorld('api', {
    getSources,
    getBase64,
    startStream,
    createRoom,
    joinRoom,
    onRoomCreatedCallback
});
