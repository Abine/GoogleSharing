// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>
// Thi s program is free software; you can redistribute it and/or
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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var loadScript = function(filename) {
  try {
    var path = __LOCATION__.parent.clone();
    path.append(filename);

    var fileProtocol = Components.classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Components.interfaces["nsIFileProtocolHandler"]);
    var loader       = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces["mozIJSSubScriptLoader"]);
        
    loader.loadSubScript(fileProtocol.getURLSpecFromFile(path));
  } catch (e) {
    dump("Error loading component script: " + path.path + " : " + e);
  }
};

var setRestartCount = function(value) {
  dump("Setting restart count: " + value + "\n");
  var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  preferences.getBranch("googlesharing.").setIntPref("restart-count", value);  
};

var getRestartCount = function() {
    var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    return preferences.getBranch("googlesharing.").getIntPref("restart-count");    
};

loadScript("Filter.js");
loadScript("Proxy.js");
loadScript("ProxyManager.js");
loadScript("MainThreadDispatcher.js");
loadScript("ConnectionManager.js");
loadScript("LanguagePreferences.js");
loadScript("Identity.js");
loadScript("Cookie.js");
loadScript("Prefetcher.js");

function GoogleSharingManager() { 
  this.wrappedJSObject = this;
  this.initializeExtensionVersion();
  this.initializeConnectionManager();
  this.registerHeadersObserver();
  this.registerProxyObserver();
}

GoogleSharingManager.prototype = {
  classDescription: "GoogleSharingManager Component",
  classID:          Components.ID("{d29c7ea0-fd61-11de-8a39-0800200c9a66}"),
  contractID:       "@getabine.com/googlesharingmanager;1",
  QueryInterface: XPCOMUtils.generateQI(),
  proxyManager: null,
  connectionManager: null,
  extensionVersion: "0.0",
  enabled: false, 

  initializeExtensionVersion: function() {
    var uuid = "donottrackplus@abine.com";
    if ("@mozilla.org/extensions/manager;1" in Components.classes) {
      var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
      .getService(Components.interfaces.nsIExtensionManager);
      this.extensionVersion = gExtensionManager.getItemForID(uuid).version;
    } else {
      // Geko 2.0
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      var self = this;
      AddonManager.getAddonByID(uuid, function(addon) { self.extensionVersion = addon.version; });
    }
  },

  initializeConnectionManager: function() {
    this.proxyManager      = new ProxyManager();
    this.connectionManager = new ConnectionManager(this.proxyManager);
    this.enabled           = this.proxyManager.isEnabled();
  },

  update: function() {
    this.connectionManager.shutdown();
    this.connectionManager = new ConnectionManager(this.proxyManager);
  },

  setEnabled: function(value) {
    this.enabled = value;
    this.proxyManager.setEnabled(value);
    this.proxyManager.savePreferences();    
    if (this.enabled) this.update();
  },

  isEnabled: function() {
    return this.enabled;
  },

  isShortStatus: function() {
    return this.proxyManager.isShortStatus();
  },

  setShortStatus: function(value) {
    this.proxyManager.setShortStatus(value);
    this.proxyManager.savePreferences();
  },

  getProxyManager: function() {
    return this.proxyManager;
  },

  getNewProxy: function() {
    return new Proxy();
  },

  getConnectionManager: function() {
    return this.connectionManager;
  },

  registerHeadersObserver: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "http-on-modify-request", false);
    observerService.addObserver(this, "http-on-examine-response", false);
    observerService.addObserver(this, "network:offline-status-changed", false);
  },

  registerProxyObserver: function() {
    var protocolService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);

    protocolService.unregisterFilter(this);
    protocolService.registerFilter(this, 10000);
  },

  applyFilter : function(protocolService, uri, otherProxies) {
    if (!this.enabled) return proxy;
    
    var requestUri = uri.scheme + "://" + uri.host + uri.path;
    var  proxy = this.connectionManager.getProxyForURL(requestUri);
  
    if (!proxy) return otherProxies;
    proxy.setProxyTunnel(otherProxies);
    return proxy.getEncryptedProxyInfo();
  },

  getAbbreviatedPathForSubject: function(subject) {
    var abbreviatedPath = subject.originalURI.path.substring(0, subject.originalURI.path.lastIndexOf('/'));

    if (abbreviatedPath.indexOf("/") != 0)
      return "/" + abbreviatedPath;

    return abbreviatedPath;
  },

  sendActivityNotification: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);  
    observerService.notifyObservers(observerService, "googlesharing-activity", false);
  },
  dump: function(aMessage) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("GS2: "+(new Date())+"\n" + aMessage);
  },

  setHeadersForEncryptedRequest: function(proxy, subject) {
    var abbreviatedPath = this.getAbbreviatedPathForSubject(subject);
    var sharedIdentity  = proxy.fetchSharedIdentity(false);
    var cookies         = null;
    if (sharedIdentity != null)
      cookies           = sharedIdentity.getCookies(subject.originalURI.host, abbreviatedPath);
    
    if (cookies) {
      subject.setRequestHeader("Cookie", cookies, false);
    } else {
      subject.setRequestHeader("Cookie", "", false);
    }
    
    subject.setRequestHeader("User-Agent", sharedIdentity.getUserAgent(), false);
    subject.setRequestHeader("Accept-Encoding", "gzip,deflate", false);
    subject.setRequestHeader("Accept-Language", "en-us,en;q=0.5", false);
  },

  setHeadersForEncryptedResponse: function(proxy, subject) {
    var cookie;

    try {
      cookie = subject.getResponseHeader("Set-Cookie");
    } catch (exception) {
      return;
    }    

    var abbreviatedPath = this.getAbbreviatedPathForSubject(subject);  
    subject.setResponseHeader("Set-Cookie", "", false);

    cookies = cookie.split("\n");

    for(var i=0;i<cookies.length;i++){
        proxy.updateSharedIdentity(cookies[i], subject.originalURI.host, abbreviatedPath);
    }
  },

  handleOutgoingRequest: function(requestUri, proxy, subject) {
    this.setHeadersForEncryptedRequest(proxy, subject);
    this.sendActivityNotification();
  },

  handleIncomingResponse: function(requestUri, proxy, subject) {
      this.setHeadersForEncryptedResponse(proxy, subject);
  },

  observe: function(subject, topic, data) {
    if (topic == 'http-on-modify-request' || topic == 'http-on-examine-response') {
      if (!this.enabled) return;
      subject.QueryInterface(Components.interfaces.nsIHttpChannel);
      var requestUri = subject.originalURI.scheme + "://" + subject.originalURI.host + subject.originalURI.path;
      var proxy = this.connectionManager.getProxyForURL(requestUri);    
      if (!proxy) return;

      if (topic == 'http-on-modify-request') {
	       this.handleOutgoingRequest(requestUri, proxy, subject);
      } else {
	       this.handleIncomingResponse(requestUri, proxy, subject);
      }
    } else if (topic == 'network:offline-status-changed') {
      dump("Network offline status changed: " + data + "\n");
      if (data == "online") {
	       this.connectionManager = new ConnectionManager(this.proxyManager);
      }
    }
  }
};

var components = [GoogleSharingManager];
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
