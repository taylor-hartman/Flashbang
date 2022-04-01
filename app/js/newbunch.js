const ipcRenderer = require("electron").ipcRenderer;
var pairs;
var id;

var importMenuOpen = false,
    exportMenuOpen = false;

try {
    const url = document.location.href;
    id = url.split("?")[1].split("=")[1]; //gets the id of bunch from query string
    id = id.replaceAll("%20", " ");
} catch {
    //there is no ? or = in the new bunch btn so it throws err
    id = ".new_bunch";
}

console.log(id);

const editing = id !== ".new_bunch"; //true if editing; false if new bunch

var editingPairs = false; //represents if X's show to delete pairs

//calls management
let timesCorrect;
let pairOrder, questionType;

ipcRenderer.send("globalSettings:get", "timesCorrect");
ipcRenderer.on("globalSettings:gettimesCorrect", (e, val) => {
    timesCorrect = val;
});

//---------------Editing stuff------------------
document.getElementById("edit-pairs").addEventListener("click", (e) => {
    editingPairs = !editingPairs;
    adjustEditing();
});

function adjustEditing() {
    const deletePairBtns = document.getElementsByClassName("pair-delete-btn");

    if (editingPairs) {
        for (x = 0; x < deletePairBtns.length; x++) {
            deletePairBtns[x].classList.remove("undisplay");
            deletePairBtns[x].addEventListener("click", (e) => {
                //e.target is possible because of pointer-events: none; on svg in css file
                e.target.parentElement.parentElement.remove();
                refactorIndicies();
            });
        }
    } else {
        for (x = 0; x < deletePairBtns.length; x++) {
            deletePairBtns[x].classList.add("undisplay");
        }
    }
}

//add pair
document.getElementById("plus").addEventListener("click", (e) => {
    e.preventDefault();
    var indicies = document.getElementsByClassName("index");
    var idNum = indicies.length + 1;

    var newPair = document.createElement("div");
    newPair.classList.add("pair");

    newPair.setAttribute(
        "calls",
        pairOrder.standard || pairOrder.both ? timesCorrect : 0
    );
    newPair.setAttribute(
        "revCalls",
        pairOrder.reversed || pairOrder.both ? timesCorrect : 0
    );

    newPair.innerHTML = `
        <p class="index">${idNum}</p>
        <div class="input-holder">
        <input
            class="prompt"
            type="text"
            placeholder="Prompt"
            name=""
            id=""
        />
        <input
            class="answer"
            type="text"
            placeholder="Answer"
            name=""
            id=""
        />
        <a class="pair-delete-btn undisplay">
                <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
        </a>
        </div>`;

    if (editingPairs) {
        const deleteBtn = newPair.getElementsByClassName("pair-delete-btn")[0];

        deleteBtn.classList.remove("undisplay");

        deleteBtn.addEventListener("click", (e) => {
            //e.target is possible because of pointer-events: none; on svg in css file
            e.target.parentElement.parentElement.remove();
        });
    }

    document.getElementById("pair-container").appendChild(newPair);

    const pairElems = document.getElementsByClassName("pair");
    const yPos = pairElems[pairElems.length - 1].getBoundingClientRect().top;
    window.scrollTo(0, yPos);
});

//---stuff for clearing---
document.getElementById("clear-btn").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("delete-menu").classList.remove("hide");
    // setTimeout(() => {
    //     document.getElementById("delete-menu").classList.add("hide");
    // }, 5000);
});

document.getElementById("yes-delete").addEventListener("click", () => {
    pairs = [];
    document.getElementById("title-input").value = "";
    generatePairsHTML();
    document.getElementById("delete-menu").classList.add("hide");
});

document.getElementById("no-delete").addEventListener("click", () => {
    document.getElementById("delete-menu").classList.add("hide");
});
//------------

//--------------------------------------------
//-----------------Save Stuff-------------------
//Bunches are saved either when submitting or when pressing the back button. aka at any exit of the page throughh buttons
document.getElementById("new-bunch-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (titleValid(document.getElementById("title-input").value)) {
        const bunch = makeBunch();
        if (editing) {
            //id = id
            ipcRenderer.send("bunch:save", bunch);
        } else {
            ipcRenderer.send("bunch:submit", bunch); //id = newly generated id
        }
        ipcRenderer.send("returnToIndex");
    }
});

function backBtnToIndex(e) {
    e.preventDefault();
    const bunch = makeBunch();
    if (editing) {
        if (titleValid(document.getElementById("title-input").value)) {
            ipcRenderer.send("bunch:save", bunch); //id = id
            ipcRenderer.send("returnToIndex");
        }
    } else {
        ipcRenderer.send("newbunch:save", bunch); //id = ".new_bunch"
        ipcRenderer.send("returnToIndex");
    }
}

//saves when not leaving page e.g. going to import and export menus
function saveInternal() {
    const bunch = makeBunch();
    //saves pairs but not tile. i think this works, but may need fixing
    ipcRenderer.send("bunch:save", bunch);
}

function makeBunch() {
    //TODO this is only part of the data. defaults shoudl be used for the rest (see main.js bunch:save)
    var bunch = {
        id: id,
        title: document.getElementById("title-input").value,
        lastUsed: new Date(),
        pairs: [],
        promptLang: document.getElementById("prompt-lang").value,
        answerLang: document.getElementById("answer-lang").value,
    };

    bunch.pairs = JSON.parse(JSON.stringify(makePairs()));
    console.log(bunch.pairs);

    return bunch;
}

function makePairs() {
    const htmlPairs = document
        .getElementById("pair-container")
        .getElementsByClassName("pair");

    let madePairs = [];

    var redacted = 0; //amount of invalid pairs
    for (x = 0; x < htmlPairs.length; x++) {
        let prompt = htmlPairs[x].getElementsByClassName("prompt")[0].value;
        let answer = htmlPairs[x].getElementsByClassName("answer")[0].value;
        let calls = htmlPairs[x].getAttribute("calls");
        let revCalls = htmlPairs[x].getAttribute("revCalls");
        if (prompt !== "" && answer !== "") {
            madePairs[x - redacted] = {
                prompt: prompt.trim(),
                answer: answer.trim(),
                calls: parseInt(calls),
                revCalls: parseInt(revCalls),
            };
        } else {
            redacted += 1;
        }
    }

    return madePairs;
}

//--------------------------------------------
//---------------Load Stuff-------------------

document.getElementById("title-input").addEventListener("change", () => {
    titleValid(document.getElementById("title-input").value);
});

var titleTimeout;
function titleValid(t) {
    // re = /^[0-9a-z]/i; //must start with alpha numeric
    if (t === "") {
        document.getElementById("title-valid-message").innerText =
            "Title cannot be empty";
        document.getElementById("title-valid-message").classList.remove("hide");
        clearTimeout(titleTimeout);
        titleTimeout = setTimeout(() => {
            document
                .getElementById("title-valid-message")
                .classList.add("hide");
        }, 3000);
        return false;
    }
    re = /^(?![\.\s])/; //does not begin with . or whitespace
    let result = re.test(t);
    if (result) {
        //passes first test
        re = /^[^<>\/\\]+$/; //cannot contain <>/\
        result = re.test(t);
        if (result) {
            //passes second test
            return result;
        } //fails second test
        document.getElementById("title-valid-message").innerText =
            "Title cannot contain <>/\\";
        document.getElementById("title-valid-message").classList.remove("hide");
        clearTimeout(titleTimeout);
        titleTimeout = setTimeout(() => {
            document
                .getElementById("title-valid-message")
                .classList.add("hide");
        }, 3000);
        return result;
    }
    //fails first test
    document.getElementById("title-valid-message").innerText =
        "Title cannot begin with . or space";
    document.getElementById("title-valid-message").classList.remove("hide");
    clearTimeout(titleTimeout);
    titleTimeout = setTimeout(() => {
        document.getElementById("title-valid-message").classList.add("hide");
    }, 3000);
    return result;
}

ipcRenderer.send("bunch:getAll", id);

ipcRenderer.on("bunch:getAll", (e, bunch) => {
    pairs = JSON.parse(JSON.stringify(bunch.pairs));
    pairOrder = JSON.parse(JSON.stringify(bunch.pairOrder));
    questionType = JSON.parse(JSON.stringify(bunch.questionType));
    document.getElementById("title-input").value = bunch.title;
    if (pairs.length < 3) {
        const lenHolder = pairs.length;
        for (x = 0; x < 3 - lenHolder; x++) {
            pairs.push({ prompt: "", answer: "" });
        }
    }
    generatePairsHTML();
});

function generatePairsHTML() {
    document.getElementById("pair-container").innerHTML = "";
    //default pairs val is []. clear sets to this default. in order to display inputs when nothing there these next lines.
    //all blank pairs are removed when importing and in make bunch
    if (pairs.length === 0) {
        pairs = [
            { prompt: "", answer: "" },
            { prompt: "", answer: "" },
            { prompt: "", answer: "" },
        ];
    }
    for (x = 0; x < pairs.length; x++) {
        var newPair = document.createElement("div");
        newPair.classList.add("pair");

        if (pairs[x].calls != null) {
            newPair.setAttribute("calls", pairs[x].calls);
        } else {
            newPair.setAttribute(
                "calls",
                pairOrder.standard || pairOrder.both ? timesCorrect : 0
            );
        }

        if (pairs[x].revCalls != null) {
            newPair.setAttribute("revCalls", pairs[x].revCalls);
        } else {
            newPair.setAttribute(
                "revCalls",
                pairOrder.reversed || pairOrder.both ? timesCorrect : 0
            );
        }

        newPair.innerHTML = `
            <p class="index">${x + 1}</p>
            <div class="input-holder">
            <input
                class="prompt"
                type="text"
                placeholder="Prompt"
                name=""
                id="",
                value="${pairs[x].prompt}"
            />
            <input
                class="answer"
                type="text"
                placeholder="Answer"
                name=""
                id="",
                value="${pairs[x].answer}"
            />
            <a class="pair-delete-btn undisplay">
                <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
            </a>
            </div>`;
        document.getElementById("pair-container").appendChild(newPair);
    }
}

//--------Import Stuff---------
document.getElementById("top-right-btn").addEventListener("click", () => {
    if (!importMenuOpen) {
        document.getElementById("import-form").classList.remove("hide");
        document
            .getElementsByClassName("new-bunch-container")[0]
            .classList.add("hide");

        editingPairs = false;
        adjustEditing();

        saveInternal();
        importMenuOpen = true;
    } else {
        //TODO get rid of this hide the icon or move it
        closeImportMenu();
    }
});

function closeImportMenu() {
    document.getElementById("import-form").classList.add("hide");
    document
        .getElementsByClassName("new-bunch-container")[0]
        .classList.remove("hide");
    importMenuOpen = false;
}

function closeExportMenu() {
    document.getElementById("export-menu").classList.add("hide");
    document
        .getElementsByClassName("new-bunch-container")[0]
        .classList.remove("hide");
    exportMenuOpen = false;
}

document.getElementById("back-btn").addEventListener("click", (e) => {
    if (importMenuOpen) {
        closeImportMenu();
    } else if (exportMenuOpen) {
        closeExportMenu();
    } else {
        backBtnToIndex(e); //TODO idky passing this e in
    }
});

document.getElementById("import-submit-btn").addEventListener("click", (e) => {
    e.preventDefault();
    parseImport();
    removeBlanks();
    generatePairsHTML();
});

document.getElementById("info-icon").addEventListener("mouseenter", () => {
    document.getElementById("import-info-menu").classList.remove("hide");
});

document.getElementById("info-icon").addEventListener("mouseleave", () => {
    document.getElementById("import-info-menu").classList.add("hide");
});

document
    .getElementById("info-icon-export")
    .addEventListener("mouseenter", () => {
        document.getElementById("export-info-menu").classList.remove("hide");
    });

document
    .getElementById("info-icon-export")
    .addEventListener("mouseleave", () => {
        document.getElementById("export-info-menu").classList.add("hide");
    });

var importTimeout;
function parseImport() {
    try {
        const termSeparatorInput = document.getElementById("btwn-term");
        const pairSeparatorInput = document.getElementById("btwn-pair");

        const termSeparator =
            termSeparatorInput.value === "" ? "-" : termSeparatorInput.value;
        const pairSeparator =
            pairSeparatorInput.value === "" ? "\n" : pairSeparatorInput.value;

        const importVals = document.getElementById("import-text").value;
        const pairsStrings = importVals.split(pairSeparator);
        const importPairs = [];
        for (x = 0; x < pairsStrings.length; x++) {
            const pairArray = pairsStrings[x].split(termSeparator);
            const pair = {};
            pair["prompt"] = pairArray[0].trim(); //removed leading and trailing white spaces
            pair["answer"] = pairArray[1].trim();
            importPairs.push(pair);
        }
        //TODO calls must be added in editing mode
        pairs = pairs.concat(importPairs);
        closeImportMenu();
    } catch {
        document
            .getElementById("import-valid-message")
            .classList.remove("hide");
        clearTimeout(importTimeout);
        importTimeout = setTimeout(() => {
            document
                .getElementById("import-valid-message")
                .classList.add("hide");
        }, 3000);
    }
}

function closeImportMenu() {
    document.getElementById("import-text").value = "";
    document.getElementById("import-form").classList.add("hide");
    document
        .getElementsByClassName("new-bunch-container")[0]
        .classList.remove("hide");
    //TODO p sure this is not necissary anymore
    document.getElementById("top-right-btn").innerHTML = `
        <svg
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            version="1.2"
            baseProfile="tiny"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M15 12h-2v-2c0-.553-.447-1-1-1s-1 .447-1 1v2h-2c-.553 0-1 .447-1 1s.447 1 1 1h2v2c0 .553.447 1 1 1s1-.447 1-1v-2h2c.553 0 1-.447 1-1s-.447-1-1-1zM19.707 7.293l-4-4c-.187-.188-.441-.293-.707-.293h-8c-1.654 0-3 1.346-3 3v12c0 1.654 1.346 3 3 3h10c1.654 0 3-1.346 3-3v-10c0-.266-.105-.52-.293-.707zm-2.121.707h-1.086c-.827 0-1.5-.673-1.5-1.5v-1.086l2.586 2.586zm-.586 11h-10c-.552 0-1-.448-1-1v-12c0-.552.448-1 1-1h7v1.5c0 1.379 1.121 2.5 2.5 2.5h1.5v9c0 .552-.448 1-1 1z" />
        </svg>`;

    importMenuOpen = false;
}

//----------Export Stuff--------------
document.getElementById("export-btn").addEventListener("click", () => {
    document.getElementById("export-menu").classList.remove("hide");
    document
        .getElementsByClassName("new-bunch-container")[0]
        .classList.add("hide");

    exportMenuOpen = true;

    saveInternal();
    //TODO this is here because saving is not quick enough to update pairs
    //pairs should probabaly be updated based on the html more often anyway
    //this is an ok temporary fix
    pairs = JSON.parse(JSON.stringify(makePairs()));
    updateExport();
});

function updateExport() {
    const termSeparatorInput = document.getElementById("btwn-term-export");
    const pairSeparatorInput = document.getElementById("btwn-pair-export");

    const termSeparator =
        termSeparatorInput.value === "" ? "-" : termSeparatorInput.value;
    const pairSeparator =
        pairSeparatorInput.value === "" ? "\n" : pairSeparatorInput.value;

    const textArea = document.getElementById("export-text");
    textArea.value = "";
    for (x = 0; x < pairs.length - 1; x++) {
        textArea.value += `${pairs[x].prompt}${termSeparator}${pairs[x].answer}${pairSeparator}`;
        console.log("lmao");
    }
    textArea.value += `${pairs[x].prompt}${termSeparator}${pairs[x].answer}`;
}

document
    .getElementById("btwn-pair-export")
    .addEventListener("change", updateExport);
document
    .getElementById("btwn-term-export")
    .addEventListener("change", updateExport);

//TODO fix this should not be editing pairs, rather i think html
function removeBlanks() {
    var splicedCount = 0;
    const oglength = pairs.length;
    for (x = 0; x < oglength; x++) {
        if (
            pairs[x - splicedCount].prompt === "" &&
            pairs[x - splicedCount].answer === ""
        ) {
            pairs.splice(x - splicedCount, 1);
            splicedCount += 1;
        }
    }
}

function refactorIndicies() {
    const indicies = document.getElementsByClassName("index");
    for (x = 0; x < indicies.length; x++) {
        indicies[x].innerText = x + 1;
    }
}

//prevents enter from doing form actions
document.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        if (document.activeElement.id != "import-text") {
            e.preventDefault();
        }
    }
});

// generateLangHTML();
// function generateLangHTML() {
//     const code = [
//         "ar-SA",
//         "bn-BD",
//         "bn-IN",
//         "cs-CZ",
//         "da-DK",
//         "de-AT",
//         "de-CH",
//         "de-DE",
//         "el-GR",
//         "en-AU",
//         "en-CA",
//         "en-GB",
//         "en-IE",
//         "en-IN",
//         "en-NZ",
//         "en-US",
//         "en-ZA",
//         "es-AR",
//         "es-CL",
//         "es-CO",
//         "es-ES",
//         "es-MX",
//         "es-US",
//         "fi-FI",
//         "fr-BE",
//         "fr-CA",
//         "fr-CH",
//         "fr-FR",
//         "he-IL",
//         "hi-IN",
//         "hu-HU",
//         "id-ID",
//         "it-CH",
//         "it-IT",
//         "jp-JP",
//         "ko-KR",
//         "nl-BE",
//         "nl-NL",
//         "no-NO",
//         "pl-PL",
//         "pt-BR",
//         "pt-PT",
//         "ro-RO",
//         "ru-RU",
//         "sk-SK",
//         "sv-SE",
//         "ta-IN",
//         "ta-LK",
//         "th-TH",
//         "tr-TR",
//         "zh-CN",
//         "zh-HK",
//         "zh-TW",
//     ];
//     const lang = [
//         "Arabic",
//         "Bangla",
//         "Bangla",
//         "Czech",
//         "Danish",
//         "German",
//         "German",
//         "German",
//         "Greek",
//         "English",
//         "English",
//         "English",
//         "English",
//         "English",
//         "English",
//         "English",
//         "English",
//         "Spanish",
//         "Spanish",
//         "Spanish",
//         "Spanish",
//         "Spanish",
//         "Spanish",
//         "Finnish",
//         "French",
//         "French",
//         "French",
//         "French",
//         "Hebrew",
//         "Hindi",
//         "Hungarian",
//         "Indonesian",
//         "Italian",
//         "Italian",
//         "Japanese",
//         "Korean",
//         "Dutch",
//         "Dutch",
//         "Norwegian",
//         "Polish",
//         "Portugese",
//         "Portugese",
//         "Romanian",
//         "Russian",
//         "Slovak",
//         "Swedish",
//         "Tamil",
//         "Tamil",
//         "Thai",
//         "Turkish",
//         "Chinese",
//         "Chinese",
//         "Chinese",
//     ];
//     const region = [
//         "Saudi Arabia",
//         "Bangladesh",
//         "India",
//         "Czech Republic",
//         "Denmark",
//         "Austria",
//         "Switzerland",
//         "Germany",
//         "Greece",
//         "Australia",
//         "Canada",
//         "United Kingdom",
//         "Ireland",
//         "India",
//         "New Zealand",
//         "United States",
//         "South Africa",
//         "Argentina",
//         "Chile",
//         "Columbia",
//         "Spain",
//         "Mexico",
//         "United States",
//         "Finland",
//         "Belgium",
//         "Canada",
//         "Switzerland",
//         "France",
//         "Israel",
//         "India",
//         "Hungary",
//         "Indonesia",
//         "Switzerland",
//         "Italy",
//         "Japan",
//         "Republic of Korea",
//         "Belgium",
//         "The Netherlands",
//         "Norway",
//         "Poland",
//         "Brazil",
//         "Portugal",
//         "Romania",
//         "Russian Federation",
//         "Slovakia",
//         "Sweden",
//         "India",
//         "Sri Lanka",
//         "Thailand",
//         "Turkey",
//         "China",
//         "Hond Kong",
//         "Taiwan",
//     ];
//     let langhtml = "";
//     for (x = 0; x < code.length; x++) {
//         let option = `<option value="${code[x]}">${lang[x]} (${region[x]})</option>`;
//         langhtml += option;
//     }

//     console.log(langhtml);
// }
