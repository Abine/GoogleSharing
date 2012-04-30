/*
 * Copyright (c) 2010 Moxie Marlinspike
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 * USA
 */

function Prefetcher(urlScheme, host, port) {
  this.urlScheme               = urlScheme;
  this.host                    = host;
  this.port                    = 80;

  this.cachedIdentity          = null;
  this.backupIdentity          = null;

  this.cachedIdentityTimestamp = 0;
  this.outstandingAsyncRequest = false;
}

Prefetcher.prototype.parseIdentity = function(response) {
  // REVIEW 2012-04-27 <moxie> -- Why does the respose have escaped quotes in it?  We should
  // just fix that, no?

  // kind of hacky, response comes back wrapped in quotes, and internal quotes are escaped.
  response = response.substring(1,response.length-1);
  response = response.replace(/\\"/g,'"');

  if(!this.hasCachedIdentity()) {
    this.cachedIdentity          = new Identity(JSON.parse(response));
    this.cachedIdentityTimestamp = new Date().getTime();
  } else {
    this.backupIdentity          = new Identity(JSON.parse(response));
  }
  return this.cachedIdentity;
};

Prefetcher.prototype.sendRequest = function(request, async,method,data) {
  var cookieRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
  var thisInstance  = this;
  if (async) {
    if(method == "PUT"){
      // REVIEW 2012-04-27 <moxie> -- Remove comments, if the code isn't clear it should
      // be refactored.

      // we don't care about the response for checking in identity
      cookieRequest.onreadystatechange = function(){};
    } else {
      cookieRequest.onreadystatechange = function() {
        if (cookieRequest.readyState == 4) {  
      	 if(cookieRequest.status == 200) {
	   // REVIEW 2012-04-27 <moxie> -- Fix tabs.
      	   thisInstance.parseIdentity(cookieRequest.responseText);
  	       thisInstance.outstandingAsyncRequest = false;
      	 } else {
  	      thisInstance.outstandingAsyncRequest = false;
      	 }
        }  
      };  
      this.outstandingAsyncRequest = true;
    }
  }

  cookieRequest.open(method, request, async); 
  cookieRequest.setRequestHeader('Accept', 'application/json'); 
  cookieRequest.setRequestHeader('Content-Type','application/json');
  cookieRequest.overrideMimeType('application/json');  
  cookieRequest.send(data);

  if (!async && method == "GET" && cookieRequest.status == 200) {
    return this.parseIdentity(cookieRequest.responseText);
  } else if (!async) {
    return null;
  }
};

Prefetcher.prototype.hasCachedIdentity = function() {
  return (this.cachedIdentity != null && ((new Date().getTime() - this.cachedIdentityTimestamp) <= 75000));
};

Prefetcher.prototype.hasBackupIdentity = function(){
  return this.backupIdentity != null;
};

Prefetcher.prototype.fetchCachedSharedIdentity = function() {
  if (this.hasCachedIdentity()) {

    return this.cachedIdentity;

    // REVIEW 2012-04-27 <moxie> -- This feels like overloading of this function to me,
    // and it should be recomposed up into fetchIdentity, or both methods should be recomposed
    // into a separate collection of functions.
  } else if(this.hasBackupIdentity()){
    // REVIEW 2012-04-27 <moxie> -- Remove comments, replace with identically-named functions
    // if necessary.

    // check in old identity
    this.sendRequest(this.urlScheme + this.host + ":" + this.port + "/identity",true,"PUT",JSON.stringify(this.cachedIdentity));
    // swap with backup identity
    this.cachedIdentity = this.backupIdentity;
    // reset cache timeout
    this.cachedIdentityTimestamp = (new Date()).getTime();
    // checkout a new backup identity
    this.sendRequest(this.urlScheme + this.host + ":" + this.port + "/identity",true,"GET");
    return this.cachedIdentity;
  }  
  return null;
};

Prefetcher.prototype.updateSharedIdentity = function(cookie, domain, path) {
  if(this.cachedIdentity){
    this.cachedIdentity.addUpdateCookie(cookie,domain,path);
  }
};

// REVIEW 2012-04-27 <moxie> -- This class should kick off an async identity
// request on startup so that there's never a blocking action from the chrome.
Prefetcher.prototype.fetchSharedIdentity = function(async) {
  var identity = this.fetchCachedSharedIdentity();
  if (identity == null && !(async && this.outstandingAsyncRequest)){
    // fetch an identity and a backup
    identity = this.sendRequest(this.urlScheme + this.host + ":" + this.port + "/identity", async,"GET",null);
    this.sendRequest(this.urlScheme + this.host + ":" + this.port + "/identity", true,"GET",null);
  }

  return identity;
};

