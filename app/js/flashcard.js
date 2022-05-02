/* 
    functions must be called in this order bunch:getAll -> updateHTML -> createRefPair -> setCurrentPair -> displayCard
    for that reason createRefPair calls setCurrentPair calls displayCard
*/

const { ipcRenderer } = require("electron");

let settings; //all study settings
let bunchSettings = {}; //all bunch settings

var answerShown = false,
    studyComplete = false;
var pairs; //pairs is all pairs in bunch, current pair is the one currently being displayed
var menuToggled = false;
var currentReversed; // bool if the currentPair is asked standard or reversed
let pairsRef = []; //array of references to each pair

const url = document.location.href;
const id = url.split("?")[1].split("=")[1].replaceAll("%20", " "); //gets the id of bunch from query string

let inResetMenu = false;

//#region Event Handlers
/* -------------------------------------------------------------------------- */
/*                               Event Handlers                               */
/* -------------------------------------------------------------------------- */

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

//edit button
document.getElementById("edit-bunch-btn").addEventListener("click", () => {
    document
        .getElementById("edit-bunch-btn")
        .setAttribute("href", `newbunch.html?id=${id}&from=flashcard`);
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
    window.location.href = `index.html`;
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
    bunchSettings.pairOrder = {
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
    bunchSettings.questionType = {
        //TODO should be updated w get to main
        flashcard: document.getElementById("ask-flashcard").checked,
        typed: document.getElementById("ask-typed").checked,
    };
    updateHTML();
    updateRemainingText();
    setCurrentPair();
}

document.getElementById("say-prompt").addEventListener("change", () => {
    ipcRenderer.send("bunch:set", id, {
        key: "sayPrompt",
        value: document.getElementById("say-prompt").checked,
    });
    // bunchSettings.sayPrompt = ipcRenderer.send("bunch:get", id, "sayPrompt");
    //TODO do this with get request, the above does not work for some reason
    bunchSettings.sayPrompt = document.getElementById("say-prompt").checked;
});

document.getElementById("say-answer").addEventListener("change", () => {
    ipcRenderer.send("bunch:set", id, {
        key: "sayAnswer",
        value: document.getElementById("say-answer").checked,
    });
    // bunchSettings.sayAnswer = ipcRenderer.send("bunch:get", id, "sayAnswer");
    //TODO do this with get request, the above does not work for some reason
    bunchSettings.sayAnswer = document.getElementById("say-answer").checked;
});

document.getElementById("show-pinyin").addEventListener("change", () => {
    ipcRenderer.send("bunch:set", id, {
        key: "showPinyin",
        value: document.getElementById("show-pinyin").checked,
    });
    //TODO do this with get request,
    bunchSettings.showPinyin = document.getElementById("show-pinyin").checked;

    updatePromptPinyin();
});

window.addEventListener("keydown", keyListener);
function keyListener(e) {
    e = e || window.e; //capture the e, and ensure we have an e
    var key = e.key; //find the key that was pressed
    if (
        key === "Escape" ||
        (!inResetMenu && studyComplete && (key === " " || key === "Enter"))
    ) {
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

//-----------Settings Stuff------------
ipcRenderer.on("globalSettings:getAll", (e, settingsIn) => {
    settings = settingsIn;
});

// ------------Pairs Stuff-------------
ipcRenderer.on("bunch:getAll", (e, bunch) => {
    pairs = JSON.parse(JSON.stringify(bunch.pairs)); //deep copy

    bunchSettings.promptLang = bunch.promptLang;
    bunchSettings.answerLang = bunch.answerLang;

    bunchSettings.pairOrder = bunch.pairOrder;
    bunchSettings.questionType = bunch.questionType;

    bunchSettings.sayPrompt = bunch.sayPrompt;
    bunchSettings.sayAnswer = bunch.sayAnswer;

    bunchSettings.showPinyin = bunch.showPinyin;

    currentReversed = bunch.pairOrder.reversed;
    studyComplete = bunch.complete;

    updateHTML();

    createPairsRef();
});

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

//#endregion

//#region Bunch Management
/* -------------------------------------------------------------------------- */
/*                              Bunch Management                              */
/* -------------------------------------------------------------------------- */

let lastPrompt;
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

function createPairsRef() {
    pairsRef = [];
    if (bunchSettings.pairOrder.standard) {
        for (x = 0; x < pairs.length; x++) {
            if (pairs[x].calls > 0) {
                pairsRef.push(pairs[x]); //"Objects and arrays are pushed as a pointer to the original object"
            }
        }
    } else if (bunchSettings.pairOrder.reversed) {
        for (x = 0; x < pairs.length; x++) {
            if (pairs[x].revCalls > 0) {
                pairsRef.push(pairs[x]);
            }
        }
    } else if (
        bunchSettings.pairOrder.bothsr ||
        bunchSettings.pairOrder.bothrs
    ) {
        for (x = 0; x < pairs.length; x++) {
            if (pairs[x].calls > 0 || pairs[x].revCalls > 0) {
                pairsRef.push(pairs[x]);
            }
        }
    }
    setCurrentPair();
    updateRemainingText();
}

function generateCalls() {
    if (bunchSettings.pairOrder.bothrs || bunchSettings.pairOrder.bothsr) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = settings.timesCorrect;
            pairs[x].revCalls = settings.timesCorrect;
        }
    } else if (bunchSettings.pairOrder.reversed) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = 0;
            pairs[x].revCalls = settings.timesCorrect;
        }
    } else if (bunchSettings.pairOrder.standard) {
        for (x = 0; x < pairs.length; x++) {
            pairs[x].calls = settings.timesCorrect;
            pairs[x].revCalls = 0;
        }
    }
    setPairs();
    createPairsRef();
}

let prevNumCalls;
function updateCalls(correct) {
    if (correct) {
        callsString = currentReversed ? "revCalls" : "calls";
        if (currentPair[callsString] > 0) {
            currentPair[callsString] -= 1;
            if (currentPair["calls"] === 0 && currentPair["revCalls"] === 0) {
                const index = pairsRef.indexOf(currentPair);
                pairsRef.splice(index, 1);
            }
        }
    } else {
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

var noTimeout; //used for incorrect forced delay
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
    if (bunchSettings.questionType.flashcard) {
        document.querySelector("#main-separator").classList.remove("hide");
        document.getElementById("answer").classList.remove("hide");
        document.getElementById("bottom-text").innerText =
            "Incorrect: Press 1 \n Correct: Press 2 or Space";
        answerShown = true;
        sayChecked(currentReversed ? "prompt" : "answer");
    } else if (bunchSettings.questionType.typed) {
        document.getElementById("answer-input").blur();
        document.getElementById("answer-input").readOnly = true;
        answerShown = true;
        document.getElementById("bottom-text").innerText =
            "Press Enter to Continue";

        let userAnswer = document.getElementById("answer-input").value.trim();
        let answer = currentReversed ? currentPair.prompt : currentPair.answer;

        const re = /\([^)]*\) */g; //removes parenthesis and text btw them

        //if the answer is: "ans1 (1) / ans2 (2)", with all settings we should accept:
        //"ans1 (1) / ans2 (2)", "ans1 / ans2", "ans1 (1)", "ans2 (2)", "ans1", "ans2"

        let answers;
        if (settings.useSlash) {
            answers = answer.split("/");

            for (x = 0; x < answers.length; x++) {
                answers[x] = answers[x].trim();
            }

            if (answers.length > 1) {
                answers.unshift(answer); //appends full answer to position 0
            }
        } else {
            answers = [];
            answers.push(answer);
        }

        let toBeAdded = [];

        if (settings.ignoreParenthesis) {
            for (x = 0; x < answers.length; x++) {
                const val = answers[x].replace(re, "").trim();
                if (!answers.includes(val)) {
                    toBeAdded.push(val);
                }
            }
        }

        answers = answers.concat(toBeAdded);
        toBeAdded = [];

        if (settings.ignoreCapital) {
            userAnswer = userAnswer.toLowerCase();
            for (x = 0; x < answers.length; x++) {
                const val = answers[x].toLowerCase();
                if (!answers.includes(val)) {
                    toBeAdded.push(val);
                }
            }
        }

        answers = answers.concat(toBeAdded);
        toBeAdded = [];

        let set = false;
        for (x = 0; x < answers.length; x++) {
            if (userAnswer == answers[x]) {
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
                set = true;
                break;
            }
        }
        if (!set) {
            noTimeout = false;
            incorrectTimeout = setTimeout(() => {
                noTimeout = true;
            }, settings.delayIncorrect * 1000);
            updateCalls(false);
            styleAnswer(false);
            sayChecked(currentReversed ? "prompt" : "answer");
        }
    }
}

function answerManager(e) {
    if (bunchSettings.questionType.flashcard) {
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
    } else if (bunchSettings.questionType.typed) {
        if (!answerShown) {
            if (e.key === "Enter") {
                showAnswer();
            }
        } else {
            if (e.key === "Enter" && noTimeout) {
                clearTimeout(correctTimeout);
                resetPage();
            } else if (
                (e.metaKey && e.key.toLowerCase() === "d") ||
                (e.ctrlKey && e.key.toLowerCase() === "d")
            ) {
                iWasRight();
            }
        }
    }
}

function sayChecked(type) {
    //this is confusing, prompt and answer mean different things in dif places
    //here they refer to if the term is currentpair.answer or current pair.prompt
    if (
        (type == "answer" && bunchSettings.sayAnswer) ||
        (type == "prompt" && bunchSettings.sayPrompt)
    ) {
        window.speechSynthesis.cancel(); //stops all previous call
        let lang, string;
        if (type == "prompt") {
            lang = bunchSettings.promptLang;
            string = currentPair.prompt;
        } else if (type == "answer") {
            lang = bunchSettings.answerLang;
            string = currentPair.answer;
        }

        const rmp = /\(.*?\)/g; //removes parenthesis and text btw them
        string = settings.ignoreParenthesis
            ? string.replace(rmp, "").trim()
            : string;

        var msg = new SpeechSynthesisUtterance(string);
        msg.lang = lang;
        window.speechSynthesis.speak(msg);
    }
}

function sayClicked(type) {
    //inputs type "prompt" for prompt; "answer" for answer
    //this is confusing, prompt and answer mean different things in dif places
    //here they refer to if the user clicked on the prompt (given) or answer (hidden)
    window.speechSynthesis.cancel(); //stops all previous call
    let lang, string;
    if (type == "prompt") {
        lang = currentReversed
            ? bunchSettings.answerLang
            : bunchSettings.promptLang;
        string = currentReversed ? currentPair.answer : currentPair.prompt;
    } else if (type == "answer") {
        lang = currentReversed
            ? bunchSettings.promptLang
            : bunchSettings.answerLang;
        string = currentReversed ? currentPair.prompt : currentPair.answer;
    }

    const rmp = /\(.*?\)/g; //removes parenthesis and text btw them
    string = settings.ignoreParenthesis
        ? string.replace(rmp, "").trim()
        : string;

    var msg = new SpeechSynthesisUtterance(string);
    msg.lang = lang;
    window.speechSynthesis.speak(msg);
}

//#endregion

//#region HTML Management
/* -------------------------------------------------------------------------- */
/*                               HTML Management                              */
/* -------------------------------------------------------------------------- */

function updateHTML() {
    /*updates all html that depends on bunch content/settings */
    document.getElementById("standard").checked =
        bunchSettings.pairOrder.standard;
    document.getElementById("reversed").checked =
        bunchSettings.pairOrder.reversed;
    document.getElementById("bothsr").checked = bunchSettings.pairOrder.bothsr;
    document.getElementById("bothrs").checked = bunchSettings.pairOrder.bothrs;

    document.getElementById("ask-flashcard").checked =
        bunchSettings.questionType.flashcard;
    document.getElementById("ask-typed").checked =
        bunchSettings.questionType.typed;

    document.getElementById("say-prompt").checked = bunchSettings.sayPrompt;
    document.getElementById("say-answer").checked = bunchSettings.sayAnswer;

    if (pinyinLang(bunchSettings.promptLang)) {
        document
            .getElementById("pinyin-option-section")
            .classList.remove("undisplay");
        document.getElementById("show-pinyin").checked =
            bunchSettings.showPinyin;
    }

    const root = document.querySelector(":root");
    root.style.fontSize = `${settings.studyFontSize}px`;

    if (studyComplete) {
        //study again menu is open bc bunch is complete
        inResetMenu = true;
        var fcc = document.getElementById("flashcard-container");
        fcc.innerHTML = `<h2 id="end-dialogue">Bunch Complete <br> Press Space to Reset Progress</h2>`;
    } else {
        if (bunchSettings.questionType.flashcard) {
            document.getElementById("flashcard-container").innerHTML = `
            <div id="prompt-container"> 
                <div id="pinyin-container">
                    <p class="hide" id="pinyin-text"></p>
                </div>
                <h2 class="" id="prompt"></h2>
            </div>
            <div class="hide" id="main-separator"></div>
            <h2 class="hide" id="answer"></h2>`;

            document.getElementById("flashcard-container").style.paddingBottom =
                "10vh";
        } else if (bunchSettings.questionType.typed) {
            document.getElementById("flashcard-container").innerHTML = `
            <div id="prompt-container"> 
                <div id="pinyin-container">
                    <p class="hide" id="pinyin-text"></p>
                </div>
                <h2 id="prompt">Lorem</h2>
            </div>
            <div class="input-container">
                    <input type="text" id="answer-input"/>
                    <div class="hide" id="status-block">&#10004</div>
            </div>
            <h2 class="hide typed-answer" id="answer">Lorem</h2>
            <div class="hide" id="iwr-btn-container">
            <button id="iwr-btn">I was right</button></div>`;

            document.getElementById("flashcard-container").style.paddingBottom =
                "5vh";

            document
                .getElementById("iwr-btn")
                .addEventListener("click", iWasRight);
        }

        document.getElementById("bottom-container").innerHTML = `
            <p ${
                settings.showRemaining ? "" : 'class="undisplay"'
            }id="remaining-text"></p>

            <p ${
                settings.showInfo ? "" : 'class="undisplay"'
            } id="bottom-text">Press Enter to Answer</p>`;

        //event listeners for text to speech on click
        document.getElementById("prompt").addEventListener("click", () => {
            sayClicked("prompt");
        });

        document.getElementById("answer").addEventListener("click", () => {
            sayClicked("answer");
        });

        if (
            pinyinLang(bunchSettings.promptLang) ||
            pinyinLang(bunchSettings.answerLang)
        ) {
            document
                .getElementById("pinyin-text")
                .addEventListener("click", () => {
                    addPinYinText(
                        document.getElementById("prompt").innerText,
                        true
                    );
                });

            //event listeners for piniyn
            document
                .getElementById("prompt")
                .addEventListener("mouseenter", () => {
                    if (!bunchSettings.showPinyin) {
                        if (
                            (!currentReversed &&
                                pinyinLang(bunchSettings.promptLang)) ||
                            (currentReversed &&
                                pinyinLang(bunchSettings.answerLang))
                        ) {
                            addPinYinText(
                                document.getElementById("prompt").innerText,
                                false
                            );
                            document
                                .getElementById("pinyin-text")
                                .classList.remove("hide");
                        } else {
                            document
                                .getElementById("pinyin-text")
                                .classList.add("hide");
                        }
                    }
                });

            document
                .getElementById("prompt")
                .addEventListener("mouseleave", () => {
                    if (!bunchSettings.showPinyin) {
                        document
                            .getElementById("pinyin-text")
                            .classList.add("hide");
                    }
                });
        }

        if (bunchSettings.showPinyin) {
            updatePromptPinyin();
        }
    }
}

function updatePromptPinyin() {
    if (bunchSettings.showPinyin)
        if (
            (!currentReversed && pinyinLang(bunchSettings.promptLang)) ||
            (currentReversed && pinyinLang(bunchSettings.answerLang))
        ) {
            addPinYinText(document.getElementById("prompt").innerText, false);
            document.getElementById("pinyin-text").classList.remove("hide");
        } else {
            document.getElementById("pinyin-text").classList.add("hide");
        }
    else {
        document.getElementById("pinyin-text").classList.add("hide");
    }
}

function displayCard() {
    if (!studyComplete) {
        //this is called from bunch:getAll when studyis complete sometimes. this is to stop it from that
        if (bunchSettings.pairOrder.bothrs) {
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
        updatePromptPinyin();
        sayChecked(currentReversed ? "answer" : "prompt");

        answerShown = false;
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

function resetHTML() {
    if (bunchSettings.questionType.flashcard) {
        document.querySelector("#main-separator").classList.add("hide");
        document.getElementById("answer").classList.add("hide");
        document.getElementById("bottom-text").innerText =
            "Press Space to Reveal Answer";
    } else if (bunchSettings.questionType.typed) {
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
}

function studyCompleteHTML() {
    var fcc = document.getElementById("flashcard-container");
    const bottomText = document.getElementById("bottom-text");
    bottomText.innerText = "Press Space or Enter to Return Home";
    fcc.innerHTML = `<h2 id="end-dialogue">Bunch Study Complete!</h2>`;
    document.getElementById("bottom-text").classList.remove("undisplay");
    document.getElementById("options-btn").classList.add("hide");
    document.getElementById("remaining-text").classList.add("undisplay");
}

function addPinYinText(val, poly) {
    if (val.trim() != "") {
        if (val.includes("(") && val.includes(")")) {
            const rmp = /\(.*?\)/g; //removes parenthesis and text btw them
            val = val.replace(rmp, "").trim();
        }
        // * @param str Chinese character to be converted
        // * @param splitter separated characters, separated by spaces by default
        // * @param withtone return Whether the result contains tones, the default is
        // * @param polyphone Whether polyphone supports polyphones, the default is no
        document.getElementById("pinyin-text").innerText = poly
            ? `${pinyinUtil.getPinyin(val, " ", true, poly)}`.replaceAll(
                  ",",
                  " / "
              )
            : `${pinyinUtil.getPinyin(val, " ", true, false)}`;
    }
}

function updateRemainingText() {
    if (settings.showRemaining && !inResetMenu) {
        let remainingCount = 0;
        for (x = 0; x < pairsRef.length; x++) {
            remainingCount += pairsRef[x].revCalls + pairsRef[x].calls;
        }
        document.getElementById(
            "remaining-text"
        ).innerText = `${remainingCount} remaining`;
    }
}
//#endregion

//#region Resets
/* -------------------------------------------------------------------------- */
/*                                   Resets                                   */
/* -------------------------------------------------------------------------- */
function exitResetMenu() {
    //if the user wishes to reset progress
    studyComplete = false;
    setComplete();
    inResetMenu = false;
    updateHTML();
    generateCalls(); //generateCalls calls createPairsRef, thus updatehtml must be called before
}

function resetPage() {
    if (pairsRef.length > 0) {
        resetHTML();
        updateRemainingText();
        createPairsRef();
    } else {
        studyCompleteHTML();
        studyComplete = true;
        setComplete();
    }
    setPairs();
}
//#endregion

function pinyinLang(lang) {
    //returns bool representing if lang is a pinyin lang
    return lang == "zh-CN" || lang == "zh-HK" || lang == "zh-TW";
}
