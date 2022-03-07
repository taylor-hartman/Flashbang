const electron = require("electron");
const path = require("path");
const fs = require("fs");

class Settings {
    constructor(type) {
        const userDataPath = (electron.app || electron.remote.app).getPath(
            "userData"
        );

        var defaults;
        //settings only changable in settings.html
        this.path = path.join(userDataPath + "/settings.json");
        defaults = {
            theme: "light",
            strikeThrough: true,
            showInfo: true,
            showIwr: true,
            timesCorrect: 2,
            penalizeIncorrect: true,
            delayCorrect: 1,
            delayIncorrect: 0,
            sortHomeBy: "lastUsed",
        };

        this.data = parseDataFile(this.path, defaults);

        //create file if dne
        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, JSON.stringify(this.data));
        }
    }
    get(key) {
        return this.data[key];
    }

    getAll() {
        return this.data;
    }

    set(key, val) {
        this.data[key] = val;
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }

    setAll(val) {
        this.data = val;
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }
}

function parseDataFile(filePath, defaults) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (err) {
        return defaults;
    }
}

module.exports = Settings;
