// The port used for the app is 9000
var socket = io.connect('http://localhost:9000');
// Keep track of whether we're running or stepping
var run = false;
// Change this value if you want the snackbar to appear longer or shorter
var snackbarTime = 3000;
var waveform;
var status = {
	compiled: false,
	run: false,
	// Keep track of whether beekeeper will stop for breakpoints
	breakpoints: false,
	ranOnce: false,
	first: true
}

initialize();

// As the app starts, disable all buttons except save and compile
function initialize() {
	initializeAce();
	$("#footer").addClass('hidden');
	document.getElementById('console').innerHTML = "";
	document.getElementById('waveform-body').innerHTML = "";
	status.compiled = false;
	status.run = false;
	status.breakpoints = false;
	status.first = true;
	status.ranOnce = false;
	disableAllButtons(true);
	disableButton("save", false);
	disableButton("compile", false);
	document.getElementById('footer').style.visibility = 'hidden';
	document.getElementById('waveform-body').style.visibility = 'hidden';
	document.getElementById('editor').style.width = '100%';
	document.getElementById('editor').style.height = '100%';
}

function initializeAce() {
	editor.setValue(`${code}`);
	editor.renderer.setShowGutter(true);
	decorateAce(editor);
}

function decorateAce(editor) {
	editor.on("guttermousedown", function(e){
		var target = e.domEvent.target;
		if (target.className.indexOf("ace_gutter-cell") == -1){
			return;
		}
		if (!editor.isFocused()){
			return;
		}
		if (e.clientX > 25 + target.getBoundingClientRect().left){
			return;
		}
		var row = e.getDocumentPosition().row;
		var breakpointsArray = e.editor.session.getBreakpoints();
		if(!(row in breakpointsArray)){
			if (row === 0 || row === e.editor.session.getLength() -1) {}
			else {
				e.editor.session.addGutterDecoration(row, '.ace_gutter-cell.ace_breakpoint');
				e.editor.session.setBreakpoint(row);
			}
		}else{
			e.editor.session.addGutterDecoration(row, 'white');
			e.editor.session.clearBreakpoint(row);
		}
			e.stop();
	});
	editor.session.on("changeBreakpoint", function(e){
	// captures set and clear breakpoint events
	});
}

/*
Disable or enable all buttons according to state
*/
function disableAllButtons(state) {
	document.getElementById("save").disabled = state;
	document.getElementById("compile").disabled = state;
	disableRunButtons(state);
}

/*
Disable or enable run buttons according to state
*/
function disableRunButtons(state) {
	document.getElementById("run").disabled = state;
	document.getElementById("step").disabled = state;
	document.getElementById("stepi").disabled = state;
	document.getElementById("stop").disabled = state;
}

/*
Disable or enable single button according to state
*/
function disableButton(id, state) {
	document.getElementById(`${id}`).disabled = state;
}

/*
Determine if the run has breakpoint or not
If both running and there are breakpoints tell the user to either step or view waveform
Then disable run button
*/
function breakpointRun() {
	if (run && breakpoints) {
		showSnack("You can either step or view waveform now");
		disableButton("run", true);
		return true;
	}
	return false;
}

/*
Display loading spinner
Change section to body if you want to cover the whole page
*/
function showLoadingOverlay() {
	$('#section').loading({circles: 3, overlay: true, base: 1.0});
}

/*
Display loading spinner
Change section according to showLoadingOverlay
*/
function hideLoadingOverlay() {
	$('#section').loading({hide: true, destroy:true});
}

function createWaveform(data) {
	if (waveform != undefined) {
		delete waveform;
	}
	data = data.replace(/,\s*\]/gm, ']');
	// data = data.replace(/,\s*\}/gm, '}');
	// data = data.replace(/\\/gm, '\\\\');
	var wave_data = JSON.parse(data);
	document.getElementById('waveform-body').innerHTML = "";
	waveform = new Waveform('waveform-body', wave_data, null);
}

function displayReturn(data, disassembly) {
	document.getElementById('footer').style.visibility = 'visible';
	document.getElementById('waveform-body').style.visibility = 'visible';
	document.getElementById('editor').style.width = '50%';
	document.getElementById('editor').style.height = '75%';
	createWaveform(data);
	document.getElementById('console').innerHTML = disassembly;
	document.getElementById('console').scrollTop = document.getElementById('console').scrollHeight;
}

/*
* For some reason, god know what, the return of getBreakpoints is offset by 1 for each element
* And length returns double the actual length!
*/
function getBreakpoints () {
	var array = editor.session.getBreakpoints();
	var breakpoints = [];
	for (var key in array) {
		if (array[key] === 'ace_breakpoint') {
			breakpoints.push(parseInt(key)+1);
		}
	}
	socket.emit('breakpoints', breakpoints);
}

document.getElementById("save").onclick =
function () {
	// Get the code from the editor
	code = editor.getValue();
	// Tell the server to save the code
	socket.emit('save', code);
};

document.getElementById("compile").onclick =
function () {
	if(editor.session.getLength < 1) {
		alert("There is no code in the editor");
	}
	else if(editor.getValue() === code && status.ranOnce) {
		showSnack("Code hasn't changed");
	}
	else {
		showLoadingOverlay();
		initialize();
		status.ranOnce = true;
		disableButton("compile", true);
		disableButton("stop", false);
		code = editor.getValue();
		socket.emit('compile', code);
	}
};

document.getElementById("breakpoints").onclick =
function (code) {
	var breakpointsArray = editor.session.getBreakpoints();
	for(row in breakpointsArray){
		editor.session.addGutterDecoration(row, 'white');
		editor.session.clearBreakpoint(row);
	}
	socket.emit('breakpoints', null);
};

document.getElementById('run').onclick =
function () {
	getBreakpoints();
	status.run = true;
	if (!status.breakpoints) {
		socket.emit('run');
	} else {
		socket.emit('continue');
	}
};

document.getElementById('step').onclick =
function () {
	getBreakpoints();
	socket.emit('step');
};

document.getElementById('stepi').onclick =
function () {
	getBreakpoints();
	socket.emit('stepi');
};

document.getElementById('stop').onclick =
function () {
	socket.emit('stop');
	initialize();
};

function showSnack(text) {
	var snackbar = document.getElementById("snackbar");
	snackbar.innerHTML = text;
	snackbar.className = "show";
	setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, snackbarTime);
}

/*
Signal saved is received when code is saved to file
*/
socket.on('returnSaved', function(data) {
	// Hide the loading overlay displayed while saving
	showSnack("Saved Successfully");
});

/*
Signal finishedCompilation is received when compiling code is complete
*/
socket.on('returnCompiled', function() {
	// Set the compiled flag to true
	status.compiled = true;
	// hide the overlay displayed by compile button click
	hideLoadingOverlay();
	// Tell the user the code compiled
	showSnack("Compiled successfully");
	// Enable the run buttons
	disableRunButtons(false);
});

/*
Signal is received when a step is done or a run is finished
*/
socket.on('returnStep', function(data, disassembly) {
	displayReturn(data, disassembly);
});

/*
Signal is received when a step is done or a run is finished
*/
socket.on('returnStepi', function(data, disassembly) {
	displayReturn(data, disassembly);
});

/*
Signal is received when the code execution is finished
*/
socket.on('returnRun', function(data, disassembly) {
	console.log('received finish');
	displayReturn(data, disassembly);
	// tell the user the program finished
    showSnack("Program finished");
	// disable run buttons
	disableRunButtons(true);
	// enable compile button
	disableButton("compile", false);
	status.first = true;
});

/*
Signal is received when beekeeper is killed
*/
socket.on('returnStop', function() {
	showSnack("Beekeeper Killed");
	initialize();
});

/*
This function was meant for much more than this. What a waste.
*/
socket.on('error', function(data) {
	// To show proper message for xhr poll error
	// TODO need to handle xhr poll error correctly
	if (data.includes('xhr')) showSnack('Connection to server lost, please refresh page');
	// I have no idea why I turned this into string but I'm too afraid to remove it now
	else showSnack(`${data}`);
});

/*
Display message in snack and activate the compilation button
*/
socket.on('message', function(data) {
	showSnack(data);
});
