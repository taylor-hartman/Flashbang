const { ipcRenderer } = require("electron");

var answerShown = false,
    studyComplete = false;
var pairs; //pairs is all pairs in bunch, current pair is the one currently being displayed
var menuToggled = false;
var correct; //stores if the current answer is correct

const correctGreen = "#B2CC3E",
    incorrectRed = "#ea4848",
    dark = "#393e41";

//TODO could likely be chnaged do document.addEventListener('DOMContentLoaded', ()) and be faster
window.onload = () => {
    //requests pairs data from main
    const url = document.location.href;
    var title = url.split("?")[1].split("=")[1]; //gets the title of bunch from query string
    title = title.replaceAll("%20", " ");
    //reuquests settings data from main
    //NOTE Settings must be gotten before pairs
    ipcRenderer.send("settings:getAll");
    //requests bunch data
    ipcRenderer.send("bunch:get", title);
};

//----------buttons listners--------------
//options button
document.getElementById("options-btn").addEventListener("click", () => {
    if (!menuToggled) {
        document.getElementById("options-menu").classList.remove("hide");
    } else {
        document.getElementById("options-menu").classList.add("hide");
    }
    menuToggled = !menuToggled;
});

//pair order
var orderRadios = document.querySelectorAll('input[name="pairOrder"]');
Array.prototype.forEach.call(orderRadios, (radio) => {
    radio.addEventListener("change", onOrderChange);
});

function onOrderChange() {
    ipcRenderer.send("settings:set", {
        key: "pairOrder",
        value: {
            standard: document.getElementById("standard").checked,
            reversed: document.getElementById("reversed").checked,
            both: document.getElementById("both").checked,
        },
    });

    const url = document.location.href;
    var title = url.split("?")[1].split("=")[1];
    title = title.replaceAll("%20", " ");
    ipcRenderer.send("bunch:get", title);
}

//question type
var typeRadios = document.querySelectorAll('input[name="questionType"]');
Array.prototype.forEach.call(typeRadios, (radio) => {
    radio.addEventListener("change", onQuestionTypeChange);
});

function onQuestionTypeChange() {
    ipcRenderer.send("settings:set", {
        key: "questionType",
        value: {
            flashcard: document.getElementById("ask-flashcard").checked,
            typed: document.getElementById("ask-typed").checked,
            // both: document.getElementById("ask-both").checked,
        },
    });

    updateHTML();
    displayCard();
}

//show info
document
    .getElementById("show-info")
    .addEventListener("change", onShowInfoChange);

function onShowInfoChange() {
    ipcRenderer.send("settings:set", {
        key: "showInfo",
        value: document.getElementById("show-info").checked,
    });

    updateInfo();
}

function updateInfo() {
    const isChecked = document.getElementById("show-info").checked;
    if (isChecked) {
        document.getElementById("bottom-text").classList.remove("hide");
    } else {
        document.getElementById("bottom-text").classList.add("hide");
    }
}

//called the first time settings are gotten to initialize info and html
ipcRenderer.once("settings:getAll", (e, settings) => {
    getAllSettings(settings);
    updateHTML();
});

//-----------Settings Stuff------------
ipcRenderer.on("settings:getAll", (e, settings) => {
    getAllSettings(settings);
});

function getAllSettings(settings) {
    document.getElementById("standard").checked = settings.pairOrder.standard;
    document.getElementById("reversed").checked = settings.pairOrder.reversed;
    document.getElementById("both").checked = settings.pairOrder.both;
    document.getElementById("ask-flashcard").checked =
        settings.questionType.flashcard;
    document.getElementById("ask-typed").checked = settings.questionType.typed;
    // document.getElementById("ask-both").checked = settings.questionType.both;
    document.getElementById("show-info").checked = settings.showInfo;
}

// ------------Pairs Stuff-------------
// handles pairs data
ipcRenderer.on("bunch:get", (e, bunch) => {
    pairs = JSON.parse(JSON.stringify(bunch.pairs)); //deep copy
    generatePairs();
    displayCard();
});

function updateHTML() {
    if (document.getElementById("ask-flashcard").checked) {
        document.getElementById("flashcard-container").innerHTML = `
        <h2 id="prompt"></h2>
       <div class="hide" id="main-separator"></div>
       <h2 class="hide" id="answer"></h2>
       <p class="hide" id="bottom-text">Press Space to Reveal Answer</p>`;
    } else if (document.getElementById("ask-typed").checked) {
        document.getElementById(
            "flashcard-container"
        ).innerHTML = `<h2 id="prompt">Lorem</h2>
        <div class="input-container">
                <input type="text" id="answer-input" />
                <div class="hide" id="status-block">&#10004</div>
        </div>
        <h2 class="hide typed-answer" id="answer">Lorem</h2>
        <div class="hide" id="iwr-btn-container"><button id="iwr-btn">I was right</button></div>
        <p class="hide" id="bottom-text">Press Enter to Answer</p>`;

        document.getElementById("iwr-btn").addEventListener("click", iWasRight);
    }
    //TODO shouldnt be here
    updateInfo();
}

function iWasRight() {
    //HACK: calls twice to undo the already done incorrect and then do the correct
    callsCorrect();
    callsCorrect();
    resetPage();
}

function generatePairs() {
    //TODO make it so calls remaining stays for already existsing
    if (document.getElementById("both").checked) {
        //both first in if statement
        const ogPairLen = pairs.length;
        for (x = 0; x < ogPairLen; x++) {
            const revPair = { prompt: "", answer: "" };
            revPair.prompt = pairs[x].answer;
            revPair.answer = pairs[x].prompt;
            pairs.push(revPair);
        }
    } else if (document.getElementById("reversed").checked) {
        for (x = 0; x < pairs.length; x++) {
            const promtpHolder = pairs[x].prompt;
            pairs[x].prompt = pairs[x].answer;
            pairs[x].answer = promtpHolder;
        }
    } else if (document.getElementById("standard").checked) {
        //nothing to do here
    }

    generateCalls();
}

function generateCalls() {
    if (document.getElementById("both").checked) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = 4;
        }
    } else {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = 2;
        }
    }

    console.log(pairs);
}

function displayCard() {
    const index = Math.floor(Math.random() * pairs.length);
    //TODO add shit to stop repeats etc
    currentPair = pairs[index];
    //TODO same for both no if
    if (document.getElementById("ask-flashcard").checked) {
        document.getElementById("prompt").innerText = currentPair.prompt;
        document.getElementById("answer").innerText = currentPair.answer;
    } else if (document.getElementById("ask-typed").checked) {
        document.getElementById("prompt").innerText = currentPair.prompt;
        document.getElementById("answer").innerText = currentPair.answer;
    }
    answerShown = false;
}

window.addEventListener("keydown", keyListener);
function keyListener(e) {
    //whatever we want to do goes in this block
    e = e || window.e; //capture the e, and ensure we have an e
    var key = e.key; //find the key that was pressed
    if (key === "Escape" || (studyComplete && key === " ")) {
        window.location.href = "index.html";
        return;
    }
    if (document.getElementById("ask-flashcard").checked) {
        answersManager(key);
    } else if (document.getElementById("ask-typed").checked) {
        typedAnswersManager(e);
    }
}

function typedAnswersManager(e) {
    if (!answerShown) {
        if (e.key === "Enter") {
            typedShowAnswer();
        }
    } else {
        if (e.key === "Enter") {
            clearTimeout(correctTimeout);
            resetPage();
        } else if (e.metaKey && e.key === "d") {
            iWasRight();
        }
    }
}

function answersManager(key) {
    if (!answerShown) {
        if (key === " ") {
            showAnswer();
        }
    } else {
        if (key === "2" || key === " ") {
            //Answer is right
            //TODO make sure this bottoms out at 0 somewhere else
            callsCorrect();
        } else if (key === "1") {
            //answer is wrong
            //TODO make sure this caps out at 2 somewhere else
            callsIncorrect();
        }
        resetPage();
    }
}

function callsCorrect() {
    console.log("Correct");
    if (currentPair.calls > 0) {
        currentPair.calls -= 1;
        if (currentPair.calls === 0) {
            const index = pairs.indexOf(currentPair);
            pairs.splice(index, 1);
        }
    }
}

function callsIncorrect() {
    console.log("Inorrect");
    if (currentPair.calls !== 0 && currentPair.calls < 2) {
        currentPair.calls += 1;
    }
}

//TODO decide if you are making dif functions or using if statements
var correctTimeout;
function typedShowAnswer() {
    document.getElementById("answer-input").blur();
    document.getElementById("answer-input").readOnly = true;
    answerShown = true;
    document.getElementById("bottom-text").innerText =
        "Press Enter to Continue";
    const userAnswer = document.getElementById("answer-input").value;
    if (userAnswer === currentPair.answer) {
        callsCorrect();
        styleCorrect();
        correctTimeout = setTimeout(resetPage, 1000);
    } else {
        callsIncorrect();
        styleIncorrect();
    }
}

function showAnswer() {
    document.querySelector("#main-separator").classList.remove("hide");
    document.getElementById("answer").classList.remove("hide");
    document.getElementById("bottom-text").innerText =
        "Incorrect: Press 1 \n Correct: Press 2 or Space";
    answerShown = true;
}

function styleCorrect() {
    const input = document.getElementById("answer-input");
    input.style.border = `2px solid ${correctGreen}`;
    const statusBlock = document.getElementById("status-block");
    statusBlock.style.background = correctGreen;
    statusBlock.innerHTML = "&#10004";
    statusBlock.classList.remove("hide");
}

function styleIncorrect() {
    document.getElementById("answer").classList.remove("hide");
    document.getElementById("iwr-btn-container").classList.remove("hide");
    const input = document.getElementById("answer-input");
    input.style.textDecoration = `line-through ${incorrectRed} 2px`;
    const statusBlock = document.getElementById("status-block");
    statusBlock.style.background = incorrectRed;
    statusBlock.innerHTML = "&#10006";
    statusBlock.classList.remove("hide");
    // input.style.border = `2px solid ${incorrectRed}`;
}

function resetPage() {
    if (pairs.length > 0) {
        if (document.getElementById("ask-flashcard").checked) {
            document.querySelector("#main-separator").classList.add("hide");
            document.getElementById("answer").classList.add("hide");
            document.getElementById("bottom-text").innerText =
                "Press Space to Reveal Answer";
        } else if (document.getElementById("ask-typed").checked) {
            const input = document.getElementById("answer-input");
            input.readOnly = false;
            input.style.border = `2px solid var(--highlight, #393e41)`;
            input.focus();
            input.value = "";
            input.style.textDecoration = "none";
            document.getElementById("status-block").classList.add("hide");
            document.getElementById("answer").classList.add("hide");
            document.getElementById("iwr-btn-container").classList.add("hide");
            document.getElementById("bottom-text").innerText =
                "Press Enter to Answer";
        }
        // answerShown = false; //answershown set in displaycard now
        displayCard();
    } else {
        //flashcard container
        var fcc = document.getElementById("flashcard-container");
        const bottomText = document.getElementById("bottom-text");
        bottomText.innerText = "Press Space to Return Home";
        fcc.innerHTML = `<h2>Bunch Study Complete!</h2>`;
        fcc.innerHTML += bottomText.outerHTML;
        studyComplete = true;
    }
}
