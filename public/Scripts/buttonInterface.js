var socket = io.connect('http://localhost:9000');

socket.on('proceed', function() {
	document.getElementById("compile").onclick = function (code) {
		var code = editor.getValue();
		socket.emit('compile', code);
	};

	document.getElementById('run').onclick = function () {
		socket.emit('run');
	};

	document.getElementById('runff').onclick = function () {
		socket.emit('runff');
	};

	document.getElementById('step').onclick = function () {
		socket.emit('step');
	};

	document.getElementById('stepi').onclick = function () {
		socket.emit('stepi');
	};

	document.getElementById('finish').onclick = function() {
		socket.emit('finish');
	}

	document.getElementById('break').onclick = function() {
		socket.emit('break');
	}
});

socket.on('respone', function() {
	console.log("response received");
	alert("Finished!");
	$("#waveform-container").load(window.location.href + "#waveform-container");
});

socket.on('finishedCompilation', function() {
		alert("Compiled!");
});

socket.on('error', function(data) {
	alert(`${error}`);
});

socket.on('message', function(data) {
	alert(`${data}`);
});
