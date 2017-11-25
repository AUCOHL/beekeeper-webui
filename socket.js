#!/usr/bin/env node
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
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
`;
var out="";
var workingDirectory="";
var directory="";
var userHome="";
var home="";
var uname="";
var name="";
var filename = "code.c";
var firstStep = true;
var processData = "";
var processError = "";

//so the program will not close instantly
process.stdin.resume();

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
		// console.log(out);
		fs.writeFile("waveform-data.js",out, function(err) {
			if(err) {
				return console.log(err);
			}
			exec(`cp -f waveform-data.js public/Scripts`,
				(error4, stdout4, stderr4) => {
					if (error4 || stderr4) {
						console.error(`waveform-source store failed: ${error4}.`);
						socket.emit('error', error4);
					}
                    console.log("VCD stored");
			});
		});
		return stdout3;
	});
}

io.on("connection", function (socket) {
	socket.emit('proceed', { state: 'fine' });

	exec (`echo "$USER"`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get username: ${error}.`);
			socket.emit('error', error);
		}
		name = stdout;
		uname = name.trim();
	});
	exec (`pwd`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get workingDirectory: ${error}.`);
			socket.emit('error', error);
		}
		directory = stdout;
		workingDirectory = directory.trim() + "/";
	});
	exec (`cd ~ && pwd`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't get username: ${error}.`);
			socket.emit('error', error);
		}
		home = stdout;
		userHome = home.trim() + "/";
	});

	socket.on('save', function (code) {
		console.log(code);
		exec(`rm -f code.c`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`cd failed: ${error}.`);
				socket.emit('error', error);
			}
			fs.writeFile("code.c", code, function(err) {
			    if(err) {
					console.log(err);
					socket.emit('error', err);
			    }
			});
		});
	});

	socket.on('compile', function (code) {
		console.log(code);
		exec(`rm -f code.c`, (error, stdout, stderr) => {
			if (error || stderr) {
				console.error(`cd failed: ${error}.`);
				socket.emit('error', error);
			}
			fs.writeFile("code.c", code, function(err) {
			    if(err) {
					console.log(err);
					socket.emit('error', err);
			    } else {
					console.log("The file was saved");
					exec (`/usr/local/bin/BeekeeperSupport/cc ${filename}`, (error1, stdout1, stderr1) => {
						if (error1 || stderr1) {
							console.error(`cc failed: ${error1}.`);
							socket.emit('error', error1);
							process.exit(73);
						}
						// run samplesoc
						exec (`cp -f /usr/local/bin/BeekeeperSupport/Compiler/examplesoc.json soc.json`, (error, stdout, stderr) => {
							if (error || stderr) {
								console.error(`Couldn't get username: ${error}.`);
								socket.emit('error', error);
							}
							// run makesoc
							exec (`/usr/local/bin/BeekeeperSupport/makesoc soc.json`, (error, stdout, stderr) => {
								if (error || stderr) {
									console.error(`Couldn't get username: ${error}.`);
									socket.emit('error', error);
								}
								exec (`iverilog -o code.c.bin_dump/Beekeeper.vvp -I/usr/local/bin/BeekeeperSupport/ BFM.v`, (error3, stdout3, stderr3) => {
									if (error3 || stderr3) {
										console.error(`iverilog failed: ${error3}.`);
										socket.emit('error', error3);
										process.exit(73);
									}
									console.log("finished compilation");
									socket.emit('finishedCompilation');
									// vvp -M/home/ahmed/BeekeeperSupport -mBeekeeper code.c.bin_dump/Beekeeper.vvp
									global.proc = spawn('vvp', [`-M/usr/local/bin/BeekeeperSupport`, '-mBeekeeper', 'code.c.bin_dump/Beekeeper.vvp']);
		                           	proc.stdin.setEncoding('utf-8');
									// proc.stdout.pipe(process.stdout);
									proc.stdout.on('data', (data) => {
									  // console.log(`child stdout:\n${data}`);
									  processData = data;
									  fs.writeFile("public/Scripts/waveform-text.js", "var data=`" + data + "`;", function(err) {
										  if(err) {
											  console.log(err);
											  socket.emit('error', err);
										  }
									  });
									});
									setTimeout(function(){ proc.stdin.write('code.c.bin\n'); }, 1000);
								});
							});
						});
					});
				}
			});
		});
	});

	socket.on('run', function(code) {
		if (proc !== 'undefined') {
            console.log("executing");
            socket.emit('response', storeVCD());
            proc.stdin.write('run');
            proc.stdin.end();
        } else {
            socket.emit('message', "Compile first");
        }
        if (stdout) socket.emit('response');
	});
	socket.on('runff', function(code) {
		if (proc !== 'undefined') {
            proc.stdin.write('runff\n');
			storeVCD();
			socket.emit('response', 'runff');
        } else {
            socket.emit('message', "Compile first");
        }
	});
	socket.on('step', function(code) {
		if (proc !=='undefined') {
			proc.stdin.write('step\n');
			console.log('step');
			storeVCD();
			socket.emit('response', processData);
		} else {
            socket.emit('message', "Compile first");
        }
	});

	socket.on('stepi', function(code) {
		if (proc !== 'undefined') {
			proc.stdin.write('stepi\n');
			console.log('stepi');
			storeVCD();
			socket.emit('response', processData);
		} else {
            socket.emit('message', "Compile first");
        }
	});

	socket.on('finish', function(code) {
		if (proc !== 'undefined')
		proc.stdin.write('exit\r');
		proc.stdin.end();
	});

	socket.on('break', function(code) {
		if (proc !== 'undefined')
		proc.stdin.write('break\n');
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
