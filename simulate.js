const exec = require('child_process').exec;
const path = require('path');

exec(`./beekeeper/beekeeper`, (error, stdout, stderr) => {
if (error || stderr) {
    console.error(`File reading failed: ${error}.`);
    process.exit(73);
}
