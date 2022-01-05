const ipcRenderer = require("electron").ipcRenderer;
var pageNumber = 0;
var bunches, bunchCount;

ipcRenderer.on("bunchdata:get", (e, bunchesData) => {
    //TODO redundant conversion before and after get
    bunches = JSON.parse(JSON.stringify(bunchesData));
    bunchCount = bunches.length;
    makeIndexPage();
});

document
    .getElementById("scroll-forward")
    .addEventListener("click", scrollForward);

document.getElementById("scroll-back").addEventListener("click", scrollBack);

function scrollForward() {
    if (pageNumber < bunchCount / 7 - 1) {
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

function makeIndexPage() {
    sortByDate(bunches);
    generateHTML(bunchCount - 7 * pageNumber < 7 ? bunchCount % 7 : 7);
    populateHexs(bunches.slice(pageNumber * 7, (pageNumber + 1) * 7));
    scrollButtonControl();
}

//pass by reference
function sortByDate(bunches) {
    bunches.sort(function (a, b) {
        var dateA = new Date(a.lastUsed),
            dateB = new Date(b.lastUsed);
        return dateA - dateB;
    });
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
                        <a href="newbunch.html" class="hex-center">
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
            rows[0].style = "margin-left: -20%;";
            break;
        case 5:
            main.innerHTML = `<div class="hex-row">${generateHexs(3)}</div>`;
            main.innerHTML += `<div class="hex-row">${generateHexs(2)}</div>`;
            break;
        case 6:
            main.innerHTML = `<div class="hex-row">${generateHexs(3)}</div>`;
            main.innerHTML += `<div class="hex-row">${generateHexs(3)}</div>`;
            var rows = main.getElementsByClassName("hex-row");
            rows[0].style = "margin-left: -20%;";
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
        </div>
    </div>`;
    var template = "";
    for (x = 0; x < num; x++) {
        template += hexTempate;
    }
    return template;
}

function populateHexs(bunches) {
    const rows = document.getElementsByClassName("hex-row");
    //TODO possibly do this with loops
    //TODO Add top to bottom vs left to right
    switch (bunches.length) {
        //LEFT RIGHT TRAVERSAL
        // case 0:
        //     return;
        // case 1:
        //     insertElement(0, 0, bunches[0]);
        //     break;
        // case 2:
        //     insertElement(0, 0, bunches[0]);
        //     insertElement(0, 1, bunches[1]);
        //     break;
        // case 3:
        //     insertElement(0, 0, bunches[0]);
        //     insertElement(1, 0, bunches[1]); //2nd goes on bottom row
        //     insertElement(0, 1, bunches[2]);
        //     break;
        // case 4:
        //     insertElement(0, 0, bunches[0]);
        //     insertElement(1, 0, bunches[1]); //2nd goes on bottom row
        //     insertElement(0, 1, bunches[2]);
        //     insertElement(1, 1, bunches[3]);
        //     break;
        // case 5:
        //     insertElement(0, 0, bunches[0]);
        //     insertElement(1, 0, bunches[1]);
        //     insertElement(0, 1, bunches[2]);
        //     insertElement(1, 1, bunches[3]);
        //     insertElement(0, 2, bunches[4]);
        //     break;
        // case 6:
        //     insertElement(0, 0, bunches[0]);
        //     insertElement(1, 0, bunches[1]);
        //     insertElement(0, 1, bunches[2]);
        //     insertElement(1, 1, bunches[3]);
        //     insertElement(0, 2, bunches[4]);
        //     insertElement(1, 2, bunches[5]);
        //     break;
        // case 7:
        //     insertElement(0, 0, bunches[0]);
        //     insertElement(1, 0, bunches[1]);
        //     insertElement(0, 1, bunches[2]);
        //     insertElement(1, 1, bunches[3]);
        //     insertElement(0, 2, bunches[4]);
        //     insertElement(1, 2, bunches[5]);
        //     insertElement(0, 3, bunches[6]);
        //     break;
        //TOP BOTTOM TRAVERSAL
        case 0:
            return;
        case 1:
            insertElement(0, 0, bunches[0]);
            break;
        case 2:
            insertElement(0, 0, bunches[0]);
            insertElement(0, 1, bunches[1]);
            break;
        case 3:
            insertElement(0, 0, bunches[0]);
            insertElement(0, 1, bunches[1]); //2nd goes on top row
            insertElement(1, 0, bunches[2]);
            break;
        case 4:
            insertElement(0, 0, bunches[0]);
            insertElement(0, 1, bunches[1]);
            insertElement(1, 0, bunches[2]);
            insertElement(1, 1, bunches[3]);
            break;
        case 5:
            insertElement(0, 0, bunches[0]);
            insertElement(0, 1, bunches[1]);
            insertElement(0, 2, bunches[2]);
            insertElement(1, 0, bunches[3]);
            insertElement(1, 1, bunches[4]);
            break;
        case 6:
            insertElement(0, 0, bunches[0]);
            insertElement(0, 1, bunches[1]);
            insertElement(0, 2, bunches[2]);
            insertElement(1, 0, bunches[3]);
            insertElement(1, 1, bunches[4]);
            insertElement(1, 2, bunches[5]);
            break;
        case 7:
            insertElement(0, 0, bunches[0]);
            insertElement(0, 1, bunches[1]);
            insertElement(0, 2, bunches[2]);
            insertElement(0, 3, bunches[3]);
            insertElement(1, 0, bunches[4]);
            insertElement(1, 1, bunches[5]);
            insertElement(1, 2, bunches[6]);
            break;
    }

    function insertElement(row, index, bunch) {
        //Row 0 for top, 1 for bottom
        //index from 0 to 3 for top, from 0 to 3 for bottom
        //inserts titles
        rows[row]
            .getElementsByClassName("hex-content")
            [index].querySelector("h3").innerText = bunch.title;
        //inserts num terms
        rows[row]
            .getElementsByClassName("hex-content")
            [index].querySelector("p").innerText = bunch.numTerms + " Terms";
        //inserts links with query selectors
        rows[row]
            .getElementsByClassName("hex-center")
            [index].setAttribute("href", `flashcard.html?title=${bunch.title}`);
    }
}

function scrollButtonControl() {
    if (pageNumber === 0) {
        document.getElementById("scroll-back").classList.add("hide");
    } else {
        document.getElementById("scroll-back").classList.remove("hide");
    }

    if (bunchCount - 7 * pageNumber <= 7) {
        document.getElementById("scroll-forward").classList.add("hide");
    } else {
        document.getElementById("scroll-forward").classList.remove("hide");
    }
}
