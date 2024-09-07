/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// Update app versions in package.json and angular environments
const fs = require('fs');
const path = require('path');
const versionInfo = require(path.join(__dirname, 'version.json'));
const packageJson =  require(path.join(__dirname, 'package.json'));
const { execSync } = require('child_process');

// Read the commit message
const commitMsg = process.argv[2];

// Check if the commit message contains a version bump indicator
const minorBumpRegex = /\[minor\+\]/i;
const majorBumpRegex = /\[major\+\]/i;
const patchBumpRegex = /\[patch\+\]/i;

let versionBump = null;

if (majorBumpRegex.test(commitMsg)) {
  versionBump = 'major';
} else if (minorBumpRegex.test(commitMsg)) {
  versionBump = 'minor';
}else if (patchBumpRegex.test(commitMsg)) {
    versionBump = 'patch';
  }

console.log(`Commit msg: ${commitMsg}`)

if (versionBump) {
    // Read the current version
    let currentVersion = versionInfo.version;

    console.log(`Current version is ${currentVersion} (from version.json)`)

    // Parse the version
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|preview))?$/;
    const match = currentVersion.match(versionRegex);

    if (!match) {
        console.error('Invalid version format');
        process.exit(1);
    }

    let [, major, minor, patch, suffix] = match;
    [major, minor, patch] = [major, minor, patch].map(Number);

    // Increment the version
    if (versionBump === 'major') {
        major++;
        minor = 0;
        patch = 0;
        console.log(`Major version bump requested`)
    } else if (versionBump === 'minor') {
        minor++;
        patch = 0;
        console.log(`Minor version bump requested`)
    }else if( versionBump === 'patch' ){
        patch++;
        console.log(`Patch version bump requested`)
    }

    // Determine if we're on a feature branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const isFeatureBranch = currentBranch !== 'main' && currentBranch !== 'master';
    console.log(`On branch ${currentBranch}`)

    // Set the appropriate suffix
    suffix = isFeatureBranch ? (suffix || 'preview') : (suffix || '');

    // Construct the new version string
    const newVersion = `${major}.${minor}.${patch}${suffix ? '-' + suffix : ''}`;
    console.log(`New version is ${newVersion}`)

    // Update version.json
    versionInfo.version = newVersion;
    fs.writeFileSync(path.join(__dirname, 'version.json'), JSON.stringify(versionInfo, null, 2));

    updateApplicationFiles()

    // Stage modified files
    console.log(`Staging new files and amending commit`)

    execSync(`git add ${path.join(__dirname, 'version.json')}`)
    execSync(`git add ${path.join(__dirname, 'package.json')}`)
    execSync(`git add ${path.join(__dirname, 'src','index.html')}`)
    execSync(`git add ${path.join(__dirname, 'src','environments', '*')}`)

    // Amend the commit
    execSync('git commit --amend --no-edit');

    // add the tag
    execSync(`git tag -a v${versionInfo.version} -m "${versionBump} version bump" HEAD`);



    console.log(`Version bumped to ${newVersion}`);
}else{
    console.warn("No version bump requested")
}


function updateApplicationFiles(){
    let filesToUpdate = [
         path.join(__dirname, './src/environments/environment.ts'),
         path.join(__dirname, './src/environments/environment.development.ts'),
         path.join(__dirname, './src/environments/environment.electrified-dev.ts'),
         path.join(__dirname, './src/environments/environment.electrified-prod.ts'),
         path.join(__dirname, './src/environments/environment.github-pages.ts')
    ];
    
    for (let file of filesToUpdate) {
        console.info(`Updating version in ${file}`);
        let data = fs.readFileSync(file, 'utf8');
        data = data.replace(/userVersion: '(.*)'/, `userVersion: '${versionInfo.version}'`);
        fs.writeFileSync(file, data);
    }
    
    console.info(`Updating version in index.html`);
    let data = fs.readFileSync(path.join(__dirname, 'src','index.html'), 'utf8');
    data = data.replace(/v\d+\.\d+\.\d+-[a-z]+/g, `v${versionInfo.version}`);
    fs.writeFileSync(path.join(__dirname, 'src','index.html'), data);
    
    packageJson.version = versionInfo.version;
    console.info(`Updating version in package.json`);
    fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(packageJson, null, 2));
}

