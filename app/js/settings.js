const ipcRenderer = require("electron").ipcRenderer;

/* ----------------------------- Theme Settings ----------------------------- */
const palettes = document.getElementsByClassName("palette");
for (x = 0; x < palettes.length; x++) {
    palettes[x].addEventListener("click", changeTheme);
}

function changeTheme(e) {
    const theme = e.target.id;
    ipcRenderer.send("globalSettings:set1", { key: "theme", value: theme });
    ipcRenderer.send("background:set");
    e.target.querySelector(".color-box").classList.add("spin");
    e.target
        .querySelector(".color-box")
        .addEventListener("animationend", (f) => {
            f.target.classList.remove("spin");
        });
}

/* ----------------------------- Study Settings ----------------------------- */
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

document.getElementById("show-remaining").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "showRemaining",
        value: document.getElementById("show-remaining").checked,
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

document.getElementById("study-font-size").addEventListener("change", () => {
    var value = document.getElementById("study-font-size").value;
    re = /^\d{1,2}(\.\d{1,2})?$/; //makes sure is number between 0 and 100 (exclusive) with max two decimals
    const testedvalue = re.test(value) ? value : 18; //18 is default value
    if (testedvalue > 35) {
        value = 35;
    } else if (testedvalue < 12) {
        value = 12;
    } else {
        value = testedvalue;
    }
    ipcRenderer.send("globalSettings:set", {
        key: "studyFontSize",
        value: parseFloat(value, 10),
    });
});

document.getElementById("animate-study").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "animateStudy",
        value: document.getElementById("animate-study").checked,
    });
});

document.getElementById("animate-pages").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "animatePages",
        value: document.getElementById("animate-pages").checked,
    });
});

document.getElementById("ignore-parenthesis").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "ignoreParenthesis",
        value: document.getElementById("ignore-parenthesis").checked,
    });
});

document.getElementById("use-slash").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "useSlash",
        value: document.getElementById("use-slash").checked,
    });
});

document.getElementById("ignore-capital").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "ignoreCapital",
        value: document.getElementById("ignore-capital").checked,
    });
});

if (navigator.userAgent.indexOf("Win") != -1) {
    document.getElementById("sound-section").classList.remove("undisplay");
    document.getElementById("sound-text").innerText =
        "In order to use text to speech, the desired lanaguge must be added to Windows in the settings app under Time & language -> Langauge & region -> Language";
    console.log("win");
} else if (
    navigator.userAgent.indexOf("X11") != -1 ||
    navigator.userAgent.indexOf("Linux") != -1
) {
    console.log("linux");
    document.getElementById("sound-section").classList.remove("undisplay");
    document.getElementById("sound-text").innerText =
        "Text to speech may not function properly on all Linux and UNIX Operating Systems :(";
}

document.getElementById("sort-home-by").addEventListener("change", () => {
    ipcRenderer.send("globalSettings:set", {
        key: "sortHomeBy",
        value: document.getElementById("sort-home-by").value,
    });
});

document.getElementById("reset-btn").addEventListener("click", () => {
    ipcRenderer.send("globalSettings:resetDefaults");
});

/* ------------------------------ IPC Requests ------------------------------ */
ipcRenderer.send("globalSettings:getAll");
ipcRenderer.on("globalSettings:getAll", (e, settings) => {
    //----Study----
    //general
    document.getElementById("strike-through").checked = settings.strikeThrough;
    document.getElementById("show-iwr").checked = settings.showIwr;
    document.getElementById("show-info").checked = settings.showInfo;
    document.getElementById("show-remaining").checked = settings.showRemaining;
    document.getElementById("times-correct").value = settings.timesCorrect;
    document.getElementById("penalize-incorrect").checked =
        settings.penalizeIncorrect;
    document.getElementById("delay-correct").value = settings.delayCorrect;
    document.getElementById("delay-incorrect").value = settings.delayIncorrect;
    document.getElementById("study-font-size").value = settings.studyFontSize;
    document.getElementById("animate-study").checked = settings.animateStudy;
    //type
    document.getElementById("ignore-parenthesis").checked =
        settings.ignoreParenthesis;
    document.getElementById("use-slash").checked = settings.useSlash;
    document.getElementById("ignore-capital").checked = settings.ignoreCapital;

    //----Homepage----
    document.getElementById("sort-home-by").value = settings.sortHomeBy;
    document.getElementById("animate-pages").checked = settings.animatePages;
});
