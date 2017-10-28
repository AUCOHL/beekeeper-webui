#!/usr/bin/env node
const exec = require('child_process').exec;
const path = require('path');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(9000);

function handler (req, res) {
	fs.readFile(__dirname + '/public/index.html',
		function (err, data) {
			if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}
		res.writeHead(200);
		res.end(data);
	});
}

io.on('connection', function (socket) {
	socket.emit('proceed', { hello: 'world' });

	socket.on('assemble', function (filename) {
		exec(`cp ${filename} Beekeeper/ && cd Beekeeper && make && ./bkcc ${filename} && iverilog -o app.bin_dump/Beekeeper.vvp -I /usr/local/bin/BeekeeperSupport BFM.v`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`File reading failed: ${error}.`);
				process.exit(73);
			}
		});
	});

	socket.on('run', function (data) {
		exec(`if [pwd != Beekeeper] cd Beekeeper && iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp && dos2unix vcd2json.pl && touch dump.txt && ./vcd2js.pl dump.v`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`File reading failed: ${error}.`);
				process.exit(73);
			}
			socket.emit('respone', stdout);
		});
	});

	socket.on('step', function (data) {
		exec(`if [pwd != Beekeeper] cd Beekeeper && iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp && dos2unix vcd2json.pl && touch dump.txt && ./vcd2js.pl dump.v`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`File reading failed: ${error}.`);
				process.exit(73);
			}
			socket.emit('respone', stdout);
		});
	});
});
