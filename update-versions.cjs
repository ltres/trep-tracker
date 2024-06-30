// Update app versions in package.json and angular environments
const fs = require('fs');
const versionInfo = require('./version.json');
const packageJson = require('./package.json');

let filesToUpdate = [
    './src/environments/environment.ts',
    './src/environments/environment.development.ts',
    './src/environments/environment.electrified.ts'
]
    ;

for (let file of filesToUpdate) {

    let data = fs.readFileSync(file, 'utf8');
    data = data.replace(/version: \"(.*)\"/, `version: '${versionInfo.version}'`);
    fs.writeFileSync(file, data);
}


packageJson.version = versionInfo.version;

fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));