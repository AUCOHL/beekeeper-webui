// The port used for the app is 9000
var socket = io.connect('http://localhost:9000');
// Keep track of whether we're running or stepping
var run = false;
// Keep track of whether beekeeper will stop for breakpoints
var breakpoints = false;
// Create the new window object for waveform
var newWindow = window;
// Change this value if you want the snackbar to appear longer or shorter
var snackbarTime = 4000;
var waveform;
var ranOnce = false;

initialize();

// As the app starts, disable all buttons except save and compile
function initialize() {
	disableAllButtons(true);
	disableButton("save", false);
	disableButton("compile", false);
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
	document.getElementById("breakpoints").disabled = state;
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
	// $('#section').loading({circles: 3, overlay: true, base: 1.0});
}

/*
Display loading spinner
Change section according to showLoadingOverlay
*/
function hideLoadingOverlay() {
	// $('#section').loading({hide: true, destroy:true});
}

// The socket receives the proceed signal when server first initiliazes
socket.on('proceed', function() {

	document.getElementById("save").onclick =
	function () {
		// Get the code from the editor
		code = editor.getValue();
		// Tell the server to save the code
		socket.emit('save', code);
	};

	document.getElementById("compile").onclick =
	function () {
		showLoadingOverlay();
		if(editor.session.getLength < 1) {
			alert("There is no code in the editor");
		}
		else if(editor.getValue() === code && ranOnce) {
			showSnack("Code hasn't changed");
		}
		else {
			ranOnce = true;
			disableButton("compile", true);
			disableButton("stop", false);
			run = false;
			code = editor.getValue();
			socket.emit('compile', code);
		}
	};

	document.getElementById("breakpoints").onclick =
	function (code) {
		var maxNumber = editor.session.getLength();
		var minNumber = 1;
		var breakpoints = "0";
		while (breakpoints != null) {
			var breakpoints = prompt("Specify the line numbers seperated by commas:");
			if (breakpoints.includes("0") || breakpoints.includes(`${maxNumber+1}`)) {
 				alert(`Numbers should be between 1 and ${maxNumber}`);
			} else break;
		}
		socket.emit('breakpoints', breakpoints);
	};

	document.getElementById('run').onclick =
	function () {
		run = true;
		state = breakpointRun();
		if (!state) {
			socket.emit('run');
		}
	};

	document.getElementById('step').onclick =
	function () {
		socket.emit('step');
	};

	document.getElementById('stepi').onclick =
	function () {
		socket.emit('stepi');
	};

	document.getElementById('waveform').onclick =
	function () {
		socket.emit('waveform');
		newWindow.close();
		// There are two different HTML templates, one for stepping and one for running
		if (run) newWindow = window.open("waveform-viewer/waveform-viewer.html");
		else newWindow = window.open("waveform-viewer/waveform-footer.html");
	};

	document.getElementById('stop').onclick =
	function () {
		socket.emit('stop');
	};
});

function showSnack(text) {
	var snackbar = document.getElementById("snackbar");
	snackbar.innerHTML = text;
	snackbar.className = "show";
	setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, snackbarTime);
}

/*
Signal saved is received when code is saved to file
*/
socket.on('saved', function(data) {
	// Hide the loading overlay displayed while saving
	showSnack("Saved Successfully");
});

/*
Signal finishedCompilation is received when compiling code is complete
*/
socket.on('finishedCompilation', function() {
	// Set the compiled flag to true
	var compiled = true;
	// hide the overlay displayed by compile button click
	hideLoadingOverlay();
	// Tell the user the code compiled
	showSnack("Compiled successfully");
	// Enable the run buttons
	disableRunButtons(false);
});

/*
Signal response is received when a step is done or a run is finished
*/
socket.on('response', function() {
	// Close the previosly opened window
	// newWindow.close();
	// There are two templates, the one with footer for stepping mode the first is for running
	// if (run) newWindow = window.open("waveform-viewer/waveform-viewer.html");
	// else newWindow = window.open("waveform-viewer/waveform-footer.html");
});

/*
Signal complete is received when the code execution is finished
*/
socket.on('complete', function() {
	if (waveform != undefined) delete waveform;
	document.getElementById('waveform-container').innerHTML = "";
	waveform = new Waveform('waveform-container', data_cntr, null);
	waveform.setOnChangeListener(function(e){console.log(e);});
	// tell the user the program finished
    showSnack("Program finished");
	// disable run buttons
	disableRunButtons(true);
	// enable compile button
	disableButton("compile", false);
});

socket.on('stopped', function() {
	showSnack("Beekeeper Killed");
	initialize();
});

/*
This function was meant for much more than this. What a waste.
*/
socket.on('error', function(data) {
	// To show proper message for xhr poll error
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
