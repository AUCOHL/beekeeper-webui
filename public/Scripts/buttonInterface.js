var socket = io.connect('http://localhost:9000');
var clicks = 0;
var compiled = false;

$body = $("body");

$(document).on({
    ajaxStart: function() { $body.addClass("loading");    },
     ajaxStop: function() { $body.removeClass("loading"); }
});

// Initiates an AJAX request on click
$(document).on("click", function(){
    $.get("/mockjax");
});

socket.on('proceed', function() {

	// document.getElementById("save").onclick = function (code) {
	// 	var code = editor.getValue();
	// 	socket.emit('save', code);
	// };

	document.getElementById("compile").onclick = function (code) {
		var code = editor.getValue();
		clicks = 0;
		compiled = true;
		socket.emit('compile', code);
	};

	document.getElementById('run').onclick = function () {
		if (compiled) {
			socket.emit('run');
			// setTimeout(function(){ window.open("waveform-viewer.html"); }, 1000);
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
			if (clicks == 0) {
				console.log("first click");
				clicks = 1;
			}
			// 	setTimeout(function(){ window.open("waveform-viewer.html"); }, 1000);
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
			}
			// setTimeout(function(){ window.open("waveform-viewer.html"); }, 1000);
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

	// document.getElementById('break').onclick = function() {
	// 	if (compiled) {
	// 		socket.emit('break');
	// 	} else {
	// 		alert("Please Compile First");
	// 	}
	// }

	document.getElementById('waveform').onclick = function () {
		if (compiled) {
			window.open("waveform-viewer.html");
		} else {
			alert("Please Compile First");
		}
	};
});

socket.on('response', function() {
	// alert("got response");
	window.open("waveform-viewer.html");
});

socket.on('finished', function() {
	// alert("got response");
    alert("Program finished");
});

socket.on('finishedCompilation', function() {
	alert("Compiled");
});

socket.on('error', function(data) {
	alert(`${data}`);
});

socket.on('message', function(data) {
	alert(`${data}`);
});
