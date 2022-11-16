//fade out upon unload
window.addEventListener("beforeunload", function () {
    document.body.classList.remove("fade-in"); //remove original fade in class to prevent property clashing
    document.body.classList.add("fade-out");   //add new fade out class
});