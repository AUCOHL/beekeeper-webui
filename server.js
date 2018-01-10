#!/usr/bin/env node
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const path = require('path');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var net = require('net');
app.listen(9000);

// Prefix and suffix are needed for proper display of the waveform.
//  DO NOT CHANGE THEM.
var prefix = `var data_cntr = `;
var suffix = `;
var timing = JSON.parse('{"rendered":["mod_7SEG_tb.clk","mod_7SEG_tb.segA","mod_7SEG_tb.segB","mod_7SEG_tb.segC","mod_7SEG_tb.segD","mod_7SEG_tb.segDP","mod_7SEG_tb.rst","mod_7SEG_tb.segE","mod_7SEG_tb.segF","mod_7SEG_tb.DUT.BCD[3:0]"],"hidden":["mod_7SEG_tb.DUT.SevenSeg[7:0]","mod_7SEG_tb.DUT.cntovf","mod_7SEG_tb.DUT.rst","mod_7SEG_tb.DUT.cnt[1:0]","mod_7SEG_tb.DUT.clk","mod_7SEG_tb.segG"],"from":43,"to":69,"cursor":"52.75","cursorExact":52.753017641597026,"end":150,"originalEnd":"150","radix":2,"timeScale":"1","timeScaleUnit":"ns","timeUnit":1000,"highlightedIndex":5}');
var waveform = new Waveform('waveform-container', data_cntr, null);
waveform.setOnChangeListener(function(e){
	console.log(e);
});
`;
var out="";
// Whether or not we're in stepping mode
var stepping = false;
// Count number of steps
var step = 0;
// Save the current line of code
var codeLine = "";
// Save current child process data
var processData = "";
// Receive current child process error
var processError = "";

var userData = {
	codeFileName: "code.c",
	codeCFile: `public/data/code.c`,
	codeTextFile: "./public/data/code-text.js",
	waveformDataFile: "./public/data/waveform-data.js",
	waveformTextFile: "./public/data/waveform-text.js"
}

//so the program will not close instantly
process.stdin.resume();

// HTTP server handler
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

// Handle the process exit
function exitHandler(options, err) {
    if (options.exit) {
		if (typeof(proc) !== 'undefined') {
			proc.kill();
		}
		socket.emit('message', "Exit");
		process.exit();
	}
}

// Store the vcd2waveform data in the user data folder
function storeVCD() {
	var child = spawn('./vcd2js.pl', ['dump.vcd']);
	var output = "";
	child.stdout.on('data', (data) => {
		output += data;
	});
	// Only save when process is finished
	child.stdout.on('close', function(code) {
        var out =  prefix + output + suffix;
		// console.log(out);
		storeFile("public/data/waveform-data.js", out);
    });
}

// Helper function to store files on drive
function storeFile(file, text) {
	fs.writeFile(file, text, function(err) {
		if(err) {
			console.log(err);
			socket.emit('error', err);
		}
	});
}

// Where all socket communication takes place
io.on("connection", function (socket) {
	// Once socket is initialized inform other party to proceed
	socket.emit('proceed', { state: 'fine' });

	// Catch all exceptions to make sure server doesn't crash
	// TODO exception handling needs to be done properly
	process.on('uncaughtException', function (err) {
	  	console.error(err);
	});

	// Save user code taken from Ace instance
	function saveCode (code) {
		storeFile(userData.codeCFile, code);
		storeFile(userData.codeTextFile, "var code=`" + code + "`;");
	}
	socket.on('save', function (code) {
		saveCode(code);
	});

	socket.on('compile', function (code) {
		saveCode(code);
		console.log(userData.codeCFile + "\n" + userData.codeFileName);
		// TODO figure out a way to simplify this callback hell
		exec (`/usr/local/bin/BeekeeperSupport/cc ${userData.codeCFile}`, (error1, stdout1, stderr1) => {
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
					else exec (`iverilog -o ${userData.codeCFile}.bin_dump/Beekeeper.vvp -I/usr/local/bin/BeekeeperSupport/ BFM.v`, (error3, stdout3, stderr3) => {
						if (error3 || stderr3) {
							console.error(`iverilog failed: ${error3}.`);
							socket.emit('error', error3);
						}
						// vvp -M/home/ahmed/BeekeeperSupport -mBeekeeper code.c.bin_dump/Beekeeper.vvp
						global.proc = spawn('vvp', [`-M/usr/local/bin/BeekeeperSupport`, '-mBeekeeper', `${userData.codeCFile}.bin_dump/Beekeeper.vvp`]);
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
					            if (address.indexOf(userData.codeFileName) > -1) {
									// get instruction line number
									step = parseInt(address.substring(address.indexOf(`${userData.codeFileName}:`) + `${userData.codeFileName}:`.length, address.indexOf(' ')));
									// get instruction address
								    address = "[" + address.substring(address.indexOf(' ') + 1, address.length) + "]";
					            }
								var lines = code.split('\n');
								// get the code line TODO improve the loop
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
								storeFile(userData.waveformTextFile, "var data=`" + text + "`;");
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

// Bind the process exit event to our exit handler
process.on('exit', exitHandler.bind(null,{exit:true}));
// //catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, {exit:true}));
// // catches "kill pid" (for example: nodemon restart)
// process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
// process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
