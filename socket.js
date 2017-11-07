#!/usr/bin/env node
const exec = require('child_process').exec;
const path = require('path');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var net = require('net');

app.listen(9000);

var prefix = `var data_cntr = `;
var suffix = `;
var timing = JSON.parse('{"rendered":["mod_7SEG_tb.clk","mod_7SEG_tb.segA","mod_7SEG_tb.segB","mod_7SEG_tb.segC","mod_7SEG_tb.segD","mod_7SEG_tb.segDP","mod_7SEG_tb.rst","mod_7SEG_tb.segE","mod_7SEG_tb.segF","mod_7SEG_tb.DUT.BCD[3:0]"],"hidden":["mod_7SEG_tb.DUT.SevenSeg[7:0]","mod_7SEG_tb.DUT.cntovf","mod_7SEG_tb.DUT.rst","mod_7SEG_tb.DUT.cnt[1:0]","mod_7SEG_tb.DUT.clk","mod_7SEG_tb.segG"],"from":43,"to":69,"cursor":"52.75","cursorExact":52.753017641597026,"end":150,"originalEnd":"150","radix":2,"timeScale":"1","timeScaleUnit":"ns","timeUnit":1000,"highlightedIndex":5}');
var waveform = new Waveform('waveform-container', data_cntr, null);
waveform.setOnChangeListener(function(e){
	console.log(e);
});
`

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

	/*The reason the entire function in nested inside an exec is to force
	sequential execution. Apparently socket.io is that great.*/
	var uname="";
	exec (`echo "$USER"`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get username: ${error}.`);
			socket.emit('error', error);
			//process.exit(73);
		}
		uname = stdout;
	});


	socket.on('assemble', function (code) {
		console.log(code);

		exec(`rm -f code.c`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`cd failed: ${error}.`);
				socket.emit('error', error);
				//process.exit(73);
			}
			fs.writeFile("code.c", code, function(err) {
			    if(err) {
					console.log(err);
					socket.emit('error', err);
			    } else {
					console.log("The file was saved!");
					exec(`rm -f Beekeeper/code.c && cp -f code.c Beekeeper`, (error, stdout, stderr) => {
						if (error || stderr) {
							console.error(`cd failed: ${error}.`);
							socket.emit('error', error);
							//process.exit(73);
						}
					});
					exec (`cd Beekeeper && ./bkcc code.c`, (error1, stdout1, stderr1) => {
						if (error1 || stderr1) {
							console.error(`bkcc failed: ${error1}.`);
							socket.emit('error', error1);
							process.exit(73);
						}
					});
					exec (`cd Beekeeper && make soc`, (error2, stdout2, stderr2) => {
						if (error2 || stderr2) {
							console.error(`make soc failed: ${error2}.`);
							socket.emit('error', error2);
							process.exit(73);
						}
					});
					exec (`cd Beekeeper && iverilog -o Beekeeper.vvp Generated.v`, (error3, stdout3, stderr3) => {
						if (error3 || stderr3) {
							console.error(`iverilog failed: ${error3}.`);
							socket.emit('error', error3);
							process.exit(73);
						}
						else {
							socket.emit('finishedAssembly');
						}
					});
				}
			});

			// if (language == "C") {
			// }
			// if (language == "RISC-V") {
			// 	exec(`touch code.s && truncate -s 0 code.s && echo "${code}" > code.s`);
			// }
		});
	});

	socket.on('run', function (data) {
		// exec(`if [pwd != Beekeeper] then cd Beekeeper; && iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp && dos2unix vcd2json.pl && touch dump.txt && ./vcd2js.pl dump.v`, (error, stdout, stderr) => {
		// exec (`iverilog -M/usr/local/bin/BeekeeperSupport -mBeekeeper app.bin_dump/Beekeeper.vvp`, (error3, stdout3, stderr3) => {
		var workingDirectory = "";
		exec (`cd Beekeeper && pwd`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`pwd failed: ${error}.`);
				socket.emit('error', error);
				//process.exit(73);
			}
			workingDirectory = stdout;
			exec (`cd Beekeeper && iverilog -M${workingDirectory}/ -mBeekeeper ${workingDirectory}/Beekeeper.vvp`, (error1, stdout1, stderr1) => {
				if (error1 || stderr1) {
					console.error(`beekeeper failed: ${error1}.`);
					socket.emit('error', error1);
					//process.exit(73);
				}
			});
		});
		exec (`cd Beekeeper && ./vcd2js.pl dump.vcd`, (error3, stdout3, stderr3) => {
			if (error3 || stderr3) {
				console.error(`vcd2js failed: ${error3}.`);
				socket.emit('error', error3);
				//process.exit(73);
			}
			console.log(stdout3);
			fs.writeFile("waveform-data.js", prefix+stdout3+suffix, function(err) {
			    if(err) {
			        return console.log(err);
			    }
			});
			exec(`cp -f waveform-data.js public/Scripts`,
				(error4, stdout4, stderr4) => {
					if (error4 || stderr4) {
						console.error(`waveform-source store failed: ${error4}.`);
						socket.emit('error', error4);
						//process.exit(73);
					}
			});
			socket.emit('response', stdout3);
		});
	});

	socket.on('step', function (data) {
		var client = new net.Socket();
		client.connect(9001, '127.0.0.1', function() {
			console.log('Connected to cpp socket');
			client.write("ping from client");
		});
	});
});
