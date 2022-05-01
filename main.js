const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const { join } = require('path');
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

let serviceAccount = JSON.parse(readFileSync('serviceAccount.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const createWindow = () => {
    const win = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
        }
    });

    ipcMain.on('ROOM_CREATED', (_, docId) => {
        const callDoc = db.collection('calls').doc(docId);
        const answerCandidates = callDoc.collection('answerCandidates');
        console.log('Adding listeners');
        // Listen for changes
        callDoc.onSnapshot(snapshot => {
            const data = snapshot.data();
            if (data === undefined) {
                console.log('Document doesn\'t exist');
            }
            if (data && data.answer) {
                console.log('Firing ADD_ANSWER_DESCRIPTION');
                win.webContents.send('ADD_ANSWER_DESCRIPTION', data.answer);
            }
        });

        // When answered, add candidates to peer connection
        answerCandidates.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    console.log('Firing ADD_ICE_CANDIDATE');
                    win.webContents.send('ADD_ICE_CANDIDATE', change.doc.data());
                }
            });
        });
    });

    ipcMain.on('ROOM_JOIN', (_, roomId) => {
        console.log('Got ROOM_JOIN signal');
        const callDoc = db.collection('calls').doc(roomId);
        const offerCandidates = callDoc.collection('offerCandidates');
        offerCandidates.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    console.log('Sending ADD_ICE_CANDIDATE signal with data\n' + change.doc.data());
                    win.webContents.send('ADD_ICE_CANDIDATE', change.doc.data());
                }
            });
        });
    });

    ipcMain.handle('GET_DOCBYID', async (_, docId) => {
        const callDoc = db.collection('calls').doc(docId);
        const callData = (await callDoc.get()).data();
        return callData;
    });

    ipcMain.handle('GET_SOURCES', async () => {
        const inputSources = await desktopCapturer.getSources({
            types: ['window', 'screen']
        });
        return inputSources;
    });

    win.loadFile(join(__dirname, 'views', 'index.html'));
    win.webContents.openDevTools();
};

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
});