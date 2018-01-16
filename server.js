#!/usr/bin/env node
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const path = require('path');
const events = require('events');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var net = require('net');
app.listen(9000);

// DO NOT CHANGE THESE VARIABLES.
var prefix = "var data_cntr = ";
var timeScale = "1";
var timeScaleUnit = "ns";
var timeUnit = 1000;
var separator = `;`;

// var timing =
// JSON.parse('{
// 	"rendered":["mod_7SEG_tb.clk","mod_7SEG_tb.segA","mod_7SEG_tb.segB","mod_7SEG_tb.segC","mod_7SEG_tb.segD","mod_7SEG_tb.segDP","mod_7SEG_tb.rst","mod_7SEG_tb.segE","mod_7SEG_tb.segF","mod_7SEG_tb.DUT.BCD[3:0]"],
// 	"hidden":["mod_7SEG_tb.DUT.SevenSeg[7:0]","mod_7SEG_tb.DUT.cntovf","mod_7SEG_tb.DUT.rst","mod_7SEG_tb.DUT.cnt[1:0]","mod_7SEG_tb.DUT.clk","mod_7SEG_tb.segG"],
// 	"from":43,
// 	"to":69,
// 	"cursor":"52.75",
// 	"cursorExact":52.753017641597026,
// 	"end":150,
// 	"originalEnd":"150",
// 	"radix":2,
// 	"timeScale":${timeScale},
// 	"timeScaleUnit":${timeScaleUnit},
// 	"timeUnit":${timeUnit},
// 	"highlightedIndex":5
// }');

var timing = `var timing =
JSON.parse('{"rendered":["mod_7SEG_tb.clk","mod_7SEG_tb.segA","mod_7SEG_tb.segB","mod_7SEG_tb.segC","mod_7SEG_tb.segD","mod_7SEG_tb.segDP","mod_7SEG_tb.rst","mod_7SEG_tb.segE","mod_7SEG_tb.segF","mod_7SEG_tb.DUT.BCD[3:0]"],"hidden":["mod_7SEG_tb.DUT.SevenSeg[7:0]","mod_7SEG_tb.DUT.cntovf","mod_7SEG_tb.DUT.rst","mod_7SEG_tb.DUT.cnt[1:0]","mod_7SEG_tb.DUT.clk","mod_7SEG_tb.segG"],"from":43,"to":69,"cursor":"52.75","cursorExact":52.753017641597026,"end":150,"originalEnd":"150","radix":2,"timeScale":"${timeScale}","timeScaleUnit":"${timeScaleUnit}","timeUnit":${timeUnit},"highlightedIndex":5}');`;

var changeListener = `var waveform = new Waveform('waveform-container', data_cntr, null);waveform.setOnChangeListener(function(e){console.log(e);});`;
var suffix = separator + timing + changeListener;

// Create an eventEmitter object
var eventEmitter = new events.EventEmitter();
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
// Track the beekeeper process
var proc = undefined;
// Flag to keep track of beekeeper termination
var finished = false;

var userData = {
	codeFileName: "code.c",
	codeCFile: "code.c",
	codeBinFile: "code.c.bin",
	codeTextFile: "./public/data/code-text.js",
	waveformDataFile: "./public/data/waveform-data.js",
	waveformTextFile: "./public/data/waveform-text.js",
	disassemblyTextFile: "./public/data/disassembly.js"
}

var beekeeperData = {
	beekeeperPath: "/usr/local/bin/BeekeeperSupport/",
	socPath: "/usr/local/bin/BeekeeperSupport/Compiler/examplesoc.json",
	makeSocPath: "/usr/local/bin/BeekeeperSupport/makesoc",
	ccPath: "/usr/local/bin/BeekeeperSupport/cc"
}

// This is the execution chain, follow it from the top down
eventEmitter.on('codeCompiled', copySoc);
eventEmitter.on('socCopied', makeSoc);
eventEmitter.on('socMade', build);
eventEmitter.on('built', runBeekeeper);
eventEmitter.on('ranBeekeeper', setProcessParams);
eventEmitter.on('processParamsSet', setBeekeeperDataStream);
eventEmitter.on('dataStreamDefined', finishCompilation)
eventEmitter.on('runFinished', finishRun);
eventEmitter.on('stepFinished', finishStep);

// Catch all exceptions to make sure server doesn't crash
// TODO exception handling needs to be done properly
process.on('uncaughtException', function (err) {
	console.error(err);
});
// Bind the process exit event to our exit handler
process.on('exit', exitHandler.bind(null,{exit:true}));
// so the program will not close instantly
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
		storeFile(userData.waveformDataFile, out);
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

// Save user code taken from Ace instance
function saveCode (code) {
	storeFile(userData.codeCFile, code);
	storeFile(userData.codeTextFile, "var code=`" + code + "`;");
	socket.emit('saved');
}

// run cc
function compileCode(code) {
	saveCode(code);
	global.code = code;
	exec (`${beekeeperData.ccPath} ${userData.codeCFile}`, (error1, stdout1, stderr1) => {
		if (error1 || stderr1) {
			console.error(`cc failed: ${error1}.`);
			socket.emit('message', "Compilation Failed");
		}
		else eventEmitter.emit('codeCompiled');
	});
}

// run samplesoc
function copySoc() {
	exec (`cp -f ${beekeeperData.socPath} soc.json`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't copy samplesoc: ${error}.`);
			socket.emit('error', error);
		}
		else eventEmitter.emit('socCopied');
	});
}

// run makesoc
function makeSoc() {
	exec (`${beekeeperData.makeSocPath} soc.json`, (error, stdout, stderr) => {
		if (error || stderr) {
			console.error(`Couldn't makesoc: ${error}.`);
			socket.emit('error', {error});
		}
		else eventEmitter.emit('socMade');
	});
}

// build
function build() {
	exec (`iverilog -o ${userData.codeCFile}.bin_dump/Beekeeper.vvp -I${beekeeperData.beekeeperPath} BFM.v`, (error3, stdout3, stderr3) => {
		if (error3 || stderr3) {
			console.error(`iverilog failed: ${error3}.`);
			socket.emit('error', error3);
		}
		else eventEmitter.emit('built');
	});
}

function runBeekeeper() {
	// If a beekeeper process is running, kill it
	if (proc !== undefined) proc.kill();
	// reset stepping to false if there was a previous run
	stepping = false;
	// remove any previous dump
	spawn('rm', ['-f', 'dump.vcd']);
	// vvp -M/usr/local/bin/BeekeeperSupport -mBeekeeper code.c.bin_dump/Beekeeper.vvp
	proc = spawn('vvp', [`-M${beekeeperData.beekeeperPath}`, '-mBeekeeper', `${userData.codeCFile}.bin_dump/Beekeeper.vvp`]);
	eventEmitter.emit('ranBeekeeper');
}

function setProcessParams() {
	if (proc != undefined) {
		proc.stdin.setEncoding('utf-8');
		// set beekeeper program path
		proc.stdin.write(`${userData.codeBinFile}\n`);
		// NOTE uncomment for debugging
		proc.stdout.pipe(process.stdout);
		eventEmitter.emit('processParamsSet');
	}
}

function setBeekeeperDataStream() {
	proc.stdout.on('data', (data) => {
		global.data = data;
		var first = true;
		// convert data object to string
		data = "" + data;
		if (data.includes('Invalid input')) {
			socket.emit('message', "Sorry, you can't do that!");
		}
		else if (data.indexOf("JAL zero, 0") > -1) {
			eventEmitter.emit('runFinished');
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
			// get the code line
			// TODO improve the loop
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
	eventEmitter.emit('dataStreamDefined');
}

function finishCompilation() {
	socket.emit('finishedCompilation');
}

function finishStep() {
	storeVCD();
	socket.emit('response');
}

function finishRun() {
	proc.stdin.pause();
	proc.kill();
	storeVCD();
	socket.emit('complete');
}

// Where all socket communication takes place
io.on("connection", function (socket) {
	global.socket = socket;

	// Once socket is initialized inform other party to proceed
	socket.emit('proceed', { state: 'fine' });

	socket.on('save', function (code) {
		saveCode(code);
	});

	socket.on('compile', function (code) {
		compileCode(code);
	});

	socket.on('run', function(code) {
		if (stepping) proc.stdin.write('continue\n');
		else proc.stdin.write('run\n');
	});

	socket.on('breakpoints', function(breakpoints) {
		if (breakpoints != "0") {
			var number = 0;
			var breakArray = breakpoints.split(",");
			for (var i = 0; i < breakArray.length; i++) {
				number = parseInt(breakArray[i]);
				proc.stdin.write(`break ${userData.codeCFile}:${number}\n`);
			}
		}
	});

	socket.on('step', function(code) {
		stepping = true;
		proc.stdin.write('step\n');
		finishStep();
	});

	socket.on('stepi', function(code) {
		stepping = true;
		proc.stdin.write('stepi\n');
		finishStep();
	});

	socket.on('stop', function(code) {
		if (proc !== 'undefined') proc.kill();
	});

	socket.on('waveform', function(code) {
		storeVCD();
	})
});
