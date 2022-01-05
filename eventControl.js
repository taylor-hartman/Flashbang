const { app, ipcMain } = require("electron");
const Store = require("./store");
const fs = require("fs");

ipcMain.on("newbunch:set", (e, bunch) => {
    const store = new Store({
        fileName: bunch.title,
    });
    store.setAll(bunch);
    returnToIndexPage(); //TODO THIS SHOULD NOT BE HERE idk y capital
});

export function sendBunchesData() {
    const userDataPath = app.getPath("userData");
    const bunchesDir = userDataPath + "/bunches";
    var data = [];
    if (fs.existsSync(userDataPath + "/bunches")) {
        try {
            var data = [];
            const files = fs.readdirSync(bunchesDir, "utf-8");
            for (x = 0; x < files.length; x++) {
                const jsonString = fs.readFileSync(bunchesDir + "/" + files[x]);
                const bunch = JSON.parse(jsonString);
                const title = bunch.title;
                const lastUsed = bunch.lastUsed;
                const numTerms = bunch.data.length;
                data.push({ title, lastUsed, numTerms });
            }
            console.log(data);
            mainWindow.webContents.send("bunchdata:get", data);
        } catch {
            (error) => {
                console.log(error);
            };
        }
    } else {
        mainWindow.webContents.send("bunchdata:get", []); //return 0 if bunches directory dne
    }
}

// function sendNumBunches() {
//     const userDataPath = app.getPath("userData");
//     if (fs.existsSync(userDataPath + "/bunches")) {
//         const bunchesDir = userDataPath + "/bunches";
//         fs.readdir(bunchesDir, (error, files) => {
//             mainWindow.webContents.send("bunchnum:get", files.length);
//         });
//     } else {
//         mainWindow.webContents.send("bunchnum:get", 0); //return 0 if bunches directory dne
//     }
// }

function returnToIndexPage() {
    sendBunchesData();
    mainWindow.loadFile("./app/index.html");
}
