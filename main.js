const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const BunchStorage = require("./bunchStorage");
const Settings = require("./settings");
const FolderManager = require("./folderManager");
const fs = require("fs");
const fetch = require("electron-fetch").default;
const dialog = require("electron").dialog;

//#region Electron/Window Management
/* -------------------------------------------------------------------------- */
/*                         Electron/Window Management                         */
/* -------------------------------------------------------------------------- */
// Set env
process.env.NODE_ENV = app.commandLine.hasSwitch("dev")
	? "development"
	: "production";

//npm start runs without dev flag
//npm run dev runs with dev flag
const isDev = process.env.NODE_ENV !== "production" ? true : false;
const isMac = process.platform === "darwin" ? true : false;

let mainWindow;

const globalSettings = new Settings("global");
const folderManager = new FolderManager();

//HACK....this is painful wtf
//-----------background flash fix------------
const backgroundLookUp = {
	light: "#e7e6e1",
	dark: "#222831",
	"lemon-mint": "#fffdde",
	lab: "#e4e7e6",
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
		title: `flashbang${isDev ? " (dev)" : ""}`,
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
	const mainMenu = Menu.buildFromTemplate(standardMenu);
	Menu.setApplicationMenu(mainMenu);

	mainWindow.webContents.once("dom-ready", () => {
		//check for update
		if (globalSettings.get("updateNotif")) {
			//if notifications are turned off no external request is made
			try {
				const currentVersion = 1.2; //the version of this release
				fetch("https://flashbang.lol/version-info.json")
					.then((res) => res.text())
					.then((body) => {
						const info = JSON.parse(body);
						const latestVersion = parseFloat(info["latest-version"]);
						if (latestVersion > currentVersion) {
							mainWindow.webContents.send("index:showUpdateAlert");
						}
					});
			} catch {}
		}
	});
});

const standardMenu = [
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
];

let menu;

ipcMain.on("updateMenu", (e, type) => {
	menu = JSON.parse(JSON.stringify(standardMenu));
	switch (type) {
		case "study-typed":
			menu.push({
				label: "Study",
				submenu: [{ label: "I Was Right", accelerator: "CmdOrCtrl+D" }],
			});
			break;
		// case "study-flashcard":
		//     menu.push({
		//         label: "Study",
		//         submenu: [
		//             { label: "Show Answer", accelerator: "Space" },
		//             { label: "Answer Correct", accelerator: "2" },
		//             { label: "Answer Incorrect", accelerator: "1" },
		//         ],
		//     });
		//     break;
		case "newbunch":
			if (isMac) {
				menu.push({
					label: "Navigation",
					submenu: [
						{ label: "Scroll To Top", accelerator: "CmdOrCtrl+Up" },
						{
							label: "Scroll To Bottom",
							accelerator: "CmdOrCtrl+Down",
						},
					],
				});
			}
			break;
		case "standard":
			break;
	}

	if (isDev) {
		menu.push({
			label: "Developer",
			submenu: [
				{ role: "reload" },
				{ role: "forcereload" },
				{ type: "separator" },
				{ role: "toggledevtools" },
			],
		});
	}

	Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
});

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

	//NOTE only need for development and updates
	//checks to see if defaults have been added and applies them if so
	for (const [key, value] of Object.entries(bunchStorage.defaults)) {
		if (bunchStorage.get(key) == null || bunchStorage.get(key) == undefined) {
			bunchStorage.set(key, value);
		}
	}
});

//saves an already existing bunch
ipcMain.on("bunch:save", (e, bunch) => {
	const bunchStorage = new BunchStorage({
		fileName: bunch.id,
	});

	for (const [key, value] of Object.entries(bunch)) {
		bunchStorage.set(key, value);
	}

	//NOTE only need for development and updates
	// checks to see if defaults have been added and applies them if so
	for (const [key, value] of Object.entries(bunchStorage.defaults)) {
		if (bunchStorage.get(key) == null || bunchStorage.get(key) == undefined) {
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
function sendBunchData(e) {
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
					const jsonString = fs.readFileSync(bunchesDir + "/" + files[x]);
					const bunch = JSON.parse(jsonString);
					const title = bunch.title;
					const lastUsed = bunch.lastUsed;
					const numTerms = bunch.pairs.length;
					const id = bunch.id;
					data.push({ id, title, lastUsed, numTerms });
				}
			}
			e.reply("bunchdata:get", data);
		} catch {
			(error) => {
				console.log(error);
			};
		}
	} else {
		e.reply("bunchdata:get", []); //return 0 if bunches directory dne
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

//#region Folder Requests
/* -------------------------------------------------------------------------- */
/*                              Folder Requests                               */
/* -------------------------------------------------------------------------- */
ipcMain.on("folderdata:get", (e) => {
	folderData = folderManager.getAll();
	e.reply("folderdata:get", folderData);
});

ipcMain.on("folder:addbunches", (e, folderID, bunchIDs) => {
	folderManager.addBunches(folderID, bunchIDs);
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
