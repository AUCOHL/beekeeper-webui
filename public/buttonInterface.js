var socket = io.connect('http://localhost:9000');
var clicks = 0;
var compiled = false;

socket.on('proceed', function() {
	document.getElementById("compile").onclick = function (code) {
		var code = editor.getValue();
		clicks = 0;
		compiled = true;
		socket.emit('compile', code);
	};

	document.getElementById('run').onclick = function () {
		if (compiled) {
			socket.emit('run');
			setTimeout(function(){ window.open("waveform-viewer.html"); }, 2000);
		} else {
			alert("Please Compile First");
		}
		// window.open("waveform-viewer.html");
	};

	document.getElementById('runff').onclick = function () {
		if (compiled) {
			socket.emit('runff');
			setTimeout(function(){ window.open("waveform-viewer.html"); }, 2000);
		} else {
			alert("Please Compile First");
		}
		// window.open("waveform-viewer.html");
	};

	document.getElementById('step').onclick = function () {
		if (compiled) {
			socket.emit('step');
			console.log("clicked");
			if (clicks == 0) {
				console.log("first click");
				clicks = 1;
				socket.emit('stepi');
			}
		 	setTimeout(function(){ window.open("waveform-viewer.html"); }, 2000);
		} else {
			alert("Please Compile First");
		}
	};

	document.getElementById('stepi').onclick = function () {
		if (compiled) {
			socket.emit('stepi');
			console.log("clicked");
			if (clicks == 0) {
				console.log("first click");
				clicks = 1;
				socket.emit('stepi');
			}
			setTimeout(function(){ window.open("waveform-viewer.html"); }, 2000);
		} else {
			alert("Please Compile First");
		}
	};

	document.getElementById('finish').onclick = function() {
		if (compiled) {
			socket.emit('finish');
		} else {
			alert("Please Compile First");
		}
	}

	document.getElementById('break').onclick = function() {
		if (compiled) {
			socket.emit('break');
		} else {
			alert("Please Compile First");
		}
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
