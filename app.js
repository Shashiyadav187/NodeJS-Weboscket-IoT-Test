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
    var lastResponseTime = new Date().getTime();

    connections.push(connection);

    // Logging
    console.log((new Date()) + ' Connected. IP: ' + request.remoteAddress);
    sendNoty('New Connection. IP: ' + request.remoteAddress);

    // Start ping timer
    var connectionTimer = setInterval(function () {
        var diffTime = new Date().getTime() - lastResponseTime;

        if (diffTime > config.ws.max_no_response_time_minutes * 60000) {
            console.log((new Date()) + ' Connection has not replied for ' + diffTime + ' ms. IP: ' + connection.remoteAddress);
            sendNoty('Connection has not replied for ' + diffTime + ' ms. IP: ' + connection.remoteAddress);
        }

        connection.sendUTF(JSON.stringify({
            type: "ping"
        }));

        console.log((new Date()) + ' Sent ping for IP: ' + connection.remoteAddress);
    }, config.ws.ping_interval_minutes * 60000);

    // Bind Events
    connection.on('message', function (message) {
        console.log((new Date()) + ' Message "' + message.utf8Data + '" from IP: ' + request.remoteAddress);

        lastResponseTime = new Date().getTime();

        console.log(lastResponseTime);
    });

    connection.on('close', function () {
        console.log((new Date()) + ' Connection closed. IP: ' + connection.remoteAddress);
        sendNoty('Connection closed. IP: ' + connection.remoteAddress);

        // Remove from array
        var index = connections.indexOf(connection);

        if (index !== -1) {
            connections.splice(index, 1);
        }

        // Stop ping timer
        clearInterval(connectionTimer);
    });
});

// function sendAll(data) {
//     connections.forEach(function (destination) {
//         destination.sendUTF(data);
//     });
// }

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