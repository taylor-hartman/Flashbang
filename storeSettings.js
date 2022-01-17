const electron = require("electron");
const path = require("path");
const fs = require("fs");

//yes i probably could make one big store class instead of one for settings and one for store but who cares
class StoreSettings {
    constructor() {
        const userDataPath = (electron.app || electron.remote.app).getPath(
            "userData"
        );

        this.path = path.join(userDataPath + "/settings.json");
        const defaults = {
            pairOrder: {
                standard: true,
                reversed: false,
                both: false,
            },
            questionType: {
                flashcard: true,
                typed: false,
            },
            showInfo: true,
        };

        this.data = parseDataFile(this.path, defaults);
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

module.exports = StoreSettings;
