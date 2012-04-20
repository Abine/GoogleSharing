var redis = require("redis"),
    userAgents = require('./useragents'),
    client = redis.createClient();

var IdentityProvider = function(){
	this.BASE_POOL_SIZE = 30;
    // populate pool
	this.addToGlobalPool(this.BASE_POOL_SIZE,function(){});
};

IdentityProvider.prototype.addToGlobalPool = function(howMany,cb){
    var newIdentity = {userAgent:userAgents.getRandom(),cookies:[]};
    var self = this;
    client.sadd("identities",Math.random()+"@AB1N3!!"+JSON.stringify(newIdentity),function(err,res){
        if(howMany==1){
            cb();
        } else {
            self.addToGlobalPool(howMany-1,cb);
        }
    });
};

IdentityProvider.prototype.getIdentityJSON = function(cb){
    var self = this;
    client.spop("identities",function(err,identityJSON){
        if(!err && identityJSON && identityJSON != ""){
            cb(identityJSON);
        } else {
            // no more in the pool, add some more!
            self.addToGlobalPool(self.BASE_POOL_SIZE,function(){self.getIdentityJSON(cb);});
        } 
    });
};

IdentityProvider.prototype.putIdentity = function(identityJSON,cb){
    client.sadd("identities",identityJSON,cb);
};

exports.IdentityProvider = IdentityProvider;