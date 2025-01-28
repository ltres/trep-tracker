const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

console.log(__dirname)

module.exports = {
  packagerConfig: {
    asar:true,
    icon: path.join(process.cwd(), "src", "assets", "icon","web", "favico.icns"),
    extraResource: [
      path.join(process.cwd(), "src", "assets", "icon","web", "favico.icns")]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        bin: 'trep-tracker',
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`,
        icon: `${__dirname}/src/assets/icon/web/favicon.ico`,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
      config: {
        bin: 'trep-tracker',
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`,
        icon: `${__dirname}/src/assets/icon/web/favicon.ico`,
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        bin: 'trep-tracker',
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`,
        options: {
          icon: `${__dirname}/src/assets/icon/web/favicon.ico`,
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        bin: 'trep-tracker',
        iconUrl: `${__dirname}/src/assets/icon/web/favicon.ico`,
        setupIcon: `${__dirname}/src/assets/icon/web/favicon.ico`,
        icon: `${__dirname}/src/assets/icon/web/favicon.ico`,
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'trep-tracker',
        icon: `${__dirname}/src/assets/icon/web/favico.icns`,
        format: "ULFO",
        overwrite:true
      }
    }
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
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'ltres',
          name: 'trep-tracker'
        },
        prerelease: true,
        draft: false
      }
    }
  ]
};
