var BR = require('./backbone-relational');
console.log(BR);

require('http').createServer(function(req, res) {
	if (req.url === '/') req.url = '/index.html';
	require('fs').readFile(__dirname + req.url, function(err, data) {
		if (err) {
			res.writeHead(404); res.end();
		} else {
			var mime = 'text/html';
			if (req.url.slice(-3) === '.js') mime = 'text/javascript';
			if (req.url.slice(-4) === '.css') mime = 'text/stylesheet';
			res.writeHead(200, {'content-type': mime, 'content-length': data.length});
			res.end(data);
		}
	});
}).listen(8080);
