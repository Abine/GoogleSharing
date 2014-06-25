(function() {
  var constants;

  constants = {
    proxyPort: '8080',
    identityPort: '3000',
    redisPort: '6379',
    redisHost: 'proxy-redis.abine.com',
    redisAuth: false
  };

  module.exports.constants = constants;

}).call(this);
