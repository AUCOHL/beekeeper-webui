var socket = io.connect('http://localhost');

socket.emit('beekeeper');
document.getElementById("assemble").onclick = function () {
	socket.emit('assemble');
};
document.getElementById("run").onclick = function () {
	socket.emit('run');
};

document.getElementById("step").onclick = function () {
	socket.emit('run');
};
