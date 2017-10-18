#!/usr/bin/env node
const exec = require('child_process').exec;
const path = require('path');
const init = require('init.js');

init();
//Getting SoC
exec(`cd beekeeper && ./beekeeper`, (error, stdout, stderr) => {
if (error || stderr) {
    console.error(`File reading failed: ${error}.`);
    process.exit(73);
}
