const createWindowsInstaller =
    require("electron-winstaller").createWindowsInstaller;
const path = require("path");

getInstallerConfig()
    .then(createWindowsInstaller)
    .catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });

function getInstallerConfig() {
    console.log("creating windows installer");

    return Promise.resolve({
        appDirectory: "/release-builds/flashbang-win32-ia32",
        authors: "taylor hartman",
        noMsi: true,
        outputDirectory: "/windows-build",
        exe: "flashbang.exe",
        setupExe: "flashbang.exe",
        setupIcon: "/icons/icon.ico",
    });
}
