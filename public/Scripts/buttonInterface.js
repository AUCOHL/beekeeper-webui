var socket = io.connect('http://localhost:9000');

var waveform = document.getElementById("waveform-text");
waveform.src = "Scripts/initialSource.js";

document.getElementById("assemble").onclick = function () {
	socket.emit('assemble');
};
document.getElementById("run").onclick = function () {
	socket.emit('run');
};

document.getElementById("step").onclick = function () {
	socket.emit('step');
};
