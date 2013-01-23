var BR = require('./backbone-relational');
console.log(BR);

require('http').createServer(function(req, res) {
	if (/^\/(\?|$)/.test(req.url)) req.url = req.url.replace(/^\//, '/index.html');
	var basename = req.url.split("?")[0];
	require('fs').readFile(__dirname + basename, function(err, data) {
		if (err) {
			res.writeHead(404); res.end();
		} else {
			var mime = 'text/html';
			if (req.url.slice(-3) === '.js') mime = 'text/javascript';
			if (req.url.slice(-4) === '.css') mime = 'text/css';
			res.writeHead(200, {'content-type': mime, 'content-length': data.length});
			res.end(data);
		}
	});
}).listen(8080);
