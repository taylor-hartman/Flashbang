/* 
    functions must be called in this order bunch:getAll -> updateHTML -> createRefPair -> setCurrentPair -> displayCard
    for that reason createRefPair calls setCurrentPair calls displayCard
*/

const { ipcRenderer } = require("electron");

var answerShown = false,
    studyComplete = false;
inResetMenu = false;
var pairs; //pairs is all pairs in bunch, current pair is the one currently being displayed
var menuToggled = false;
var currentReversed; // bool if the currentPair is asked standard or reversed
let pairsRef = []; //array of references to each pair

let settings; //all study settings

const url = document.location.href;
const id = url.split("?")[1].split("=")[1].replaceAll("%20", " "); //gets the id of bunch from query string

//TODO could likely be chnaged do document.addEventListener('DOMContentLoaded', ()) and be faster
window.onload = () => {
    //requests pairs data from main
    ipcRenderer.send("globalSettings:getAll");
    //reuquests studySettings data from main
    //NOTE Settings must be gotten before pairs
    ipcRenderer.send("studySettings:getAll");
    //sets lastUsed to current time
    ipcRenderer.send("bunch:set", id, {
        key: "lastUsed",
        value: new Date(),
    });
    //requests bunch data
    ipcRenderer.send("bunch:getAll", id);
};

//----------buttons listners--------------
//edit button
document.getElementById("edit-bunch-btn").addEventListener("click", () => {
    document
        .getElementById("edit-bunch-btn")
        .setAttribute("href", `newbunch.html?id=${id}`);
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
    ipcRenderer.send("bunch:set", id, {
        key: "pairOrder",
        value: {
            standard: document.getElementById("standard").checked,
            reversed: document.getElementById("reversed").checked,
            bothsr: document.getElementById("bothsr").checked,
            bothrs: document.getElementById("bothrs").checked,
        },
    });
    pairOrder = {
        //TODO this should be done via get req to main
        standard: document.getElementById("standard").checked,
        reversed: document.getElementById("reversed").checked,
        bothsr: document.getElementById("bothsr").checked,
        bothrs: document.getElementById("bothrs").checked,
    };
    generateCalls();
}

//question type
var typeRadios = document.querySelectorAll('input[name="questionType"]');
Array.prototype.forEach.call(typeRadios, (radio) => {
    radio.addEventListener("change", onQuestionTypeChange);
});

function onQuestionTypeChange() {
    ipcRenderer.send("bunch:set", id, {
        key: "questionType",
        value: {
            flashcard: document.getElementById("ask-flashcard").checked,
            typed: document.getElementById("ask-typed").checked,
        },
    });
    questionType = {
        //TODO should be updated w get to main
        flashcard: document.getElementById("ask-flashcard").checked,
        typed: document.getElementById("ask-typed").checked,
    };
    updateHTML();
    setCurrentPair();
}

//-----------Settings Stuff------------
ipcRenderer.on("globalSettings:getAll", (e, settingsIn) => {
    settings = settingsIn;
});

// ------------Pairs Stuff-------------
// handles pairs data
//TODO this should not be done this way, should create a global var that stores bunch settings
let promptLang, answerLang;
let pairOrder, questionType;
ipcRenderer.on("bunch:getAll", (e, bunch) => {
    pairs = JSON.parse(JSON.stringify(bunch.pairs)); //deep copy

    promptLang = bunch.promptLang;
    answerLang = bunch.answerLang;

    currentReversed = bunch.pairOrder.reversed;

    pairOrder = bunch.pairOrder;
    questionType = bunch.questionType;

    studyComplete = bunch.complete;

    updateHTML();

    createPairsRef();
});

function createPairsRef() {
    pairsRef = [];
    if (pairOrder.standard) {
        for (x = 0; x < pairs.length; x++) {
            if (pairs[x].calls > 0) {
                pairsRef.push(pairs[x]); //"Objects and arrays are pushed as a pointer to the original object"
            }
        }
    } else if (pairOrder.reversed) {
        for (x = 0; x < pairs.length; x++) {
            if (pairs[x].revCalls > 0) {
                pairsRef.push(pairs[x]);
            }
        }
    } else if (pairOrder.bothsr || pairOrder.bothrs) {
        for (x = 0; x < pairs.length; x++) {
            if (pairs[x].calls > 0 || pairs[x].revCalls > 0) {
                pairsRef.push(pairs[x]);
            }
        }
    }
    setCurrentPair();
}

function updateHTML() {
    /*updates all html that depends on bunch content/settings */
    document.getElementById("standard").checked = pairOrder.standard;
    document.getElementById("reversed").checked = pairOrder.reversed;
    document.getElementById("bothsr").checked = pairOrder.bothsr;
    document.getElementById("bothrs").checked = pairOrder.bothrs;
    document.getElementById("ask-flashcard").checked = questionType.flashcard;
    document.getElementById("ask-typed").checked = questionType.typed;

    const root = document.querySelector(":root");
    root.style.fontSize = `${settings.studyFontSize}px`;

    if (studyComplete) {
        //study again menu is open bc bunch is complete
        inResetMenu = true;
        var fcc = document.getElementById("flashcard-container");
        fcc.innerHTML = `<h2 id="end-dialogue">Bunch Complete <br> Press Space to Reset Progress</h2>`;
    } else {
        if (questionType.flashcard) {
            document.getElementById("flashcard-container").innerHTML = `
        <h2 class="flashcard-margin" id="prompt"></h2>
       <div class="hide" id="main-separator"></div>
       <h2 class="hide" id="answer"></h2>
       <p ${
           settings.showInfo ? "" : 'class="hide"'
       } id="bottom-text">Press Space to Reveal Answer</p>`;
        } else if (questionType.typed) {
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
            settings.showInfo ? "" : 'class="hide"'
        } id="bottom-text">Press Enter to Answer</p>`;

            document
                .getElementById("iwr-btn")
                .addEventListener("click", iWasRight);
        }

        //event listeners for text to speech on click
        document.getElementById("prompt").addEventListener("click", () => {
            say("prompt");
        });

        document.getElementById("answer").addEventListener("click", () => {
            say("answer");
        });
    }
}

function generateCalls() {
    if (pairOrder.bothrs || pairOrder.bothsr) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = settings.timesCorrect;
            pairs[x].revCalls = settings.timesCorrect;
        }
    } else if (pairOrder.reversed) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = 0;
            pairs[x].revCalls = settings.timesCorrect;
        }
    } else if (pairOrder.standard) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = settings.timesCorrect;
            pairs[x].revCalls = 0;
        }
    }
    setPairs();
    createPairsRef();
    console.log("Pairs", pairs);
}

var lastPrompt;
function setCurrentPair() {
    let index = Math.floor(Math.random() * pairsRef.length);

    let count = 0;
    if (pairsRef.length > 1) {
        while (pairsRef[index].prompt === lastPrompt && count < 5) {
            //TODO shoudl be better way to do this
            //TODO i feel like this while loop is not effiecient
            index = Math.floor(Math.random() * pairsRef.length);
            count += 1; //after five trys j continue anyway (need this for repeat prompts)
        }
        lastPrompt = pairsRef[index].prompt;
    }
    currentPair = pairsRef[index];

    displayCard();
}

function displayCard() {
    if (!studyComplete) {
        //this is called from bunch:getAll when studyis complete sometimes. this is to stop it from that
        if (pairOrder.bothrs) {
            //if it is reversed then standard, then we need to flip order
            if (currentPair.revCalls > 0) {
                currentReversed = true; //TODO should not be set here
                document.getElementById("prompt").innerText =
                    currentPair.answer;
                document.getElementById("answer").innerText =
                    currentPair.prompt;
            } else {
                currentReversed = false;
                document.getElementById("prompt").innerText =
                    currentPair.prompt;
                document.getElementById("answer").innerText =
                    currentPair.answer;
            }
        } else {
            if (currentPair.calls > 0) {
                //this is ok because calls is set to zero for reversed
                //TODO should probably make into one thing and not two tho
                currentReversed = false;
                document.getElementById("prompt").innerText =
                    currentPair.prompt;
                document.getElementById("answer").innerText =
                    currentPair.answer;
            } else {
                currentReversed = true;
                document.getElementById("prompt").innerText =
                    currentPair.answer;
                document.getElementById("answer").innerText =
                    currentPair.prompt;
            }
        }

        say("prompt");

        answerShown = false;
    }
}

window.addEventListener("keydown", keyListener);
function keyListener(e) {
    e = e || window.e; //capture the e, and ensure we have an e
    var key = e.key; //find the key that was pressed
    if (key === "Escape" || (!inResetMenu && studyComplete && key === " ")) {
        window.location.href = "index.html";
        return;
    } else if (inResetMenu && key === " ") {
        exitResetMenu();
    } else {
        answerManager(e);
    }

    if (menuToggled) {
        toggleMenu();
    }
}

function exitResetMenu() {
    //if the user wishes to reset progress
    studyComplete = false;
    setComplete();
    inResetMenu = false;
    updateHTML();
    generateCalls(); //generateCalls calls createPairsRef, thus updatehtml must be called before
}

function answerManager(e) {
    if (questionType.flashcard) {
        if (!answerShown) {
            if (e.key === " ") {
                showAnswer();
            }
        } else {
            if (e.key === "2" || e.key === " ") {
                //Answer is right
                updateCalls(true);
                resetPage(); //this must stay inside if bc otherwise resets on any key
            } else if (e.key === "1") {
                //answer is wrong
                updateCalls(false);
                resetPage(); //this must stay inside if bc otherwise resets on any key
            }
        }
    } else if (questionType.typed) {
        if (!answerShown) {
            if (e.key === "Enter") {
                showAnswer();
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
}

var noTimeout; //used for incorrect forced delay

function say(type) {
    window.speechSynthesis.cancel(); //stops all previous call
    let lang, string;
    if (type == "prompt") {
        lang = currentReversed ? answerLang : promptLang;
        string = currentReversed ? currentPair.answer : currentPair.prompt;
    } else if (type == "answer") {
        lang = currentReversed ? promptLang : answerLang;
        string = currentReversed ? currentPair.prompt : currentPair.answer;
    }
    var msg = new SpeechSynthesisUtterance(string);
    msg.lang = lang;
    window.speechSynthesis.speak(msg);
}

//TODO make into one function w callincorrect
let prevNumCalls;
function updateCalls(correct) {
    if (correct) {
        console.log("Correct");
        callsString = currentReversed ? "revCalls" : "calls";
        if (currentPair[callsString] > 0) {
            currentPair[callsString] -= 1;
            if (currentPair["calls"] === 0 && currentPair["revCalls"] === 0) {
                const index = pairsRef.indexOf(currentPair);
                pairsRef.splice(index, 1);
            }
        }
    } else {
        console.log("Inorrect");
        callsString = currentReversed ? "revCalls" : "calls";
        prevNumCalls = currentPair[callsString];
        if (
            currentPair[callsString] !== 0 &&
            currentPair[callsString] < settings.timesCorrect &&
            settings.penalizeIncorrect
        ) {
            currentPair[callsString] += 1;
        }
    }
}

function iWasRight() {
    clearTimeout(incorrectTimeout);
    noTimeout = true;

    callsString = currentReversed ? "revCalls" : "calls";

    if (prevNumCalls === settings.timesCorrect) {
        //if calls was as high as possible
        currentPair[callsString] -= 1; //only take away one bc the initial incorrect did nothing
    } else {
        currentPair[callsString] -= 2; //one to correct initial incorrect and one for rigth answer
    }

    if (currentPair["calls"] === 0 && currentPair["revCalls"] === 0) {
        const index = pairsRef.indexOf(currentPair);
        pairsRef.splice(index, 1);
    }

    resetPage();
}

//TODO decide if you are making dif functions or using if statements
var correctTimeout, incorrectTimeout;
function showAnswer() {
    if (questionType.flashcard) {
        document.querySelector("#main-separator").classList.remove("hide");
        document.getElementById("answer").classList.remove("hide");
        document.getElementById("bottom-text").innerText =
            "Incorrect: Press 1 \n Correct: Press 2 or Space";
        answerShown = true;
        say("answer");
    } else if (questionType.typed) {
        document.getElementById("answer-input").blur();
        document.getElementById("answer-input").readOnly = true;
        answerShown = true;
        document.getElementById("bottom-text").innerText =
            "Press Enter to Continue";

        let userAnswer = document.getElementById("answer-input").value;
        let answer = currentReversed ? currentPair.prompt : currentPair.answer;

        const rmp = /\(.*?\)/g; //removes parenthesis and text btw them
        parsedAnswer = settings.ignoreParenthesis
            ? answer.replace(rmp, "").trim()
            : answer; //trim() removes trailing whitespaces

        if (settings.ignoreCapital) {
            answer = answer.toLowerCase();
            userAnswer = userAnswer.toLowerCase();
            parsedAnswer = parsedAnswer.toLowerCase();
        }

        if (userAnswer == answer || userAnswer == parsedAnswer) {
            updateCalls(true);
            if (settings.delayCorrect == 0) {
                resetPage();
            } else {
                styleAnswer(true);
                correctTimeout = setTimeout(
                    resetPage,
                    settings.delayCorrect * 1000
                );
            }
        } else {
            noTimeout = false;
            incorrectTimeout = setTimeout(() => {
                noTimeout = true;
            }, settings.delayIncorrect * 1000);
            updateCalls(false);
            styleAnswer(false);
            say("answer");
        }
    }
}

function styleAnswer(correct) {
    if (correct) {
        const input = document.getElementById("answer-input");
        // input.style.border = `2px solid ${correctGreen}`;
        const statusBlock = document.getElementById("status-block");
        // statusBlock.style.background = correctGreen;
        statusBlock.innerHTML = "&#10004";
        statusBlock.classList.remove("hide");
    } else {
        document.getElementById("answer").classList.remove("hide");
        if (settings.showIwr) {
            document
                .getElementById("iwr-btn-container")
                .classList.remove("hide");
        }
        const input = document.getElementById("answer-input");
        if (settings.strikeThrough) {
            input.style.textDecoration = `line-through 2px`;
        }
        const statusBlock = document.getElementById("status-block");
        // statusBlock.style.background = incorrectRed;
        statusBlock.innerHTML = "&#10006";
        statusBlock.classList.remove("hide");
        // input.style.border = `2px solid ${incorrectRed}`;
    }
}

function resetPage() {
    console.log("Pairs", pairs);
    console.log("PairsRef", pairsRef);
    if (pairsRef.length > 0) {
        if (questionType.flashcard) {
            document.querySelector("#main-separator").classList.add("hide");
            document.getElementById("answer").classList.add("hide");
            document.getElementById("bottom-text").innerText =
                "Press Space to Reveal Answer";
        } else if (questionType.typed) {
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
        createPairsRef();
    } else {
        //when complete
        //else if pairsRef.length <= 0 aka if study complete
        //flashcard container
        var fcc = document.getElementById("flashcard-container");
        const bottomText = document.getElementById("bottom-text");
        bottomText.innerText = "Press Space to Return Home";
        fcc.innerHTML = `<h2 id="end-dialogue">Bunch Study Complete!</h2>`;
        fcc.innerHTML += bottomText.outerHTML;
        document.getElementById("options-btn").classList.add("hide");
        studyComplete = true;
        setComplete();
    }

    setPairs();
}

function setPairs() {
    ipcRenderer.send("bunch:set", id, {
        key: "pairs",
        value: pairs,
    });
}

function setComplete() {
    ipcRenderer.send("bunch:set", id, {
        key: "complete",
        value: studyComplete,
    });
}
