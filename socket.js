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

var step = 0;
var codeLine = "";
var filename = "code.c";
var processData = "";
var processError = "";
var stepping = false;

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

function exitHandler(options, err) {
    if (options.exit) {
		if (typeof(proc) !== 'undefined') {
			proc.kill();
		}
		socket.emit('message', "Exit");
		process.exit();
	}
}

function storeVCD() {
	exec (`./vcd2js.pl dump.vcd`, (error3, stdout3, stderr3) => {
		if (error3 || stderr3) {
			// socket.emit('error', error3);
		}
		var out =  prefix+stdout3+suffix;
		storeFile("public/Scripts/waveform-data.js", out);
		return stdout3;
	});
}

function storeFile(file, text) {
	fs.writeFile(file, text, function(err) {
		if(err) {
			console.log(err);
			socket.emit('error', err);
		}
	});
}

io.on("connection", function (socket) {
	socket.emit('proceed', { state: 'fine' });

	process.on('uncaughtException', function (err) {
	  	console.error(err);
	});

	socket.on('save', function (code) {
		storeFile(filename, code);
		storeFile("public/Scripts/code-text.js", "var code=`" + code + "`;");
	});

	socket.on('compile', function (code) {
		storeFile(filename, code);
		storeFile("public/Scripts/code-text.js", "var code=`" + code + "`;");
		exec (`/usr/local/bin/BeekeeperSupport/cc ${filename}`, (error1, stdout1, stderr1) => {
			if (error1 || stderr1) {
				console.error(`cc failed: ${error1}.`);
				socket.emit('message', "Compilation Failed");
			}
			// run samplesoc
			else exec (`cp -f /usr/local/bin/BeekeeperSupport/Compiler/examplesoc.json soc.json`, (error, stdout, stderr) => {
				if (error || stderr) {
					console.error(`Couldn't copy samplesoc: ${error}.`);
					socket.emit('error', error);
				}
				// run makesoc
				else exec (`/usr/local/bin/BeekeeperSupport/makesoc soc.json`, (error, stdout, stderr) => {
					if (error || stderr) {
						console.error(`Couldn't makesoc: ${error}.`);
						socket.emit('error', {error});
					}
					// build
					else exec (`iverilog -o code.c.bin_dump/Beekeeper.vvp -I/usr/local/bin/BeekeeperSupport/ BFM.v`, (error3, stdout3, stderr3) => {
						if (error3 || stderr3) {
							console.error(`iverilog failed: ${error3}.`);
							socket.emit('error', error3);
						}
						// vvp -M/home/ahmed/BeekeeperSupport -mBeekeeper code.c.bin_dump/Beekeeper.vvp
						global.proc = spawn('vvp', [`-M/usr/local/bin/BeekeeperSupport`, '-mBeekeeper', 'code.c.bin_dump/Beekeeper.vvp']);
                       	proc.stdin.setEncoding('utf-8');
						// proc.stdout.pipe(process.stdout);
						proc.stdout.on('data', (data) => {
							global.data = data;
							if (data.indexOf("JAL zero, 0") > -1) {
								storeVCD();
								socket.emit("complete");
								proc.kill();
							} else {
								var processData = "" + data;
								// remove "(beekeeper)"
								processData = processData.substring(0, processData.indexOf("(beekeeper)"));
					            // Remove "Running step by step..."
					            if (processData.indexOf("Running") > -1) {
					                processData = processData.substring(processData.indexOf("Running") + "Running step by step...".length, processData.length-1);
					            }
								// get instructions
								var instruction = processData.substring(0, processData.indexOf("["));
								// get instruction address
					            var address = processData.substring(processData.indexOf("["), processData.indexOf("]"));
								// cleanup address
					            if (address.indexOf("code.c") > -1) {
									// get instruction line number
									step = parseInt(address.substring(address.indexOf('code.c:') + "code.c:".length, address.indexOf(' ')));
									// get instruction address
								    address = "[" + address.substring(address.indexOf(' ') + 1, address.length) + "]";
					            }
								var lines = code.split('\n');
								// TODO improve the loop
								// get the code line. This loop is inefficient
								for(var i = 0;i < lines.length;i++){
									if (step == i) codeLine = lines[i];
								};
								// grab the instruction op
								var instructionSet = instruction.match(/[A-Z]+.*?,/g);
								// grab the instruction arguments
								var argumentSet = instruction.match(/(,[^A-Z]*)/g);
								var instructions = [];
								if (instructionSet != null) {
									for (var iterator = 0; iterator < instructionSet.length; iterator++) {
										instructions.push(instructionSet[iterator] + argumentSet[iterator].substring(1, argumentSet[iterator].length) + "<br/>")
									}
								}
								// create console text
								var text = "";
								if (instructions != null) {
									// line of code first, followed by address
									text = text + codeLine + "<br/>" + address + "<br/>";
									// append instructions to text
									for (var iterator = 0; iterator < instructions.length; iterator++) {
										text = text + instructions[iterator];
									}
								}
								storeFile("public/Scripts/waveform-text.js", "var data=`" + text + "`;");
							}
						});
						socket.emit('finishedCompilation');
						// set beekeeper program path
						setTimeout(function(){ proc.stdin.write('code.c.bin\n'); }, 500);
					});
				});
			});
		});
	});

	socket.on('run', function(code) {
		proc.stdin.write('run\n');
	});

	socket.on('runff', function(code) {
	    proc.stdin.write('runff\n');
		setTimeout(function() {
			storeVCD();
			socket.emit('complete');
			socket.emit('response');
		}, 5000);
	});

	socket.on('step', function(code) {
		stepping = true;
		proc.stdin.write('step\n');
		storeVCD();
		socket.emit('response');
	});

	socket.on('stepi', function(code) {
		stepping = true;
		proc.stdin.write('stepi\n');
		storeVCD();
		socket.emit('response');
	});

	socket.on('finish', function(code) {
		if (proc !== 'undefined')
		proc.stdin.write('exit\n');
		proc.stdin.end();
	});

	socket.on('break', function(code) {
		if (proc !== 'undefined')
		proc.stdin.write('break\n');
	});
});

//do something when app is closing
process.on('exit', exitHandler.bind(null,{exit:true}));
// //catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, {exit:true}));
// // catches "kill pid" (for example: nodemon restart)
// process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
// process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
