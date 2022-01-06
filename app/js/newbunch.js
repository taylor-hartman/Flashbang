const ipcRenderer = require("electron").ipcRenderer;
var pairs;

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
        </div>`;

    document.getElementById("pair-container").appendChild(newPair);

    const pairElems = document.getElementsByClassName("pair");
    const yPos = pairElems[pairElems.length - 1].getBoundingClientRect().top;
    window.scrollTo(0, yPos);
});

const form = document.getElementById("new-bunch-form");

// form.addEventListener("change", (e) => {
//     const bunch = makeBunch();
//     ipcRenderer.send("bunch:save", bunch);
// });

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bunch = makeBunch();
    ipcRenderer.send("bunch:save", bunch);
    ipcRenderer.send("bunch:setAll", bunch);
    ipcRenderer.send("returnToIndex");
});

document.getElementById("back-btn").addEventListener("click", (e) => {
    e.preventDefault();
    const bunch = makeBunch();
    ipcRenderer.send("bunch:save", bunch);
    ipcRenderer.send("returnToIndex");
});

// window.onbeforeunload = () => {};

function makeBunch() {
    const prompts = form.getElementsByClassName("prompt");
    const answers = form.getElementsByClassName("answer");

    var bunch = {
        title: document.getElementById("title-input").value,
        lastUsed: new Date(),
        pairs: [],
    };

    for (x = 0; x < prompts.length; x++) {
        bunch.pairs[x] = { prompt: prompts[x].value, answer: answers[x].value };
    }

    return bunch;
}

ipcRenderer.send("bunch:get", ".new_bunch");
ipcRenderer.on("bunch:get", (e, bunch) => {
    console.log(bunch);
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
        pair["prompt"] = pairArray[0];
        pair["answer"] = pairArray[1];
        importPairs.push(pair);
    }
    console.log(importPairs);
    pairs = pairs.concat(importPairs);
    console.log(pairs);
}
