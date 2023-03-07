const ipcRenderer = require("electron").ipcRenderer;
var pageNumber = 0;
var bunches, matchingBunches; //bunches is all bunches; matchingBunches is bunches that match a search result

ipcRenderer.send("updateMenu", "standard");

window.onload = () => {
	ipcRenderer.send("bunchdata:get");
	setTimeout(() => {
		document.getElementById("search-input").classList.remove("preload");
	}, 250);
};

ipcRenderer.on("bunchdata:get", (e, bunchesData) => {
	bunches = JSON.parse(JSON.stringify(bunchesData));
	makeIndexPage();
});

ipcRenderer.on("folderbunchdata:get", (e, bunchesData) => {
	bunches = JSON.parse(JSON.stringify(bunchesData));

	makeIndexPage();

	var topLeftBtn = document.getElementById("new-bunch-btn");
	// remove event listeners
	const newTopLeftButton = topLeftBtn.cloneNode(true);
	topLeftBtn.parentNode.replaceChild(newTopLeftButton, topLeftBtn);
	//redefine post clone
	topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.removeAttribute("href");
	topLeftBtn.addEventListener("click", (e) => {
		ipcRenderer.send("folderdata-usemenu:get");
	});
	topLeftBtn.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M14.414 5.586c-.78-.781-2.048-.781-2.828 0l-6.415 6.414 6.415 6.414c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-3.585-3.586 3.585-3.586c.781-.781.781-2.047 0-2.828z"/></svg>`;

	document.getElementById("folder-btn").classList.add("undisplay");
});

ipcRenderer.on("folderdata-addmenu:get", (e, folderData) => {
	const folders = JSON.parse(JSON.stringify(folderData));
	generateFolderMenu(folders);
	addFoldersMenuEventListeners();
});

ipcRenderer.on("folderdata-usemenu:get", (e, folderData) => {
	const folders = JSON.parse(JSON.stringify(folderData));
	generateFolderMenu(folders);
	useFoldersMenuEventListeners();
});

ipcRenderer.on("index:showUpdateAlert", () => {
	document.getElementById("update-alert").classList.remove("undisplay");
});

//#region Edit/Delete
/* -------------------------------------------------------------------------- */
/*                                   Edit/Delete                              */
/* -------------------------------------------------------------------------- */

var editShown = false;
document.getElementById("edit-bunch-btn").addEventListener("click", () => {
	editShown = !editShown;
	updateEditIcons();
});

function deleteBunch(e) {
	const fileTitle = e.target.getAttribute("bunch-title");
	document
		.getElementById("yes-delete")
		.setAttribute("bunch-id", e.target.getAttribute("bunch-id"));
	const deleteMenuText = document
		.getElementById("delete-menu")
		.querySelector("h3");
	deleteMenuText.innerText = `Do you really want to delete "${fileTitle}"?`;

	document.getElementById("delete-menu").classList.remove("hide");
	document.getElementById("study-together-btn").classList.add("undisplay");
	document.getElementById("add-to-folder-btn").classList.add("undisplay");
	const checks = document.getElementsByClassName("mega-bunch-checkbox");
	for (x = 0; x < checks.length; x++) {
		checks[x].checked = false;
	}
}

document.getElementById("yes-delete").addEventListener("click", () => {
	bunchID = document.getElementById("yes-delete").getAttribute("bunch-id");
	ipcRenderer.send("bunch:delete", bunchID);
	ipcRenderer.send("bunchdata:get");
	document.getElementById("delete-menu").classList.add("hide");
});

document.getElementById("no-delete").addEventListener("click", () => {
	document.getElementById("delete-menu").classList.add("hide");
});
//#endregion

//#region Search
/* -------------------------------------------------------------------------- */
/*                                   Search                                   */
/* -------------------------------------------------------------------------- */
var searchInputShown = false;
document.getElementById("search-bunch-btn").addEventListener("click", () => {
	searchInputShown = !searchInputShown;
	if (searchInputShown) {
		//show it
		document.getElementById("search-input").classList.remove("hide");
		setTimeout(() => {
			document.getElementById("search-input").focus();
		}, 250);
	} else {
		//hide it
		document.getElementById("search-input").classList.add("hide");
	}
});

document.getElementById("search-input").addEventListener("input", () => {
	unselectBunches();
	const value = document.getElementById("search-input").value;
	matchingBunches = [];
	for (x = 0; x < bunches.length; x++) {
		if (bunches[x].title.toLowerCase().includes(value.toLowerCase())) {
			matchingBunches.push(bunches[x]); //TODO change to reference (shallow copy)
		}
	}
	if (matchingBunches.length === 0) {
		const main = document.querySelector(".main-container");
		main.innerHTML = `<h2 id="no-matches">No Matches Found</h2>`;
	} else {
		makeIndexPage();
	}
});
//#endregion

//#region Sort
/* -------------------------------------------------------------------------- */
/*                             Sort / Appearance                              */
/* -------------------------------------------------------------------------- */
//pass by reference
function sortByDate(input) {
	input.sort(function (a, b) {
		var dateA = new Date(a.lastUsed),
			dateB = new Date(b.lastUsed);
		return dateB - dateA;
	});
}

function sortByName(input) {
	input.sort(function (a, b) {
		var title1 = a.title,
			title2 = b.title;
		return title1.localeCompare(title2, undefined, { numeric: true });
	});
}

let sortHomeBy;
ipcRenderer.send("globalSettings:get", "sortHomeBy");
ipcRenderer.on("globalSettings:getsortHomeBy", (e, val) => {
	//Study
	sortHomeBy = val;
});

let homeStyle;
ipcRenderer.send("globalSettings:get", "homeStyle");
ipcRenderer.on("globalSettings:gethomeStyle", (e, val) => {
	homeStyle = val;
});
//#endregion

//#region HTML/CSS Generation
/* -------------------------------------------------------------------------- */
/*                           HTML/CSS Generation                              */
/* -------------------------------------------------------------------------- */
function makeIndexPage() {
	if (document.getElementById("search-input").value === "") {
		bunchesCurrent = bunches;
	} else {
		bunchesCurrent = matchingBunches;
	}

	if (sortHomeBy === "lastUsed") {
		sortByDate(bunchesCurrent);
	} else {
		sortByName(bunchesCurrent);
	}

	if (homeStyle == "hexagon") {
		generateHTML(
			bunchesCurrent.length - 7 * pageNumber < 7 ? bunchesCurrent.length % 7 : 7
		);
		populateHexs(bunchesCurrent.slice(pageNumber * 7, (pageNumber + 1) * 7));
		scrollButtonControl();
	} else {
		//if (homeStyle == "list") {
		//made else incase settings file coruption
		generateList(bunchesCurrent);
	}

	const topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.innerHTML = `<svg
	width="24px"
	height="24px"
	viewBox="0 0 24 24"
	version="1.2"
	baseProfile="tiny"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M18 10h-4v-4c0-1.104-.896-2-2-2s-2 .896-2 2l.071 4h-4.071c-1.104 0-2 .896-2 2s.896 2 2 2l4.071-.071-.071 4.071c0 1.104.896 2 2 2s2-.896 2-2v-4.071l4 .071c1.104 0 2-.896 2-2s-.896-2-2-2z"
	/>
</svg>`;

	topLeftBtn.setAttribute("href", "newbunch.html?id=.new_bunch");
	// remove event listeners
	const newTopLeftButton = topLeftBtn.cloneNode(true);
	topLeftBtn.parentNode.replaceChild(newTopLeftButton, topLeftBtn);
	//remove all click events from bottom left btn
	var homeToggleBtn = document.getElementById("folder-btn");
	const newButton = homeToggleBtn.cloneNode(true);
	homeToggleBtn.parentNode.replaceChild(newButton, homeToggleBtn);
	//add new event listener
	homeToggleBtn = document.getElementById("folder-btn");
	homeToggleBtn.addEventListener("click", () => {
		ipcRenderer.send("folderdata-usemenu:get");
	});
	//set icon
	homeToggleBtn.innerHTML = `<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		version="1.2"
		baseProfile="tiny"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M18 6h-6c0-1.104-.896-2-2-2h-4c-1.654 0-3 1.346-3 3v10c0 1.654 1.346 3 3 3h12c1.654 0 3-1.346 3-3v-8c0-1.654-1.346-3-3-3zm-12 0h4c0 1.104.896 2 2 2h6c.552 0 1 .448 1 1h-14v-2c0-.552.448-1 1-1zm12 12h-12c-.552 0-1-.448-1-1v-7h14v7c0 .552-.448 1-1 1z"
		/>
	</svg>`;

	document.getElementById("edit-bunch-btn").classList.remove("undisplay");
	document.getElementById("search-bunch-btn").classList.remove("undisplay");
	document.getElementById("settings-btn").classList.remove("undisplay");
	document.getElementById("folder-btn").classList.remove("undisplay");

	styleHomepage();
}

function generateHTML(num) {
	const main = document.querySelector(".main-container");
	switch (num) {
		case 0:
			//Styling is done here not in css file for case 0
			main.innerHTML = `
            <div class="hex-row">
                <div class="hex-container">
                    <div class="hex">
                        <a href="newbunch.html?id=.new_bunch" class="hex-center">
                            <div class="hex-content no-bunches-hex-content">
                                <h3>Create New Bunch</h3>
                                <svg
                                    width="24px"
                                    height="24px"
                                    viewBox="0 0 24 24"
                                    version="1.2"
                                    baseProfile="tiny"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M18 10h-4v-4c0-1.104-.896-2-2-2s-2 .896-2 2l.071 4h-4.071c-1.104 0-2 .896-2 2s.896 2 2 2l4.071-.071-.071 4.071c0 1.104.896 2 2 2s2-.896 2-2v-4.071l4 .071c1.104 0 2-.896 2-2s-.896-2-2-2z"
                                    />
                                </svg>
                            </div>
                        </a>
                    </div>
                </div>
            <div class="hex-row">`;
			break;
		case 1:
			main.innerHTML = `<div class="hex-row">${generateHexs(1)}</div>`;
			break;
		case 2:
			main.innerHTML = `<div class="hex-row">${generateHexs(2)}</div>`;
			break;
		case 3:
			main.innerHTML = `<div class="hex-row">${generateHexs(2)}</div>`;
			main.innerHTML += `<div class="hex-row">${generateHexs(1)}</div>`;
			break;
		case 4:
			main.innerHTML = `<div class="hex-row">${generateHexs(2)}</div>`;
			main.innerHTML += `<div class="hex-row">${generateHexs(2)}</div>`;
			var rows = main.getElementsByClassName("hex-row");
			rows[0].style = "margin-left: -125px;";
			break;
		case 5:
			main.innerHTML = `<div class="hex-row">${generateHexs(3)}</div>`;
			main.innerHTML += `<div class="hex-row">${generateHexs(2)}</div>`;
			break;
		case 6:
			main.innerHTML = `<div class="hex-row">${generateHexs(3)}</div>`;
			main.innerHTML += `<div class="hex-row">${generateHexs(3)}</div>`;
			var rows = main.getElementsByClassName("hex-row");
			rows[0].style = "margin-left: -125px;";
			break;
		default:
			main.innerHTML = `<div class="hex-row">${generateHexs(4)}</div>`;
			main.innerHTML += `<div class="hex-row">${generateHexs(3)}</div>`;
			break;
	}
}

function generateHexs(num) {
	const hexTempate = `
    <div class="hex-container">
        <div class="hex">
            <a href="" class="hex-center">
                <div class="hex-content">
                    <h3>Bunch</h3>
                    <p>00 Terms</p>
                </div>
            </a>
            <div class="edit-icons-container hide">
                <a class="btn delete-btn">
                    <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M18 7h-1v-1c0-1.104-.896-2-2-2h-7c-1.104 0-2 .896-2 2v1h-1c-.552 0-1 .448-1 1s.448 1 1 1v8c0 2.206 1.794 4 4 4h5c2.206 0 4-1.794 4-4v-8c.552 0 1-.448 1-1s-.448-1-1-1zm-10-1h7v1h-7v-1zm8 11c0 1.104-.896 2-2 2h-5c-1.104 0-2-.896-2-2v-8h9v8zM8.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5zM10.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5zM12.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5zM14.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5z"/></svg>
                </a>
                <label class="mega-bunch-checkbox-container hex-check-box-container">
                        <input type="checkbox" class="mega-bunch-checkbox"/>
                        <span class="checkmark"></span>
                </label>
                <a class="btn edit-btn">
                    <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M21.561 5.318l-2.879-2.879c-.293-.293-.677-.439-1.061-.439-.385 0-.768.146-1.061.439l-3.56 3.561h-9c-.552 0-1 .447-1 1v13c0 .553.448 1 1 1h13c.552 0 1-.447 1-1v-9l3.561-3.561c.293-.293.439-.677.439-1.061s-.146-.767-.439-1.06zm-10.061 9.354l-2.172-2.172 6.293-6.293 2.172 2.172-6.293 6.293zm-2.561-1.339l1.756 1.728-1.695-.061-.061-1.667zm7.061 5.667h-11v-11h6l-3.18 3.18c-.293.293-.478.812-.629 1.289-.16.5-.191 1.056-.191 1.47v3.061h3.061c.414 0 1.108-.1 1.571-.29.464-.19.896-.347 1.188-.64l3.18-3.07v6zm2.5-11.328l-2.172-2.172 1.293-1.293 2.171 2.172-1.292 1.293z"/></svg>
                </a>
            </div>
        </div>
    </div>`;
	var template = "";
	for (x = 0; x < num; x++) {
		template += hexTempate;
	}
	return template;
}

function populateHexs(input) {
	//TODO possibly do this with loops
	//TODO Add top to bottom vs left to right
	switch (input.length) {
		//LEFT RIGHT TRAVERSAL
		// case 0:
		//     return;
		// case 1:
		//     insertElement(0, 0, input[0]);
		//     break;
		// case 2:
		//     insertElement(0, 0, input[0]);
		//     insertElement(0, 1, input[1]);
		//     break;
		// case 3:
		//     insertElement(0, 0, input[0]);
		//     insertElement(1, 0, input[1]); //2nd goes on bottom row
		//     insertElement(0, 1, input[2]);
		//     break;
		// case 4:
		//     insertElement(0, 0, input[0]);
		//     insertElement(1, 0, input[1]); //2nd goes on bottom row
		//     insertElement(0, 1, input[2]);
		//     insertElement(1, 1, input[3]);
		//     break;
		// case 5:
		//     insertElement(0, 0, input[0]);
		//     insertElement(1, 0, input[1]);
		//     insertElement(0, 1, input[2]);
		//     insertElement(1, 1, input[3]);
		//     insertElement(0, 2, input[4]);
		//     break;
		// case 6:
		//     insertElement(0, 0, input[0]);
		//     insertElement(1, 0, input[1]);
		//     insertElement(0, 1, input[2]);
		//     insertElement(1, 1, input[3]);
		//     insertElement(0, 2, input[4]);
		//     insertElement(1, 2, input[5]);
		//     break;
		// case 7:
		//     insertElement(0, 0, input[0]);
		//     insertElement(1, 0, input[1]);
		//     insertElement(0, 1, input[2]);
		//     insertElement(1, 1, input[3]);
		//     insertElement(0, 2, input[4]);
		//     insertElement(1, 2, input[5]);
		//     insertElement(0, 3, input[6]);
		//     break;
		//TOP BOTTOM TRAVERSAL
		case 0:
			return;
		case 1:
			insertElement(0, 0, input[0]);
			break;
		case 2:
			insertElement(0, 0, input[0]);
			insertElement(0, 1, input[1]);
			break;
		case 3:
			insertElement(0, 0, input[0]);
			insertElement(0, 1, input[1]); //2nd goes on top row
			insertElement(1, 0, input[2]);
			break;
		case 4:
			insertElement(0, 0, input[0]);
			insertElement(0, 1, input[1]);
			insertElement(1, 0, input[2]);
			insertElement(1, 1, input[3]);
			break;
		case 5:
			insertElement(0, 0, input[0]);
			insertElement(0, 1, input[1]);
			insertElement(0, 2, input[2]);
			insertElement(1, 0, input[3]);
			insertElement(1, 1, input[4]);
			break;
		case 6:
			insertElement(0, 0, input[0]);
			insertElement(0, 1, input[1]);
			insertElement(0, 2, input[2]);
			insertElement(1, 0, input[3]);
			insertElement(1, 1, input[4]);
			insertElement(1, 2, input[5]);
			break;
		case 7:
			insertElement(0, 0, input[0]);
			insertElement(0, 1, input[1]);
			insertElement(0, 2, input[2]);
			insertElement(0, 3, input[3]);
			insertElement(1, 0, input[4]);
			insertElement(1, 1, input[5]);
			insertElement(1, 2, input[6]);
			break;
	}
}

function insertElement(row, index, bunch) {
	const rows = document.getElementsByClassName("hex-row");
	//Row 0 for top, 1 for bottom
	//index from 0 to 3 for top, from 0 to 2 for bottom
	//inserts titles
	rows[row]
		.getElementsByClassName("hex-content")
		[index].querySelector("h3").innerText = bunch.title;
	//inserts num terms
	rows[row]
		.getElementsByClassName("hex-content")
		[index].querySelector("p").innerText = bunch.numTerms + " Terms";
	//inserts links with query strings
	rows[row]
		.getElementsByClassName("hex-center")
		[index].setAttribute("href", `flashcard.html?id=${bunch.id}`);
	//add edit query strings
	rows[row]
		.getElementsByClassName("edit-icons-container")
		[index].querySelector(".edit-btn")
		.setAttribute("href", `newbunch.html?id=${bunch.id}`);
	rows[row]
		.getElementsByClassName("edit-icons-container")
		[index].querySelector(".mega-bunch-checkbox")
		.setAttribute("bunch-id", `${bunch.id}`);
	//add delete strings
	rows[row]
		.getElementsByClassName("edit-icons-container")
		[index].querySelector(".delete-btn")
		.setAttribute("bunch-title", `${bunch.title}`);
	rows[row]
		.getElementsByClassName("edit-icons-container")
		[index].querySelector(".delete-btn")
		.setAttribute("bunch-id", `${bunch.id}`);
}

function generateList(bunchList) {
	const main = document.querySelector(".main-container");
	if (bunches.length == 0) {
		main.innerHTML = `<a class="list-create-new-bunch" href="newbunch.html?id=.new_bunch"> 
                            <h3>Create New Bunch</h3>
                            <svg
                                width="24px"
                                height="24px"
                                viewBox="0 0 24 24"
                                version="1.2"
                                baseProfile="tiny"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M18 10h-4v-4c0-1.104-.896-2-2-2s-2 .896-2 2l.071 4h-4.071c-1.104 0-2 .896-2 2s.896 2 2 2l4.071-.071-.071 4.071c0 1.104.896 2 2 2s2-.896 2-2v-4.071l4 .071c1.104 0 2-.896 2-2s-.896-2-2-2z"
                                />
                            </svg>
                            </a>`;
	} else {
		let listContent = "";
		bunchList.forEach((bunch) => {
			listContent += `
            <li class="li-bunch" bunch-id="${bunch.id}"> 
                <a class="standard-li-display" href="flashcard.html?id=${bunch.id}">
                    <div class="li-content">
                        <h3>${bunch.title}</h3> 
                        <div>${bunch.numTerms} Terms</div>  
                    </div>
                </a>
                <div class="li-edit-icons-container">
                    <label class="mega-bunch-checkbox-container li-check-box-container">
                        <input type="checkbox" class="mega-bunch-checkbox" bunch-id="${bunch.id}"/>
                        <span class="checkmark"></span>
                    </label>
                    <a class="btn edit-btn" href="newbunch.html?id=${bunch.id}">
                        <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M21.561 5.318l-2.879-2.879c-.293-.293-.677-.439-1.061-.439-.385 0-.768.146-1.061.439l-3.56 3.561h-9c-.552 0-1 .447-1 1v13c0 .553.448 1 1 1h13c.552 0 1-.447 1-1v-9l3.561-3.561c.293-.293.439-.677.439-1.061s-.146-.767-.439-1.06zm-10.061 9.354l-2.172-2.172 6.293-6.293 2.172 2.172-6.293 6.293zm-2.561-1.339l1.756 1.728-1.695-.061-.061-1.667zm7.061 5.667h-11v-11h6l-3.18 3.18c-.293.293-.478.812-.629 1.289-.16.5-.191 1.056-.191 1.47v3.061h3.061c.414 0 1.108-.1 1.571-.29.464-.19.896-.347 1.188-.64l3.18-3.07v6zm2.5-11.328l-2.172-2.172 1.293-1.293 2.171 2.172-1.292 1.293z"/></svg>
                    </a>
                    <a class="btn delete-btn" bunch-title="${bunch.title}">
                        <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M18 7h-1v-1c0-1.104-.896-2-2-2h-7c-1.104 0-2 .896-2 2v1h-1c-.552 0-1 .448-1 1s.448 1 1 1v8c0 2.206 1.794 4 4 4h5c2.206 0 4-1.794 4-4v-8c.552 0 1-.448 1-1s-.448-1-1-1zm-10-1h7v1h-7v-1zm8 11c0 1.104-.896 2-2 2h-5c-1.104 0-2-.896-2-2v-8h9v8zM8.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5zM10.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5zM12.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5zM14.5 10.5c-.275 0-.5.225-.5.5v6c0 .275.225.5.5.5s.5-.225.5-.5v-6c0-.275-.225-.5-.5-.5z"/></svg>
                    </a>
                </div>
                <div class="li-delete-menu undisplay">
                    <h3>Are you sure you want to delete this bunch?</h3>
                    <div class="li-delete-btns-container">
                        <button class="li-yes-delete">Yes</button>
                        <button class="li-no-delete">No</button>
                    </div>
                </div>
            </li>`;
		});

		main.innerHTML = `<ul class="main-list">${listContent}</ul>`;

		const deleteBtns = document.getElementsByClassName("delete-btn");
		for (x = 0; x < deleteBtns.length; x++) {
			deleteBtns[x].addEventListener("click", deleteBunchList);
		}

		const checks = document.getElementsByClassName("mega-bunch-checkbox");
		for (x = 0; x < checks.length; x++) {
			checks[x].addEventListener("change", megaBunchProcess);
		}
	}
}

function generateFolderMenu(folders) {
	currentBunchIDs = [];
	checks = document.getElementsByClassName("mega-bunch-checkbox");
	for (x = 0; x < checks.length; x++) {
		if (checks[x].checked) {
			currentBunchIDs.push(parseInt(checks[x].getAttribute("bunch-id")));
		}
	}
	unselectBunches();
	content = "";
	for (const folder of folders) {
		//format taken from list homepage
		content += `<li class="folder-menu-li">
	        <div class="folder-display" folder-name="${folder.title}">
	            <div class="li-content">
	                <h3>${folder.title}</h3>
	                <div>${folder.numbunches} Bunches</div>
	            </div>
	        </div>
	    </li>`;
	}
	const main = document.querySelector(".main-container");
	main.innerHTML = `<div id="folder-menu">${content}<div>`;
}

function addFoldersMenuEventListeners() {
	const folderLIs = document
		.getElementById("folder-menu")
		.getElementsByClassName("folder-display");
	for (x = 0; x < folderLIs.length; x++) {
		folderLIs[x].addEventListener("click", (e) => {
			//Add to folder functionality
			const folderName = e.currentTarget.getAttribute("folder-name");
			const data = { folderName, currentBunchIDs };
			ipcRenderer.send("folder:addto", data);
		});
	}

	document.getElementById("edit-bunch-btn").classList.add("undisplay");
	document.getElementById("folder-btn").classList.add("undisplay");
	document.getElementById("search-input").classList.add("hide");
	document.getElementById("search-input").value = "";
	document.getElementById("search-bunch-btn").classList.add("undisplay");
	document.getElementById("settings-btn").classList.add("undisplay");

	var topLeftBtn = document.getElementById("new-bunch-btn");
	// remove event listeners
	const newTopLeftButton = topLeftBtn.cloneNode(true);
	topLeftBtn.parentNode.replaceChild(newTopLeftButton, topLeftBtn);
	//redefine post clone
	topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.removeAttribute("href");
	topLeftBtn.addEventListener("click", (e) => {
		ipcRenderer.send("bunchdata:get");
	});
	topLeftBtn.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M14.414 5.586c-.78-.781-2.048-.781-2.828 0l-6.415 6.414 6.415 6.414c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-3.585-3.586 3.585-3.586c.781-.781.781-2.047 0-2.828z"/></svg>`;
}

function useFoldersMenuEventListeners() {
	const folderLIs = document
		.getElementById("folder-menu")
		.getElementsByClassName("folder-display");
	for (x = 0; x < folderLIs.length; x++) {
		folderLIs[x].addEventListener("click", (e) => {
			//Add to folder functionality
			const folderName = e.currentTarget.getAttribute("folder-name");
			ipcRenderer.send("folder:open", folderName);
		});
	}

	var topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M18 6h-6c0-1.104-.896-2-2-2h-4c-1.654 0-3 1.346-3 3v10c0 1.654 1.346 3 3 3h12c1.654 0 3-1.346 3-3v-8c0-1.654-1.346-3-3-3zm0 12h-12c-.552 0-1-.448-1-1v-7h4c.275 0 .5-.225.5-.5s-.225-.5-.5-.5h-4v-2c0-.552.448-1 1-1h4c0 1.104.896 2 2 2h6c.552 0 1 .448 1 1h-4c-.275 0-.5.225-.5.5s.225.5.5.5h4v7c0 .552-.448 1-1 1zM15 12h-2v-2c0-.553-.447-1-1-1s-1 .447-1 1v2h-2c-.553 0-1 .447-1 1s.447 1 1 1h2v2c0 .553.447 1 1 1s1-.447 1-1v-2h2c.553 0 1-.447 1-1s-.447-1-1-1z"/></svg>`;
	topLeftBtn.removeAttribute("href");

	const newTopLeftButton = topLeftBtn.cloneNode(true);
	topLeftBtn.parentNode.replaceChild(newTopLeftButton, topLeftBtn);
	var topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.addEventListener("click", addNewFolder);

	//remove all click events from bottom left btn
	var homeToggleBtn = document.getElementById("folder-btn");
	const newButton = homeToggleBtn.cloneNode(true);
	homeToggleBtn.parentNode.replaceChild(newButton, homeToggleBtn);
	//add new event listener
	homeToggleBtn = document.getElementById("folder-btn");
	homeToggleBtn.addEventListener("click", () => {
		ipcRenderer.send("bunchdata:get");
	});
	homeToggleBtn.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M19.707 7.293l-4-4c-.187-.188-.441-.293-.707-.293h-8c-1.654 0-3 1.346-3 3v12c0 1.654 1.346 3 3 3h10c1.654 0 3-1.346 3-3v-10c0-.266-.105-.52-.293-.707zm-2.121.707h-1.086c-.827 0-1.5-.673-1.5-1.5v-1.086l2.586 2.586zm-.586 11h-10c-.552 0-1-.448-1-1v-12c0-.552.448-1 1-1h7v1.5c0 1.379 1.121 2.5 2.5 2.5h1.5v9c0 .552-.448 1-1 1z"/></svg>`;

	document.getElementById("search-input").classList.add("hide");
	document.getElementById("search-input").value = "";
	document.getElementById("search-bunch-btn").classList.add("undisplay");
	document.getElementById("folder-btn").classList.remove("undisplay");
}

document.getElementById("add-to-folder-btn").addEventListener("click", () => {
	ipcRenderer.send("folderdata-addmenu:get");
});

function addNewFolder() {
	const main = document.querySelector(".main-container");
	main.innerHTML = `
		<form id="new-folder-menu" >
			<p id="new-folder-error"></p>
			<input type="text" id="new-folder-input" placeholder="new folder name">
			<button type="submit" id="new-folder-submit">Submit</button>
		</form>`;

	var topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.innerHTML = `<svg width="24px" height="24px" viewBox="0 0 24 24" fill="#000000" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M14.414 5.586c-.78-.781-2.048-.781-2.828 0l-6.415 6.414 6.415 6.414c.39.391.902.586 1.414.586s1.024-.195 1.414-.586c.781-.781.781-2.047 0-2.828l-3.585-3.586 3.585-3.586c.781-.781.781-2.047 0-2.828z"/></svg>`;
	// remove old event listeners
	const newTopLeftButton = topLeftBtn.cloneNode(true);
	topLeftBtn.parentNode.replaceChild(newTopLeftButton, topLeftBtn);
	//set new btn
	topLeftBtn = document.getElementById("new-bunch-btn");
	topLeftBtn.addEventListener("click", () => {
		ipcRenderer.send("folderdata-usemenu:get");
	});

	document.getElementById("new-folder-menu").addEventListener("submit", (e) => {
		e.preventDefault();
		const name = document.getElementById("new-folder-input").value;
		if (
			name.includes(".") ||
			name.includes("/") ||
			name.includes("\\") ||
			name.includes("~") ||
			name.includes(":")
		) {
			document.getElementById("new-folder-error").innerText =
				"Folder name cannot contain .\\/~:";
		}
		ipcRenderer.send("folder:add", name);
	});
}

ipcRenderer.on("folder:addErr", (e, error) => {
	document.getElementById("new-folder-error").innerText = error;
});

function deleteBunchList(e) {
	const parentLI = e.target.closest(".li-bunch");
	parentLI.querySelector(".li-delete-menu").classList.remove("undisplay");
	parentLI
		.querySelector(".li-yes-delete")
		.addEventListener("click", yesDeleteList);
	parentLI
		.querySelector(".li-no-delete")
		.addEventListener("click", noDeleteList);

	unselectBunches();
}

function unselectBunches() {
	document.getElementById("study-together-btn").classList.add("undisplay");
	document.getElementById("add-to-folder-btn").classList.add("undisplay");
	const checks = document.getElementsByClassName("mega-bunch-checkbox");
	for (x = 0; x < checks.length; x++) {
		checks[x].checked = false;
	}
}

function yesDeleteList(e) {
	const bunchID = e.target.closest(".li-bunch").getAttribute("bunch-id");
	ipcRenderer.send("bunch:delete", bunchID);
	ipcRenderer.send("bunchdata:get"); //TODO page should not be "reloaded" for 1 bunch delete
	//dont have to deal with display/undisplay bc page is reloaded
}

function noDeleteList(e) {
	const parentLI = e.target.closest(".li-bunch");
	parentLI.querySelector(".li-delete-menu").classList.add("undisplay");
	parentLI
		.querySelector(".li-no-delete")
		.removeEventListener("click", noDeleteList);
	parentLI
		.querySelector(".li-yes-delete")
		.addEventListener("click", yesDeleteList);
}

function styleHomepage() {
	if (homeStyle == "hexagon") {
		document.getElementById("edit-bunch-btn").classList.remove("hide");
	} else {
		//if (homeStyle == "list") { //made else just in case settings file corruption
		document.getElementById("edit-bunch-btn").classList.add("hide");
	}
}

//#endregion

//#region Mega Bunch
/* -------------------------------------------------------------------------- */
/*                               Mega Bunch                                   */
/* -------------------------------------------------------------------------- */
var currentBunchIDs = [];
function megaBunchProcess() {
	const checks = document.getElementsByClassName("mega-bunch-checkbox");
	var numChecks = 0;
	for (x = 0; x < checks.length; x++) {
		if (checks[x].checked) {
			numChecks += 1;
		}
	}

	if (numChecks > 1) {
		document.getElementById("study-together-btn").classList.remove("undisplay");
		document.getElementById("add-to-folder-btn").classList.remove("undisplay");
		document.getElementById("delete-menu").classList.add("hide");
	} else if (numChecks > 0) {
		document.getElementById("study-together-btn").classList.add("undisplay");
		document.getElementById("add-to-folder-btn").classList.remove("undisplay");
		document.getElementById("delete-menu").classList.add("hide");
	} else {
		document.getElementById("study-together-btn").classList.add("undisplay");
		document.getElementById("add-to-folder-btn").classList.add("undisplay");
	}
}

//#endregion

//#region Button Management
/* -------------------------------------------------------------------------- */
/*                              Button Management                             */
/* -------------------------------------------------------------------------- */
function updateEditIcons() {
	const iconContainers = document.getElementsByClassName(
		"edit-icons-container"
	);
	if (editShown) {
		//if not shown then show
		//delete button functionality is only added to btns when the edit btns are shown
		for (x = 0; x < iconContainers.length; x++) {
			iconContainers[x].classList.remove("hide");
			iconContainers[x]
				.getElementsByClassName("delete-btn")[0]
				.addEventListener("click", deleteBunch);

			iconContainers[x]
				.getElementsByClassName("mega-bunch-checkbox")[0]
				.addEventListener("change", megaBunchProcess);
		}
	} else {
		for (x = 0; x < iconContainers.length; x++) {
			iconContainers[x].classList.add("hide");
		}
	}
}

/* ----------------------------- Scroll Buttons ----------------------------- */
document
	.getElementById("scroll-forward")
	.addEventListener("click", scrollForward);

document.getElementById("scroll-back").addEventListener("click", scrollBack);

function scrollButtonControl() {
	if (pageNumber === 0) {
		document.getElementById("scroll-back").classList.add("hide");
	} else {
		document.getElementById("scroll-back").classList.remove("hide");
	}

	if (bunchesCurrent.length - 7 * pageNumber <= 7) {
		document.getElementById("scroll-forward").classList.add("hide");
	} else {
		document.getElementById("scroll-forward").classList.remove("hide");
	}
}

function scrollForward() {
	if (pageNumber < bunchesCurrent.length / 7 - 1) {
		pageNumber += 1;
		makeIndexPage();
	}
}

function scrollBack() {
	if (pageNumber > 0) {
		pageNumber -= 1;
		makeIndexPage();
	}
}

document.getElementById("update-notif-close").addEventListener("click", () => {
	document.getElementById("update-alert").classList.add("undisplay");
});

document.getElementById("update-notif-update").addEventListener("click", () => {
	require("electron").shell.openExternal("http://www.flashbang.lol");
	document.getElementById("update-alert").classList.add("undisplay");
});

//#endregion
