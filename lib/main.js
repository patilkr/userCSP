/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
*/

var data = require("self").data;
var tabs = require('sdk/tabs');
var ss = require("sdk/simple-storage"); // persistent data store APIs

const timers = require('timers');
const observer = require('observer-service');
const {URL} = require("url"); 
const {Cc,Ci,Cu,Cr} = require("chrome");
const xpcom = require("xpcom");
const { Class } = require("sdk/core/heritage");

// userCSP custom libraries
const userCSPcache = require("userCSP_cache");
const userCSPFilterMod = require("userCSP_filter");

// Integrate it into command line
let gcl = Cu.import("resource:///modules/devtools/gcli.jsm");

// ---------------------------------------------------------------
// ----------------------- Create userCSP Panel ------------------
// Create a panel whose content is defined in "text-entry.html".
var userCSP = require("panel").Panel({
  width: 1024,
  height: 500,
  contentURL: data.url("userCSP_UI.html"),
});

// Create a widget, and attach the panel to it, so the panel is
// shown when the user clicks the widget.
require("widget").Widget({
  label: "UserCSP",
  id: "userContentSecurityPolicy",
  contentURL: data.url("CSP_logo-48*54.jpg"),
  panel: userCSP
});

// ---------------------------------------------------------------

// ---------------------------------------------------------------
// ----------------------------- GCLI ----------------------------
// GCLI commands for userCSP
gcl.gcli.addCommand({
    name: "userCSP",
    description: "User Specified Cotnent Security Policy",    
});

gcl.gcli.addCommand({
    name: "userCSP infer-start",
    description: "Start inferring of csp policy for current webpage",
    exec: function(args, context) {
        return "Inferring of CSP policy started";
    }
});

// GCLI command [infer-stop] to show infered policy for active web page
gcl.gcli.addCommand({
    name: "userCSP infer-stop",
    description: "Stop inferring of csp policy for current web page",
    exec: function(args, context) {
        let hostName = context.environment.contentDocument.location.protocol+"//"+context.environment.contentDocument.location.host;
        return ss.storage.inferredPolicies[hostName];
        //return test();
    }
});

// GCLI command [infer-apply] to apply infered policy for active web page
var userCSP_infer_apply = false;
gcl.gcli.addCommand({
    name: "userCSP infer-apply",
    description: "Apply infered csp policy for current web page",
    exec: function(args, context) {
        let hostName = context.environment.contentDocument.location.protocol+"//"+context.environment.contentDocument.location.host;
        if (ss.storage.inferredPolicies[hostName]) {
            userCSP_infer_apply = true; //To set Content-Security-Policy 
            tabs.activeTab.reload(); // reload current activeTab
        } else {
            return "First please infer policy for web page. Use 'userCSP infer-start' then load website for which you want to infer policy then user 'userCSP infer-stop'. Then use 'userCSP infer-apply' to apply inferred rules."
        }
        return "Content-Security-Policy header set for "+hostName+" is: "+ss.storage.inferredPolicies[hostName];
        //return test();
    }
});

// GCLI command [show] to show userCSP UI
gcl.gcli.addCommand({
    name: "userCSP show",
    description: "Show add-on UI",
    exec: function(args, context) {
        userCSP.show();
        //return "Inferring of CSP policy started";
    }
});
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// ------------------------- simple-storage APIs -----------------
// Simple-storage APIs 
// Create persitent store for infer policy
if (!ss.storage.inferredPolicies) {
    ss.storage.inferredPolicies = {};
}

if (!ss.storage.inferredPoliciesArray) {
    ss.storage.inferredPoliciesArray = {};
}

// create persistent store to store user policies
if (!ss.storage.userPolicies) {
    ss.storage.userPolicies = {};
}

if (!ss.storage.userPoliciesArray) {
    ss.storage.userPoliciesArray = {};
}

if (!ss.storage.userCSPState) {
    ss.storage.userCSPState = {};
}


// Delete entries if we exceed 5M bytes of store
ss.on("OverQuota", function () {
  while (ss.quotaUsage > 1)
    ss.storage.inferredPoliciesArray.pop();
    ss.storage.userPoliciesArray.pop();
});

// ---------------------------------------------------------------
// ------ Global Variables ---------------------------------------
var websiteCSPRules = {}; // stores website defined CSP rules in array format
var websiteCSPFull = {}; // website CSP in unformatted 

var domainList = new Array();

var inferCSPFlag = true; // inferCSP policy flag
// ---------------------------------------------------------------

// Add event listener to Bcak/Forward Button and
// Read HTTP header (Content-Security-Policy) header from cache

userCSPcache.userCSPregisterBFbtnListener();

// ---------------------------------------------------------------
// ----------------- Receive messages from Data  Module ---------------------
// Exit userCSP UI
userCSP.port.on("exitUserCSP", function (text) {
        //console.log(text);
  userCSP.hide();
});

// open new Tab to Report An Issue
userCSP.port.on("reportIssue", function () {
  tabs.open("https://github.com/patilkr/userCSP/issues");
  userCSP.hide();
});

userCSP.port.on("combineStrictPolicy", function (sitePolicy, userPolicy, webDomain) {
    console.log("combineStrictPolicy routine is invoked");

    try {
        var csp = Cc["@mozilla.org/contentsecuritypolicy;1"].createInstance(Ci.nsIContentSecurityPolicy);
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        // var tempURL = "http://" + webDomain;
        tempURL = webDomain;
        var selfuri = ioService.newURI(tempURL, null, null);        
        
        csp.refinePolicy(userPolicy, selfuri);
        csp.refinePolicy(sitePolicy, selfuri);

        // send combine Strict policy to UI
        userCSP.port.emit("setCombineStrict", csp.policy, webDomain);

       // console.log("$$$ CSP after RefinePolicy="+csp.policy);
    } catch(e) {
        console.log("%%% Error code of refinePolicy method: "+e);
    }

});

// --------------------------------------------------------------- 

// ---------------------------------------------------------------
// ---------------- Send messages to Data Module ---------------------------
// send Infer CSP Policy Array to addon
userCSP.port.on("inferCSPArray", function (webDomain) {
    userCSP.port.emit("setInferAsUserCSP",  webDomain, ss.storage.inferredPoliciesArray, ss.storage.inferredPolicies);
});


// ---------------------------------------------------------------

// ---------------------------------------------------------------
// -------------------- Supplimentary Functions ---------------------
exports.userCSP_getRulesForTabs = function userCSPP_getRulesForTabs(hostName) {
    userCSP_getRulesForOpenTabs(hostName);
}

function searchStringInArray(hostName) {
    for (var j = 0; j < domainList.length; j++) {
        if (domainList[j].match(hostName))
            return true;
    }
    return false;
} // end of "searchStringInArray"

// helper function to get currently active domain
function getActiveDomain() {
    if (tabs.activeTab.url === "about:blank") return;
    if (!(URL(tabs.activeTab.url).host)) return;

    if ((URL(tabs.activeTab.url).scheme === "http") || (URL(tabs.activeTab.url).scheme === "https")) {
        var activeWindow = URL(tabs.activeTab.url).scheme +"://" +URL(tabs.activeTab.url).host;
        // domainNameRules.activeDomain = activeWindow;
        return activeWindow;

    }
} // end of getActiveDomain() function

function userCSP_getRulesForOpenTabs(hostName) {
    var tempStr;

    // reset the domainList array
    domainList = new Array();

    for (var i = 0; i < tabs.length; i++) {
        //  console.log("scheme="+URL(tabs[i].url).scheme);
        tempStr = URL(tabs[i].url).scheme + "://" + URL(tabs[i].url).host;
        if (!searchStringInArray(tempStr)) { 
            // Not found, so insert it in array
            domainList.push(tempStr);
            console.log(tempStr + " will be sent to UI");

            // infer Policy
            
            // simple-storage usage for inferCSP policy
            if (!ss.storage.inferredPoliciesArray[hostName]) {
                ss.storage.inferredPoliciesArray[hostName] = new Array(11);
                ss.storage.inferredPoliciesArray[hostName][0] = "'self'";
                ss.storage.inferredPoliciesArray[hostName][9] = "*";
            }

            var newResult = "";

            for (var j = 0; j < 10; j++) {
                if (!ss.storage.inferredPoliciesArray[tempStr][j])
                    continue;                
                
                newResult = userCSPFilterMod.addCSPDirectiveNames(newResult, j+1, ss.storage.inferredPoliciesArray[tempStr][j]); 

            }
            
            // Simple-storage; Store single inferred policy
            ss.storage.inferredPolicies[tempStr] = newResult;            

        } // end of IF loop
    } // end of FOR loop

    // console.log(" Sending domainList:"+domainList);
    userCSP.port.emit("addHostName", domainList);
	  
    // Curently active domain- default: Every
    let activeWindow = "Every";

    // Function to get currently active domain name
     activeWindow = getActiveDomain();


    // send record to add-on UI
    timers.setTimeout(function (){                  
      userCSP.port.emit("showCSPRules",  activeWindow, websiteCSPFull, websiteCSPRules,  ss.storage.userPolicies, ss.storage.userPoliciesArray, ss.storage.inferredPolicies, ss.storage.inferredPoliciesArray);
    }, 1000);	  
} // end of userCSP_getRulesForOpenTabs() function


function getBrowserFromChannel(aChannel) {
  try {
    var notificationCallbacks = 
      aChannel.notificationCallbacks ? aChannel.notificationCallbacks : aChannel.loadGroup.notificationCallbacks;
 
    if (!notificationCallbacks)
      return null;
 
    var domWin = notificationCallbacks.getInterface(Ci.nsIDOMWindow);
      return domWin.document;
     // return gBrowser.getBrowserForDocument(domWin.top.document);
  }
  catch (e) {
   // console.log("###Error: Cannot get Origin URI of request generator in main.js"+ e + "\n");
    return null;
  }
} // end of getBrowserFromChannel() function

// Helper function to add domain to the infer list
function addRuleToInferList(hostName, contType, contLoc) {
    try {

        if (!ss.storage.inferredPoliciesArray[hostName]) {
            ss.storage.inferredPoliciesArray[hostName] = new Array(11);
            ss.storage.inferredPoliciesArray[hostName][0] = "'self'";
            ss.storage.inferredPoliciesArray[hostName][9] = "*";
        }

    } catch (e) {
        console.log ("\n EXCEPTION in main.js: ss.storage.inferredPoliciesArray caused Exception!!! e = " + e);
    }

    var contURL = contLoc.scheme + "://" + contLoc.host;

    switch(contType) {    
    case 2: // script-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][1])
            ss.storage.inferredPoliciesArray[hostName][1] = "";
        if (ss.storage.inferredPoliciesArray[hostName][1].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][1] += " ";
            ss.storage.inferredPoliciesArray[hostName][1] += contURL;
           // console.log("Infer Rule!! " + hostName+ " script-src ="+ ss.storage.inferredPoliciesArray[hostName][1]);
        }

        break
    case 3: // img-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][3])
            ss.storage.inferredPoliciesArray[hostName][3] = "";
        if (ss.storage.inferredPoliciesArray[hostName][3].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][3] += " ";
            ss.storage.inferredPoliciesArray[hostName][3] += contURL;
           // console.log("Infer Rule!! " + hostName+ " img-src ="+ ss.storage.inferredPoliciesArray[hostName][3]);
        }

        break;
    case 4: // style-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][5])
            ss.storage.inferredPoliciesArray[hostName][5] = "";
        if (ss.storage.inferredPoliciesArray[hostName][5].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][5] += " ";
            ss.storage.inferredPoliciesArray[hostName][5] += contURL;
           // console.log("Infer Rule!! " + hostName+ " style-src ="+ ss.storage.inferredPoliciesArray[hostName][5]);
        }

        break;
    case 5: // object-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][2])
            ss.storage.inferredPoliciesArray[hostName][2] = "";
        if (ss.storage.inferredPoliciesArray[hostName][2].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][2] += " ";
            ss.storage.inferredPoliciesArray[hostName][2] += contURL;
          //  console.log("Infer Rule!! " + hostName+ " object-src ="+ ss.storage.inferredPoliciesArray[hostName][2]);
        }

        break;
    case 6: // document-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][0])
            ss.storage.inferredPoliciesArray[hostName][0] = "";
        if (ss.storage.inferredPoliciesArray[hostName][0].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][0] += " ";
            ss.storage.inferredPoliciesArray[hostName][0] += contURL;
           // console.log("Infer Rule!! " + hostName+ " default-src ="+ ss.storage.inferredPoliciesArray[hostName][0]);
        }

        break;
    case 7: // frame-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][6])
            ss.storage.inferredPoliciesArray[hostName][6] = "";
        if (ss.storage.inferredPoliciesArray[hostName][6].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][6] += " ";
            ss.storage.inferredPoliciesArray[hostName][6] += contURL;
           // console.log("Infer Rule!! " + hostName+ " frame-src ="+ ss.storage.inferredPoliciesArray[hostName][6]);
        }

        break;
    case 11: // xhr-src or connect-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][8])
            ss.storage.inferredPoliciesArray[hostName][8] = "";
        if (ss.storage.inferredPoliciesArray[hostName][8].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][8] += " ";
            ss.storage.inferredPoliciesArray[hostName][8] += contURL;
           // console.log("Infer Rule!! " + hostName+ " connect-src ="+ ss.storage.inferredPoliciesArray[hostName][8]);
        }

        break;
    case 14: // font-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][7])
            ss.storage.inferredPoliciesArray[hostName][7] = "";
        if (ss.storage.inferredPoliciesArray[hostName][7].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][7] += " ";
            ss.storage.inferredPoliciesArray[hostName][7] += contURL;
           // console.log("Infer Rule!! " + hostName+ " font-src ="+ ss.storage.inferredPoliciesArray[hostName][7]);
        }
            break;
        case 15: // media-src

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][4])
            ss.storage.inferredPoliciesArray[hostName][4] = "";
        if (ss.storage.inferredPoliciesArray[hostName][4].indexOf(contURL) === -1) {
            ss.storage.inferredPoliciesArray[hostName][4] += " ";
            ss.storage.inferredPoliciesArray[hostName][4] += contURL;
          //  console.log("Infer Rule!! " + hostName+ " media-src ="+ ss.storage.inferredPoliciesArray[hostName][4]);
        }

        break;
    } // end of switch
} // end of function addRuleToInferList()

// ---------------------------------------------------------------

// ---------------------------------------------------------------
// ---------------------- Event Listeners ----------------------------------

// Use "tabs" API's event handler
// Tabs "READY" event: emitted when DOM contents are ready
tabs.on('ready', function(evtTab) {
    if (evtTab.url !== "about:blank") {  

        if (!(URL(evtTab.url).host)) // if host is null
            return;

        var hostName = URL(evtTab.url).scheme + "://" + URL(evtTab.url).host;
        
             

        console.log("Number of open tabs=" + tabs.length);
        console.log("DOMContentLoaded:" + hostName);

        userCSP_getRulesForOpenTabs(hostName);
    } // end of "evetTab.url" IF loop
});



function httpExamineCallback(aSubject, aTopic, aData) {
    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
    if (httpChannel.responseStatus === 200) {
        var doc = getBrowserFromChannel(httpChannel);
        if (doc === null) // if its null then no document available
            return;
       
        var hostName = doc.location.protocol + "//" + doc.location.host;

        var responseName = httpChannel.URI.scheme + "://" + httpChannel.URI.host;
        console.log("\n\n HTTP Handler; hostName = " + hostName);
        console.log("\n responseName = " + responseName);

        // if userCSP infer-apply GCLI command invoked
        if (userCSP_infer_apply) {
            userCSP_infer_apply = false;
            console.log("\n http Handler: Content-Security-Policy Header = " + ss.storage.inferredPolicies[hostName]);
            httpChannel.setResponseHeader("Content-Security-Policy", ss.storage.inferredPolicies[hostName], false);
        }

        // Check for website CSP rules
        var cspRules;
        try {
            cspRules = httpChannel.getResponseHeader("Content-Security-Policy");    
        } catch(e) {           
            try {
                cspRules = httpChannel.getResponseHeader("X-Content-Security-Policy");    // Fallback mechanims support 
            } catch(e) {
                console.log("%%%ERROR: Website doesn't specified CSP rules!!!");

            } // end of inner catch
        } // end of outer catch

try {
            // CSP doesn't set by website
            if (cspRules) {
                console.log("\n\nWebsite Specified CSP Rules= " + cspRules);
                websiteCSPRules[responseName] = new Array(11);
                websiteCSPFull[responseName] = cspRules;
                for (var i = 0; i < 11; i++) {
                    websiteCSPRules[responseName][i] = userCSPFilterMod.cspDirectiveFilter(cspRules, i, true);            
                }
            }
        } catch (e) {
            console.log ("\nERROR: Either website hasn't specified CSP rules or some code error exists. ");
        }
        
    } // end of responseStatus == 200 IF loop
} // end of  httpExamineCallback() function



// Register observer service for http events
var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
	observerService.addObserver(httpExamineCallback, "http-on-examine-response", false);


// Register nsIContentPolicy Listener
exports.preventimage = Class({
  extends: xpcom.Unknown,
  interfaces: ["nsIContentPolicy"],
  shouldLoad: function (contType, contLoc, reqOrig, ctx, typeGuess, extra) {
      if (!inferCSPFlag)
          return Ci.nsIContentPolicy.ACCEPT;

      if (typeof(reqOrig.scheme) === 'undefined')
          return Ci.nsIContentPolicy.ACCEPT;

      if (typeof(contLoc.scheme) === 'undefined')
          return Ci.nsIContentPolicy.ACCEPT;

      if (contLoc.scheme == "http" || contLoc.scheme == "https") {
          if (reqOrig.scheme == "http" || reqOrig.scheme == "https") {
              var hostName =  reqOrig.scheme + "://" + reqOrig.host;
              
             //console.log(" Both contLoc and reqOrigin scheme = http || https");           

              addRuleToInferList(hostName, contType, contLoc);
          } // end of req.Orig IF Loop
          else {
              var hostName = contLoc.scheme + "://" + contLoc.host;
              if (contType === 6) {
                  console.log(" New page load request contType == 6, contLoc = " + hostName);
                  try {

                      if (!ss.storage.inferredPoliciesArray[hostName]) {
                          ss.storage.inferredPoliciesArray[hostName] = new Array(11);
                          ss.storage.inferredPoliciesArray[hostName][0] = "'self'";
                          ss.storage.inferredPoliciesArray[hostName][9] = "*";
                      }

                  } catch(e) { console.log(" ERROR!! "+e);}
              } // contType ==6 IF loop
          }
      } // end of contLoc IF loop


      return Ci.nsIContentPolicy.ACCEPT;
  },
 
  shouldProcess: function (contType, contLoc, reqOrig, ctx, mimeType, extra) {
     // console.log(" shouldProcess works!!!");
      return Ci.nsIContentPolicy.ACCEPT;
  }
});
 

let factory = xpcom.Factory({
  Component:   exports.preventimage,
  description: "Implements content policy to prevent images from being loaded",
  contract:    "@lduros.net/PreventImage-policy",
});
 
var catman = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
catman.addCategoryEntry("content-policy", "preventimage.preventimage", factory.contract, false, true);


// Add-on Unload Routine
require("unload").when(function() { 
    // Unregister content policy
    catman.deleteCategoryEntry("content-policy", "preventimage.preventimage", false);   
 });

// ---------------------------------------------------------------

