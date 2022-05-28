require("dotenv").config();
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        appBundleId: "BUNDLE ID HERE",
        appPath: `${appOutDir}/${appName}.app`,
        appleId: "EMAIL HERE",
        appleIdPassword: "KEY HERE",
    });
};
