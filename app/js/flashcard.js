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

document.body.addEventListener("click", (e) => {
    if (
        !document.getElementById("options-menu").contains(e.target) &&
        !document.getElementById("options-btn").contains(e.target)
    ) {
        if (menuToggled) {
            document.getElementById("options-menu").classList.add("hide");
            menuToggled = !menuToggled;
        }
    }
});

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
            test: document.getElementById("ask-test").checked,
        },
    });
    bunchSettings.questionType = {
        //TODO should be updated w get to main
        flashcard: document.getElementById("ask-flashcard").checked,
        typed: document.getElementById("ask-typed").checked,
        test: document.getElementById("ask-test").checked,
    };

    updateMenu();
    updateHTML();
    updateRemainingText();
    if (
        bunchSettings.questionType.flashcard ||
        bunchSettings.questionType.typed
    ) {
        createPairsRef();
    }
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
    displayCard();
});

document.getElementById("hide-para-text").addEventListener("change", () => {
    ipcRenderer.send("bunch:set", id, {
        key: "hideParaText",
        value: document.getElementById("hide-para-text").checked,
    });
    //TODO do this with get request,
    bunchSettings.hideParaText =
        document.getElementById("hide-para-text").checked;

    displayCard();
});

//TODO chnage to only on down
window.addEventListener("keydown", keyListener);
function keyListener(e) {
    if (!e.repeat) {
        //makes it on key initially pressed down instead of while key down
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

    bunchSettings.hideParaText = bunch.hideParaText;

    bunchSettings.showPinyin = bunch.showPinyin;

    currentReversed = bunch.pairOrder.reversed;
    studyComplete = bunch.complete;

    updateMenu();

    updateHTML();

    if (
        bunchSettings.questionType.typed ||
        bunchSettings.questionType.flashcard
    ) {
        createPairsRef();
    }
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

function updateMenu() {
    if (bunchSettings.questionType.typed) {
        ipcRenderer.send("updateMenu", "study-typed");
    } else {
        ipcRenderer.send("updateMenu", "standard");
    }
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
            index = Math.floor(Math.random() * pairsRef.length);
            count += 1; //after five trys j continue anyway (need this for repeat prompts)
        }
        lastPrompt = pairsRef[index].prompt;
    }
    currentPair = pairsRef[index];

    if (bunchSettings.pairOrder.bothrs) {
        if (currentPair.revCalls > 0) {
            //if it is reversed then standard, then we need to flip order
            currentReversed = true;
        } else {
            currentReversed = false;
        }
    } else {
        if (currentPair.calls > 0) {
            currentReversed = false;
        } else {
            currentReversed = true;
        }
    }

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

        if (typedCorrect(userAnswer, answer)) {
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
            sayChecked(currentReversed ? "prompt" : "answer");
        }
    }
}

function typedCorrect(userAnswer, answer) {
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
        const re = /\([^)]*\) */g; //removes parenthesis and text btw them
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

    for (x = 0; x < answers.length; x++) {
        if (userAnswer == answers[x]) {
            return true;
        }
    }
    return false;
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

    document.getElementById("ask-flashcard").checked =
        bunchSettings.questionType.flashcard;
    document.getElementById("ask-typed").checked =
        bunchSettings.questionType.typed;
    document.getElementById("ask-test").checked =
        bunchSettings.questionType.test;

    document.getElementById("standard").checked =
        bunchSettings.pairOrder.standard;
    document.getElementById("reversed").checked =
        bunchSettings.pairOrder.reversed;
    document.getElementById("bothsr").checked = bunchSettings.pairOrder.bothsr;
    document.getElementById("bothrs").checked = bunchSettings.pairOrder.bothrs;

    document.getElementById("say-prompt").checked = bunchSettings.sayPrompt;
    document.getElementById("say-answer").checked = bunchSettings.sayAnswer;

    document.getElementById("hide-para-text").checked =
        bunchSettings.hideParaText;

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
        var fcc = document.getElementById("main-container");
        fcc.innerHTML = `<h2 id="end-dialogue">Bunch Complete <br> Press Space to Reset Progress</h2>`;
    } else {
        if (bunchSettings.questionType.flashcard) {
            document.getElementById("main-container").innerHTML = `
            <div id="prompt-container"> 
                <div id="pinyin-container">
                    <p class="hide" id="pinyin-text"></p>
                </div>
                <h2 class="" id="prompt"></h2>
            </div>
            <div class="hide" id="main-separator"></div>
            <h2 class="hide" id="answer"></h2>`;

            document.getElementById("main-container").style.paddingBottom =
                "10vh";

            changeDisplayTypedAndFlashcard();
            initBottomContainer();
            ttsTypedAndFlashcardEventListeners();
            pinyinTypedAndFlashcardHTML();
        } else if (bunchSettings.questionType.typed) {
            document.getElementById("main-container").innerHTML = `
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

            document.getElementById("main-container").style.paddingBottom =
                "5vh";

            document
                .getElementById("iwr-btn")
                .addEventListener("click", iWasRight);

            changeDisplayTypedAndFlashcard();
            initBottomContainer();
            ttsTypedAndFlashcardEventListeners();
            pinyinTypedAndFlashcardHTML();
        } else if (bunchSettings.questionType.test) {
            document
                .getElementById("main-container")
                .classList.remove("flashcard-main-container");
            document
                .getElementById("main-container")
                .classList.add("test-main-container");

            document
                .getElementById("bottom-container-container")
                .classList.add("undisplay");
            document
                .getElementById("edit-bunch-btn")
                .classList.add("undisplay");
            generateTest();
        }
    }
}

function initBottomContainer() {
    document.getElementById("bottom-container").innerHTML = `
            <p ${
                settings.showRemaining ? "" : 'class="undisplay"'
            }id="remaining-text"></p>

            <p ${
                settings.showInfo ? "" : 'class="undisplay"'
            } id="bottom-text">Press Enter to Answer</p>`;

    if (
        bunchSettings.questionType.flashcard ||
        bunchSettings.questionType.typed
    ) {
    }
}

function ttsTypedAndFlashcardEventListeners() {
    //event listeners for text to speech on click
    document.getElementById("prompt").addEventListener("click", () => {
        sayClicked("prompt");
    });

    document.getElementById("answer").addEventListener("click", () => {
        sayClicked("answer");
    });
}

function changeDisplayTypedAndFlashcard() {
    document.getElementById("edit-bunch-btn").classList.remove("undisplay");

    document
        .getElementById("bottom-container-container")
        .classList.remove("undisplay");

    document
        .getElementById("main-container")
        .classList.add("flashcard-main-container");
    document
        .getElementById("main-container")
        .classList.remove("test-main-container");
}

function pinyinTypedAndFlashcardHTML() {
    if (
        pinyinLang(bunchSettings.promptLang) ||
        pinyinLang(bunchSettings.answerLang)
    ) {
        document.getElementById("pinyin-text").addEventListener("click", () => {
            addPinYinText(currentPrompt(), true);
        });

        //event listeners for piniyn
        document.getElementById("prompt").addEventListener("mouseenter", () => {
            if (!bunchSettings.showPinyin) {
                if (
                    (!currentReversed &&
                        pinyinLang(bunchSettings.promptLang)) ||
                    (currentReversed && pinyinLang(bunchSettings.answerLang))
                ) {
                    addPinYinText(currentPrompt(), false);
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

        document.getElementById("prompt").addEventListener("mouseleave", () => {
            if (!bunchSettings.showPinyin) {
                document.getElementById("pinyin-text").classList.add("hide");
            }
        });
    }

    if (
        bunchSettings.showPinyin &&
        ((!currentReversed && pinyinLang(bunchSettings.promptLang)) ||
            (currentReversed && pinyinLang(bunchSettings.answerLang)))
    ) {
        document.getElementById("pinyin-text").classList.remove("hide");
    } else {
        document.getElementById("pinyin-text").classList.add("hide");
    }
}

function genTestMC(pair, index) {
    //at least THREE pairs must exist to do mc
    let randIndex1 = Math.floor(Math.random() * pairs.length);
    while (randIndex1 == index) {
        randIndex1 = Math.floor(Math.random() * pairs.length);
    }
    let randIndex2 = Math.floor(Math.random() * pairs.length);
    while (randIndex2 == index || randIndex2 == randIndex1) {
        randIndex2 = Math.floor(Math.random() * pairs.length);
    }

    let choice0, choice1, choice2;
    let answerIndex = Math.floor(Math.random() * 3);
    switch (answerIndex) {
        case 0:
            choice0 = pair.answer;
            choice1 = pairs[randIndex1].answer;
            choice2 = pairs[randIndex2].answer;
            break;
        case 1:
            choice0 = pairs[randIndex1].answer;
            choice1 = pair.answer;
            choice2 = pairs[randIndex2].answer;
            break;
        case 2:
            choice0 = pairs[randIndex1].answer;
            choice1 = pairs[randIndex2].answer;
            choice2 = pair.answer;
            break;
    }

    const html = `<div class="test-MC" answer="${answerIndex}" selected=-1>
    <div class="test-MC-prompt">${pair.prompt}</div>
    <div class="test-MC-choice-container">
        <button class="test-MC-choice" class="test-MC-choice" num=0><div class="test-MC-choice-text">${choice0}</div><div class="correct-indicator undisplay">&#10004;</div></button>
        <button class="test-MC-choice" class="test-MC-choice" num=1><div class="test-MC-choice-text">${choice1}</div><div class="correct-indicator undisplay">&#10004;</div></button>
        <button class="test-MC-choice" class="test-MC-choice" num=2><div class="test-MC-choice-text">${choice2}</div><div class="correct-indicator undisplay">&#10004;</div></button>
        <div class="incorrect-indicator-container">
            <svg class="incorrect-indicator undisplay" width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
        </div>
    </div>
</div>`;
    return html;
}

function genTestTyped(pair) {
    const html = `<div class="test-typed" answer="${pair.answer}">
    <div class="test-typed-prompt">${pair.prompt}</div>
    <div class="answer-container-test-typed">
        <input type="text" class="test-typed-answer" />
        <div class="test-typed-correct-answer undisplay">${pair.answer}</div>
    </div>

    <div class="incorrect-indicator-container typed-correct-indicator-conatiner">
        <svg class="incorrect-indicator undisplay" width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
    </div>
</div>`;
    return html;
}

function genTestTF(pair, index) {
    //NEED AT LEAST TWO PAIRS FOR TF Questions
    const isTrue = Math.floor(Math.random() * 2) == 0; //determines if true or false
    if (isTrue) {
        const html = `
        <div class="test-TF" answer="true" state="true">
            <div class="test-TF-prompt">${pair.prompt}</div>
            <button class="test-TF-button">=</button>
            <div class="test-TF-answer">${pair.answer}</div>

            <div class="incorrect-indicator-container">
                <svg class="incorrect-indicator undisplay" width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
            </div>
        </div>`;
        return html;
    } else {
        let indexDif = Math.floor(Math.random() * pairs.length); //determines other pair
        while (index == indexDif) {
            indexDif = Math.floor(Math.random() * pairs.length);
        }
        const randPrompt = Math.floor(Math.random() * 2) == 0; //determines if prompt is dif or answer is dif
        if (randPrompt) {
            const html = `
                <div class="test-TF" answer="false" state="true">
                    <div class="test-TF-prompt">${pairs[indexDif].prompt}</div>
                    <button class="test-TF-button">=</button>
                    <div class="test-TF-answer">${pair.answer}</div>

                    <div class="incorrect-indicator-container">
                        <svg class="incorrect-indicator undisplay" width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
                    </div>
                </div>`;
            return html;
        } else {
            const html = `
                <div class="test-TF" answer="false" state="true">
                    <div class="test-TF-prompt">${pair.prompt}</div>
                    <button class="test-TF-button">=</button>
                    <div class="test-TF-answer">${pairs[indexDif].answer}</div>

                    <div class="incorrect-indicator-container">
                        <svg class="incorrect-indicator undisplay" width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
                    </div>
                </div>`;
            return html;
        }
    }
}

function generateTest() {
    var indecies = [];
    for (x = 0; x < pairs.length; x++) {
        indecies[x] = x;
    }

    var testHTML = `<div class="undisplay" id="test-score-container">
                        <div id="test-score-flex">
                            <div id="score-fraction"></div>
                            <div id="score-percent"></div>
                        </div>
                    </div>`;

    if (pairs.length < 3) {
        if (pairs.length == 1) {
            testHTML += genTestMC(pairs[0]);
        }
    } else {
        let numMC = Math.floor(pairs.length / 3);
        let numTyped = Math.ceil((pairs.length - numMC) / 2);
        let numTF = pairs.length - numMC - numTyped;
        testHTML += `<div class="MC-head">Multiple Choice</div>`;
        for (x = 0; x < numMC; x++) {
            let indeciesIndex = Math.floor(Math.random() * indecies.length);
            let index = indecies[indeciesIndex];
            let testGenPair = pairs[index];
            testHTML += genTestMC(testGenPair, index);
            indecies.splice(indeciesIndex, 1);
        }
        testHTML += `<div class="typed-head">Typed</div>`;
        for (x = 0; x < numTyped; x++) {
            let indeciesIndex = Math.floor(Math.random() * indecies.length);
            let index = indecies[indeciesIndex];
            let testGenPair = pairs[index];
            testHTML += genTestTyped(testGenPair);
            indecies.splice(indeciesIndex, 1);
        }
        testHTML += `<div class="TF-head">True / False</div>`;
        for (x = 0; x < numTF; x++) {
            let indeciesIndex = Math.floor(Math.random() * indecies.length);
            let index = indecies[indeciesIndex];
            let testGenPair = pairs[index];
            testHTML += genTestTF(testGenPair, index);
            indecies.splice(indeciesIndex, 1);
        }
    }

    testHTML += `<div class="test-separator"></div>
                <button id="test-submit">Submit</button>`;

    document.getElementById("main-container").innerHTML = testHTML;

    document.getElementById("test-submit").addEventListener("click", () => {
        window.scrollTo(0, 0);
        checkTest();
    });

    const TFButtons = document.getElementsByClassName("test-TF-button");
    for (button of TFButtons) {
        button.addEventListener("click", (e) => {
            newState =
                "true" != e.target.closest(".test-TF").getAttribute("state");
            e.target.closest(".test-TF").setAttribute("state", newState);
            if (newState) {
                e.target.innerText = "=";
            } else {
                e.target.innerText = "≠";
            }
        });
    }

    const MCButtons = document.getElementsByClassName("test-MC-choice");
    for (button of MCButtons) {
        button.addEventListener("click", (e) => {
            e.target
                .closest(".test-MC")
                .setAttribute(
                    "selected",
                    e.target.closest(".test-MC-choice").getAttribute("num")
                );

            const choices = e.target
                .closest(".test-MC")
                .getElementsByClassName("test-MC-choice");
            for (choice of choices) {
                choice.style.background = "none";
            }
            e.target.closest(".test-MC-choice").style.background =
                "var(--btn-hover)";
        });
    }
}

function checkTest() {
    const choices = document.getElementsByClassName("test-MC-choice");
    for (choice of choices) {
        //cloning removes event listeners
        let new_choice = choice.cloneNode(true);
        choice.parentNode.replaceChild(new_choice, choice);
    }

    const btns = document.getElementsByClassName("test-TF-button");
    for (btn of btns) {
        //cloning removes event listeners
        let new_btn = btn.cloneNode(true);
        btn.parentNode.replaceChild(new_btn, btn);
    }

    let incorrectCount = 0;

    const MC = document.getElementsByClassName("test-MC");
    for (question of MC) {
        if (
            question.getAttribute("answer") != question.getAttribute("selected")
        ) {
            question
                .querySelector(".incorrect-indicator")
                .classList.remove("undisplay");

            question
                .getElementsByClassName("correct-indicator")
                [question.getAttribute("answer")].classList.remove("undisplay");
            incorrectCount += 1;
        }
    }

    const typed = document.getElementsByClassName("test-typed");
    for (question of typed) {
        const input = question.querySelector(".test-typed-answer");
        if (!typedCorrect(input.value, question.getAttribute("answer"))) {
            question
                .querySelector(".incorrect-indicator")
                .classList.remove("undisplay");

            question.querySelector(".test-typed-answer ").style.textDecoration =
                "line-through 2px";

            question
                .querySelector(".test-typed-correct-answer")
                .classList.remove("undisplay");
            incorrectCount += 1;
        }
    }

    const TF = document.getElementsByClassName("test-TF");
    for (question of TF) {
        if (question.getAttribute("answer") != question.getAttribute("state")) {
            question
                .querySelector(".incorrect-indicator")
                .classList.remove("undisplay");

            incorrectCount += 1;
        }
    }

    const totalQuestions = MC.length + typed.length + TF.length;
    document.getElementById("score-fraction").innerText = `Score: ${
        totalQuestions - incorrectCount
    } / ${totalQuestions}`;
    document.getElementById("score-percent").innerText = `${Math.ceil(
        ((totalQuestions - incorrectCount) / totalQuestions) * 100
    )}%`;
    document
        .getElementById("test-score-container")
        .classList.remove("undisplay");
}

function updatePromptPinyin() {
    //TODO remove try catch
    try {
        if (bunchSettings.showPinyin)
            if (
                (!currentReversed && pinyinLang(bunchSettings.promptLang)) ||
                (currentReversed && pinyinLang(bunchSettings.answerLang))
            ) {
                addPinYinText(currentPrompt(), false);
                document.getElementById("pinyin-text").classList.remove("hide");
            } else {
                document.getElementById("pinyin-text").classList.add("hide");
            }
        else {
            document.getElementById("pinyin-text").classList.add("hide");
        }
    } catch {}
}

function displayCard() {
    if (!studyComplete) {
        //this is called from bunch:getAll when studyis complete sometimes. this is to stop it from that
        if (currentReversed) {
            document.getElementById("prompt").innerText =
                bunchSettings.showPinyin || bunchSettings.hideParaText
                    ? currentPair.answer.replace(/\(.*?\)/g, "")
                    : currentPair.answer;
            document.getElementById("answer").innerText = currentPair.prompt;
        } else {
            document.getElementById("prompt").innerText =
                bunchSettings.showPinyin || bunchSettings.hideParaText
                    ? currentPair.prompt.replace(/\(.*?\)/g, "")
                    : currentPair.prompt;
            document.getElementById("answer").innerText = currentPair.answer;
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
    var fcc = document.getElementById("main-container");
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
            // const rmp = /\(.*?\)/g; //removes parenthesis and text btw them
            // val = val.replace(rmp, "").trim();
            val = val.match(/\(([^)]+)\)/)[1]; //gets text in parenthesis
            document.getElementById("pinyin-text").innerText = val;
        } else {
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

function currentPrompt() {
    return currentReversed ? currentPair.answer : currentPair.prompt;
}
