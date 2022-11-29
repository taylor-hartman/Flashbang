const electron = require("electron");
const path = require("path");
const fs = require("fs");

class Settings {
    constructor() {
        const userDataPath = (electron.app || electron.remote.app).getPath(
            "userData"
        );

        var defaults;
        //settings only changable in settings.html
        this.path = path.join(userDataPath + "/settings.json");

        this.defaults = {
            theme: "light",
            strikeThrough: true,
            showInfo: true,
            showRemaining: true,
            showIwr: true,
            timesCorrect: 2,
            penalizeIncorrect: true,
            delayCorrect: 1,
            delayIncorrect: 0,
            studyFontSize: 18,
            animateStudy: true,
            ignoreParenthesis: true,
            useSlash: true,
            ignoreCapital: true,
            sortHomeBy: "lastUsed",
            homeStyle: "hexagon",
        };

        this.data = this.parseDataFile();

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

    resetDefault() {
        this.data = JSON.parse(JSON.stringify(this.defaults));
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }

    parseDataFile() {
        try {
            const fileData = JSON.parse(fs.readFileSync(this.path));
            const data = this.fillNull(fileData);
            return data;
        } catch (err) {
            return this.defaults;
        }
    }

    fillNull(data) {
        let set = false;
        for (const [key, value] of Object.entries(this.defaults)) {
            if (data[key] == null) {
                //make sure no values are set to null
                data[key] = value; //if null set to default
                set = true;
            }
        }
        if (set) {
            //if a value was set save it to file
            this.setAll(data);
        }
        return data;
    }
}

module.exports = Settings;
