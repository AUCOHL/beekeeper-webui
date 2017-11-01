x #!/usr/bin/env node
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
	socket.emit('proceed', { state: 'fine' });

	var uname="";
	exec (`echo "$USER"`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get username: ${error}.`);
			process.exit(73);
		}
		uname = stdout;
	});


	socket.on('assemble', function (code) {
		console.log(code);
		// if (language == "C") {
			exec(`touch code.c && truncate -s 0 code.c && echo "${code}" > code.c`);
		// }
		// if (language == "RISC-V") {
		// 	exec(`touch code.s && truncate -s 0 code.s && echo "${code}" > code.s`);
		// }
		// exec(`cp code.c Beekeeper/ && cd Beekeeper && iverilog -o app.bin_dump/Beekeeper.vvp -I /usr/local/bin/BeekeeperSupport BFM.v`, (error, stdout, stderr) => {
		exec(`cp code.c Beekeeper/ && cd Beekeeper && ./Scripts/bkcc code.c && make soc && iverilog -o Beekeeper.vvp Generated.v`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`Assembly failed: ${error}.`);
				process.exit(73);
			}
			exec('r', (error1, stdout1, stderr1) => {
				if (error1 || stderr1) {
					console.error(`Running failed: ${error}.`);
					process.exit(73);
				}
			});
		});
	});

	socket.on('run', function (data) {
		// exec(`if [pwd != Beekeeper] then cd Beekeeper; && iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp && dos2unix vcd2json.pl && touch dump.txt && ./vcd2js.pl dump.v`, (error, stdout, stderr) => {
		exec(`cd Beekeeper && dos2unix vcd2js.pl && ./vcd2js.pl dump.vcd`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`Running failed: ${error}.`);
				process.exit(73);
			}
			socket.emit(response, stdout);
		});
	});

	socket.on('step', function (data) {
		exec(`cp code.c Beekeeper/ && cd Beekeeper && ./bkcc code.c && make soc && iverilog -o Beekeeper.vvp Generated.v && beekeeper`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`Stepping failed: ${error}.`);
				process.exit(73);
			}
			exec('s', (error1, stdout1, stderr1) => {
				if (error1 || stderr1) {
					console.error(`Running failed: ${error}.`);
					process.exit(73);
				}
				exec(`cd Beekeeper && dos2unix vcd2js.pl && ./vcd2js.pl dump.vcd`, (error, stdout, stderr) => {
					if (error || stderr) {
						console.error(`Running failed: ${error}.`);
						process.exit(73);
					}
					socket.emit(response, stdout);
				});
			});
		});
	});
});
