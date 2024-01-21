require("dotenv").config();
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        appBundleId: "com.NAME.APP",
        appPath: `${appOutDir}/${appName}.app`,
        appleId: "APPLE_ID_EMAIL",
        appleIdPassword: "APP_SPECIFIC_PASSWORD",
    });
};
