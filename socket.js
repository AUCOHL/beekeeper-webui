#!/usr/bin/env node
const exec = require('child_process').exec;
const path = require('path');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var net = require('net');

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
		fs.writeFile("code.c", code, function(err) {
		    if(err) {
		        return console.log(err);
		    }
			console.log("The file was saved!");
		});
		// exec(`touch code.c && truncate -s 0 code.c && echo "${code}" > code.c`);
		// if (language == "C") {
		// }
		// if (language == "RISC-V") {
		// 	exec(`touch code.s && truncate -s 0 code.s && echo "${code}" > code.s`);
		// }
		// exec(`cp code.c Beekeeper/ && cd Beekeeper && iverilog -o app.bin_dump/Beekeeper.vvp -I /usr/local/bin/BeekeeperSupport BFM.v`, (error, stdout, stderr) => {
		exec(`cp code.c Beekeeper`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`cd failed: ${error}.`);
				process.exit(73);
			}
		});
		exec (`./Beekeeper/bkcc code.c`, (error1, stdout1, stderr1) => {
			if (error1 || stderr1) {
				console.error(`bkcc failed: ${error1}.`);
				process.exit(73);
			}
		});
		exec (`cd Beekeeper && make soc`, (error2, stdout2, stderr2) => {
			if (error2 || stderr2) {
				console.error(`make soc failed: ${error2}.`);
				process.exit(73);
			}
		});
		exec (`cd Beekeeper && iverilog -o Beekeeper.vvp Generated.v`, (error3, stdout3, stderr3) => {
			if (error3 || stderr3) {
				console.error(`iverilog failed: ${error3}.`);
				process.exit(73);
			}
			else {
				console.log("done");
			}
		});
	});

	socket.on('run', function (data) {
		// exec(`if [pwd != Beekeeper] then cd Beekeeper; && iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp && dos2unix vcd2json.pl && touch dump.txt && ./vcd2js.pl dump.v`, (error, stdout, stderr) => {
		// exec (`iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp`, (error3, stdout3, stderr3) => {
		exec (`cd Beekeeper && ./beekeeper`, (error1, stdout1, stderr1) => {
			if (error1 || stderr1) {
				console.error(`beekeeper failed: ${error1}.`);
				process.exit(73);
			}
		});
		// exec (`cd Beekeeper && dos2unix vcd2js.pl`, (error2, stdout2, stderr2) => {
		// 	if (error2 || stderr2) {
		// 		console.error(`dos2unix failed: ${error2}.`);
		// 		process.exit(73);
		// 	}
		// });
		exec (`cd Beekeeper && ./vcd2js.pl dump.vcd`, (error3, stdout3, stderr3) => {
			if (error3 || stderr3) {
				console.error(`vcd2js failed: ${error3}.`);
				process.exit(73);
			}
			socket.emit('response', stdout3);
		});
	});

	socket.on('step', function (data) {
		var client = new net.Socket();
		client.connect(9001, '127.0.0.1', function() {
			console.log('Connected to cpp socket');
			client.write("ping from client");
		});
		// exec(`cp code.c Beekeeper/ && cd Beekeeper && ./bkcc code.c && make soc && iverilog -o Beekeeper.vvp Generated.v && beekeeper`, (error, stdout, stderr) => {
		// 	if (error || stderr) {
		// 		console.error(`Stepping failed: ${error}.`);
		// 		process.exit(73);
		// 	}
		// 	exec('s', (error1, stdout1, stderr1) => {
		// 		if (error1 || stderr1) {
		// 			console.error(`Running failed: ${error}.`);
		// 			process.exit(73);
		// 		}
		// 		exec(`cd Beekeeper && dos2unix vcd2js.pl && ./vcd2js.pl dump.vcd`, (error, stdout, stderr) => {
		// 			if (error || stderr) {
		// 				console.error(`Running failed: ${error}.`);
		// 				process.exit(73);
		// 			}
		// 			socket.emit(response, stdout);
		// 		});
		// 	});
		// });
	});
});
