/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// Update app versions in package.json and angular environments
const fs = require('fs');
const path = require('path');
const versionInfo = require(path.join(__dirname, '..', 'version.json'));
const { execSync } = require('child_process');

// Read the commit message
const commitMsg = process.argv[2];

// Check if the commit message contains a version bump indicator
const minorBumpRegex = /\[minor\+\]/i;
const majorBumpRegex = /\[major\+\]/i;
const patchBumpRegex = /\[patch\+\]/i;
const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|preview))?$/;

let versionBump = null;

if (majorBumpRegex.test(commitMsg)) {
  versionBump = 'major';
} else if (minorBumpRegex.test(commitMsg)) {
  versionBump = 'minor';
}else if (patchBumpRegex.test(commitMsg)) {
  versionBump = 'patch';
}else if ( versionRegex.test(commitMsg) ){
  versionBump = 'rewrite'
}

const versionFileStaged = execSync('git diff --name-only --cached').toString().trim();

if (versionBump && versionFileStaged.indexOf('version.json') < 0) {
    console.log(`Commit msg: ${commitMsg}`)

    // Read the current version
    let currentVersion = versionInfo.version;

    console.log(`Current version is ${currentVersion} (from version.json)`)

    // Parse the version
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
    }else if( versionBump === 'rewrite' ){
      const matchCur = commitMsg.match(versionRegex);
      [, major, minor, patch, suffix] = matchCur; 
    }

    // Determine if we're on a feature branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const isFeatureBranch = currentBranch !== 'main' && currentBranch !== 'master';
    console.log(`On branch ${currentBranch}`)

    // Set the appropriate suffix
    suffix = isFeatureBranch ? 'preview' : 'beta';

    // Construct the new version string
    const newVersion = `${major}.${minor}.${patch}${suffix ? '-' + suffix : ''}`;
    console.log(`New version is ${newVersion}`)

    // Update version.json
    versionInfo.version = newVersion;
    fs.writeFileSync(path.join(__dirname, '..', 'version.json'), JSON.stringify(versionInfo, null, 2));
    console.warn("Version.json updated and staged")
    execSync(`git add ${path.join(__dirname, '..', 'version.json')}`)

}else{
    console.warn("No version bump requested")
}