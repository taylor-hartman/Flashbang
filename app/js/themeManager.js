ipcRenderer.send("globalSettings:get", "theme");
ipcRenderer.on("globalSettings:gettheme", (e, theme) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `css/${theme}.css`;
    link.id = "theme-style";
    try {
        //this is for settings.html to stop from having multiple style sheets
        document.getElementById("theme-style").remove();
    } catch {}
    document.head.append(link);
});
