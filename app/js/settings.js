const palettes = document.getElementsByClassName("palette");
for (x = 0; x < palettes.length; x++) {
    palettes[x].addEventListener("click", changeTheme);
}

function changeTheme(e) {
    const theme = e.target.id;
    const link = `<link rel="stylesheet" href="css/${theme}.css" id="${theme}-stylesheet"/>`;
    document.getElementById("theme-stylesheets").innerHTML = link;
}
