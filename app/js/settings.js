const ipcRenderer = require("electron").ipcRenderer;

//-------Themes-------
const palettes = document.getElementsByClassName("palette");
for (x = 0; x < palettes.length; x++) {
    palettes[x].addEventListener("click", changeTheme);
}

function changeTheme(e) {
    const theme = e.target.id;
    ipcRenderer.send("globalSettings:set1", { key: "theme", value: theme });
    ipcRenderer.send("background:set");
}

//-------Study-------
document.getElementById("strike-through").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "strikeThrough",
        value: document.getElementById("strike-through").checked,
    });
});

document.getElementById("show-info").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "showInfo",
        value: document.getElementById("show-info").checked,
    });
});

document.getElementById("show-iwr").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "showIwr",
        value: document.getElementById("show-iwr").checked,
    });
});

document.getElementById("delay-correct").addEventListener("change", () => {
    var value = document.getElementById("delay-correct").value;
    re = /^\d(\.\d{1,2})?$/;
    value = re.test(value) ? value : 1.0;
    ipcRenderer.send("globalSettings:set", {
        key: "delayCorrect",
        value: parseFloat(value, 10),
    });
});

document.getElementById("delay-incorrect").addEventListener("change", () => {
    var value = document.getElementById("delay-incorrect").value;
    re = /^\d(\.\d{1,2})?$/;
    value = re.test(value) ? value : 0.0;
    ipcRenderer.send("globalSettings:set", {
        key: "delayIncorrect",
        value: parseFloat(value, 10),
    });
});

//-------Get Settings-------
ipcRenderer.send("globalSettings:getAll");
ipcRenderer.on("globalSettings:getAll", (e, settings) => {
    //Study
    document.getElementById("strike-through").checked = settings.strikeThrough;
    document.getElementById("show-iwr").checked = settings.showIwr;
    document.getElementById("show-info").checked = settings.showInfo;
    document.getElementById("delay-correct").value = settings.delayCorrect;
    document.getElementById("delay-incorrect").value = settings.delayIncorrect;
});
