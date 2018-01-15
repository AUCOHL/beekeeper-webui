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
	document.getElementById("runff").disabled = state;
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


	function breakpointRun() {
		if (run && breakpoints) {
			showSnack("You can either step or view waveform now");
			disableButton("run", true);
			disableButton("runff", true);
			return true;
		}
		return false;
	}


$(document).ready(function () {
	$( "#compile" ).click(function() {
		$('#section').loading({ circles: 3,overlay: true });
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

	document.getElementById('runff').onclick = function () {
		if (!breakpointRun()) {
	 		run = true;
			socket.emit('runff');
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
	var x = document.getElementById("snackbar");
	x.innerHTML = text;
	x.className = "show";
	setTimeout(function(){ x.className = x.className.replace("show", ""); }, snackbarTime);
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
	$('#section').loading({hide: true});
	showSnack("Compiled successfully");
	disableRunButtons(false);
});

socket.on('error', function(data) {
	showSnack(`${data}`);
	document.getElementById("compile").disabled = false;
});

socket.on('message', function(data) {
	showSnack(data);
	document.getElementById("compile").disabled = false;
});
