/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// Update app versions in package.json and angular environments
const fs = require('fs');
const versionInfo = require('./version.json');
const packageJson = require('./package.json');


let filesToUpdate = [
    './src/environments/environment.ts',
    './src/environments/environment.development.ts',
    './src/environments/environment.electrified-dev.ts',
    './src/environments/environment.electrified-prod.ts',
    './src/environments/environment.github-pages.ts'
]
    ;

for (let file of filesToUpdate) {
    console.info(`Updating version in ${file}`);
    let data = fs.readFileSync(file, 'utf8');
    data = data.replace(/userVersion: '(.*)'/, `userVersion: '${versionInfo.version}'`);
    fs.writeFileSync(file, data);
}

console.info(`Updating version in index.html`);
let data = fs.readFileSync('./src/index.html', 'utf8');
data = data.replace(/v\d+\.\d+\.\d+-[a-z]+/g, `v${versionInfo.version}`);
fs.writeFileSync('./src/index.html', data);

packageJson.version = versionInfo.version;
console.info(`Updating version in package.json`);
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));