const electron = require("electron");
const path = require("path");
const fs = require("fs");

class FolderManager {
	constructor() {
		const userDataPath = (electron.app || electron.remote.app).getPath(
			"userData"
		);

		this.path = path.join(userDataPath, "/folders.json");

		this.data = parseDataFile(this.path);

		//create file if dne
		if (!fs.existsSync(this.path)) {
			fs.writeFileSync(this.path, JSON.stringify(this.data));
		}
	}

	get(folderID) {
		return this.data[folderID.toSting()];
	}

	getAll() {
		return this.data;
	}

	addFolder(title, bunchIDs) {
		let id = 0;
		while (this.data[id.toString()] != undefined) {
			//find an unused id
			id += 1;
		}

		const newJson = { title: title, bunchIDs: bunchIDs };

		this.data[id.toString()] = newJson;
		fs.writeFileSync(this.path, JSON.stringify(this.data));
	}

	addBunches(folderID, bunchIDs) {
		for (let x = 0; x < bunchIDs.length; x++) {
			try {
				const currentBunchIDs = this.data[folderID.toString()]["bunchIDs"];
				if (!currentBunchIDs.includes(bunchIDs[x])) {
					currentBunchIDs.push(bunchIDs[x]);
				}
				fs.writeFileSync(this.path, JSON.stringify(this.data));
			} catch {
				console.log(`failed to add bunch ${bunchIDs[x]} to folder`);
			}
		}
	}

	removeBunches(folderID, bunchIDs) {
		for (let x = 0; x < bunchIDs.length; x++) {
			try {
				const currentBunchIDs = this.data[folderID.toString()]["bunchIDs"];
				if (currentBunchIDs.includes(bunchIDs[x])) {
					currentBunchIDs.splice(currentBunchIDs.indexOf(bunchIDs[x]), 1);
				}
				fs.writeFileSync(this.path, JSON.stringify(this.data));
			} catch {
				console.log("failed to remove bunch from folder");
			}
		}
	}

	setTitle(folderID, title) {
		this.data[folderID.toString()]["title"] = title;
		fs.writeFileSync(this.path, JSON.stringify(this.data));
	}

	removeFolder(folderID) {
		delete this.data[folderID.toString()];
	}

	printData() {
		console.log(this.data);
	}
}

function parseDataFile(filePath) {
	try {
		return JSON.parse(fs.readFileSync(filePath));
	} catch (err) {
		return {};
	}
}

module.exports = FolderManager;
