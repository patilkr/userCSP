var data = require("self").data;
var tabs = require('tabs');
const timers = require('timers');
const observer = require('observer-service');
const sql = require("sqlite");
const {URL} = require("url"); //or another way to get it is as follows
// var URL = require("url").URL;

const {Cc,Ci,Cu} = require("chrome");

//
const REPORT_SERVER_URI = "http://www.attacker.com";

//let cspUtil = Cu.import('resource://gre/modules/CSPUtils.jsm');

//------------------------------------------------------------------------
 
// Create D/b: "userCSP.sqlite"
// Database will be created if it doesn't exists. 
// Otherwise, existing database file will be used. 
sql.connect("userCSP.sqlite");

// Create Database Table "userCSPTable" to store user CSP policies 
// for each domain. Table will be created if it doesn't exists. 
sql.tableUsedOrNew("userCSPTable");


// Create a panel whose content is defined in "text-entry.html".
var userCSP = require("panel").Panel({
  width: 600,
  height: 600,
  contentURL: data.url("default-src.html"),
});
 

// Create a widget, and attach the panel to it, so the panel is
// shown when the user clicks the widget.
require("widget").Widget({
  label: "UserCSP",
  id: "userContentSecurityPolicy",
  contentURL: "http://www.mozilla.org/favicon.ico",
  panel: userCSP
});

//---------------------------------------------------------------------
// Store and retrieve user CSP policies from D/B and 
// communicate with add-on UI


// Global Variable to avoid sending duplicate tab.url to userCSP UI
var domainList = new Array();
var domainNameRules = {}; // store user csp rules in array format

var websiteCSPRules = {}; // stores website defined CSP rules in array format
var websiteCSPFull = {}; // website CSP in unformatted 

// Store entire Database into Global variable
var myDatabase = {};

//---------------------------------------------------------------------


//Supplimentary function
function searchStringInArray(hostName) {
    for (var j=0; j < domainList.length; j++) {
        if (domainList[j].match(hostName))
            return true;
    }
    return false;
} // end of "searchStringInArray"


// Supplimentary function
function getDomainRulesFromDB(dList) {

    var selStat = 'select * from userCSPTable where domainName="all"';
    console.log(selStat);
    sql.execute(selStat,function(result,status){
        console.log("\n Select query result.rows="+result.rows);        
	      if (result.rows != 0) {               
	          domainNameRules["all"] = new Array(11);
	          domainNameRules.length += 1;
	          for (var i=0; i<11; i++) {
		            domainNameRules["all"][i] = result.data[0][i+1];
	          }
	          console.log("\n Recorded domainNameRules for ALL="+domainNameRules["all"]);
        }
    }); 


    for (var j=0; j < dList.length; j++) {
	      var selStat = "select * from userCSPTable where domainName=\""+dList[j]+"\"";
	      console.log(selStat);
	      sql.execute(selStat,function(result,status){
            console.log("\n Select query result.rows="+result.rows);        
	          if (result.rows != 0) {               
		            domainNameRules.length += 1;
		            console.log("\n domainList[j]="+result.data[0][0]);
		            domainNameRules[result.data[0][0]] = new Array(11);
		            for (var i=0; i<11; i++) {
		                domainNameRules[result.data[0][0]][i] = result.data[0][i+1];
		            }
		            console.log("\n Recorded domainNameRules="+domainNameRules[result.data[0][0]]);
            }
	      }); 
    } // end of FOR j=0 Loop

} // end of "getDomainRulesFromDB" function


// Get for "all" if no tab is loaded
userCSP.port.on("getCSPforAll", function (text) {
    // reset domainNameRules
    domainNameRules = {};
    domainNameRules.length = 0;
    getDomainRulesFromDB(domainList);

    timers.setTimeout(function(){dump("\n I have got record for : "+domainNameRules.length+" Domain in main add-on"); if (domainNameRules.length != 0) { console.log("\n I need to send data to the add-on UI for : "+domainNameRules.length+ " Domain names"); userCSP.port.emit("showCSPRules",domainNameRules,websiteCSPRules,websiteCSPFull,myDatabase);} }, 1000);
    
});


// Use "tabs" API's event handler 
tabs.on('ready', function(evtTab) {
    if (evtTab.url != "about:blank") {  
        var hostName = URL(evtTab.url).host;
        
        console.log("Number of open tabs="+tabs.length);
        console.log("DOMContentLoaded:"+hostName);
        console.log("index="+evtTab.index);
               
        var tempStr;

        // reset the domainList array
        domainList = new Array();

        for (var i=0; i<tabs.length; i++) {
            tempStr = URL(tabs[i].url).host;
            if (!searchStringInArray(tempStr)) { 
                // Not found, so insert it in array
                domainList.push(tempStr);
                console.log(tempStr + " will be sent to UI");
                
            }
        }
        console.log("\n sending domainList:"+domainList);
        userCSP.port.emit("addHostName", domainList);
	
	// reset domainNameRules
	domainNameRules = {};
	domainNameRules.length = 0;
  // Retrieve user specified csp rules for domain from d/b
	getDomainRulesFromDB(domainList);       

	      timers.setTimeout(function(){dump("\n I have got record for : "+domainNameRules.length+" Domain in main add-on"); if (domainNameRules.length != 0) { console.log("\n I need to send data to the add-on UI for : "+domainNameRules.length+ " Domain names"); userCSP.port.emit("showCSPRules",domainNameRules,websiteCSPRules,websiteCSPFull,myDatabase);}else{console.log("\n I need to send data to the add-on UI. showCSPRules : "); userCSP.port.emit("showCSPRules",domainNameRules,websiteCSPRules,websiteCSPFull,myDatabase); } }, 1000);
	
    } // end of "evetTab.url" IF loop
});

tabs.on('close', function(evtTab) {
    if (evtTab.url != "about:blank") {
        console.log("Window Closed:"+evtTab.url + "\n Index = "+evtTab.index);
        var hostName = URL(evtTab.url).host;
        
        var temp = "";
        var notFound = true;
        for (var i=0; i<tabs.length; i++) {
	    if (tabs[i].url=="" || tabs[i].url=="about:blank")
		continue;

            temp = URL(tabs[i].url).host;
            if (temp.indexOf(hostName) != -1) {
                console.log("\n Duplicate Tab is closed so nothing to do");
                notFound = false;
                break;
            }                
        }

        if (notFound) {
            console.log("\n No Duplication so remove hostname from list");
            for (var i=0; i<domainList.length;i++) {
                if(domainList[i].match(hostName)) {
                    // remove the element
                    domainList.splice(i,1); 
                    console.log("\n" + hostName+" is sent for removal");
                    // send it to add-on UI to remove it
                    userCSP.port.emit("rmHost", hostName);
                }
            }            
        } // end of IF found Loop      
    } // end of "evtTab.url" IF loop
});




// Insertion of values into database.
// try {
// sql.execute('insert into userCSPTable(domainName, default-src) values("123", "*");');
// console.log("Executed correctly");
// } catch(e){ console.error(e.name+' - '+e.message); }


// Listen for domain rules 
userCSP.port.on("storeDomainRules", function (domainName, directiveRules) {
    console.log("main add-on recevied:"+domainName+" = "+directiveRules);

    console.log("directiveRules length = "+directiveRules.length);

    // Store CSP rules for domain in the D/B
    try{
        var selStat = "select * from userCSPTable where domainName=\""+domainName+"\"";
        sql.execute(selStat,function(result,status) {
            console.log("result.rows="+result.rows);            
            if (result.rows != 0) {               
                var delStat = "delete from userCSPTable where domainName=\""+domainName+"\";"; 
                sql.execute(delStat);                   
            }

            // insert data for the domainName into the D/B
            var statement = "insert into userCSPTable values(\""+domainName+"\",\""+directiveRules[0]+"\",\""+directiveRules[1]+"\",\""+directiveRules[2]+"\",\""+directiveRules[3]+"\",\""+directiveRules[4]+"\",\""+directiveRules[5]+"\",\""+directiveRules[6]+"\",\""+directiveRules[7]+"\",\""+directiveRules[8]+"\",\""+directiveRules[9]+"\",\""+directiveRules[10]+"\");";
            sql.execute(statement);

            // Print Retrieve Data. This is only for testing purpose.
            selStat = "select * from userCSPTable where domainName=\""+domainName+"\"";
            sql.execute(selStat,function(result,status){
                for(var i=0;i<result.rows;i++){
                    for(var j=0;j<result.cols;j++){
                        console.log("Result:"+result.data[i][j]);
                        // console.log("Can u see me?");
                    }
                }
            });

        });
    
    } catch(e){ console.error("select error:"+e.name+' - '+e.message); }
   
});
 

// Listen for messages called "text-entered" coming from
// the page script. The message payload is the text the user
// entered.
// In this implementation we'll just log the text to the console.
userCSP.port.on("exitUserCSP", function (text) {
  console.log(text);
  userCSP.hide();
});
 

// Listen for domainName request message
userCSP.port.on("domainNames", function (text) {
  console.log(text); 
    
 //    var j = 0;
 //  // Retrieve Domain Names from currently active tabs
 //    for (var i=0; i < tabs.length; i++) {
 //  console.log("Tabs Title: "+tabs[i].title);
 //  if (tabs[i].url == "about:blank" || tabs[i].url == "") {
 //      continue;	    
 //  } else {
 //      domainList[j] = tabs[i].url;
 //      console.log(domainList[j]);
 //      j = j+ 1; // var J is used if we need to skip some var i values
 //  }
 //    }

  // console.log("@main.js: DomainList="+domainList);

  //// send domain name list
 // userCSP.port.emit("domainNames", domainList);

 // // userCSP.hide();
});

//------------------------------------------------------------------------
// Observer serives and logic to read website CSP


// // Function to get top document of that http channel
// function getTopURI(aChannel) {
//     try {
// 	      var notificationCallbacks = aChannel.notificationCallbacks ? aChannel.notificationCallbacks : aChannel.loadGroup.notificationCallbacks;

// 	      if (!notificationCallbacks) {
// 	          return null;
// 	      }
	      
// 	      var callback = notificationCallbacks.getInterface(Ci.nsIDOMWindow);
// 	      return callback.top.document;
//     }
//     catch(e) {
// 		    console.log("\n @@@ Error: " + e + "\n");
// 	      return null;
//     }
// }

var Result = null;
selStat = "select * from userCSPTable";
sql.execute(selStat,function(result,status){
    for(var i=0;i<result.rows;i++){
        for(var j=1;j<result.cols;j++){
            if (result.data[i][j] != "null" || result.data[i][j] != "") {
                switch(j) {
                case 1:
                    Result = "allow " + result.data[i][j] + "; ";
                    break;
                case 2:
                    if (Result != null)
                        Result += "script-src "+result.data[i][j] +"; ";
                    else
                        Result = "script-src " + result.data[i][j]+"; ";
                    break;
                case 3:
                    if (Result != null)
                        Result += "object-src "+result.data[i][j]+"; ";
                    else
                        Result = "object-src " + result.data[i][j]+"; ";
                    break;
                case 4:
                    if (Result != null)
                        Result += "img-src "+result.data[i][j]+"; ";
                    else
                        Result = "img-src " + result.data[i][j]+"; ";
                    break;
                case 5:
                    if (Result != null)
                        Result += "media-src "+result.data[i][j]+"; ";
                    else
                        Result = "media-src " + result.data[i][j]+"; ";
                    break;
                case 6:
                    if (Result != null)
                        Result += "style-src "+result.data[i][j]+"; ";
                    else
                        Result = "style-src " + result.data[i][j]+"; ";
                    break;
                case 7:
                    if (Result != null)
                        Result += "frame-src "+result.data[i][j]+"; ";
                    else
                        Result = "frame-src " + result.data[i][j]+"; ";
                    break;
                case 8:
                    if (Result != null)
                        Result += "font-src "+result.data[i][j]+"; ";
                    else
                        Result = "font-src " + result.data[i][j]+"; ";
                    break;
                case 9:
                    if (Result != null)
                        Result += "xhr-src "+result.data[i][j]+"; ";
                    else
                        Result = "xhr-src " + result.data[i][j]+"; ";
                    break;
                case 10:
                    if (Result != null)
                        Result += "frame-ancestors "+result.data[i][j]+"; ";
                    else
                        Result = "frame-ancestors " + result.data[i][j]+"; ";
                    break;
                } // end of switch(j) Loop
            } // end of IF(result.data[i][j] = null Loop

        } // end of For J loop
     
        //Record data of all domains
        myDatabase[result.data[i][0]] = new Array(2);
        myDatabase[result.data[i][0]][0] = Result; 
        myDatabase[result.data[i][0]][1] = result.data[i][11];

        if (result.data[i][11] == "true" || result.data[i][11] == true) { 
           // myDatabase[result.data[i][0]] = Result;        
            console.log(" Complete CSP:  "+ result.data[i][0] +" = "+myDatabase[result.data[i][0]][0]);
        }
        Result = null;
    } // end of FOR I loop
});

// Filterout null keyword from my CSP string
function websiteCSPNullFilter(cspRules, index) {
    switch(index)
    {
    case 0:
        var n = cspRules.search("allow");
        if (n != -1) {
         var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else 
            return "";
        break;
    case 1:
        var n = cspRules.search("script-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 2:
        var n = cspRules.search("object-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 3:
        var n = cspRules.search("img-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 4:
        var n = cspRules.search("media-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 5:
        var n = cspRules.search("style-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 6:
        var n = cspRules.search("frame-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 7:
        var n = cspRules.search("font-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 8:
        var n = cspRules.search("xhr-src");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 9:
        var n = cspRules.search("frame-ancestors");
        if (n != -1) {
            
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
        
    } // end of switch statement
} // end of websiteCSPFilter function

// Function to sepaprate each directive
function websiteCSPFilter(cspRules, index) {
    switch(index)
    {
    case 0:
        var n = cspRules.search("allow");
        if (n != -1) {
            n += 5;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else 
            return "";
        break;
    case 1:
        var n = cspRules.search("script-src");
        if (n != -1) {
            n += 10;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 2:
        var n = cspRules.search("object-src");
        if (n != -1) {
            n += 10;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 3:
        var n = cspRules.search("img-src");
        if (n != -1) {
            n += 7;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 4:
        var n = cspRules.search("media-src");
        if (n != -1) {
            n += 9;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 5:
        var n = cspRules.search("style-src");
        if (n != -1) {
            n += 9;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 6:
        var n = cspRules.search("frame-src");
        if (n != -1) {
            n += 9;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 7:
        var n = cspRules.search("font-src");
        if (n != -1) {
            n += 8;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 8:
        var n = cspRules.search("xhr-src");
        if (n != -1) {
            n += 7;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
    case 9:
        var n = cspRules.search("frame-ancestors");
        if (n != -1) {
            n += 15;
            var k = cspRules.indexOf(";", n);
            if (k != -1) {
                return cspRules.substring(n, k);
            } else {
                return cspRules.substring(n);
            }
        } else
            return "";
        break;
        
    } // end of switch statement
} // end of websiteCSPFilter function


// Callback for 'http-on-examine-response' notification
function httpExamineCallback(aSubject, aTopic, aData) {
    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);

    // Filter out redirect response
    // ---TODO ---

    if (httpChannel.responseStatus == 200) {
        console.log("http-on-examine-response event fired");
        console.log("Response Status = "+ httpChannel.responseStatus);
        console.log("@@@@ Intercepting http request: " + httpChannel.URI.spec + "\n");
        console.log(" Response Host = " + httpChannel.URI.host); 
        
        // Check for website CSP rules
        try {
            var cspRules = httpChannel.getResponseHeader("X-Content-Security-Policy");    
            websiteCSPRules[httpChannel.URI.host] = new Array(10);
            websiteCSPFull[httpChannel.URI.host] = cspRules;
            for (var i=0; i<10; i++) {
                websiteCSPRules[httpChannel.URI.host][i] = websiteCSPFilter(cspRules, i);
                console.log(httpChannel.URI.host+ " Website CSP Rules ["+i+"] = "+ websiteCSPRules[httpChannel.URI.host][i]);
            }
            // websiteCSPRules[httpChannel.URI.host] = cspRules;           
        } catch(e) {
            // Website does not specified CSP rules
        }
        

        // -------------------------------------------------------------
        // Overwrite User Specified CSP into response header
        if (!myDatabase[httpChannel.URI.host] && !myDatabase["all"])
            return;

	console.log("Either wisesite rule or ALL rules exists. Website = "+ httpChannel.URI.host);
        if (!myDatabase[httpChannel.URI.host]) {
            console.log("May be I will set ALL Rules for this website="+ httpChannel.URI.host);
            if(myDatabase["all"][0] != null && (myDatabase["all"][1] == "true" || myDatabase["all"][1] == true)) {
                httpChannel.setResponseHeader("X-Content-Security-Policy", myDatabase["all"][0], false);
                console.log(" $$$Response Header set to value of All :"+ ALL);
            }
            
        } else if (myDatabase[httpChannel.URI.host][0] != null && (myDatabase[httpChannel.URI.host][1] == "true" || myDatabase[httpChannel.URI.host][1] == true)){
	    var Result = "";
            var temp = "";
	    for(var i=0; i<10; i++) {
		temp = websiteCSPNullFilter(myDatabase[httpChannel.URI.host][0]);
		if (temp == null || temp == "null") {
		    continue;
		} else {
		    Result = Result + temp;
		}
	    } // end of For loop
	    // httpChannel.setResponseHeader("X-Content-Security-Policy", myDatabase[httpChannel.URI.host][0], false);
	    httpChannel.setResponseHeader("X-Content-Security-Policy", Result, false);
            console.log(" $$$Response Header set for website itself:"+ httpChannel.URI.host);
            console.log("X-Content-Security-Policy="+Result);
        } 

    } // end of responseStatus == 200 IF loop

    // // Get corresponding Tab domain of request
    //  var cur_doc = getTopURI(httpChannel);
    // console.log(" cur_doc= " +cur_doc);
    
    // if (cur_doc.documentURIObject)
    //     console.log("cur_doc.documentURIObject= " +cur_doc.documentURIObject);
    // else 
    //    console.log("DocumentURIObject is not present yet");

    // if (cur_doc.documentURIObject.host)
    //     console.log(" cur_doc.documentURIObject.host= " +cur_doc.documentURIObject.host);
    // else
    //     console.log(" Host is not present yet");



    // Check of userCSP existis for domain
    


    // Step 3: If Yes, then set 'Content-Security-Policy' response header

}

// observer.add("http-on-examine-response", httpExamineCallback); 

// Register observer service for http events
var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	observerService.addObserver(httpExamineCallback, "http-on-examine-response", false);



userCSP.port.on("combineStrictPolicy", function (sitePolicy, userPolicy, webDomain) {
    console.log("combineStrictPolicy routine is invoked");
    try {
        var csp = Cc["@mozilla.org/contentsecuritypolicy;1"].createInstance(Ci.nsIContentSecurityPolicy);
        var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var tempURL = "http://" + webDomain;
        var selfuri = ioService.newURI(tempURL, null, null);        
        csp.refinePolicy(sitePolicy, selfuri);
        csp.refinePolicy(userPolicy, selfuri);
        // send combine Strict policy to UI
        userCSP.port.emit("setCombineStrict", csp.policy, webDomain);

       // console.log("$$$ CSP after RefinePolicy="+csp.policy);
    } catch(e) {
        console.log("%%% Error code of refinePolicy method: "+e);
    }

});


















// ---------------------------------------------------------------------
// Content Policy registration and handling

// /**
//  * clearhttpstatus namespace
//  */
// if ("undefined" == typeof(clearhttpstatus)) {
//     var clearhttpstatus = {};
// }

// clearhttpstatus.contentPolicyImp = {
//   // ContentPolicy Registration data
//   classDescription: "Clear HTTP Status Content Policy",
//   classID: Components.ID("{917ec5c2-9069-47ff-9553-18040429fe03}"),
//   contractID: "@comp.nus.edu.sg/clearHTTPStatusPolicy;1",

//   //
//   // nsISupports interface implementation
//   //
//   QueryInterface: function(iid) {        
//         if (iid.equals(Components.interfaces.nsISupports) || iid.equals(Components.interfaces.nsIFactory) || iid.equals(Components.interfaces.nsIContentPolicy))
//             return this;

//         throw Components.results.NS_ERROR_NO_INTERFACE;
//   },

//   //
// 	// nsIFactory interface implementation
// 	//
//   createInstance: function(outer, iid) {
//     return this.QueryInterface(iid);
//   },

 
//   //
// 	// nsIContentPolicy interface implementation
// 	//
//   shouldLoad: function(contentType, contentLocation, requestOrigin, node, mimeTypeGuess, extra)	{

//     // Ignore requests without node/context and top-level documents
// 		if (!node || contentType == Components.interfaces.nsIContentPolicy.TYPE_DOCUMENT)
// 			return Components.interfaces.nsIContentPolicy.ACCEPT;

// 		// Ignore standalone OBJECTS
// 		if (contentType == Components.interfaces.nsIContentPolicy.TYPE_OBJECT && node.ownerDocument && !/^text\/|[+\/]xml$/.test(node.ownerDocument.contentType))
// 			return Components.interfaces.nsIContentPolicy.ACCEPT;

 
    
//     // Ignore request initiated by chrome:// protcol OR 
//     // Destination URI using moz-icon:// protocol
//     if ((this.aOriginURI.scheme == "chrome") || (this.aDestURI.scheme == "moz-icon"))
//       return Components.interfaces.nsIContentPolicy.ACCEPT;  

//       console.log("\n Conetnt Policy Should Load invoked");
   
// 		return Components.interfaces.nsIContentPolicy.ACCEPT;
//   },

//   shouldProcess: function(contentType, contentLocation, requestOrigin, node, mimeType, extra)	{
// 		return Components.interfaces.nsIContentPolicy.ACCEPT;
// 	},

// };
 
//********************************************************************




// // Register content policy
//       var registrarCHS = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
// 		  try
// 		  {
// 			  registrarCHS.registerFactory(clearhttpstatus.contentPolicyImp.classID, clearhttpstatus.contentPolicyImp.classDescription, clearhttpstatus.contentPolicyImp.contractID, clearhttpstatus.contentPolicyImp);
// 		  }
// 		  catch (e)
// 		  {
//         // report the error and continue execution
//         Cu.reportError(e);       
// 		  }

//       var categoryManagerCHS = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
//       categoryManagerCHS.addCategoryEntry("content-policy", clearhttpstatus.contentPolicyImp.classDescription, clearhttpstatus.contentPolicyImp.contractID, false, true);