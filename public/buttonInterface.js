var socket = io.connect('http://localhost:9000');
var clicks = 0;

socket.on('proceed', function() {
	document.getElementById("compile").onclick = function (code) {
		var code = editor.getValue();
		socket.emit('compile', code);
	};

	document.getElementById('run').onclick = function () {
		socket.emit('run');
		// window.open("waveform-viewer.html");
	};

	document.getElementById('runff').onclick = function () {
		socket.emit('runff');
		// window.open("waveform-viewer.html");
	};

	document.getElementById('step').onclick = function () {
		socket.emit('step');
		console.log("clicked");
		if (clicks == 0) {
			console.log("first click");
			clicks = 1;
			document.getElementById('step').click();
		} else {
			// window.open("waveform-viewer.html");
		}
	};

	document.getElementById('stepi').onclick = function () {
		socket.emit('stepi');
		console.log("clicked");
		if (clicks == 0) {
			console.log("first click");
			clicks = 1;
			document.getElementById('stepi').click();
		} else {
			// window.open("waveform-viewer.html");
		}
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
});

socket.on('finishedCompilation', function() {
	alert("Compiled!");
});

socket.on('error', function(data) {
	alert(`${data}`);
});

socket.on('message', function(data) {
	alert(`${data}`);
});
