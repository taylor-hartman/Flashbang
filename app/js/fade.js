// const animatePages = ipcRenderer.send("globalSettings:get", "animatePages");
// ipcRenderer.on("globalSettings:getanimatePages", (e, animatePages) => {
//     if (animatePages) {
//         document.querySelector("body").classList.add("fade-in");
//         //fade out upon unload
//         window.addEventListener("beforeunload", function () {
//             document.body.classList.remove("fade-in"); //remove original fade in class to prevent property clashing
//             document.body.classList.add("fade-out"); //add new fade out class
//         });
//     }
// });
