const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const Store = require("./store");
const StoreSettings = require("./storeSettings");
const fs = require("fs");

// Set env
process.env.NODE_ENV = "development";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
const isMac = process.platform === "darwin" ? true : false;

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: "Flashbang",
        width: isDev ? 900 : 675,
        height: 450,
        icon: "./assets/icons/icon.png",
        resizable: false,
        backgroundColor: "white",
        // titleBarStyle: "hidden",
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
        },
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile("./app/index.html");
}

app.on("ready", () => {
    createMainWindow();

    mainWindow.webContents.on("dom-ready", () => {
        sendBunchData(); //TODO could be optimized by putting someowhere else
    });

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);
});

const menu = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
        role: "fileMenu",
    },
    ...(isDev
        ? [
              {
                  label: "Developer",
                  submenu: [
                      { role: "reload" },
                      { role: "forcereload" },
                      { type: "separator" },
                      { role: "toggledevtools" },
                  ],
              },
          ]
        : []),
];

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

ipcMain.on("bunch:setAll", (e, bunch) => {
    var count = 0;
    console.log("in user main setal ");
    console.log(bunch);
    const userDataPath = app.getPath("userData");
    var title;
    title = bunch.title + "";
    //TODO i dont think we need this
    title = title.replace("%20", " ");
    var filePath = userDataPath + "/bunches/" + title + ".json";
    while (fs.existsSync(filePath)) {
        count += 1;
        filePath = userDataPath + "/bunches/" + title + count + ".json";
    }
    title += count === 0 ? "" : count;

    const store = new Store({
        fileName: ".new_bunch",
    });
    store.set("title", title);

    const oldPath = userDataPath + "/bunches/.new_bunch.json";
    fs.rename(oldPath, filePath, () => {}); //TODO rewrite bunch tiutle in file
});

ipcMain.on("bunch:save", (e, bunch) => {
    const store = new Store({
        fileName: ".new_bunch",
    });
    store.setAll(bunch);
});

//used to format index page
//TODO this should not exist and if it does exist it should be in index .js not here
//the parsing of the data should be done elsewhere....or maybe not idk rn brain melt
function sendBunchData() {
    //TODO see if there is a way to stop this from reading all the contents of every json file
    const userDataPath = app.getPath("userData");
    const bunchesDir = userDataPath + "/bunches";
    if (fs.existsSync(userDataPath + "/bunches")) {
        try {
            var data = [];
            const files = fs.readdirSync(bunchesDir, "utf-8");
            let re = /^\./i; //excludes hidden files
            for (x = 0; x < files.length; x++) {
                if (!re.exec(files[x])) {
                    const jsonString = fs.readFileSync(
                        bunchesDir + "/" + files[x]
                    );
                    const bunch = JSON.parse(jsonString);
                    const title = bunch.title;
                    const lastUsed = bunch.lastUsed;
                    const numTerms = bunch.pairs.length;
                    data.push({ title, lastUsed, numTerms });
                }
            }
            //TODO chnag to e reply
            mainWindow.webContents.send("bunchdata:get", data);
        } catch {
            (error) => {
                console.log(error);
            };
        }
    } else {
        //TODO chnag to e reply
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
    sendBunchData();
    mainWindow.loadFile("./app/index.html");
}

///---------FlashCard Requests-----------
//used to get data in flashcards
ipcMain.on("bunch:get", (e, title) => {
    // const userDataPath = app.getPath("userData");
    // var filePath = userDataPath + "/bunches/" + title + ".json";
    // filePath = filePath.replace("%20", " ");
    // //TODO it seems more parsing might need to be done here
    // if (fs.existsSync(filePath)) {
    //     try {
    //         const jsonString = fs.readFileSync(filePath);
    //         const bunch = JSON.parse(jsonString);
    //         e.reply("bunch:get", bunch);
    //     } catch {
    //         (error) => {
    //             console.log(error);
    //         };
    //     }
    // } else {
    //     e.reply("bunch:get", []); //return [] if bunches directory dne
    // }

    const store = new Store({ fileName: title });
    e.reply("bunch:get", store.getAll());
});

ipcMain.on("pairs:set", (e, title) => {
    const userDataPath = app.getPath("userData");
    var filePath = userDataPath + "/bunches/" + title + ".json";
    filePath = filePath.replace("%20", " ");
});

//-------Settings----------
const storeSettings = new StoreSettings();

ipcMain.on("settings:getAll", (e) => {
    // mainWindow.webContents.send("settings:getAll", storeSettings.getAll());
    e.reply("settings:getAll", storeSettings.getAll());
});

ipcMain.on("settings:set", (e, input) => {
    storeSettings.set(input.key, input.value);
    //TODO make a more specific get method
    e.reply("settings:getAll", storeSettings.getAll());
});

ipcMain.on("returnToIndex", returnToIndexPage);

app.allowRendererProcessReuse = true;
