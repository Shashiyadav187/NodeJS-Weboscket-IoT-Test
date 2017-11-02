var WebSocketServer = require('websocket').server;
var http = require('http');
var config = require('./config');
var request = require('request');

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');

    sendNoty('Server started');
});

var connections = [];

wsServer = new WebSocketServer({
    httpServer: server
}).on('request', function (request) {
    // Accept connection
    var connection = request.accept(null, request.origin);
    connections.push(connection);

    console.log((new Date()) + ' Connection accepted. IP: ' + request.remoteAddress);
    sendNoty('Connection connected ' + request.remoteAddress);

    var lastMsgTime = new Date().getTime();

    var connectionTimer = setInterval(function () {
        var diffTime = new Date().getTime() - lastMsgTime;

        if (diffTime > 600000) {
            sendNoty('Device has not replied for 10 minutes ' + connection.remoteAddress);
            connection.close();
        }

        connection.sendUTF(JSON.stringify({
            type: "checking"
        }));
    }, 300000);

    // Events
    connection.on('message', function () {
        lastMsgTime = new Date().getTime();
    });

    connection.on('close', function () {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');

        var index = connections.indexOf(connection);

        if (index !== -1) {
            connections.splice(index, 1);
        }

        sendAll(JSON.stringify({
            type: "disconnected",
            ip: connection.remoteAddress
        }));

        sendNoty('Client disconnected ' + connection.remoteAddress);

        connectionTimer.stop();
    });
});

function sendAll(data) {
    connections.forEach(function (destination) {
        destination.sendUTF(data);
    });
}

function sendNoty(text, callback) {
    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    var options = {
        url: 'https://api.telegram.org/bot' + config.telegram.bot_token + '/sendMessage',
        method: 'POST',
        headers: headers,
        form: {'chat_id': config.telegram.chat_id, 'text': text}
    };

    request(options, callback);
}