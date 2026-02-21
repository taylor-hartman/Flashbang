const ipcRenderer = require("electron").ipcRenderer;
const querystring = require("querystring");
const path = require("path");
const fs = require("fs");

let pairs;
let id;

let importMenuOpen = false,
	exportMenuOpen = false;

const url = document.location.href;
const query = url.split("?")[1];
parsedQuery = querystring.parse(query, "&", "=");
id = parsedQuery.id; // the id of the bunch (the num of the file name)
accesedFrom = parsedQuery.from; // page where the edit button was hit

const editing = id !== ".new_bunch"; // true if editing; false if new bunch

// #region Event Handlers
/* -------------------------------------------------------------------------- */
/*                               Event Handlers                               */
/* -------------------------------------------------------------------------- */
ipcRenderer.send("updateMenu", "newbunch");

/* ----------------------------- corner buttons ----------------------------- */
document.getElementById("back-btn").addEventListener("click", (e) => {
	e.preventDefault();
	if (importMenuOpen) {
		closeImportMenu();
	} else if (exportMenuOpen) {
		closeExportMenu();
	} else {
		backBtnExit();
	}
});

document.getElementById("top-right-btn").addEventListener("click", () => {
	document.getElementById("top-right-btn").classList.add("hide");
	document.getElementById("import-form").classList.remove("hide");
	document
		.getElementsByClassName("new-bunch-container")[0]
		.classList.add("hide");

	editingPairs = false;
	adjustEditing();

	saveInternal();
	importMenuOpen = true;
});

/* -------------------------------------------------------------------------- */

// remaps certain keypresses
document.addEventListener("keypress", function (e) {
	// remap: enter
	if (e.key === "Enter") {
		if (document.activeElement.id != "import-text") {
			// prevent enter from doing form actions
			e.preventDefault();

			// get active bunch index
			let activePair;
			if (document.activeElement.id == "title-input") {
				activePair = -1; // allows enter key to transfer from title bar to
				// pairs
			} else {
				activePair =
					(
						document.querySelector("input.prompt:focus") ||
						document.querySelector("input.answer:focus")
					).closest(".pair").querySelector("p.index").innerText -
					1;
			}

			// get next bunch index
			let nextPair = activePair + 1;

			// add new pair if needed
			if (nextPair >= document.querySelectorAll("div.pair").length) {
				document.getElementById("plus").click();
			}

			// focus next pair
			document.querySelectorAll("input.prompt")[nextPair].focus();
		}
	}
});

document.getElementById("title-input").addEventListener("change", () => {
	titleValid(document.getElementById("title-input").value);
});

document
	.getElementById("prompt-lang")
	.addEventListener("change", showPinYinMenu);
document
	.getElementById("answer-lang")
	.addEventListener("change", showPinYinMenu);

// #endregion

// #region HTML Management
/* -------------------------------------------------------------------------- */
/*                               HTML Management                              */
/* -------------------------------------------------------------------------- */

function generatePairsHTML() {
	document.getElementById("pair-container").innerHTML = "";
	// default pairs val is []. clear sets to this default. in order to display
	// inputs when nothing there these next lines. all blank pairs are removed
	// when importing and in make bunch
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
				pairOrder.standard || pairOrder.bothsr || pairOrder.bothrs
					? timesCorrect
					: 0,
			);
		}

		if (pairs[x].revCalls != null) {
			newPair.setAttribute("revCalls", pairs[x].revCalls);
		} else {
			newPair.setAttribute(
				"revCalls",
				pairOrder.reversed || pairOrder.bothsr || pairOrder.bothrs
					? timesCorrect
					: 0,
			);
		}

		newPair.setAttribute("prompt-image", pairs[x].promptImage || "");
		newPair.setAttribute("answer-image", pairs[x].answerImage || "");

		newPair.innerHTML = `
            <p class="index">${x + 1}</p>
            <div class="pair-holder">
                <div class="input-holder">
                    <div class="input-box">
                        <input
                            class="prompt"
                            type="text"
                            placeholder="Prompt"
                            name=""
                            id="",
                            value="${pairs[x].prompt.replaceAll('"', "&quot;")}"
                        />
                        <button type="button" class="image-attach-btn prompt-image-btn" title="Add image to prompt" tabindex="-1">
                            <svg width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23 4v16c0 1.654-1.346 3-3 3h-16c-1.654 0-3-1.346-3-3v-16c0-1.654 1.346-3 3-3h16c1.654 0 3 1.346 3 3zm-2 0c0-.551-.448-1-1-1h-16c-.552 0-1 .449-1 1v10.172l3.293-3.293c.391-.391 1.024-.391 1.414 0l2.293 2.293 6.293-6.293c.391-.391 1.024-.391 1.414 0l3.293 3.293v-6.172zm0 13.414l-4.707-4.707-6.293 6.293-2.293-2.293-4.707 4.707v.586c0 .551.448 1 1 1h16c.552 0 1-.449 1-1v-.586z"/></svg>
                        </button>
                    </div>
                    <div class="input-box">
                        <input
                            class="answer"
                            type="text"
                            placeholder="Answer"
                            name=""
                            id="",
                            value="${pairs[x].answer.replaceAll('"', "&quot;")}"
                        />
                        <button type="button" class="image-attach-btn answer-image-btn" title="Add image to answer" tabindex="-1">
                            <svg width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23 4v16c0 1.654-1.346 3-3 3h-16c-1.654 0-3-1.346-3-3v-16c0-1.654 1.346-3 3-3h16c1.654 0 3 1.346 3 3zm-2 0c0-.551-.448-1-1-1h-16c-.552 0-1 .449-1 1v10.172l3.293-3.293c.391-.391 1.024-.391 1.414 0l2.293 2.293 6.293-6.293c.391-.391 1.024-.391 1.414 0l3.293 3.293v-6.172zm0 13.414l-4.707-4.707-6.293 6.293-2.293-2.293-4.707 4.707v.586c0 .551.448 1 1 1h16c.552 0 1-.449 1-1v-.586z"/></svg>
                        </button>
                    </div>
                    <a class="pair-delete-btn undisplay">
                        <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
                    </a>
                </div>
                <div class="${!pairs[x].promptImage && !pairs[x].answerImage ? "undisplay" : ""} image-holder ">
                    <div class="image-preview prompt-image-preview ${pairs[x].promptImage ? "" : "hide"}"></div>
                    <div class="image-preview answer-image-preview ${pairs[x].answerImage ? "" : "hide"}"></div>
                </div>
            </div>
    `;
		document.getElementById("pair-container").appendChild(newPair);
	}

	// removed feature for now
	//  const htmlPairs = document.getElementsByClassName("pair");
	//  for (x = 0; x < htmlPairs.length; x++) {
	//      htmlPairs[x].addEventListener("change", (e) => {
	//          // resetPairCalls(e);
	//      });
	//  }
	showPinYinMenu(); // showpinyinmenu must be done after generatePairsHTML

	// adds event listeners after clear
	if (document.getElementById("auto-pinyin-prompt").checked) {
		const htmlPrompts = document.getElementsByClassName("prompt");
		addPinyinInputListeners(htmlPrompts);
	}

	if (document.getElementById("auto-pinyin-answer").checked) {
		const htmlAnswers = document.getElementsByClassName("answer");
		addPinyinInputListeners(htmlAnswers);
	}

	// Add image attachment event listeners
	addImageEventListeners();
	// Load existing images
	loadExistingImages();
}

// function resetPairCalls(e) {
//     e.target
//         .closest(".pair")
//         .setAttribute(
//             "calls",
//             pairOrder.standard || pairOrder.bothsr || pairOrder.bothrs
//                 ? timesCorrect
//                 : 0
//         );
//     e.target
//         .closest(".pair")
//         .setAttribute(
//             "revCalls",
//             pairOrder.reversed || pairOrder.bothsr || pairOrder.bothrs
//                 ? timesCorrect
//                 : 0
//         );
// }

function refactorIndicies() {
	const indicies = document.getElementsByClassName("index");
	for (x = 0; x < indicies.length; x++) {
		indicies[x].innerText = x + 1;
	}
}
// #endregion

// #region Pinyin and language
/* -------------------------------------------------------------------------- */
/*                           Pinyin and Language                              */
/* -------------------------------------------------------------------------- */

function showPinYinMenu() {
	// called at end of generatePairsHTML()
	let menuShown = false;
	if (
		document.getElementById("prompt-lang").value == "zh-CN" ||
		document.getElementById("prompt-lang").value == "zh-HK" ||
		document.getElementById("prompt-lang").value == "zh-TW"
	) {
		document.getElementById("pinyin-menu").classList.remove("undisplay");
		document.getElementById("pinyin-half-prompt").classList.remove("hide");
		menuShown = true;
	}

	if (
		document.getElementById("answer-lang").value == "zh-CN" ||
		document.getElementById("answer-lang").value == "zh-HK" ||
		document.getElementById("answer-lang").value == "zh-TW"
	) {
		document.getElementById("pinyin-menu").classList.remove("undisplay");
		document.getElementById("pinyin-half-answer").classList.remove("hide");
		menuShown = true;
	}

	if (!menuShown) {
		document.getElementById("pinyin-menu").classList.add("undisplay");
		document.getElementById("pinyin-half-prompt").classList.add("hide");
		document.getElementById("pinyin-half-answer").classList.add("hide");
	}
}

document.getElementById("auto-pinyin-prompt").addEventListener("change", () => {
	const htmlPrompts = document.getElementsByClassName("prompt");
	if (document.getElementById("auto-pinyin-prompt").checked) {
		addPinyinInputListeners(htmlPrompts);
	} else {
		removePinyinInputListeners(htmlPrompts);
	}
});

document.getElementById("auto-pinyin-answer").addEventListener("change", () => {
	const htmlAnswers = document.getElementsByClassName("answer");
	if (document.getElementById("auto-pinyin-answer").checked) {
		addPinyinInputListeners(htmlAnswers);
	} else {
		removePinyinInputListeners(htmlAnswers);
	}
});

function removePinyinInputListeners(elemList) {
	for (x = 0; x < elemList.length; x++) {
		elemList[x].removeEventListener("blur", addPinYinText);
	}
}

function addPinyinInputListeners(elemList) {
	for (x = 0; x < elemList.length; x++) {
		addPinyinInputListener(elemList[x]);
	}
}

function addPinyinInputListener(elem) {
	elem.addEventListener("blur", addPinYinText);
}
// #endregion

// #region Editing
/* -------------------------------------------------------------------------- */
/*                                   Editing                                  */
/* -------------------------------------------------------------------------- */

var editingPairs = false; // represents if X's show to delete pairs

// calls management
let timesCorrect;
let pairOrder, questionType;

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
				e.currentTarget.closest(".pair").remove();
				refactorIndicies();
			});
		}
	} else {
		for (x = 0; x < deletePairBtns.length; x++) {
			deletePairBtns[x].classList.add("undisplay");
		}
	}
}

// add pair
document.getElementById("plus").addEventListener("click", (e) => {
	e.preventDefault();
	var indicies = document.getElementsByClassName("index");
	var idNum = indicies.length + 1;

	var newPair = document.createElement("div");
	newPair.classList.add("pair");

	newPair.setAttribute(
		"calls",
		pairOrder.standard || pairOrder.bothsr || pairOrder.bothrs
			? timesCorrect
			: 0,
	);
	newPair.setAttribute(
		"revCalls",
		pairOrder.reversed || pairOrder.bothsr || pairOrder.bothrs
			? timesCorrect
			: 0,
	);
	newPair.setAttribute("prompt-image", "");
	newPair.setAttribute("answer-image", "");

	newPair.innerHTML = `
            <p class="index">${idNum}</p>
            <div class="pair-holder">
                <div class="input-holder">
                    <div class="input-box">
                        <input
                            class="prompt"
                            type="text"
                            placeholder="Prompt"
                            name=""
                            id="",
                        />
                        <button type="button" class="image-attach-btn prompt-image-btn" title="Add image to prompt" tabindex="-1">
                            <svg width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23 4v16c0 1.654-1.346 3-3 3h-16c-1.654 0-3-1.346-3-3v-16c0-1.654 1.346-3 3-3h16c1.654 0 3 1.346 3 3zm-2 0c0-.551-.448-1-1-1h-16c-.552 0-1 .449-1 1v10.172l3.293-3.293c.391-.391 1.024-.391 1.414 0l2.293 2.293 6.293-6.293c.391-.391 1.024-.391 1.414 0l3.293 3.293v-6.172zm0 13.414l-4.707-4.707-6.293 6.293-2.293-2.293-4.707 4.707v.586c0 .551.448 1 1 1h16c.552 0 1-.449 1-1v-.586z"/></svg>
                        </button>
                    </div>
                    <div class="input-box">
                        <input
                            class="answer"
                            type="text"
                            placeholder="Answer"
                            name=""
                            id="",
                        />
                        <button type="button" class="image-attach-btn answer-image-btn" title="Add image to answer" tabindex="-1">
                            <svg width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23 4v16c0 1.654-1.346 3-3 3h-16c-1.654 0-3-1.346-3-3v-16c0-1.654 1.346-3 3-3h16c1.654 0 3 1.346 3 3zm-2 0c0-.551-.448-1-1-1h-16c-.552 0-1 .449-1 1v10.172l3.293-3.293c.391-.391 1.024-.391 1.414 0l2.293 2.293 6.293-6.293c.391-.391 1.024-.391 1.414 0l3.293 3.293v-6.172zm0 13.414l-4.707-4.707-6.293 6.293-2.293-2.293-4.707 4.707v.586c0 .551.448 1 1 1h16c.552 0 1-.449 1-1v-.586z"/></svg>
                        </button>
                    </div>
                    <a class="pair-delete-btn undisplay">
                        <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 6.586c-.78-.781-2.048-.781-2.828 0l-2.586 2.586-2.586-2.586c-.78-.781-2.048-.781-2.828 0-.781.781-.781 2.047 0 2.828l2.585 2.586-2.585 2.586c-.781.781-.781 2.047 0 2.828.39.391.902.586 1.414.586s1.024-.195 1.414-.586l2.586-2.586 2.586 2.586c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-2.585-2.586 2.585-2.586c.781-.781.781-2.047 0-2.828z"/></svg>
                    </a>
                </div>
                <div class="undisplay image-holder">
                    <div class="image-preview prompt-image-preview hide"></div>
                    <div class="image-preview answer-image-preview hide"></div>
                </div>
            </div>`;

	if (document.getElementById("auto-pinyin-prompt").checked) {
		addPinyinInputListener(newPair.getElementsByClassName("prompt")[0]);
	}

	if (document.getElementById("auto-pinyin-answer").checked) {
		addPinyinInputListener(newPair.getElementsByClassName("answer")[0]);
	}

	if (editingPairs) {
		const deleteBtn = newPair.getElementsByClassName("pair-delete-btn")[0];

		deleteBtn.classList.remove("undisplay");

		deleteBtn.addEventListener("click", (e) => {
			e.currentTarget.closest(".pair").remove();
			refactorIndicies();
		});
	}

	document.getElementById("pair-container").appendChild(newPair);

	// Add image event listeners for new pair
	addImageEventListenersForPair(newPair);

	document.getElementById("submit-add-bar").scrollIntoView();
});

//---stuff for clearing---
document.getElementById("clear-btn").addEventListener("click", (e) => {
	e.preventDefault();
	document.getElementById("delete-menu").classList.remove("hide");
	document.getElementById("delete-menu").scrollIntoView();
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

// #endregion

// #region Import
/* -------------------------------------------------------------------------- */
/*                                   Import                                   */
/* -------------------------------------------------------------------------- */

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

var importTimeout;
function parseImport() {
	try {
		var termSeparatorInput = document.getElementById("btwn-term");
		var pairSeparatorInput = document.getElementById("btwn-pair");

		var termSeparator =
			termSeparatorInput.value == "" ? "-" : termSeparatorInput.value;
		var pairSeparator =
			pairSeparatorInput.value == "" ? ";" : pairSeparatorInput.value;

		termSeparator = termSeparator == "\\n" ? "\n" : termSeparator;
		pairSeparator = pairSeparator == "\\n" ? "\n" : pairSeparator; // translate from string \n to new line

		console.log(pairSeparator);
		console.log(termSeparator);

		const importVals = document.getElementById("import-text").value.trim();

		let pairsStrings = importVals.split(pairSeparator);
		let importPairs = [];

		// removes new lines from inside each pair if /n is not separator
		if (termSeparator != "\n") {
			for (x = 0; x < pairsStrings.length; x++) {
				pairsStrings[x] = pairsStrings[x].replace(/\n|\r/g, " ");
			}
		}

		if (pairsStrings[pairsStrings.length - 1] == "") {
			// if last elem is blank (occurs when sepeartor is the last char of input)
			console.log("last rm");
			pairsStrings.splice(-1, 1); // remove last elem
		}

		for (x = 0; x < pairsStrings.length; x++) {
			const pairArray = pairsStrings[x].split(termSeparator);
			const pair = {};
			pair["prompt"] = pairArray[0].trim(); // removed leading and trailing white spaces
			pair["answer"] = pairArray[1].trim();
			importPairs.push(pair);
		}
		// TODO calls must be added in editing mode
		pairs = pairs.concat(importPairs);
		closeImportMenu();
		document.getElementById("import-text").value = ""; // clears input
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
	document.getElementById("top-right-btn").classList.remove("hide");
	document.getElementById("import-form").classList.add("hide");
	document
		.getElementsByClassName("new-bunch-container")[0]
		.classList.remove("hide");
	importMenuOpen = false;
}

// #endregion

// #region Export
/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */

document.getElementById("export-btn").addEventListener("click", () => {
	document.getElementById("export-menu").classList.remove("hide");
	document
		.getElementsByClassName("new-bunch-container")[0]
		.classList.add("hide");
	document.getElementById("top-right-btn").classList.add("undisplay");

	exportMenuOpen = true;

	saveInternal();
	// TODO this is here because saving is not quick enough to update pairs
	// pairs should probabaly be updated based on the html more often anyway
	// this is an ok temporary fix
	pairs = JSON.parse(JSON.stringify(makePairs()));
	updateExport();
});

function updateExport() {
	const termSeparatorInput = document.getElementById("btwn-term-export");
	const pairSeparatorInput = document.getElementById("btwn-pair-export");

	let termSeparator =
		termSeparatorInput.value === "" ? "-" : termSeparatorInput.value;
	let pairSeparator =
		pairSeparatorInput.value === "" ? "\n" : pairSeparatorInput.value;

	termSeparator = termSeparator == "\\n" ? "\n" : termSeparator;
	pairSeparator = pairSeparator == "\\n" ? "\n" : pairSeparator; // translate from string \n to new line

	const textArea = document.getElementById("export-text");
	textArea.value = "";
	for (x = 0; x < pairs.length - 1; x++) {
		textArea.value += `${pairs[x].prompt}${termSeparator}${pairs[x].answer}${pairSeparator}`;
	}
	textArea.value += `${pairs[x].prompt}${termSeparator}${pairs[x].answer}`;
}

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

function closeExportMenu() {
	document.getElementById("export-menu").classList.add("hide");
	document
		.getElementsByClassName("new-bunch-container")[0]
		.classList.remove("hide");
	document.getElementById("top-right-btn").classList.remove("undisplay");

	exportMenuOpen = false;
}

document
	.getElementById("btwn-pair-export")
	.addEventListener("change", updateExport);
document
	.getElementById("btwn-term-export")
	.addEventListener("change", updateExport);

// #endregion

// #region Parsing and validation
/* -------------------------------------------------------------------------- */
/*                           parsing and validation                           */
/* -------------------------------------------------------------------------- */

function addPinYinText(e) {
	let val = e.target.value;
	if (val.trim() != "") {
		if (val.includes("(") && val.includes(")")) {
			const rmp = /\(.*?\)/g; // removes parenthesis and text btw them
			val = val.replace(rmp, "").trim();
		}
		// * @param str Chinese character to be converted
		// * @param splitter separated characters, separated by spaces by default
		// * @param withtone return Whether the result contains tones, the default
		// is
		// * @param polyphone Whether polyphone supports polyphones, the default is
		// no
		e.target.value =
			val + ` (${pinyinUtil.getPinyin(val, " ", true, false)})`;
	}
}

let titleTimeout;
function titleValid(t) {
	// re = /^[0-9a-z]/i; //must start with alpha numeric
	if (t === "") {
		// fails title is empty
		document.getElementById("title-valid-message").innerText =
			"Title cannot be empty";
		document.getElementById("title-valid-message").classList.remove("hide");
		window.scrollTo(0, 0);
		clearTimeout(titleTimeout);
		titleTimeout = setTimeout(() => {
			document
				.getElementById("title-valid-message")
				.classList.add("hide");
		}, 3000);
		return false;
	}
	re = /^(?![\.\s])/; // does not begin with . or whitespace
	let result = re.test(t);
	if (result) {
		// passes first test
		re = /^[^<>\/\\]+$/; // cannot contain <>/\
		result = re.test(t);
		if (result) {
			// passes second test
			return result;
		} // fails second test
		document.getElementById("title-valid-message").innerText =
			"Title cannot contain <>/\\";
		document.getElementById("title-valid-message").classList.remove("hide");
		window.scrollTo(0, 0);
		clearTimeout(titleTimeout);
		titleTimeout = setTimeout(() => {
			document
				.getElementById("title-valid-message")
				.classList.add("hide");
		}, 3000);
		return result;
	}
	// fails first test
	document.getElementById("title-valid-message").innerText =
		"Title cannot begin with . or space";
	document.getElementById("title-valid-message").classList.remove("hide");
	window.scrollTo(0, 0);
	clearTimeout(titleTimeout);
	titleTimeout = setTimeout(() => {
		document.getElementById("title-valid-message").classList.add("hide");
	}, 3000);
	return result;
}

let pairsLenTimeOut;
function pairsLenValid(len) {
	if (len != 0) {
		return true;
	} else {
		clearTimeout(pairsLenTimeOut);
		document.getElementById("title-valid-message").innerText =
			"Bunch must contain at least one pair";
		document.getElementById("title-valid-message").classList.remove("hide");
		window.scrollTo(0, 0);
		pairsLenTimeOut = setTimeout(() => {
			document
				.getElementById("title-valid-message")
				.classList.add("hide");
		}, 3000);
	}
}

// TODO fix this should not be editing pairs, rather i think html
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
// #endregion

// #region Saving
/* -------------------------------------------------------------------------- */
/*                                   Saving                                   */
/* -------------------------------------------------------------------------- */

// Bunches are saved either when submitting or when pressing the back button.
// aka at any exit of the page throughh buttons
document.getElementById("new-bunch-form").addEventListener("submit", (e) => {
	e.preventDefault();
	if (titleValid(document.getElementById("title-input").value)) {
		const bunch = makeBunch();
		if (pairsLenValid(bunch.pairs.length)) {
			// at least 1 pair
			if (editing) {
				// id = id
				ipcRenderer.send("bunch:save", bunch);
			} else {
				ipcRenderer.send("bunch:submit", bunch); // id = newly generated id
			}
			exitPage();
		}
	}
});

function backBtnExit() {
	const bunch = makeBunch();
	if (editing) {
		if (
			titleValid(document.getElementById("title-input").value) &&
			pairsLenValid(bunch.pairs.length) // at least 1 pair
		) {
			ipcRenderer.send("bunch:save", bunch); // id = id
			exitPage();
		}
	} else {
		ipcRenderer.send("newbunch:save", bunch); // id = ".new_bunch"
		exitPage();
	}
}

function exitPage() {
	if (accesedFrom == "flashcard") {
		window.location.href = `flashcard.html?id=${id}`;
	} else {
		window.location.href = `index.html`;
	}
}

function makeBunch() {
	// TODO this is only part of the data. defaults shoudl be used for the rest
	// (see main.js bunch:save)
	var bunch = {
		id: id,
		title: document.getElementById("title-input").value,
		lastUsed: new Date(),
		pairs: [],
		promptLang: document.getElementById("prompt-lang").value,
		answerLang: document.getElementById("answer-lang").value,
	};

	bunch.pairs = JSON.parse(JSON.stringify(makePairs()));

	return bunch;
}

function makePairs() {
	const htmlPairs = document
		.getElementById("pair-container")
		.getElementsByClassName("pair");

	let madePairs = [];

	var redacted = 0; // amount of invalid pairs
	for (x = 0; x < htmlPairs.length; x++) {
		let prompt = htmlPairs[x].getElementsByClassName("prompt")[0].value;
		let answer = htmlPairs[x].getElementsByClassName("answer")[0].value;
		let calls = htmlPairs[x].getAttribute("calls");
		let revCalls = htmlPairs[x].getAttribute("revCalls");
		let promptImage = htmlPairs[x].getAttribute("prompt-image");
		let answerImage = htmlPairs[x].getAttribute("answer-image");
		if (prompt !== "" && answer !== "") {
			madePairs[x - redacted] = {
				prompt: prompt.trim(),
				answer: answer.trim(),
				calls: parseInt(calls),
				revCalls: parseInt(revCalls),
				promptImage: promptImage || null,
				answerImage: answerImage || null,
			};
		} else {
			redacted += 1;
		}
	}

	return madePairs;
}

// saves when not leaving page e.g. going to import and export menus
function saveInternal() {
	const bunch = makeBunch();
	// saves pairs but not title. i think this works, but may need fixing
	ipcRenderer.send("bunch:save", bunch);
}

ipcRenderer.send("globalSettings:get", "timesCorrect");
ipcRenderer.on("globalSettings:gettimesCorrect", (e, val) => {
	timesCorrect = val;
});

function autoSave() {
	const bunch = makeBunch();
	if (id == ".new_bunch") {
		ipcRenderer.send("newbunch:save", bunch);
	} else {
		ipcRenderer.send("bunch:save", bunch);
	}
	setTimeout(autoSave, 60000); // save every minute
}
setTimeout(autoSave, 60000); // initial call
// #endregion

// #region Image Management
/* -------------------------------------------------------------------------- */
/*                               Image Management                             */
/* -------------------------------------------------------------------------- */

function addImageEventListeners() {
	const allPairs = document.getElementsByClassName("pair");
	for (let i = 0; i < allPairs.length; i++) {
		addImageEventListenersForPair(allPairs[i]);
	}
}

function addImageEventListenersForPair(pairElement) {
	const promptImageBtn = pairElement.querySelector(".prompt-image-btn");
	const answerImageBtn = pairElement.querySelector(".answer-image-btn");

	if (promptImageBtn) {
		promptImageBtn.addEventListener("click", () => {
			selectImage(pairElement, "prompt");
		});
	}

	if (answerImageBtn) {
		answerImageBtn.addEventListener("click", () => {
			selectImage(pairElement, "answer");
		});
	}
}

function selectImage(pairElement, side) {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";

	input.onchange = (e) => {
		const file = e.target.files[0];
		if (file) {
			saveImage(file, pairElement, side);
		}
	};

	input.click();
}

function saveImage(file, pairElement, side) {
	const reader = new FileReader();

	reader.onload = (e) => {
		const imageData = e.target.result;

		// Generate unique filename
		const timestamp = Date.now();
		const randomStr = Math.random().toString(36).substring(7);
		const ext = path.extname(file.name);
		const filename = `${timestamp}_${randomStr}${ext}`;

		// Save via IPC
		ipcRenderer.send("image:save", {
			filename: filename,
			data: imageData,
		});

		// Update pair element
		const attrName = side === "prompt" ? "prompt-image" : "answer-image";
		pairElement.setAttribute(attrName, filename);

		// Show preview
		const previewClass =
			side === "prompt" ? "prompt-image-preview" : "answer-image-preview";
		const preview = pairElement.querySelector(`.${previewClass}`);
		preview.style.backgroundImage = `url('${imageData}')`;
		preview.classList.remove("hide");

		// Show image-holder container
		const imageHolder = pairElement.querySelector(".image-holder");
		if (imageHolder) {
			imageHolder.classList.remove("undisplay");
		}

		// Add remove button to preview
		if (!preview.querySelector(".remove-image-btn")) {
			const removeBtn = document.createElement("button");
			removeBtn.classList.add("remove-image-btn");
			removeBtn.type = "button";
			removeBtn.innerHTML = "×";
			removeBtn.title = "Remove image";
			removeBtn.tabIndex = -1;
			removeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				removeImage(pairElement, side);
			});
			preview.appendChild(removeBtn);
		}
	};

	reader.readAsDataURL(file);
}

function removeImage(pairElement, side) {
	const attrName = side === "prompt" ? "prompt-image" : "answer-image";
	const filename = pairElement.getAttribute(attrName);

	if (filename) {
		// Delete image file via IPC
		ipcRenderer.send("image:delete", filename);

		// Clear attribute
		pairElement.setAttribute(attrName, "");

		// Hide preview
		const previewClass =
			side === "prompt" ? "prompt-image-preview" : "answer-image-preview";
		const preview = pairElement.querySelector(`.${previewClass}`);
		preview.style.backgroundImage = "";
		preview.classList.add("hide");

		// Remove the remove button
		const removeBtn = preview.querySelector(".remove-image-btn");
		if (removeBtn) {
			removeBtn.remove();
		}

		// Hide image-holder if both images are now empty
		const promptImage = pairElement.getAttribute("prompt-image");
		const answerImage = pairElement.getAttribute("answer-image");
		if (
			(!promptImage || promptImage === "") &&
			(!answerImage || answerImage === "")
		) {
			const imageHolder = pairElement.querySelector(".image-holder");
			if (imageHolder) {
				imageHolder.classList.add("undisplay");
			}
		}
	}
}

function loadExistingImages() {
	const allPairs = document.getElementsByClassName("pair");

	for (let i = 0; i < allPairs.length; i++) {
		const pairElement = allPairs[i];

		// Load prompt image
		const promptImage = pairElement.getAttribute("prompt-image");
		if (promptImage && promptImage !== "") {
			loadImagePreview(pairElement, "prompt", promptImage);
		}

		// Load answer image
		const answerImage = pairElement.getAttribute("answer-image");
		if (answerImage && answerImage !== "") {
			loadImagePreview(pairElement, "answer", answerImage);
		}
	}
}

function loadImagePreview(pairElement, side, filename) {
	ipcRenderer.send("image:get", filename);

	ipcRenderer.once(`image:get:${filename}`, (e, imageData) => {
		if (imageData) {
			const previewClass =
				side === "prompt"
					? "prompt-image-preview"
					: "answer-image-preview";
			const preview = pairElement.querySelector(`.${previewClass}`);
			preview.style.backgroundImage = `url('${imageData}')`;
			preview.classList.remove("hide");

			// Add remove button
			if (!preview.querySelector(".remove-image-btn")) {
				const removeBtn = document.createElement("button");
				removeBtn.classList.add("remove-image-btn");
				removeBtn.type = "button";
				removeBtn.innerHTML = "×";
				removeBtn.title = "Remove image";
				removeBtn.tabIndex = -1;
				removeBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					removeImage(pairElement, side);
				});
				preview.appendChild(removeBtn);
			}
		}
	});
}

// #endregion

// #region IPC
/* -------------------------------------------------------------------------- */
/*                                  IPC                                       */
/* -------------------------------------------------------------------------- */

// this needs to be down here otherwise calls are not generated correctly
// i think this is because the ipc request comes in and calls genpairs html,
// before eveything is ready?
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

	document.getElementById("prompt-lang").value = bunch.promptLang;
	document.getElementById("answer-lang").value = bunch.answerLang;

	generatePairsHTML();
});
// #endregion
