var socket = io.connect('http://localhost:9000');
run = false;
var clicks = 0;
var compiled = false;

document.getElementById("run").disabled = true;
document.getElementById("step").disabled = true;
document.getElementById("stepi").disabled = true;
document.getElementById("waveform").disabled = true;

socket.on('proceed', function() {

	document.getElementById("save").onclick = function (code) {
		showSnack("File saved");
		var code = editor.getValue();
		socket.emit('save', code);
	};

	document.getElementById("compile").onclick = function (code) {
        document.getElementById("run").disabled = false;
        document.getElementById("step").disabled = false;
        document.getElementById("stepi").disabled = false;
		var code = editor.getValue();
		clicks = 0;
		compiled = true;
		socket.emit('compile', code);
	};

	document.getElementById('run').onclick = function () {
		if (compiled) {
			run = true;
			socket.emit('run');
		} else {
			alert("Please Compile First");
		}
	};

	// document.getElementById('runff').onclick = function () {
	// 	if (compiled) {
	// 		socket.emit('runff');
	// 		// setTimeout(function(){ window.open("waveform-viewer.html"); }, 1000);
	// 	} else {
	// 		alert("Please Compile First");
	// 	}
	// };

	document.getElementById('step').onclick = function () {
		if (compiled) {
			socket.emit('step');
		} else {
			alert("Please Compile First");
		}
	};

	document.getElementById('stepi').onclick = function () {
		if (compiled) {
			socket.emit('stepi');
		} else {
			alert("Please Compile First");
		}
	};

	// document.getElementById('finish').onclick = function() {
	// 	if (compiled) {
	// 		socket.emit('finish');
	// 	} else {
	// 		alert("Please Compile First");
	// 	}
	// }

	// document.getElementById('break').onclick = function() {
	// 	if (compiled) {
	// 		socket.emit('break');
	// 	} else {
	// 		alert("Please Compile First");
	// 	}
	// }

	document.getElementById('waveform').onclick = function () {
		window.open("waveform-viewer.html");
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
	window.open("waveform-viewer.html");
});

socket.on('complete', function() {
    console.log("received complete signal");
    document.getElementById("run").disabled = true;
    document.getElementById("step").disabled = true;
    document.getElementById("stepi").disabled = true;
    document.getElementById("waveform").disabled = false;
	if (run) document.getElementById("waveform").click();
    showSnack("Program finished");
});

socket.on('finishedCompilation', function() {
	showSnack("Compiled successfully");
});

socket.on('error', function(data) {
	alert(`${data}`);
});

socket.on('message', function(data) {
	showSnack(`${data}`);
});
