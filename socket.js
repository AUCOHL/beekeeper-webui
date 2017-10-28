#!/usr/bin/env node
const exec = require('child_process').exec;
const path = require('path');
var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(80);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

// exec(``, (error, stdout, stderr) => {
// if (error || stderr) {
//     console.error(`File reading failed: ${error}.`);
//     process.exit(73);
//
// }
//
// io.sockets.on('connection', function (socket) {
//   socket.emit('news', { hello: 'world' }); // Send data to client
//
//   // wait for the event raised by the client
//   socket.on('my other event', function (data) {
//     console.log(data);
//   });
// });
