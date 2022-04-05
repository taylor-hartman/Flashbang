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

document.getElementById("times-correct").addEventListener("change", () => {
    var value = document.getElementById("times-correct").value;
    re = /^[1-9]$/; //makes sure is a digit 0-9
    value = re.test(value) ? value : 2; //2 is default value
    ipcRenderer.send("globalSettings:set", {
        key: "timesCorrect",
        value: parseInt(value, 10), //10 is for base 10
    });
});

document.getElementById("penalize-incorrect").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "penalizeIncorrect",
        value: document.getElementById("penalize-incorrect").checked,
    });
});

document.getElementById("delay-correct").addEventListener("change", () => {
    var value = document.getElementById("delay-correct").value;
    re = /^\d(\.\d{1,2})?$/; //makes sure is number between 0 and 10 (exclusive) with max two decimals
    value = re.test(value) ? value : 1.0; //1.0 is default value
    ipcRenderer.send("globalSettings:set", {
        key: "delayCorrect",
        value: parseFloat(value, 10), //10 is for base 10
    });
});

document.getElementById("delay-incorrect").addEventListener("change", () => {
    var value = document.getElementById("delay-incorrect").value;
    re = /^\d(\.\d{1,2})?$/; //makes sure is number between 0 and 10 (exclusive) with max two decimals
    value = re.test(value) ? value : 0.0; //0.0 is default value
    ipcRenderer.send("globalSettings:set", {
        key: "delayIncorrect",
        value: parseFloat(value, 10),
    });
});

document.getElementById("ignore-parenthesis").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "ignoreParenthesis",
        value: document.getElementById("ignore-parenthesis").checked,
    });
});

document.getElementById("ignore-capital").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "ignoreCapital",
        value: document.getElementById("ignore-capital").checked,
    });
});

document.getElementById("sort-home-by").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "sortHomeBy",
        value: document.getElementById("sort-home-by").value,
    });
});

document.getElementById("reset-btn").addEventListener("click", () => {
    ipcRenderer.send("globalSettings:resetDefaults");
});

//-------Get Settings-------
ipcRenderer.send("globalSettings:getAll");
ipcRenderer.on("globalSettings:getAll", (e, settings) => {
    //Study
    document.getElementById("strike-through").checked = settings.strikeThrough;
    document.getElementById("show-iwr").checked = settings.showIwr;
    document.getElementById("show-info").checked = settings.showInfo;
    document.getElementById("times-correct").value = settings.timesCorrect;
    document.getElementById("penalize-incorrect").checked =
        settings.penalizeIncorrect;
    document.getElementById("delay-correct").value = settings.delayCorrect;
    document.getElementById("delay-incorrect").value = settings.delayIncorrect;

    document.getElementById("ignore-parenthesis").checked =
        settings.ignoreParenthesis;
    document.getElementById("ignore-capital").checked = settings.ignoreCapital;

    document.getElementById("sort-home-by").value = settings.sortHomeBy;
});
