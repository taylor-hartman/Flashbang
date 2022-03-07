const { ipcRenderer } = require("electron");

var answerShown = false,
    studyComplete = false;
inResetMenu = false;
var pairs; //pairs is all pairs in bunch, current pair is the one currently being displayed
var menuToggled = false;
var currentReversed; // bool if the currentPair is asked standard or reversed
let pairsRef = []; //array of references to each pair

// const correctGreen = "#B2CC3E",
//     incorrectRed = "#ea4848",
//     dark = "#393e41"

const url = document.location.href;
const title = url.split("?")[1].split("=")[1].replaceAll("%20", " "); //gets the title of bunch from query string
// title = title.replaceAll("%20", " ");

//TODO could likely be chnaged do document.addEventListener('DOMContentLoaded', ()) and be faster
window.onload = () => {
    //requests pairs data from main
    ipcRenderer.send("globalSettings:getAll");
    //reuquests studySettings data from main
    //NOTE Settings must be gotten before pairs
    ipcRenderer.send("studySettings:getAll");
    //sets lastUsed to current time
    ipcRenderer.send("bunch:set", title, {
        key: "lastUsed",
        value: new Date(),
    });
    //requests bunch data
    ipcRenderer.send("bunch:getAll", title);
};

//----------buttons listners--------------
//edit button
document.getElementById("edit-bunch-btn").addEventListener("click", () => {
    document
        .getElementById("edit-bunch-btn")
        .setAttribute("href", `newbunch.html?title=${title}`);
});

//options button
document.getElementById("options-btn").addEventListener("click", toggleMenu);

function toggleMenu() {
    if (!menuToggled) {
        document.getElementById("options-menu").classList.remove("hide");
    } else {
        document.getElementById("options-menu").classList.add("hide");
    }
    menuToggled = !menuToggled;
}

document.getElementById("back-btn").addEventListener("click", () => {
    ipcRenderer.send("returnToIndex");
});

//pair order
var orderRadios = document.querySelectorAll('input[name="pairOrder"]');
Array.prototype.forEach.call(orderRadios, (radio) => {
    radio.addEventListener("change", onOrderChange);
});

function onOrderChange() {
    ipcRenderer.send("bunch:set", title, {
        key: "pairOrder",
        value: {
            standard: document.getElementById("standard").checked,
            reversed: document.getElementById("reversed").checked,
            both: document.getElementById("both").checked,
        },
    });

    generateCalls();
    // ipcRenderer.send("bunch:getAll", title);
}

//question type
var typeRadios = document.querySelectorAll('input[name="questionType"]');
Array.prototype.forEach.call(typeRadios, (radio) => {
    radio.addEventListener("change", onQuestionTypeChange);
});

function onQuestionTypeChange() {
    ipcRenderer.send("bunch:set", title, {
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

//-----------Settings Stuff------------

let showIwr,
    showInfo,
    strikeThrough,
    penalizeIncorrect,
    timesCorrect,
    delayCorrect,
    delayIncorrect;

ipcRenderer.on("globalSettings:getAll", (e, settings) => {
    showInfo = settings.showInfo;
    showIwr = settings.showIwr;
    strikeThrough = settings.strikeThrough;
    timesCorrect = settings.timesCorrect;
    penalizeIncorrect = settings.penalizeIncorrect;
    delayCorrect = settings.delayCorrect;
    delayIncorrect = settings.delayIncorrect;
});

// ------------Pairs Stuff-------------
// handles pairs data
ipcRenderer.on("bunch:getAll", (e, bunch) => {
    pairs = JSON.parse(JSON.stringify(bunch.pairs)); //deep copy
    for (x = 0; x < pairs.length; x++) {
        // if (!(pairs[x].calls === 0 && pairs[x].revCalls === 0)) {
        pairsRef[x] = pairs[x]; //reference
        // }
    }

    document.getElementById("standard").checked = bunch.pairOrder.standard;
    document.getElementById("reversed").checked = bunch.pairOrder.reversed;
    document.getElementById("both").checked = bunch.pairOrder.both;
    document.getElementById("ask-flashcard").checked =
        bunch.questionType.flashcard;
    document.getElementById("ask-typed").checked = bunch.questionType.typed;

    updateHTML();

    studyComplete = bunch.complete;
    if (studyComplete === true) {
        inResetMenu = true;
        displayStudyAgain();
    } else if (studyComplete === false) {
        displayCard();
    } else {
        //if studyComplete === "new"
        generateCalls();
        studyComplete = false; //YOU HAVE TO LEAVE THIS HERE PUTTING A STRING IN A BOOL IS STUPID AF BUT YOU CHOSE TO DO IT
        setComplete();
    }
});

function displayStudyAgain() {
    var fcc = document.getElementById("flashcard-container");
    fcc.innerHTML = `<h2 id="end-dialogue">Bunch Complete <br> Press Space to Reset Progress</h2>`;
}

function updateHTML() {
    if (document.getElementById("ask-flashcard").checked) {
        document.getElementById("flashcard-container").innerHTML = `
        <h2 class="flashcard-margin" id="prompt"></h2>
       <div class="hide" id="main-separator"></div>
       <h2 class="hide" id="answer"></h2>
       <p ${
           showInfo ? "" : 'class="hide"'
       } id="bottom-text">Press Space to Reveal Answer</p>`;
    } else if (document.getElementById("ask-typed").checked) {
        document.getElementById(
            "flashcard-container"
        ).innerHTML = `<h2 class="typed-margin" id="prompt">Lorem</h2>
        <div class="input-container">
                <input type="text" id="answer-input" />
                <div class="hide" id="status-block">&#10004</div>
        </div>
        <h2 class="hide typed-answer" id="answer">Lorem</h2>
        <div class="hide" id="iwr-btn-container"><button id="iwr-btn">I was right</button></div>
        <p ${
            showInfo ? "" : 'class="hide"'
        } id="bottom-text">Press Enter to Answer</p>`;

        document.getElementById("iwr-btn").addEventListener("click", iWasRight);
    }
}

function generateCalls() {
    if (document.getElementById("both").checked) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = timesCorrect;
            pairs[x].revCalls = timesCorrect;
        }
        console.log("both");
    } else if (document.getElementById("reversed").checked) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = 0;
            pairs[x].revCalls = timesCorrect;
        }
        console.log("revh");
    } else if (document.getElementById("standard").checked) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = timesCorrect;
            pairs[x].revCalls = 0;
        }
        console.log("sta");
    }
    setPairs();
    displayCard();
    console.log("Pairs", pairs);
}

function displayCard() {
    const index = Math.floor(Math.random() * pairsRef.length);
    //TODO add shit to stop repeats etc
    currentPair = pairsRef[index];
    if (currentPair.calls > 0) {
        currentReversed = false;
        document.getElementById("prompt").innerText = currentPair.prompt;
        document.getElementById("answer").innerText = currentPair.answer;
    } else {
        currentReversed = true;
        document.getElementById("prompt").innerText = currentPair.answer;
        document.getElementById("answer").innerText = currentPair.prompt;
    }

    answerShown = false;
}

window.addEventListener("keydown", keyListener);
function keyListener(e) {
    //whatever we want to do goes in this block
    e = e || window.e; //capture the e, and ensure we have an e
    var key = e.key; //find the key that was pressed
    if (key === "Escape" || (!inResetMenu && studyComplete && key === " ")) {
        window.location.href = "index.html";
        return;
    } else if (inResetMenu && key === " ") {
        //if the user wishes to reset progress
        studyComplete = false;
        inResetMenu = false;
        ipcRenderer.send("bunch:set", title, {
            key: "complete",
            value: studyComplete,
        });
        updateHTML();
        generateCalls();
        //i chnaged the line below from an if to an else if. i dont think it shoudl cause any issues
    } else if (document.getElementById("ask-flashcard").checked) {
        answersManager(key);
    } else if (document.getElementById("ask-typed").checked) {
        typedAnswersManager(e);
    }

    if (menuToggled) {
        toggleMenu();
    }
}

var noTimeout; //used for incorrect forced delay
function typedAnswersManager(e) {
    if (!answerShown) {
        if (e.key === "Enter") {
            typedShowAnswer();
        }
    } else {
        if (e.key === "Enter" && noTimeout) {
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
    callsString = currentReversed ? "revCalls" : "calls";
    if (currentPair[callsString] > 0) {
        currentPair[callsString] -= 1;
        if (currentPair["calls"] === 0 && currentPair["revCalls"] === 0) {
            const index = pairsRef.indexOf(currentPair);
            pairsRef.splice(index, 1); //TODO this is splicing from og array too (also does in iwr)
        }
    }
}

let prevNumCalls;
function callsIncorrect() {
    console.log("Inorrect");
    callsString = currentReversed ? "revCalls" : "calls";
    prevNumCalls = currentPair[callsString];
    if (
        currentPair[callsString] !== 0 &&
        currentPair[callsString] < timesCorrect &&
        penalizeIncorrect
    ) {
        currentPair[callsString] += 1;
    }
}

function iWasRight() {
    clearTimeout(incorrectTimeout);
    noTimeout = true;

    callsString = currentReversed ? "revCalls" : "calls";

    if (prevNumCalls === timesCorrect) {
        currentPair[callsString] -= 1;
    } else {
        currentPair[callsString] -= 2;
    }

    if (currentPair["calls"] === 0 && currentPair["revCalls"] === 0) {
        const index = pairsRef.indexOf(currentPair);
        pairsRef.splice(index, 1);
    }

    resetPage();
}

//TODO decide if you are making dif functions or using if statements
var correctTimeout, incorrectTimeout;
function typedShowAnswer() {
    document.getElementById("answer-input").blur();
    document.getElementById("answer-input").readOnly = true;
    answerShown = true;
    document.getElementById("bottom-text").innerText =
        "Press Enter to Continue";
    const userAnswer = document.getElementById("answer-input").value;
    if (userAnswer === currentPair.answer) {
        callsCorrect();
        if (delayCorrect == 0) {
            resetPage();
        } else {
            styleCorrect();
            correctTimeout = setTimeout(resetPage, delayCorrect * 1000);
        }
    } else {
        noTimeout = false;
        incorrectTimeout = setTimeout(() => {
            noTimeout = true;
        }, delayIncorrect * 1000);
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
    // input.style.border = `2px solid ${correctGreen}`;
    const statusBlock = document.getElementById("status-block");
    // statusBlock.style.background = correctGreen;
    statusBlock.innerHTML = "&#10004";
    statusBlock.classList.remove("hide");
}

function styleIncorrect() {
    document.getElementById("answer").classList.remove("hide");
    if (showIwr) {
        document.getElementById("iwr-btn-container").classList.remove("hide");
    }
    const input = document.getElementById("answer-input");
    if (strikeThrough) {
        input.style.textDecoration = `line-through 2px`;
    }
    const statusBlock = document.getElementById("status-block");
    // statusBlock.style.background = incorrectRed;
    statusBlock.innerHTML = "&#10006";
    statusBlock.classList.remove("hide");
    // input.style.border = `2px solid ${incorrectRed}`;
}

function resetPage() {
    console.log("Pairs", pairs);
    console.log("PairsRef", pairsRef);
    if (pairsRef.length > 0) {
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
        //else if pairsRef.length <= 0 aka if study complete
        //flashcard container
        var fcc = document.getElementById("flashcard-container");
        const bottomText = document.getElementById("bottom-text");
        bottomText.innerText = "Press Space to Return Home";
        fcc.innerHTML = `<h2 id="end-dialogue">Bunch Study Complete!</h2>`;
        fcc.innerHTML += bottomText.outerHTML;
        studyComplete = true;
        setComplete();
    }

    setPairs();
}

function setPairs() {
    ipcRenderer.send("bunch:set", title, {
        key: "pairs",
        value: pairs,
    });
}

function setComplete() {
    ipcRenderer.send("bunch:set", title, {
        key: "complete",
        value: studyComplete,
    });
}
