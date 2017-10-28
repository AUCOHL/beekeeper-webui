var socket = io.connect('http://localhost:9000');

var waveform = document.getElementById("waveform-text");
var syntax = document.getElementById("syntaxSel");

document.getElementById("assemble").onclick = function (code) {
	var code = editor.getValue();
	socket.emit('assemble', code, language);
};

document.getElementById("run").onclick = function () {
	socket.emit('run');
};

document.getElementById("step").onclick = function () {
	socket.emit('step');
};


socket.on("respone", function(data) {
	waveform.src=data;
});
