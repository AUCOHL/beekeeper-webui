#!/usr/bin/env node
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const path = require('path');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var net = require('net');
// var cppsocket = require('net').Socket();
//
// cppsocket.on('data', function(d){
//     console.log(d.toString());
// });

app.listen(9000);

var prefix = `var data_cntr = `;
var suffix = `;
var timing = JSON.parse('{"rendered":["mod_7SEG_tb.clk","mod_7SEG_tb.segA","mod_7SEG_tb.segB","mod_7SEG_tb.segC","mod_7SEG_tb.segD","mod_7SEG_tb.segDP","mod_7SEG_tb.rst","mod_7SEG_tb.segE","mod_7SEG_tb.segF","mod_7SEG_tb.DUT.BCD[3:0]"],"hidden":["mod_7SEG_tb.DUT.SevenSeg[7:0]","mod_7SEG_tb.DUT.cntovf","mod_7SEG_tb.DUT.rst","mod_7SEG_tb.DUT.cnt[1:0]","mod_7SEG_tb.DUT.clk","mod_7SEG_tb.segG"],"from":43,"to":69,"cursor":"52.75","cursorExact":52.753017641597026,"end":150,"originalEnd":"150","radix":2,"timeScale":"1","timeScaleUnit":"ns","timeUnit":1000,"highlightedIndex":5}');
var waveform = new Waveform('waveform-container', data_cntr, null);
waveform.setOnChangeListener(function(e){
	console.log(e);
});
`;
var out = "";
var workingDirectory="";
var userHome="";
var filename = "code.c";

process.stdin.resume(); //so the program will not close instantly

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

function storeVCD() {
	exec (`./vcd2js.pl dump.vcd`, (error3, stdout3, stderr3) => {
		if (error3 || stderr3) {
			console.error(`vcd2js failed: ${error3}.`);
			socket.emit('error', error3);
		}
		var out =  prefix+stdout3+suffix;
		console.log(out);
		fs.writeFile("waveform-data.js",out, function(err) {
			if(err) {
				return console.log(err);
			}
			exec(`cp -f waveform-data.js public/Scripts`,
				(error4, stdout4, stderr4) => {
					if (error4 || stderr4) {
						console.error(`waveform-source store failed: ${error4}.`);
						socket.emit('error', error4);
						//process.exit(73);
					}
                    console.log("VCD stored");
			});
		});
		return stdout3;
	});
}

io.on("connection", function (socket) {
	socket.emit('proceed', { state: 'fine' });
	var uname="";
	exec (`echo "$USER"`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get username: ${error}.`);
			socket.emit('error', error);
			//process.exit(73);
		}
		uname = stdout;
	});
	exec (`pwd`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get workingDirectory: ${error}.`);
			socket.emit('error', error);
			//process.exit(73);
		}
		workingDirectory = stdout;
	});
	exec (`cd ~ && pwd`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get username: ${error}.`);
			socket.emit('error', error);
			//process.exit(73);
		}
		userHome = stdout;
	});
	socket.on('compile', function (code) {
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
					console.log("The file was saved");
					exec (`${userHome}BeekeeperSupport/cc ${filename}`, (error1, stdout1, stderr1) => {
						if (error1 || stderr1) {
							console.error(`cc failed: ${error1}.`);
							socket.emit('error', error1);
							process.exit(73);
						}
						exec (`iverilog -o code.c.bin_dump/Beekeeper.vvp -I${userHome}/BeekeeperSupport/ BFM.v`, (error3, stdout3, stderr3) => {
							if (error3 || stderr3) {
								console.error(`iverilog failed: ${error3}.`);
								socket.emit('error', error3);
								process.exit(73);
							}
							console.log("finished compilation");
							socket.emit('finishedCompilation');
							// vvp -M/home/ahmed/BeekeeperSupport -mBeekeeper code.c.bin_dump/Beekeeper.vvp
							global.proc = spawn('vvp', [`-M${userHome}BeekeeperSupport`, '-mBeekeeper', 'code.c.bin_dump/Beekeeper.vvp']);
                            // global.proc = spawn('beekeeper');
							proc.stdin.setEncoding('utf-8');
							proc.stdout.pipe(process.stdout);
							// setTimeout(function(){ cppsocket.connect(9001, "127.0.0.1"); }, 1000);
						});
					});
				}
			});
		});
	});
	socket.on('run', function(code) {
		// cppsocket.write(`${filename}.bin,0`);
		if (proc !== 'undefined') {
            console.log("executing");
            socket.emit('response', storeVCD());
            proc.stdin.write('run');
            proc.stdin.end();
            // setTimeout(function(){ proc.stdin.write('SIGINT') }, 2000);
        } else {
            socket.emit('message', "Compile first");
        }
        if (stdout)
		// proc.stdin.end();
		socket.emit('response');
	});
	socket.on('runff', function(code) {
		// cppsocket.write(`${filename}.bin,1`);
		if (proc !== 'undefined') {
            proc.stdin.write('runff\n');
			storeVCD();
			socket.emit('response');
        } else {
            socket.emit('message', "Compile first");
        }
		// proc.stdin.end();
		socket.emit('response');
	});
	socket.on('step', function(code) {
		// cppsocket.write(`${filename}.bin,2`);
		if (proc !=='undefined') {
			proc.stdin.write('step\n');
			storeVCD();
			socket.emit('response');
		} else {
            socket.emit('message', "Compile first");
        }
		// proc.stdin.end();
	});
	socket.on('stepi', function(code) {
		// cppsocket.write(`${filename}.bin,3`);
		if (proc !== 'undefined') {
			proc.stdin.write('stepi\n');
			storeVCD();
			socket.emit('response');
		} else {
            socket.emit('message', "Compile first");
        }
		// proc.stdin.end();
	});
	socket.on('finish', function(code) {
		// cppsocket.write(`${filename}.bin,4`);
		if (proc !== 'undefined')
		proc.stdin.write('exit\r');
		proc.stdin.end();
	});
	socket.on('break', function(code) {
		// cppsocket.write(`${filename}.bin,5`);
		if (proc !== 'undefined')
		proc.stdin.write('break\n');
		// proc.stdin.end();
	});
});

function exitHandler(options, err) {
    if (options.exit) {
		if (typeof(proc) !== 'undefined') {
			proc.kill();
		}
		process.exit();
	}
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{exit:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
