// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
// USA

function Proxy() {
  this.name              = null;
  this.host              = null;
  this.interfaceLanguage = "en";
  this.searchLanguage    = "all";
  this.httpPort          = -1;
  this.prefetchPort           = -1;
  
  this.enabled           = false;
  this.filters           = new Array();
 
  this.proxyMaps         = true;
  this.proxyGroups       = true;
  this.proxyNews         = true;
  this.proxyVideo        = true;
  this.proxyProducts     = true;
  this.proxyImages       = true;
  this.proxyFinance      = true;
  this.proxyCode         = true;

  this.prefetcher        = null;
  this.encryptedProxyInfo    = null;
  this.tunnelProxy           = null;

  this.setDefaultFilters();
}

Proxy.prototype.initializePrefetcher = function() {
  if (this.prefetcher == null) {
    // REVIEW 2012-04-26 <moxie> -- Whis is this port hardcoded
    // as 80?  The default HTTP port is even 8080 for proxy.abine.com?
    // JAMES: Well nginx is listening on port 80 for identity requests
    //        the ATS is listening on 8080 though
    this.prefetcher = new Prefetcher("http://", this.host,this.prefetchPort);
  }
};

Proxy.prototype.updateSharedIdentity = function(cookie, domain, path) {
  this.initializePrefetcher();
  this.prefetcher.updateSharedIdentity(cookie, domain, path);
};

Proxy.prototype.hasCachedIdentity = function() {
  this.initializePrefetcher();
  return this.prefetcher.hasCachedIdentity();
};

Proxy.prototype.fetchSharedIdentity = function(async) {
  this.initializePrefetcher();
  return this.prefetcher.fetchSharedIdentity(async);
};

Proxy.prototype.setProxyTunnel = function(tunnelProxy) {
  this.tunnelProxy = tunnelProxy;
};

Proxy.prototype.getEncryptedProxyInfo = function() {
  return this.encryptedProxyInfo;
};

Proxy.prototype.initializeProxyInfo = function() {
  var proxyService        = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService(Components.interfaces.nsIProtocolProxyService);
  this.encryptedProxyInfo = proxyService.newProxyInfo("http", this.getHost(), this.getHTTPPort(), 1, 0, null); 
};


// REVIEW 2012-04-26 <moxie> -- These filters should all probably be made to be
// protocol agnostic, and the code calling in for a filter match should handle forcing
// the upgrade to https and passing everything post-protocol specifier.
Proxy.prototype.setDefaultFilters = function() {
  var javascriptApiPaths = 
  "|\\/jsapi|\\/uds\\/|\\/books\\/api\\.js|\\/friendconnect\\/script\\/friendconnect\\.js|\\/s2\\/sharing\\/js|\\/maps\\?.*file=(googleapi|api).*" + 
  "|\\/maps\\/api\\/js|\\/reviews\\/scripts\\/annotations_bootstrap\\.js";

  mainFilter = new Filter();
  mainFilter.setName("main");
  mainFilter.setExpression("^https?:\\/\\/(?:(?!chatenabled\\.|mail\\.|checkout\\.|sites\\.|accounts\\.|docs\\.|picasaweb\\.|notebook\\.|spreadsheets\\.|wave\\.|voice\\.|bookmarks\\.|talkgadget\\." +
  			   (this.proxyMaps     ? "" : "|maps\\.|id\\.|mt[0-9]\\.|khm[0-9]\\.")     +
  			   (this.proxyGroups   ? "" : "|groups\\.")   +
  			   (this.proxyNews     ? "" : "|news\\.")     +
  			   (this.proxyVideo    ? "" : "|video\\.")    +
  			   (this.proxyProducts ? "" : "|products\\.") +
  			   (this.proxyImages   ? "" : "|images\\.")   +
			   (this.proxyCode     ? "" : "|code\\.")     +
  			   ")[^.]+\\.)?google\\.com(?!\\.|\\/accounts|\\/a\\/|\\/UniversalLogin|\\/calendar|\\/reader|\\/health|\\/notebook|\\/wave|\\/ig|\\/apps|\\/webmasters|\\/contacts|\\/voice|\\/bookmarks|\\/group\\/[^/]+\\/post"     + 
  			   javascriptApiPaths                         +
  			   (this.proxyProducts ? "" : "|\\/prdhp")    +
  			   (this.proxyImages   ? "" : "|\\/imghp")    +
  			   ")");
  mainFilter.setEnabled(true);
   
  staticFilter  = new Filter();
  staticFilter.setName("static");
  staticFilter.setExpression("^https?:\\/\\/.+\\.gstatic\\.com(?!\\/.+api.+)");
  staticFilter.setEnabled(true);

  hostedFilter  = new Filter();
  hostedFilter.setName("hosted");
  hostedFilter.setExpression("^https?:\\/\\/.+\\.googlehosted\\.com/.?");
  hostedFilter.setEnabled(true);

  hundredFilter = new Filter();
  hundredFilter.setName("1e100");
  hundredFilter.setExpression("^https?:\\/\\/(.+\\.)?1e100\\.net/.?");
  hundredFilter.setEnabled(true);

  encryptedSearchFilter = new Filter();
  encryptedSearchFilter.setName("encrypted");
  encryptedSearchFilter.setExpression("^https?:\\/\\/(encrypted|clients1|id)\\.google.com\\/.?");
  encryptedSearchFilter.setEnabled(true);

  filters = new Array();
  filters.push(mainFilter);
  filters.push(staticFilter);
  filters.push(hostedFilter);
  filters.push(hundredFilter);
  filters.push(encryptedSearchFilter);

  this.setFilters(filters);
};

Proxy.prototype.getHost = function() {
  return this.host;
};

Proxy.prototype.setHost = function(host) {
  this.host = host;
};

Proxy.prototype.getPrefetchPort = function() {
  return this.prefetchPort;
};

Proxy.prototype.setPrefetchPort = function(port) {
  this.prefetchPort = port;
};

Proxy.prototype.getHTTPPort = function() {
  return this.httpPort;
};

Proxy.prototype.setHTTPPort = function(port) {
  this.httpPort = port;
};

Proxy.prototype.getName = function() {
  return this.name;
};

Proxy.prototype.setName = function(name) {
  this.name = name;
};

Proxy.prototype.getFilters = function() {
  return this.filters;
};

Proxy.prototype.setFilters = function(filters) {
  this.filters = filters;
};

Proxy.prototype.getEnabled = function() {
  return this.enabled;
};

Proxy.prototype.setEnabled = function(value) {
  this.enabled = value;
};

Proxy.prototype.setInterfaceLanguage = function(value) {
  this.interfaceLanguage = value;
};

Proxy.prototype.getInterfaceLanguage = function() {
  return this.interfaceLanguage;
};

Proxy.prototype.setSearchLanguage = function(value) {
  this.searchLanguage = value;
};

Proxy.prototype.getSearchLanguage = function() {
  return this.searchLanguage;
};

Proxy.prototype.getFilterCount = function() {
  return this.filters.length;
};

Proxy.prototype.setProxyMaps = function(value) {
  this.proxyMaps = value;
};

Proxy.prototype.getProxyMaps = function(value) {
  return this.proxyMaps;
};

Proxy.prototype.setProxyGroups = function(value) {
  this.proxyGroups = value;
};

Proxy.prototype.getProxyGroups = function(value) {
  return this.proxyGroups;
};

Proxy.prototype.setProxyNews = function(value) {
  this.proxyNews = value;
};

Proxy.prototype.getProxyNews = function(value) {
  return this.proxyNews;
};

Proxy.prototype.setProxyVideo = function(value) {
  this.proxyVideo = value;
};

Proxy.prototype.getProxyVideo = function(value) {
  return this.proxyVideo;
};

Proxy.prototype.setProxyProducts = function(value) {
  this.proxyProducts = value;
};

Proxy.prototype.getProxyProducts = function(value) {
  return this.proxyProducts;
};

Proxy.prototype.setProxyImages = function(value) {
  this.proxyImages = value;
};

Proxy.prototype.getProxyImages = function(value) {
  return this.proxyImages;
};

Proxy.prototype.setProxyFinance = function(value) {
  this.proxyFinance = value;
};

Proxy.prototype.getProxyFinance = function(value) {
  return this.proxyFinance;
};

Proxy.prototype.setProxyCode = function(value) {
  this.proxyCode = value;
};

Proxy.prototype.getProxyCode = function() {
  return this.proxyCode;
};

Proxy.prototype.shutdown = function() {
  this.terminated = true;
};

Proxy.prototype.serialize = function(xmlDocument) {
  var proxyElement = xmlDocument.createElement("proxy");
  proxyElement.setAttribute("name", this.name);
  proxyElement.setAttribute("host", this.host);
  proxyElement.setAttribute("prefetch-port", this.prefetchPort);
  proxyElement.setAttribute("http-port", this.httpPort);
  proxyElement.setAttribute("enabled", this.enabled);
  proxyElement.setAttribute("interface-language", this.interfaceLanguage);
  proxyElement.setAttribute("search-language", this.searchLanguage);

  proxyElement.setAttribute("proxyMaps", this.proxyMaps);
  proxyElement.setAttribute("proxyGroups", this.proxyGroups);
  proxyElement.setAttribute("proxyNews", this.proxyNews);
  proxyElement.setAttribute("proxyVideo", this.proxyVideo);
  proxyElement.setAttribute("proxyProducts", this.proxyProducts);
  proxyElement.setAttribute("proxyImages", this.proxyImages);
  proxyElement.setAttribute("proxyFinance", this.proxyFinance);
  proxyElement.setAttribute("proxyCode", this.proxyCode);

  return proxyElement;
};

Proxy.prototype.deserialize = function(element) {
  this.name              = element.getAttribute("name");
  this.host              = element.getAttribute("host");
  this.prefetchPort      = element.getAttribute("prefetch-port");
  this.httpPort          = element.getAttribute("http-port");
  this.interfaceLanguage = element.getAttribute("interface-language");
  this.searchLanguage    = element.getAttribute("search-language");
  this.enabled           = (element.getAttribute("enabled") == "true");
  this.proxyMaps         = (element.getAttribute("proxyMaps") == "true");
  this.proxyGroups       = (element.getAttribute("proxyGroups") == "true");
  this.proxyNews         = (element.getAttribute("proxyNews") == "true");
  this.proxyVideo        = (element.getAttribute("proxyVideo") == "true");
  this.proxyProducts     = (element.getAttribute("proxyProducts") == "true");
  this.proxyImages       = (element.getAttribute("proxyImages") == "true");
  this.proxyFinance      = (element.getAttribute("proxyFinance") == "true" || !element.getAttribute("proxyFinance"));
  this.proxyCode         = (element.getAttribute("proxyCode") == "true" || !element.getAttribute("proxyCode"));
  this.prefetcher        = new Prefetcher("http://", this.host, this.prefetchPort);
  this.setDefaultFilters();
  this.initializeProxyInfo();
};

Proxy.prototype.isPrefetchURL = function(url) {
  if (!this.enabled)        return false;

  for (var i=0;i<this.filters.length;i++) {
    if (this.filters[i].matchesURL(url)) {
      return true;
    }
  }

  return false;
};

Proxy.prototype.matchesURL = function(url) {
  if (!this.enabled) return false;

  for (var i=0;i<this.filters.length;i++) {
    if (this.filters[i].matchesURL(url)) {
      return true;
    }
  }

  return false;
};