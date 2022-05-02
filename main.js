const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const BunchStorage = require("./bunchStorage");
const Settings = require("./settings");
const fs = require("fs");

//#region Electron/Window Management
/* -------------------------------------------------------------------------- */
/*                         Electron/Window Management                         */
/* -------------------------------------------------------------------------- */
// Set env
process.env.NODE_ENV = "development";
// process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
// const isDev = false;
const isMac = process.platform === "darwin" ? true : false;

let mainWindow;

//HACK....this is painful wtf
//-----------background flash fix------------
const globalSettings = new Settings("global");

const backgroundLookUp = {
    light: "#e7e6e1",
    dark: "#222831",
    "lemon-mint": "#fffdde",
    "sea-mist": "#c4f8f0",
    beehive: "#ffc600",
    houseplant: "#a7ff83",
    cafe: "#f4dfba",
    terminal: "#000",
    dream: "#091933",
    construction: "#52575d",
};

var theme = globalSettings.get("theme");

ipcMain.on("background:set", () => {
    theme = globalSettings.get("theme");
    mainWindow.setBackgroundColor(backgroundLookUp[theme]);
});
//--------------------------------------

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: "flashbang",
        width: isDev ? 875 : 625,
        height: 425,
        icon: "./assets/icons/icon.png",
        resizable: true,
        backgroundColor: backgroundLookUp[theme],
        // titleBarStyle: "hidden",
        // frame: false,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
        },
    });

    mainWindow.on("ready-to-show", function () {
        mainWindow.show();
        mainWindow.focus();
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile("./app/index.html");
    app.commandLine.appendSwitch("--enable-features", "OverlayScrollbar");
}

app.on("ready", () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);
});

const menu = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            {
                label: "Redo",
                accelerator: "Shift+CmdOrCtrl+Z",
                selector: "redo:",
            },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            {
                label: "Select All",
                accelerator: "CmdOrCtrl+A",
                selector: "selectAll:",
            },
        ],
    },
    {
        label: "Study",
        submenu: [{ label: "I was right", accelerator: "CmdOrCtrl+D" }],
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

app.allowRendererProcessReuse = true;
//#endregion

//#region Bunch Requests
/* -------------------------------------------------------------------------- */
/*                               Bunch Requests                               */
/* -------------------------------------------------------------------------- */

/* ---------------------------------- Save ---------------------------------- */
//saves new bunch when the back button is pressed
ipcMain.on("newbunch:save", (e, bunch) => {
    const bunchStorage = new BunchStorage({
        fileName: ".new_bunch",
    });

    for (const [key, value] of Object.entries(bunch)) {
        bunchStorage.set(key, value);
    }

    //TODO take out, only need for development
    //checks to see if defaults have been added and applies them if so
    for (const [key, value] of Object.entries(bunchStorage.defaults)) {
        if (
            bunchStorage.get(key) == null ||
            bunchStorage.get(key) == undefined
        ) {
            bunchStorage.set(key, value);
        }
    }
});

ipcMain.on("bunch:save", (e, bunch) => {
    const bunchStorage = new BunchStorage({
        fileName: bunch.id,
    });

    for (const [key, value] of Object.entries(bunch)) {
        bunchStorage.set(key, value);
    }

    //TODO take out, only need for development
    //checks to see if defaults have been added and applies them if so
    for (const [key, value] of Object.entries(bunchStorage.defaults)) {
        if (
            bunchStorage.get(key) == null ||
            bunchStorage.get(key) == undefined
        ) {
            bunchStorage.set(key, value);
        }
    }
});

//when a newbunch is submitted
ipcMain.on("bunch:submit", (e, bunch) => {
    //generate id
    let count = 1;
    const userDataPath = app.getPath("userData");
    var filePath = userDataPath + "/bunches/" + count + ".json";

    while (fs.existsSync(filePath)) {
        count += 1;
        filePath = userDataPath + "/bunches/" + count + ".json";
    }

    console.log(count);
    const bunchStorage = new BunchStorage({
        fileName: count,
    });

    bunch.id = count;

    //save bunch
    for (const [key, value] of Object.entries(bunch)) {
        bunchStorage.set(key, value);
    }

    //delete .new_bunch file
    const newBunch = userDataPath + "/bunches/.new_bunch.json";
    fs.unlink(newBunch, () => {});
});

/* ----------------------------------- Get ---------------------------------- */
//pass bunch title of "" for defaults
ipcMain.on("bunch:get", (e, id, key) => {
    const bunchStorage = new BunchStorage({ fileName: id });
    e.reply(`bunch:get${key}`, bunchStorage.get(key));
});

ipcMain.on("bunch:getAll", (e, id) => {
    const bunchStorage = new BunchStorage({ fileName: id });
    e.reply("bunch:getAll", bunchStorage.getAll());
});

ipcMain.on("bunchdata:get", sendBunchData);

//used to format index page
//this has to be done here and not in index becuase index.js cannot access directory
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
                    const id = bunch.id;
                    data.push({ id, title, lastUsed, numTerms });
                }
            }
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

/* --------------------------------- Set/Delete --------------------------------- */
ipcMain.on("bunch:delete", (e, fileName) => {
    const userDataPath = app.getPath("userData");
    var filePath = userDataPath + "/bunches/" + fileName + ".json";
    fs.unlink(filePath, () => {});
});

ipcMain.on("bunch:set", (e, id, input) => {
    const bunchStorage = new BunchStorage({ fileName: id });
    bunchStorage.set(input.key, input.value);
});
//#endregion

//#region Settings Requests
/* -------------------------------------------------------------------------- */
/*                              Settings Requests                             */
/* -------------------------------------------------------------------------- */

/* ----------------------------------- Get ---------------------------------- */
ipcMain.on("globalSettings:get", (e, key) => {
    // mainWindow.webContents.send("settings:getAll", globalSettings.getAll());
    e.reply(`globalSettings:get${key}`, globalSettings.get(key));
});

ipcMain.on("globalSettings:getAll", (e) => {
    // mainWindow.webContents.send("settings:getAll", globalSettings.getAll());
    e.reply("globalSettings:getAll", globalSettings.getAll());
});

/* ------------------------------- Set/Delete ------------------------------- */
ipcMain.on("globalSettings:set", (e, input) => {
    globalSettings.set(input.key, input.value);
    e.reply("globalSettings:getAll", globalSettings.getAll());
});

//replies only wiht the set value
ipcMain.on("globalSettings:set1", (e, input) => {
    globalSettings.set(input.key, input.value);
    e.reply(`globalSettings:get${input.key}`, globalSettings.get(input.key));
});

ipcMain.on("globalSettings:resetDefaults", (e) => {
    globalSettings.resetDefault();
    e.reply("globalSettings:getAll", globalSettings.getAll());
    e.reply("globalSettings:gettheme", globalSettings.get("theme"));
});
//#endregion
