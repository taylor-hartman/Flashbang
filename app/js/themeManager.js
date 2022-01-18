ipcRenderer.send("globalSettings:get", "theme");
ipcRenderer.on("globalSettings:gettheme", (e, theme) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `css/${theme}.css`;
    link.id = "theme-style";
    document.head.append(link);
});
