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

function Cookie(jsonObject) {
  if(jsonObject){
    this.name   = jsonObject.name;
    this.value  = jsonObject.value;
    this.domain = jsonObject.domain;
    this.path   = jsonObject.path;
  } else {
    this.name = null;
    this.value = null;
    this.domain = null;
    this.path = null;
  }
}


Cookie.prototype.splitOnce = function(str,delim){
  var arr = str.split(delim);
  var first = arr[0];
  arr.shift();
  return [first,arr.join("delim")];
}

Cookie.prototype.fromHeader = function(cookieString,domain,path){
  if(cookieString && domain && path){
    var tokens = cookieString.split(";");
    var nameValue = this.splitOnce(tokens[0],"=");
    var parameters = this.parseCookieParameters(tokens);

    if(nameValue.length > 1){
      this.name = nameValue[0].trim();
      this.value = nameValue[1].trim();
    } else {
      this.name = this.value =  nameValue[0].trim();
    }

    this.domain = parameters['domain'] || domain || "";
    this.path = parameters['path'] || this.stripDownPath(path) || "/";
  } else {
    this.name = this.value = this.domain = this.path = "";
  }
};

Cookie.prototype.stripDownPath = function(path){
  var argIndex = path.indexOf("?");
  if(argIndex != -1)
    path = path.substr(0,argIndex);

  var lastSlash = path.lastIndexOf("/");

  if(lastSlash == -1) return "/";

  return path.substring(0,lastSlash);
};

Cookie.prototype.parseCookieParameters = function(tokens){
  var params = {};
  for(var i=0;i<tokens.length;i++){
    var nameValue = this.splitOnce(tokens[i],"=");
    if(nameValue.length > 1){
      params[nameValue[0].trim().toLowerCase()] = nameValue[1].trim();
    }
  } 
  return params;
};

Cookie.prototype.isValidFor = function(domain, path) {
  if (this.domain[0] == '.') {
    return (this.endsWith(domain, this.domain)) && (path.indexOf(this.path) == 0);
  } else {
    return ((domain == this.domain) || (this.endsWith(domain, "." + this.domain))) && (path.indexOf(this.path) == 0);
  }  
};

Cookie.prototype.stripDownPath = function(path){
  var argIndex = path.indexOf("?");
  if(argIndex != -1)
    path = path.substr(0,argIndex);

  var lastSlash = path.lastIndexOf("/");

  if(lastSlash == -1) return "/";

  return path.substring(0,lastSlash);
};

Cookie.prototype.isValidFor = function(domain,path){
  if(this.domain[0] == '.')
    return (this.endsWith(domain,this.domain) && path.indexOf(this.path) == 0);
  else
    return ( (this.domain == domain || this.endsWith(domain,'.'+this.domain)) && path.indexOf(this.path)==0);
};

Cookie.prototype.parseCookieParameters = function(tokens){
  var params = {};
  for(var i=0;i<tokens.length;i++){
    var firstEqualSign = tokens[i].indexOf("=");
    var nameValue = [tokens[i].substring(0,firstEqualSign),tokens[i].substring(firstEqualSign+1)];

    if(nameValue.length > 1){
      params[nameValue[0].trim().toLowerCase()] = nameValue[1].trim();
    }
  } 
  return params;
};

Cookie.prototype.endsWith = function(str, endswith) {
  return str.length >= endswith.length && str.substr(str.length - endswith.length) == endswith;
};

Cookie.prototype.serialize = function() {
  return this.name + "=" + this.value + " ; ";
};