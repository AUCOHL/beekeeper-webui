var WebSocket = require('ws');

var wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
    console.log("Connected to Websocket.");
    
    var beekeeper = require("./build/Release/hello.node");
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send("Hello, " + beekeeper.Initialize("../Samples/bubblesort.bin"));
    ws.send("Hello, " + beekeeper.Update());
});

console.log("Listening to Websocket.");