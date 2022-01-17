const ipcRenderer = require("electron").ipcRenderer;
var pairs;

//---------------Editing stuff------------------
var editingPairs = false;
document.getElementById("edit-pairs").addEventListener("click", (e) => {
    editingPairs = !editingPairs;
    const deletePairBtns = document.getElementsByClassName("pair-delete-btn");

    if (editingPairs) {
        for (x = 0; x < deletePairBtns.length; x++) {
            deletePairBtns[x].classList.remove("undisplay");
            deletePairBtns[x].addEventListener("click", (e) => {
                //e.target is possible because of pointer-events: none; on svg in css file
                e.target.parentElement.parentElement.remove();
            });
        }
    } else {
        for (x = 0; x < deletePairBtns.length; x++) {
            deletePairBtns[x].classList.add("undisplay");
        }
    }
});

document.getElementById("plus").addEventListener("click", (e) => {
    e.preventDefault();
    var indicies = document.getElementsByClassName("index");
    var idNum = indicies[indicies.length - 1].innerText;
    try {
        idNum = parseInt(idNum);
        idNum += 1;
    } catch (error) {
        console.log(error);
    }

    var newPair = document.createElement("div");
    newPair.classList.add("pair");
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
    pairs = [
        { prompt: "", answer: "" },
        { prompt: "", answer: "" },
        { prompt: "", answer: "" },
    ];
    document.getElementById("title-input").value = "";
    if (editing) {
        title = document.getElementById("title-input").value;
    }
    generatePairs();
    document.getElementById("delete-menu").classList.add("hide");
});

document.getElementById("no-delete").addEventListener("click", () => {
    document.getElementById("delete-menu").classList.add("hide");
});
//------------

//--------------------------------------------
//-----------------Save Stuff-------------------
//Bunchesa re saved either when submitting or when pressing the back button. aka at any exit of the page throughh buttons
const form = document.getElementById("new-bunch-form");
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bunch = makeBunch();
    if (editing) {
        if (title != oldTitle) {
            ipcRenderer.send("bunch:save", bunch, oldTitle);
            ipcRenderer.send("bunch:setAll", bunch, oldTitle); //passes in the old title, because set all renames the old file to the current bunch.title
        } else {
            ipcRenderer.send("bunch:save", bunch, title);
        }
    } else {
        ipcRenderer.send("bunch:save", bunch, title);
        ipcRenderer.send("bunch:setAll", bunch, title);
    }
    ipcRenderer.send("returnToIndex");
});

document.getElementById("back-btn").addEventListener("click", (e) => {
    e.preventDefault();
    const bunch = makeBunch();
    if (editing && title != oldTitle) {
        ipcRenderer.send("bunch:save", bunch, oldTitle);
        ipcRenderer.send("bunch:setAll", bunch, oldTitle);
    } else {
        ipcRenderer.send("bunch:save", bunch, title);
    }
    ipcRenderer.send("returnToIndex");
});
function makeBunch() {
    const prompts = form.getElementsByClassName("prompt");
    const answers = form.getElementsByClassName("answer");

    var bunch = {
        title: document.getElementById("title-input").value,
        lastUsed: new Date(),
        pairs: [],
    };

    for (x = 0; x < prompts.length; x++) {
        //TODO remove blank pairs
        var prompt = prompts[x].value;
        var answer = answers[x].value;
        bunch.pairs[x] = { prompt: prompt.trim(), answer: answer.trim() };
    }

    return bunch;
}
//--------------------------------------------
//---------------Load Stuff-------------------
var title;
try {
    const url = document.location.href;
    title = url.split("?")[1].split("=")[1]; //gets the title of bunch from query string
    title = title.replaceAll("%20", " ");
} catch {
    title = ".new_bunch";
}
const editing = title !== ".new_bunch";
const oldTitle = title;

document.getElementById("title-input").addEventListener("change", () => {
    if (editing) {
        title = document.getElementById("title-input").value;
    }
});

ipcRenderer.send("bunch:get", title);

ipcRenderer.on("bunch:get", (e, bunch) => {
    pairs = JSON.parse(JSON.stringify(bunch.pairs));
    document.getElementById("title-input").value = bunch.title;
    generatePairs();
});

function generatePairs() {
    document.getElementById("pair-container").innerHTML = "";
    for (x = 0; x < pairs.length; x++) {
        var newPair = document.createElement("div");
        newPair.classList.add("pair");
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
var importMenuOpen = false;
document.getElementById("top-right-btn").addEventListener("click", () => {
    if (importMenuOpen) {
        document.getElementById("import-form").classList.add("hide");
        document
            .getElementsByClassName("new-bunch-container")[0]
            .classList.remove("hide");
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
    } else {
        document.getElementById("import-form").classList.remove("hide");
        document
            .getElementsByClassName("new-bunch-container")[0]
            .classList.add("hide");
        document.getElementById("top-right-btn").innerHTML = `<svg
        width="24px"
        height="24px"
        viewBox="0 0 24 24"
        version="1.2"
        baseProfile="tiny"
        xmlns="http://www.w3.org/2000/svg"
        >
        <path
            d="M12 4c-4.419 0-8 3.582-8 8s3.581 8 8 8 8-3.582 8-8-3.581-8-8-8zm3.707 10.293c.391.391.391 1.023 0 1.414-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-2.293-2.293-2.293 2.293c-.195.195-.451.293-.707.293s-.512-.098-.707-.293c-.391-.391-.391-1.023 0-1.414l2.293-2.293-2.293-2.293c-.391-.391-.391-1.023 0-1.414s1.023-.391 1.414 0l2.293 2.293 2.293-2.293c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414l-2.293 2.293 2.293 2.293z"
        />
        </svg>`;
    }
    importMenuOpen = !importMenuOpen;
});

document.getElementById("import-submit-btn").addEventListener("click", (e) => {
    e.preventDefault();
    parseImport();
    generatePairs();

    //close import menu
    document.getElementById("import-form").classList.add("hide");
    document
        .getElementsByClassName("new-bunch-container")[0]
        .classList.remove("hide");
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
});

document.getElementById("info-icon").addEventListener("mouseenter", () => {
    document.getElementById("import-info-menu").classList.remove("hide");
});

document.getElementById("info-icon").addEventListener("mouseleave", () => {
    document.getElementById("import-info-menu").classList.add("hide");
});

function parseImport() {
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
    console.log(importPairs);
    pairs = pairs.concat(importPairs);
    console.log(pairs);
}
