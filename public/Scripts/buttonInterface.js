var socket = io.connect('http://localhost:9000');
var run = false;
var breakpoints = false;
var clicks = 0;
var newWindow = window;
var snackbarTime = 4000;

disableAllButtons(true);
disableButton("save", false);
disableButton("compile", false);

function disableRunButtons(state) {
	document.getElementById("breakpoints").disabled = state;
	document.getElementById("run").disabled = state;
	document.getElementById("step").disabled = state;
	document.getElementById("stepi").disabled = state;
	document.getElementById("stop").disabled = state;
}

function disableAllButtons(state) {
	document.getElementById("save").disabled = state;
	document.getElementById("compile").disabled = state;
	disableRunButtons(state);
}

function disableButton(id, state) {
	document.getElementById(`${id}`).disabled = state;
}

function showLoadingOverlay() {
	$('#section').loading({ circles: 3,overlay: true });
}

function hideLoadingOverlay() {
	$('#section').loading({hide: true});
}

function breakpointRun() {
	if (run && breakpoints) {
		showSnack("You can either step or view waveform now");
		disableButton("run", true);
		return true;
	}
	return false;
}

$(document).ready(function () {
	$( "#compile" ).click(function() {
		showLoadingOverlay();
	});
})

socket.on('proceed', function() {

	document.getElementById("save").onclick = function (code) {
		var code = editor.getValue();
		socket.emit('save', code);
		showSnack("File saved");
	};

	document.getElementById("compile").onclick = function (code) {
		if(editor.session.getLength < 1) alert("There is no code in the editor");
		else {
			disableButton("compile", true);
			disableButton("stop", false);
			run = false;
			var code = editor.getValue();
			socket.emit('compile', code);
		}
	};

	document.getElementById("breakpoints").onclick = function (code) {
		var maxNumber = editor.session.getLength();
		var minNumber = 1;
		var breakpoints = "0";
		while (true) {
			var breakpoints = prompt("Specify the line numbers seperated by commas:", "0");
			if (breakpoints === null || breakpoints === undefined || breakpoints.includes("0") || breakpoints.includes(`${maxNumber+1}`)) {
 				alert(`Numbers should be between 1 and ${maxNumber}`);
			} else break;
		}
		socket.emit('breakpoints', breakpoints);
	};

	document.getElementById('run').onclick = function () {
		if (!breakpointRun()) {
			run = true;
			socket.emit('run');
		}
	};

	document.getElementById('step').onclick = function () {
		socket.emit('step');
	};

	document.getElementById('stepi').onclick = function () {
		socket.emit('stepi');
	};

	document.getElementById('waveform').onclick = function () {
		socket.emit('waveform');
		newWindow.close();
		// There are two different HTML templates, one for stepping and one for running
		if (run) newWindow = window.open("waveform-viewer/waveform-viewer.html");
		else newWindow = window.open("waveform-viewer/waveform-footer.html");
	};
});

function showSnack(text) {
	console.log("showSnack");
	var snackbar = document.getElementById("snackbar");
	snackbar.innerHTML = text;
	snackbar.className = "show";
	setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, snackbarTime);
}

socket.on('response', function() {
	newWindow.close();
	if (run) newWindow = window.open("waveform-viewer/waveform-viewer.html");
	else newWindow = window.open("waveform-viewer/waveform-footer.html");
});

socket.on('complete', function() {
    console.log("received complete signal");
    showSnack("Program finished");
	disableButton("compile", false);
	disableRunButtons(true);
	document.getElementById("waveform").click();
});

socket.on('finishedCompilation', function() {
	compiled = true;
	hideLoadingOverlay();
	showSnack("Compiled successfully");
	disableRunButtons(false);
});

socket.on('error', function(data) {
	// This function was meant for much more than this. What a waste.
	// I have no idea why I turned this into string but I'm too afraid to remove it now
	showSnack(`${data}`);
	disableButton("compile", false);
});

socket.on('message', function(data) {
	// Display message in snack and activate the compilation button
	showSnack(data);
	disableButton("compile", false);
});

socket.on('saved', function(data) {
	// Hide the loading overlay displayed while saving
	hideLoadingOverlay();
});
