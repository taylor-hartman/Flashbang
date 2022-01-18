// const ipcRenderer = require("electron").ipcRenderer;

const palettes = document.getElementsByClassName("palette");
for (x = 0; x < palettes.length; x++) {
    palettes[x].addEventListener("click", changeTheme);
}

function changeTheme(e) {
    const theme = e.target.id;
    ipcRenderer.send("globalSettings:set", { key: "theme", value: theme });
}

ipcRenderer.on("globalSettings:getAll", (e, settings) => {
    const link = `<link rel="stylesheet" href="css/${settings.theme}.css" id="${settings.theme}-stylesheet"/>`;
    document.getElementById("theme-stylesheets").innerHTML = link;
});
