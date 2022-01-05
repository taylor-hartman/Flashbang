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

    const pairs = document.getElementsByClassName("pair");
    const yPos = pairs[pairs.length - 1].getBoundingClientRect().top;
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
