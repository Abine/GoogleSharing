(function() {
  var constants, fs, http, httpProxy, httpServer, net, proxy, redis, redisClient, rules, url, util, zlib;

  http = require('http');

  net = require('net');

  url = require('url');

  util = require('util');

  httpProxy = require('http-proxy');

  constants = require('./constants').constants;

  proxy = httpProxy.createProxyServer();

  var googleServers = /((encrypted|clients[0-9]*|id|www)\.google\.com)|((.+\.)?1e100\.net)|(.+\.gstatic\.com)|(.+\.googlehosted\.com)/i;

  proxy.on('error', function(err, req, res) {
    console.log('proxy error occured: ', util.inspect(err));
    return res.end();
  });

  httpServer = http.createServer(function(req, res) {
    // do not allow non https requests
    var srvUrl = url.parse(req.url);
    if (googleServers.test(srvUrl.host)) {
      console.log("http proxy request for "+req.url);
      return proxy.web(req, res, {
        target: req.url
      });
    } else {
      console.log("rejecting proxy request for "+req.url);
      res.end();
    }
  });

  httpServer.on('connect', function(req, cltSocket, head) {
    var srvSocket, srvUrl;
    srvUrl = url.parse('https://' + req.url);
    // allow only google search related servers
    if (!googleServers.test(srvUrl.hostname)) {
      console.log("rejected proxy request for "+srvUrl.hostname);
      cltSocket.write('HTTP/1.1 401 Access Denied\r\n\r\n');
      cltSocket.end();
      return;
    }
    return srvSocket = net.connect(srvUrl.port, srvUrl.hostname, function() {
      console.log('https tunnel to ' + srvUrl.hostname + ':' + srvUrl.port);
      srvSocket.on("error", function(err) {
        srvSocket.end();
        return cltSocket.end();
      });
      cltSocket.write('HTTP/1.1 200 Connection Established\r\nProxy-agent: Node-Proxy\r\n\r\n');
      srvSocket.write(head);
      srvSocket.pipe(cltSocket);
      return cltSocket.pipe(srvSocket);
    });
  });

  httpServer.listen(constants.proxyPort, null, function() {
    return console.log('Listening on port %d', httpServer.address().port);
  });

}).call(this);
