/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// Update app versions in package.json and angular environments
const fs = require('fs');
const path = require('path');
const versionInfo = require(path.join(__dirname, '..', 'version.json'));
const packageJson =  require(path.join(__dirname, '..', 'package.json'));
const { execSync } = require('child_process');

const versionFileStaged = execSync('git diff --name-only --cached').toString().trim();

if (versionFileStaged.indexOf("version.js") >= 0) {
    updateApplicationFiles()

    // Stage modified files
    console.log(`Staging new files and amending commit`)

    // execSync(`git add ${path.join(__dirname, '..', 'version.json')}`)
    execSync(`git add ${path.join(__dirname, '..', 'package.json')}`)
    execSync(`git add ${path.join(__dirname, '..', 'src','index.html')}`)
    execSync(`git add ${path.join(__dirname, '..', 'src','environments', '*')}`)

    // Amend the commit
    execSync('git commit --amend --no-edit --no-verify');

    // add the tag
    execSync(`git tag -a v${versionInfo.version} -m "Version bump" HEAD`);

    console.log(`Commit amended, tag pushed`);
}else{
    console.warn("No version bump requested")
}


function updateApplicationFiles(){
    let filesToUpdate = [
         path.join(__dirname, '..', './src/environments/environment.ts'),
         path.join(__dirname, '..', './src/environments/environment.development.ts'),
         path.join(__dirname, '..', './src/environments/environment.electrified-dev.ts'),
         path.join(__dirname, '..', './src/environments/environment.electrified-prod.ts'),
         path.join(__dirname, '..', './src/environments/environment.github-pages.ts')
    ];
    
    for (let file of filesToUpdate) {
        console.info(`Updating version in ${file}`);
        let data = fs.readFileSync(file, 'utf8');
        data = data.replace(/userVersion: '(.*)'/, `userVersion: '${versionInfo.version}'`);
        fs.writeFileSync(file, data);
    }
    
    console.info(`Updating version in index.html`);
    let data = fs.readFileSync(path.join(__dirname, '..', 'src','index.html'), 'utf8');
    data = data.replace(/v\d+\.\d+\.\d+-[a-z]+/g, `v${versionInfo.version}`);
    fs.writeFileSync(path.join(__dirname, '..', 'src','index.html'), data);
    
    packageJson.version = versionInfo.version;
    console.info(`Updating version in package.json`);
    fs.writeFileSync(path.join(__dirname, '..', 'package.json'), JSON.stringify(packageJson, null, 2));
}

