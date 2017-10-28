#!/usr/bin/env node
const exec = require('child_process').exec;
const path = require('path');

//Getting SoC
exec(`cp file.c beekeeper && cd beekeeper && ./bkcc file.c && make soc`, (error, stdout, stderr) => {
if (error || stderr) {
    console.error(`File reading failed: ${error}.`);
    process.exit(73);
}
