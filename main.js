const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

const createWindow = () =>{
    const win = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences:{
            preload: path.join(__dirname, 'preload.js'),
        }
    });
    
    ipcMain.on('GET_SOURCES', async () =>{
        const inputSources = await desktopCapturer.getSources({
            types: ['window', 'screen'] 
        });
        win.webContents.send('SET_SOURCES', inputSources);
    });
    win.loadFile(path.join(__dirname,'views','index.html'));
}

app.whenReady().then(()=>{
    createWindow();

    app.on('activate', ()=>{
        if(BrowserWindow.getAllWindows().length === 0){
            createWindow();
        }
    });
});

app.on('window-all-closed', ()=>{
    if(process.platform !== 'darwin')
        app.quit();
});

app.on('will-quit', ()=>{
    console.log('He\'s about to quit!!!');
})