var constants = require('./constants').constants;

var restify = require('restify'),
  server = restify.createServer({
    name: 'googlesharing'
    ,certificate: ''
    ,key:''
  }),
  IdentityProvider = require('./identityprovider').IdentityProvider;

server.use(restify.acceptParser(server.acceptable));
server.use(restify.bodyParser());
server.listen(constants.identityPort);

var identityProvider = new IdentityProvider();
var sep = "@AB1N3!!";

server.put('/identity', function(req,res,next){
  var identityJSON = req.body;
  identityJSON = Math.random()+sep+identityJSON;
  identityProvider.putIdentity(identityJSON,function(err){
    res.send({});
    return next();
  });
});

server.get('/identity', function(req,res,next){
  identityProvider.getIdentityJSON(function(identityJSON){
    identityJSON = identityJSON.split(sep)[1];
    res.send(JSON.parse(identityJSON));
    return next();
  });
});