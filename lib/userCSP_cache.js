//@Kailas Testing for cache header reading when BACK/FORWARD bts are pressed
const {Cc,Ci,Cu,Cr} = require("chrome");
var tabs = require('sdk/tabs');
var nsICache = Ci.nsICache; 
//var clientID = require("self").id;
var clientID = "HTTP";
var winutils = require('sdk/window/utils');
const { gBrowser } = winutils.getMostRecentBrowserWindow();

const main = require("main");

//// Functions to retrieve data from cache

var userCSPCacheListener = {
    QueryInterface : function(iid) {
        if (iid.equals(Ci.nsICacheListener))
            return this;
        throw Cr.NS_NOINTERFACE;
    },

    onCacheEntryAvailable: function(descriptor, accessGranted, status) {
        // Use http://james-ross.co.uk/mozilla/misc/nserror to lookup
        // unknown error codes.
        if ((accessGranted == Ci.nsICache.ACCESS_READ) && (descriptor) && (status == Cr.NS_OK)) {
            
            // this is where we have the cache object!
            
            console.log("\n fetching descriptor...."+ accessGranted +"\n\n");
            var headerStr = descriptor.getMetaDataElement("response-head");
            var crlfList = headerStr.split("\r\n");
            var httpStr = crlfList[0]; // first line is HTTP/1.x nnn TEXT
            var headerList = crlfList.slice(1); // following lines, probably with empty line at the end
            // Convert to object..
            var headers = {};
            for (var i=0; i < headerList.length; i++) {
	              var headerSep = headerList[i].split(":");
	              
	              var key = headerSep[0].toLowerCase();
	              var value = headerSep.slice(1).join(":").toLowerCase(); // re-combine rest of array with ":"
	              headers[key] = value;
            }

            // We can now look up headers, but it's all lower-case 
            // Don't think there is a case-insensitive lookup
            
            console.log("\n"+JSON.stringify(headers)+ "\n\n");
            
            console.log('x-content-security-policy' in headers);
            if ('x-content-security-policy' in headers) {
	              console.log("\nX-Content-Security-Policy is: " + headers['x-content-security-policy']+ "\n");
            }
        }
        else {
            console.log("\n\n Cache entry descriptor is not available. Bug-855694\n");
        }

        if (descriptor) {
            descriptor.close();
        }
    },

    onCacheEntryDoomed: function(status) {
    },

};


function userCSP_getCacheService() {
  var nsCacheService = Cc["@mozilla.org/network/cache-service;1"];
  var service = nsCacheService.getService(Ci.nsICacheService);
  return service;
}

function userCSP_createCacheSession(clientID, storagePolicy, streamable) {
  var service = userCSP_getCacheService();
  var session = service.createSession(clientID, storagePolicy, streamable);
  return session;
}


function userCSP_openCacheEntry(url, mode) {
  var session = userCSP_createCacheSession(clientID, nsICache.STORE_ANYWHERE, true);
   // console.log("\n\n Double check URL = "+ url);
  session.asyncOpenCacheEntry(url, mode, userCSPCacheListener);
 // return entry;
}

// event listener on cache entry
const userCSP_progressListener = {
  onLocationChange: function (aWebProgress, aRequest, aLocationURI, aFlags) {
    if (aWebProgress.tagName != "xul:browser")
      return;
    let browser = aWebProgress;

    gBrowser.removeTabsProgressListener(userCSP_progressListener); 
    console.log("\nonLocationChange: "+browser.contentWindow.location.href);
    
   // //read HTTP header (Content-Security-Policy) from cache
      // //@ Content-Security-Policy Header Retrieval from Cache         
       try {   
           var cacheKey = browser.contentWindow.location.href.replace(/#.*$/, "");
          // var uri = "https://csptest.computerist.org/";
            userCSP_openCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ);          
          } catch (e) {
              console.log("\n Cannot get X-Content-Security-Policy header from the Cache:"+e);
            }
      // //# Content-Security-Policy Header Retrieval from Cache

      // Update add-on UI with list of open sites
      main.userCSP_getRulesForTabs(browser.contentWindow.location.href);

  }
}; // end of userCSP_progressListener variable


//@ Goal: Add event listener on BACK/FORWARD buttons 

// Event Listener on Browser's Back/Forward Button
function userCSP_backOrForwardBtnClicked () {
    console.log ("\n\n Back or Forward Button pressed");
    console.log ("\n Current URL = "+tabs.activeTab.url); 
    gBrowser.addTabsProgressListener(userCSP_progressListener);
} // end of userCSP_backOrForwardBtnClicked() function



// function to register event listener on Back/Forward btn
exports.userCSPregisterBFbtnListener = function userCSPregisterBFbtnListener () {
    // Get Browser Window and register event Listener
    try {
        var active = winutils.windows();
        var winI = 0;
        var found = false;
        while (typeof(active[winI]) != undefined) {
            if (winutils.isBrowser(active[winI])) {
                //console.log ("\n\n Browser window = "+ active[winI]);
                var found = true;
                break;
            }
            winI = winI + 1;
        }
        // if browser window found then add event listner
        if (found) {
            var backbtn = active[winI].document.getElementById("back-button");
            if (backbtn) {
                // console.log ("\n Back button found ="+backbtn);
                backbtn.addEventListener("click", userCSP_backOrForwardBtnClicked, false);
            }
            var forwardbtn = active[winI].document.getElementById("forward-button");
            if (forwardbtn) {
                forwardbtn.addEventListener("click", userCSP_backOrForwardBtnClicked, false);
            }
            
        }
    } catch(e) {
        console.log("\n\n Error occurred in setting event listner to BACK/FORWARD btn");
    }
} // end of exports.registerBFbtnListener

//#