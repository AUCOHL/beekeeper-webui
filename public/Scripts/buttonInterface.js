var socket = io.connect('http://localhost:9000');
var run = false;
var clicks = 0;
var newWindow = window;
var compiled = false;

document.getElementById("run").disabled = true;
document.getElementById("step").disabled = true;
document.getElementById("stepi").disabled = true;
document.getElementById("waveform").disabled = true;

socket.on('proceed', function() {

	document.getElementById("save").onclick = function (code) {
		var code = editor.getValue();
		socket.emit('save', code);
		showSnack("File saved");
	};

	document.getElementById("compile").onclick = function (code) {
		document.getElementById("compile").disabled = true;
		run = false;
		compiled = true;
		var code = editor.getValue();
		socket.emit('compile', code);
	};

	document.getElementById('run').onclick = function () {
		run = true;
		socket.emit('run');
	};

	document.getElementById('step').onclick = function () {
		socket.emit('step');
	};

	document.getElementById('stepi').onclick = function () {
		socket.emit('stepi');
	};

	document.getElementById('waveform').onclick = function () {
		newWindow.close();
		if (run) newWindow = window.open("waveform-viewer/waveform-viewer.html");
		else newWindow = window.open("waveform-viewer/waveform-console.html");
	};

});

function showSnack(text) {
	console.log("showSnack");
	var x = document.getElementById("snackbar")
	x.innerHTML = text;
	x.className = "show";
	setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

socket.on('response', function() {
	newWindow.close();
	document.getElementById("waveform").disabled = false;
	if (run) newWindow = window.open("waveform-viewer/waveform-viewer.html");
	else newWindow = window.open("waveform-viewer/waveform-console.html");
});

socket.on('complete', function() {
    console.log("received complete signal");
    showSnack("Program finished");
    document.getElementById("run").disabled = true;
    document.getElementById("step").disabled = true;
    document.getElementById("stepi").disabled = true;
    document.getElementById("waveform").disabled = false;
	document.getElementById("waveform").click();
});

socket.on('finishedCompilation', function() {
	showSnack("Compiled successfully");
	document.getElementById("compile").disabled = false;
	document.getElementById("run").disabled = false;
	document.getElementById("step").disabled = false;
	document.getElementById("stepi").disabled = false;
});

socket.on('error', function(data) {
	showSnack(`${data}`);
	document.getElementById("compile").disabled = false;
});

socket.on('message', function(data) {
	showSnack(data);
	document.getElementById("compile").disabled = false;
});
