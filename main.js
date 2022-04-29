const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const { join } = require('path');
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

let serviceAccount = JSON.parse(readFileSync('serviceAccount.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

// TODO: Move all of the RTC logic into the prerenderer
const pc = new RTCPeerConnection(servers);

/**
 * @type MediaStream
 */
let localStream = null;
/**
 * @type MediaStream
 */
let remoteStream = null;

const createWindow = () => {
    const win = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
        }
    });

    ipcMain.handle('GET_SOURCES', async () => {
        const inputSources = await desktopCapturer.getSources({
            types: ['window', 'screen']
        });
        return inputSources;
    });

    // Frontend signals us to start streaming
    ipcMain.on('START_STREAM', async (_, stream) => {
        localStream = stream;
        remoteStream = new MediaStream();

        // Push tracks from local stream to peer conn
        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        });

        // Pull tracks from remote stream, add to video stream
        pc.ontrack = event => {
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track);
            });
            // Signal back to the frontend that we received new streams from peers
            win.webContents.send('STREAM_RECEIVED', remoteStream);
        };
    });


    ipcMain.on('ROOM_CREATE', async () => {
        const callDoc = db.collection('calls').doc();
        const offerCandidates = callDoc.collection('offerCandidates');
        const answerCandidates = callDoc.collection('answerCandidates');

        // Send the id of the created room
        win.webContents.send('ROOM_CREATED', callDoc.id);

        pc.onicecandidate = event => {
            event.candidate && offerCandidates.add(event.candidate.toJSON());
        };

        // Create the offer
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await callDoc.set({ offer });

        // Listen for changes
        callDoc.onSnapshot(snapshot => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.setRemoteDescription(answerDescription);

            }
        });

        // When answered, add candidates to peer connection
        answerCandidates.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            });
        });
    });

    ipcMain.on('ROOM_JOIN', async (_, roomId) => {
        const callDoc = db.collection('calls').doc(roomId);
        const offerCandidates = callDoc.collection('offerCandidates');
        const answerCandidates = callDoc.collection('answerCandidates');

        pc.onicecandidate = event => {
            event.candidate && answerCandidates.add(event.candidate.toJSON());
        }

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

        offerCandidates.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                console.log(change);
                if (change.type === 'added') {
                    let data = change.doc.data();
                    pc.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
    });

    win.loadFile(join(__dirname, 'views', 'index.html'));
    win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});

app.on('will-quit', () => {
    console.log('He\'s about to quit!!!');
})