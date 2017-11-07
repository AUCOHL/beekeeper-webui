var socket = io.connect('http://localhost:9000');

socket.on('proceed', function() {
	document.getElementById("assemble").onclick = function (code) {
		var code = editor.getValue();
		// var syntax = document.getElementById("syntaxSel");
		// var language = syntax.getValue();
		socket.emit('assemble', code);
	};

	document.getElementById('run').onclick = function () {
		socket.emit('run');
	};

	document.getElementById('step').onclick = function () {
		socket.emit('step');
	};
});
socket.on('respone', function(data) {
		console.log("response received");
	  $("#waveform-container").load(window.location.href + "#waveform-container");
});

socket.on("finishedAssembly", function() {
		alert("assembled!");
});

socket.on('error', function(data) {
	alert(`${error}`);
});
