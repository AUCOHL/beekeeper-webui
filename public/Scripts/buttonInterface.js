var socket = io.connect('http://localhost:9000');

document.getElementById("assemble").onclick = function (code) {
	var code = editor.getValue();
	// var syntax = document.getElementById("syntaxSel");
	// var language = syntax.getValue();
	socket.emit('assemble', code);
};

document.getElementById("run").onclick = function () {
	socket.emit('run');
};

document.getElementById("step").onclick = function () {
	socket.emit('step');
};

socket.on("respone", function(data) {
	var waveform = document.getElementById("waveform-text");
	waveform.src=data;
});
