const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { build } = require('electron-builder');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: `${__dirname}/src/assets/icon/web/favicon.ico`
  },
  rebuildConfig: {},
  build: {
    appId: "com.trep-tracker",
    productName: "trep-tracker",
    files: [
      "dist/**/*",
      "package.json"
    ],
    mac: {
      "category": "public.app-category.utilities"
    },
    win: {
      "target": [
        "nsis"
      ]
    },
    linux: {
      "target": [
        "AppImage"
      ]
    }
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        // The ICO file to use as the icon for the generated Setup.exe
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`
      },
    },
    {
      name: '@electron-forge/maker-zip',
      config: {
        // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        // The ICO file to use as the icon for the generated Setup.exe
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`
      },
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        // The ICO file to use as the icon for the generated Setup.exe
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        // The ICO file to use as the icon for the generated Setup.exe
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
