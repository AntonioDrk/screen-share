const { app, BrowserWindow } = require('electron');
const path = require('path');

const createWindow = () =>{
    const win = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences:{
            preload: path.join(__dirname, 'preload.js'),
        }
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