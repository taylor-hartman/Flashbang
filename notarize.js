require("dotenv").config();
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        appBundleId: "INSERT_BUNDLE_ID",
        appPath: `${appOutDir}/${appName}.app`,
        appleId: "INSERT_APPLE_ID",
        appleIdPassword: "INSERT_TEMP_PASSWORD",
    });
};
