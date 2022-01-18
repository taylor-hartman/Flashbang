const ipcRenderer = require("electron").ipcRenderer;

ipcRenderer.send("globalSettings:get", "theme");
ipcRenderer.on("globalSettings:gettheme", (e, theme) => {
    const link = `<link rel="stylesheet" href="css/${theme}.css" id="${theme}-stylesheet"/>`;
    document.getElementById("theme-stylesheets").innerHTML = link;
});
