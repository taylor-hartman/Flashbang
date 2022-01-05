const electron = require("electron");
const path = require("path");
const fs = require("fs");

class Store {
    constructor(options) {
        const userDataPath = (electron.app || electron.remote.app).getPath(
            "userData"
        );

        if (!fs.existsSync(userDataPath + "/bunches")) {
            fs.mkdir(userDataPath + "/bunches", (error) => {
                console.log(error);
            });
        }
        this.path = path.join(
            userDataPath,
            "/bunches/" + options.fileName + ".json"
        );

        const defaults = {
            title: "",
            lastUsed: "",
            pairs: [
                { prompt: "", answer: "" },
                { prompt: "", answer: "" },
                { prompt: "", answer: "" },
            ],
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

module.exports = Store;
