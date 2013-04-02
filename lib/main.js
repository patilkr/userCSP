/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
*/

var data = require("self").data;
var tabs = require('sdk/tabs');
const timers = require('timers');
const observer = require('observer-service');
const {URL} = require("url"); //or another way to get it is as follows
var ss = require("sdk/simple-storage"); // persistent data store APIs
// var URL = require("url").URL;
// const sql = require("sqlite");

const {Cc,Ci,Cu,Cr} = require("chrome");

const xpcom = require("xpcom");
//var kwindows = require("sdk/windows");

// const { Class } = require("api-utils/heritage");  // Older version of SDK
const { Class } = require("sdk/core/heritage");

// userCSP custom libraries
const userCSPcache = require("userCSP_cache");


// Desk = Desktop directory
// ProfD = profile directory
// Home = OS root directory
const fileDirectoryService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("Desk",Ci.nsIFile);

const storageService = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService);

/*Here is all the data about the current connection with sqlite*/
let connection = null;

//let cspUtil = Cu.import('resource://gre/modules/CSPUtils.jsm');

//------------------------------------------------------------------------
 
// Create D/b: "userCSP.sqlite"
// Database will be created if it doesn't exists. 
// Otherwise, existing database file will be used. 
//sql.connect("userCSP.sqlite");
fileDirectoryService.append("userCSP.sqlite");
connection = storageService.openDatabase(fileDirectoryService);

// Create Database Table "userCSPTable" to store user CSP policies 
// for each domain. Table will be created if it doesn't exists. 
//sql.tableUsedOrNew("userCSPTable");
if (!connection.connectionReady) {
    console.error("Something is wrong. database is not created" );
} else{
    console.log("userCSP.sqlite database is created sucessfully." );
}    

/* If table doesn't exists then create it. */
if(!connection.tableExists("userCSPTable")) {
    try {	    
        // connection.executeSimpleSQL("create table userCSPTable(id integer primary key autoincrement, domainName text not null, defaultSrc text, scriptSrc text, objectSrc text, imgSrc text, mediaSrc text, styleSrc text, frameSrc text, fontSrc text, xhrSrc text, frameAncestors text);");

        // Create userCSP Table
        connection.executeSimpleSQL("create table userCSPTable(domainName text primary key, defaultSrc text, scriptSrc text, objectSrc text, imgSrc text, mediaSrc text, styleSrc text, frameSrc text, fontSrc text, xhrSrc text, frameAncestors text, reporturi text, ruleState integer, inlineState boolean, combinedCSP text, inlineEval boolean);");            

        console.log("userCSP add-on: userCSP table is created sucessfully!" );
    } catch (e) {
        console.error(e.name+' - '+e.message+" --UserCSP: Table Creation Failed");
    }

} // end of "tableExists" IF loop 


// Simple-storage APIs 
// Create persitent store for infer policy
if (!ss.storage.inferredPolicies) {
    ss.storage.inferredPolicies = {};
}

if (!ss.storage.inferredPoliciesArray) {
    ss.storage.inferredPoliciesArray = {};
}

// Delete entries if we exceed 5M bytes of store
ss.on("OverQuota", function () {
  while (ss.quotaUsage > 1)
    ss.storage.inferredPoliciesArray.pop();
});

// Create a panel whose content is defined in "text-entry.html".
var userCSP = require("panel").Panel({
  width: 620,
  height: 720,
  contentURL: data.url("default-src.html"),
});
 

// Create a widget, and attach the panel to it, so the panel is
// shown when the user clicks the widget.
require("widget").Widget({
  label: "UserCSP",
  id: "userContentSecurityPolicy",
  contentURL: data.url("CSP_logo-48*54.jpg"),
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

// Infer rule array
var inferRuleArray = {}; // stores infer rules in array format
var inferRules = {} // stores all rules
var inferCSPFlag = true; // inferCSP policy flag
//---------------------------------------------------------------------


// Add event listener to Bcak/Forward Button and
// Read HTTP header (Content-Security-Policy) header from cache

userCSPcache.userCSPregisterBFbtnListener();


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

    /*sqrObject have the information about the result of query*/
    let sqrObject = new Object();
    sqrObject.data = new Array();
    sqrObject.cols = 0;
    sqrObject.rows = 0;
    let query = connection.createStatement("select * from userCSPTable where domainName='all'");
    query.executeAsync({
            handleResult:function(resultSet){
                for(var row=resultSet.getNextRow();row;row=resultSet.getNextRow()){
                    sqrObject.cols = row.numEntries;
                    let dataRow = new Array(sqrObject.cols);
                    for(var i=0;i<sqrObject.cols;i++){
                        dataRow[i] = row.getResultByIndex(i);
                    }
                    sqrObject.data[sqrObject.rows] = dataRow;
                    sqrObject.rows++;
                }
            },
                handleError:function(error){
                console.log(" SQl query execution error : "+error);
            },
                handleCompletion:function(reason){
                if (sqrObject.rows != 0) {               
                    domainNameRules["all"] = new Array(15);
                    domainNameRules.length += 1;
                    for (var i=0; i<15; i++) {
                        domainNameRules["all"][i] = sqrObject.data[0][i+1];
                    }

                    console.log("\n Recorded domainNameRules for ALL from DB="+domainNameRules["all"]);

                }
            }
        });

    console.log("dList.length = "+dList.length);
    for (var j=0; j < dList.length; j++) {
        // Asynchronous execution
        //	      var  = "select * from userCSPTable where domainName=\""+dList[j]+"\"";
	      // console.log(selStat);

        /*sqrObject have the information about the result of query*/
        let sqrObject = new Object();
        sqrObject.data = new Array();
        sqrObject.cols = 0;
        sqrObject.rows = 0;
        let query = connection.createStatement("select * from userCSPTable where domainName= :domain_name");
        query.params.domain_name=dList[j];
        console.log("dList[j]=" + dList[j]);

        query.executeAsync({
                handleResult:function(resultSet){
                    for(var row=resultSet.getNextRow();row;row=resultSet.getNextRow()){
                        sqrObject.cols = row.numEntries;
                        let dataRow = new Array(sqrObject.cols);
                        for(var i=0;i<sqrObject.cols;i++){
                            dataRow[i] = row.getResultByIndex(i);
                        }
                        sqrObject.data[sqrObject.rows] = dataRow;
                        sqrObject.rows++;
                    }
                },
                    handleError:function(error){
                    console.log(" SQL stat execution Error Code ="+error);
                },
                    handleCompletion:function(reason){
                    console.log(" Number of rows retruned by DB="+sqrObject.rows);
                    if (sqrObject.rows != 0) {               
                        domainNameRules.length += 1;
                        console.log("\n domainNameRules="+sqrObject.data[0][0]);
                        domainNameRules[sqrObject.data[0][0]] = new Array(15);
                        for (var i=0; i<15; i++) {
                            domainNameRules[sqrObject.data[0][0]][i] = sqrObject.data[0][i+1];
                        }
                        console.log("\n Recorded domainNameRules for "+ sqrObject.data[0][0] + " from DB="+domainNameRules[sqrObject.data[0][0]]);
                    }
                }
            });

    } // end of FOR j=0 Loop

} // end of "getDomainRulesFromDB" function


// helper function to get currently active domain
function getActiveDomain() {
    if (tabs.activeTab.url == "about:blank") return;
    if (!(URL(tabs.activeTab.url).host)) return;

    if ((URL(tabs.activeTab.url).scheme == "http") || (URL(tabs.activeTab.url).scheme == "https")) {
        var activeWindow = URL(tabs.activeTab.url).scheme+"://"+URL(tabs.activeTab.url).host;
        domainNameRules.activeDomain = activeWindow;
        console.log("Origin of active tab = " + domainNameRules.activeDomain);
    }
} // end of getActiveDomain() function


// Get for "all" if no tab is loaded
userCSP.port.on("getCSPforAll", function (text) {
    // reset domainNameRules
	  domainNameRules = {};
	  domainNameRules.length = 0; // number of domain rule presents
    // Curently active domain- default: Every
    domainNameRules.activeDomain = "Every"; 
    getActiveDomain();

    getDomainRulesFromDB(domainList);

    timers.setTimeout(function(){dump("\n I have got record for : "+domainNameRules.length+" Domain in main add-on \n"); if (domainNameRules.length != 0) { console.log("I need to send data to the add-on UI for : "+domainNameRules.length+ " Domain names"); userCSP.port.emit("showCSPRules",domainNameRules,websiteCSPRules,websiteCSPFull,myDatabase, inferRules);} }, 1000);
    
});

exports.userCSP_getRulesForTabs = function userCSPP_getRulesForTabs(hostName) {
    userCSP_getRulesForOpenTabs(hostName);
}

function userCSP_getRulesForOpenTabs(hostName) {
    var tempStr;

    // reset the domainList array
    domainList = new Array();

    for (var i=0; i<tabs.length; i++) {
        //  console.log("scheme="+URL(tabs[i].url).scheme);
        tempStr = URL(tabs[i].url).scheme+"://"+URL(tabs[i].url).host;
        if (!searchStringInArray(tempStr)) { 
            // Not found, so insert it in array
            domainList.push(tempStr);
            console.log(tempStr + " will be sent to UI");

            // infer Policy
            // hostName = tempStr;
            if (typeof(inferRuleArray[tempStr]) == undefined || !inferRuleArray[tempStr]) {
                inferRuleArray[tempStr] = new Array(11);
                inferRuleArray[tempStr][0] = "'self'"; // default-src
                inferRuleArray[tempStr][9] = "*"; // frame-ancestors
            } 
            
            // simple-storage usage for inferCSP policy
            if (!ss.storage.inferredPoliciesArray[hostName]) {
                ss.storage.inferredPoliciesArray[hostName] = new Array(11);
                ss.storage.inferredPoliciesArray[hostName][0] = "'self'";
                ss.storage.inferredPoliciesArray[hostName][9] = "*";
            }

            var Result = "";
            var newResult = "";

            for (var j=0; j<10; j++) {
                if (!inferRuleArray[tempStr][j])
                    continue;
                
                Result = helperToAddDirNames(Result, j+1, inferRuleArray[tempStr][j]); 
                
                newResult = helperToAddDirNames(newResult, j+1, ss.storage.inferredPoliciesArray[tempStr][j]); 

            }
            inferRules[tempStr] = Result;
            try {
                if (ss.storage.inferredPolicies[tempStr]) {
                   console.log("\n\n Previous Inferred rules for "+tempStr+" ="+ss.storage.inferredPolicies[tempStr]);                 
                    ss.storage.inferredPolicies[tempStr] = newResult;

                } else {
                     ss.storage.inferredPolicies[tempStr] = newResult;
                }
  
            }catch (e) {
                ss.storage.inferredPolicies[tempStr] = newResult;
            }
            console.log(" Currently inferred rules using inferRuleArray for "+tempStr+" ="+Result);
            console.log("\n Current Infered rules using ss.storage for "+tempStr+" ="+ss.storage.inferredPolicies[tempStr]);

        } // end of IF loop
    } // end of FOR loop

    console.log(" Sending domainList:"+domainList);
    userCSP.port.emit("addHostName", domainList);
	  
	  // reset domainNameRules
	  domainNameRules = {};
	  domainNameRules.length = 0; // number of domain rule presents
    // Curently active domain- default: Every
    domainNameRules.activeDomain = "Every"; 

    // Retrieve user specified csp rules for domain from d/b
	  getDomainRulesFromDB(domainList);       

    // Function to get currently active domain name
    getActiveDomain();


    // send record to add-on UI
	  timers.setTimeout(function(){dump("\n I have got record for : "+domainNameRules.length+" Domain in main add-on"); if (domainNameRules.length != 0) { console.log("\n I need to send data to the add-on UI for : "+domainNameRules.length+ " Domain names"); userCSP.port.emit("showCSPRules",domainNameRules,websiteCSPRules,websiteCSPFull,myDatabase,inferRules);}else{console.log("\n I need to send data to the add-on UI. showCSPRules : "); userCSP.port.emit("showCSPRules",domainNameRules,websiteCSPRules,websiteCSPFull,myDatabase, inferRules); } }, 1000);
	  
}

// Use "tabs" API's event handler
// Tabs "READY" event: emitted when DOM contents are ready
tabs.on('ready', function(evtTab) {
    if (evtTab.url != "about:blank") {  

        if (!(URL(evtTab.url).host)) // if host is null
            return;

        var hostName = URL(evtTab.url).scheme+"://"+URL(evtTab.url).host;
        
        console.log("Number of open tabs="+tabs.length);
        console.log("DOMContentLoaded:"+hostName);

        userCSP_getRulesForOpenTabs(hostName);
    } // end of "evetTab.url" IF loop
});



//  Tabs "activate" Event: Emmited when the tab is made active 
tabs.on('activate', function(evtTab) {
    // reset domainNameRules
	  domainNameRules = {};
	  domainNameRules.length = 0; // number of domain rule presents
    // Curently active domain- default: Every
    domainNameRules.activeDomain = "Every"; 

    // Function to get currently active domain name
    getActiveDomain();
    userCSP.port.emit("changeActiveDomain",domainNameRules.activeDomain);
    // Change currently active window. 

});



// Tabs "Close" event: Emitted when tab is closed
tabs.on('close', function(evtTab) {
    if (evtTab.url != "about:blank") {
        console.log("Window Closed:"+evtTab.url + "\n Index = "+evtTab.index);
        var hostName = URL(evtTab.url).scheme+"://"+URL(evtTab.url).host;
        
        var temp = "";
        var notFound = true;
        for (var i=0; i<tabs.length; i++) {
	    if (tabs[i].url=="" || tabs[i].url=="about:blank")
		continue;

            temp = URL(tabs[i].url).scheme+"://"+URL(tabs[i].url).host;
            if (temp != null) {
                if (temp.indexOf(hostName) != -1) {
                    console.log("\n Duplicate Tab is closed so nothing to do");
                    notFound = false;
                    break;
                }    
            }            
        }

        if (notFound) {
            console.log("\n No Duplication so remove hostname from list");
            for (var i=0; i<domainList.length;i++) {
                if (domainList[i] != null) {
                    if(domainList[i].match(hostName)) {
                        // remove the element
                        domainList.splice(i,1); 
                        console.log("\n" + hostName+" is sent for removal");
                        // send it to add-on UI to remove it
                        userCSP.port.emit("rmHost", hostName);
                    }
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


function insertValInDB(domainName, directiveRules) {
    // insert data for the domainName into the D/B
    // Synchronous execution
    // var statement = "insert into userCSPTable values(\""+domainName+"\",\""+directiveRules[0]+"\",\""+directiveRules[1]+"\",\""+directiveRules[2]+"\",\""+directiveRules[3]+"\",\""+directiveRules[4]+"\",\""+directiveRules[5]+"\",\""+directiveRules[6]+"\",\""+directiveRules[7]+"\",\""+directiveRules[8]+"\",\""+directiveRules[9]+"\",\""+directiveRules[10]+"\",\""+directiveRules[11]+"\",\""+directiveRules[12]+"\",\""+directiveRules[13]+"\",\""+directiveRules[14]+"\");";     
    
    // sql.execute(statement);

    console.log("Insertion values into database table for : "+domainName);

    let statement = connection.createStatement("INSERT INTO userCSPTable VALUES(:domain_name, :dRule0, :dRule1, :dRule2, :dRule3, :dRule4, :dRule5, :dRule6, :dRule7, :dRule8, :dRule9, :dRule10, :dRule11, :dRule12, :dRule13, :dRule14);");
    statement.params.domain_name = domainName;
    statement.params.dRule0 = directiveRules[0];
    statement.params.dRule1 = directiveRules[1];
    statement.params.dRule2 = directiveRules[2];
    statement.params.dRule3 = directiveRules[3];
    statement.params.dRule4 = directiveRules[4];
    statement.params.dRule5 = directiveRules[5];
    statement.params.dRule6 = directiveRules[6];
    statement.params.dRule7 = directiveRules[7];    
    statement.params.dRule8 = directiveRules[8];
    statement.params.dRule9 = directiveRules[9];
    statement.params.dRule10 = directiveRules[10];
    statement.params.dRule11 = directiveRules[11];
    statement.params.dRule12 = directiveRules[12];
    statement.params.dRule13 = directiveRules[13];
    statement.params.dRule14 = directiveRules[14];

    //  connection.executeSimpleSQL(statement);

    statement.executeAsync({
        handleResult:function(resultSet){           
        },
        handleError:function(error){
            console.log(" SQL query execution error"+error);
        },
        handleCompletion:function(reason){              
        }
    });

    // storeDBintoMyData(domainName, directiveRules);

} // end of insertValInDB() function


function storeDBintoMyData(domainName, directiveRules) {
    // This is to apply rules immediately without browser restart
    // Asynchronous execution
    //  selStat = "select * from userCSPTable where domainName=\""+domainName+"\"";

    console.log("Inside storeDBintoMyData");

    /*sqrObject have the information about the result of query*/
    let sqrObject = new Object();
    sqrObject.data = new Array();
    sqrObject.cols = 0;
    sqrObject.rows = 0;
    var statement = connection.createStatement("SELECT * FROM userCSPTable WHERE domainName = :domain_name");
    statement.params.domain_name = domainName;

    statement.executeAsync({
        handleResult:function(resultSet){
            for(var row=resultSet.getNextRow();row;row=resultSet.getNextRow()){
                sqrObject.cols = row.numEntries;
                let dataRow = new Array(sqrObject.cols);
                for(var i=0;i<sqrObject.cols;i++){
                    dataRow[i] = row.getResultByIndex(i);
                }
                sqrObject.data[sqrObject.rows] = dataRow;
                sqrObject.rows++;
            }
        },
        handleError:function(error){
            console.log(" SQL query statement execution error"+error);
        },
        handleCompletion:function(reason){
                var Result = "";
                for(var i=0;i<sqrObject.rows;i++){
                    for(var j=0;j<sqrObject.cols;j++){

                        // console.log("Result:"+sqrObject.data[i][j]);

                        if (sqrObject.data[i][j] == "null") continue; 
                        if (sqrObject.data[i][j] == "" || sqrObject.data[i][j] == " ") continue;
                        
                        Result = helperToAddDirNames(Result, j, sqrObject.data[i][j]);

                        
                    } // end of For J

                    //Record data of all domains
                    if (!myDatabase[domainName]) {
                        myDatabase[domainName] = new Array(5);
                    }
                    myDatabase[domainName][0] = Result; 
                    console.log(domainName+ " Rules retrived from DB =" + myDatabase[domainName][0]);
                    myDatabase[domainName][1] = sqrObject.data[i][12]; // state
                    //myDatabase[domainName][2] = sqrObject.data[i][13]; // sct
                    myDatabase[domainName][3] = sqrObject.data[i][14]; // comb
                   // myDatabase[domainName][4] = sqrObject.data[i][15]; // eval

                    Result = "";
                } // end of FOR I
        }
    });

    
}// end of storeDBintoMyData() function


// Listen for domain rules 
userCSP.port.on("storeDomainRules", function (domainName, directiveRules) {
 
 console.log("main add-on recevied:"+domainName+" = "+directiveRules);

    // Store CSP rules for domain in the D/B
    try{
        // Asynchronous execution
        /*sqrObject have the information about the result of query*/
        let sqrObject = new Object();
        sqrObject.data = new Array();
        sqrObject.cols = 0;
        sqrObject.rows = 0;
        let query = connection.createStatement("select * from userCSPTable where domainName= :domain_name");
        query.params.domain_name=domainName;
        query.executeAsync({
                handleResult:function(resultSet){
                    for(var row=resultSet.getNextRow();row;row=resultSet.getNextRow()){
                        sqrObject.cols = row.numEntries;
                        let dataRow = new Array(sqrObject.cols);
                        for(var i=0;i<sqrObject.cols;i++){
                            dataRow[i] = row.getResultByIndex(i);
                        }
                        sqrObject.data[sqrObject.rows] = dataRow;
                        sqrObject.rows++;
                    }
                },
                    handleError:function(error){
                    console.log(" Sql query execution error:"+error);
                },
                    handleCompletion:function(reason){
                    // console.log("sqrObject.rows="+sqrObject.rows);            
                    if (sqrObject.rows != 0) {               
                        let query = connection.createStatement("delete from userCSPTable where domainName= :domain_name");
                        query.params.domain_name=domainName;

                        //connection.executeSimpleSQL(query);
                        query.executeAsync({
                                handleResult:function(resultSet){           
                                },
                                    handleError:function(error){
                                    console.log(" SQL query execution error"+error);
                                },
                                    handleCompletion:function(reason){
              
                                }
                            });


                    }

                    insertValInDB(domainName, directiveRules);

                    storeDBintoMyData(domainName, directiveRules)

                }
            });

       
    
    } catch(e){ console.error("select error:"+e.name+' - '+e.message); }
   
});
 

// Listen for messages called "text-entered" coming from
// the page script. The message payload is the text the user
// entered.
// In this implementation we'll just log the text to the console.
userCSP.port.on("exitUserCSP", function (text) {
        //console.log(text);
  userCSP.hide();
});
 

// Listen for domainName request message
userCSP.port.on("domainNames", function (text) {
        // console.log(text); 

 // // userCSP.hide();
});

//------------------------------------------------------------------------
// Observer services and logic to read website CSP


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

// Helper Function to perform null or empty string check
// function emptyAndNullCheck(text) {
//     var temp = " ";
//     var tokens = text.split(' ');
//     for (var i in tokens) {
//         if (tokens[i] == "" || tokens[i] == " ") 
//             continue;
//         else if (tokens[i] == "null" || tokens[i] == null)
//             return false;
//         else
//             temp += tokens[i];        
//     }
//     if (temp != " ") 
//         return true;
//     else 
//         return false;
// } // end of emptyAndNullCheck function


function helperToAddDirNames(Result, j, data) {
   // console.log("Debug: Data="+data);
   
    switch(j) {
    case 1:
        Result = "default-src " + data + "; ";
        break;
    case 2:
            Result += "script-src "+data +"; ";       
        break;
    case 3:        
            Result += "object-src "+data+"; ";
       
        break;
    case 4:       
            Result += "img-src "+data+"; ";       
        break;
    case 5:       
            Result += "media-src "+data+"; ";       
        break;
    case 6:       
            Result += "style-src "+data+"; ";      
        break;
    case 7:        
            Result += "frame-src "+data+"; ";       
        break;
    case 8:       
            Result += "font-src "+data+"; ";        
        break;
    case 9:       
            Result += "connect-src "+data+"; ";       
        break;
    case 10:       
            Result += "frame-ancestors "+data+"; ";        
        break;
    case 11:      
            Result += "report-uri "+data+"; ";       
        break;
    } // end of switch(j) Loop

    return Result;

} // end of helperToAddDirName() function

// Asynchronous execution
//selStat = "select * from userCSPTable";
/*sqrObject have the information about the result of query*/
let sqrObject = new Object();
sqrObject.data = new Array();
sqrObject.cols = 0;
sqrObject.rows = 0;
let query = connection.createStatement("select * from userCSPTable");
query.executeAsync({
        handleResult:function(resultSet){
            for(var row=resultSet.getNextRow();row;row=resultSet.getNextRow()){
                sqrObject.cols = row.numEntries;
                let dataRow = new Array(sqrObject.cols);
                for(var i=0;i<sqrObject.cols;i++){
                    dataRow[i] = row.getResultByIndex(i);
                }
                sqrObject.data[sqrObject.rows] = dataRow;
                sqrObject.rows++;
            }
        },
            handleError:function(error){
            console.log(" Error in sql query execution: "+error);
        },
            handleCompletion:function(reason){
            var Result = "";
            for(var i=0;i<sqrObject.rows;i++){
                for(var j=1;j<sqrObject.cols;j++){
                    if (sqrObject.data[i][j] == "null") continue; 
                    if (sqrObject.data[i][j] == "" || sqrObject.data[i][j] == " ") continue;
            
                    Result = helperToAddDirNames(Result, j, sqrObject.data[i][j]);
            
                } // end of For J loop
     
                // console.log("###Debug: Result = "+ Result);

                //Record data of all domains
                myDatabase[sqrObject.data[i][0]] = new Array(5);
                myDatabase[sqrObject.data[i][0]][0] = Result; 
                myDatabase[sqrObject.data[i][0]][1] = sqrObject.data[i][12];
              //  myDatabase[sqrObject.data[i][0]][2] = sqrObject.data[i][13]; // inline-script
                myDatabase[sqrObject.data[i][0]][3] = sqrObject.data[i][14];
              //  myDatabase[sqrObject.data[i][0]][4] = sqrObject.data[i][15]; // inline-eval

                if (sqrObject.data[i][12] == 1 || sqrObject.data[i][12] == 2) { 
                    // myDatabase[sqrObject.data[i][0]] = Result;        
                    // console.log(" Complete User CSP:  "+ sqrObject.data[i][0] +" = "+myDatabase[sqrObject.data[i][0]][0]);
                } else if (sqrObject.data[i][12] == 3 || sqrObject.data[i][12] == 4) {
                    // console.log(" Combined CSP:  "+ sqrObject.data[i][0] +" = "+myDatabase[sqrObject.data[i][0]][3]);
                }
                Result = ""; // reset Result for next row of data
            } // end of FOR I loop

        }
});


// Filterout null keyword from my CSP string
function userCSPNullFilter(cspRules, index) {
    switch(index)
    {
    case 0:
        var n = cspRules.search("allow");
        if (n == -1) {
            n = cspRules.search("default-src");
            if ( n == -1)
                return "" ;
        } 
        var k = cspRules.indexOf(";", n);
        if (k != -1) {
            return cspRules.substring(n, k);
        } else {
            return cspRules.substring(n);
        }
        
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
        var n = cspRules.search("connect-src");
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
     case 10:
        var n = cspRules.search("report-uri");
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
        if (n == -1) {
            n =  cspRules.search("default-src");
            if (n != -1) {
                n += 11;
            } else { return "";}
        } else {
            n += 5;
        }
        
        var k = cspRules.indexOf(";", n);
        if (k != -1) {
            return cspRules.substring(n, k);
        } else {
            return cspRules.substring(n);
        }
        
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
        var n = cspRules.search("connect-src");
        if (n != -1) {
            n += 11;
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
     case 10:
        var n = cspRules.search("report-uri");
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
    } // end of switch statement
} // end of websiteCSPFilter function

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

// Callback for 'http-on-examine-response' notification
function httpExamineCallback(aSubject, aTopic, aData) {
    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);

    // Filter out redirect response
    // ---TODO ---

    if (httpChannel.responseStatus == 200) {

      //  console.log("http-on-examine-response event fired");
      //  console.log("Response Status = "+ httpChannel.responseStatus);

        // console.log("@@@@ Intercepting http request: " + httpChannel.URI.spec + "\n");
        
        var doc = getBrowserFromChannel(httpChannel);
        if (doc == null) // if its null then no document available
            return;

        // if (doc.location == "about:blank" || doc.location == "about:config")
        //     return;
        
        // console.log(" protocol = "+doc.location.protocol);

        // if (doc.location.protocol == "http:" || doc.location.protocol == "https:") {
        var hostName = doc.location.protocol+"//"+doc.location.host;

      //  console.log("##Debug: Browser = "+doc.location);        

        
        var responseName = httpChannel.URI.scheme+"://"+httpChannel.URI.host;
        
        // console.log(" Origin URI = " + hostName); 
        // console.log(" Response Host = " + responseName); 
        
        // Check for website CSP rules
        var cspRules;
        try {
            cspRules = httpChannel.getResponseHeader("Content-Security-Policy");    
             } catch(e) {
            // Website does not specified CSP rules
            // console.log("%%%ERROR: Website doesn't specified CSP rules!!!");
                 try {
                      cspRules = httpChannel.getResponseHeader("X-Content-Security-Policy");    // Fallback mechanims support 
                 } catch(e) {
                     console.log("%%%ERROR: Website doesn't specified CSP rules!!!");

                 } // end of inner catch
        } // end of outer catch
                              
               
           

            if (!cspRules) return; // CSP doesn't set by website

            websiteCSPRules[responseName] = new Array(11);
            websiteCSPFull[responseName] = cspRules;
            for (var i=0; i<11; i++) {
                websiteCSPRules[responseName][i] = websiteCSPFilter(cspRules, i);
                // console.log(responseName+ " Website CSP Rules ["+i+"] = "+ websiteCSPRules[responseName][i]);
            }
            // websiteCSPRules[responseName] = cspRules;           
      
        

        // -------------------------------------------------------------
        // Overwrite User Specified CSP into response header
        if (typeof(myDatabase[responseName]) == undefined) {
            if(typeof(myDatabase["all"]) == undefined) {
                if (typeof(myDatabase[hostName]) == undefined)
                    return;
            }
        }

        if ((myDatabase[responseName]) == null) {
            if((myDatabase["all"]) == null) {
                if ((myDatabase[hostName]) == null)
                    return;
            }
        }

	     // console.log("Website or ALL rules exists !!");

        var policyToApply = "";
        
        try {       
            if (typeof(myDatabase[responseName]) != undefined) {
                if (myDatabase[responseName][0] != null && (myDatabase[responseName][1] >= 2 && myDatabase[responseName][1] <= 4)){
                    //  console.log("$$$$$ Website Rule will be set = "+myDatabase[responseName][0]);
	                  var Result = "";
                    
                    if (myDatabase[responseName][1] != 3 || myDatabase[responseName][1] != 4) {
                        Result = myDatabase[responseName][0];
                    } else {
                        Result = myDatabase[responseName][3];
                    }

                    // // Inline Script
                    // var inlineS = false;
	                  // if (myDatabase[responseName][2] == "true" || myDatabase[responseName][2]==true) { // inline-script
                    //     Result += " options inline-script";
                    //     inlineS = true;
                    // }
                    // if ((myDatabase[responseName][4] == "true" || myDatabase[responseName][4]==true) && (inlineS == true)) { // inline-script
                    //     Result += " inline-eval;";
                    //     inlineS = false;
                    // } else if ((myDatabase[responseName][4] == "true" || myDatabase[responseName][4]==true)) { // inline-script
                    //     Result += " options inline-eval;";
                    //     inlineS = false;
                    // }
                    // if (inlineS) {
                    //     Result += ";";
                    //     inlineS=false;
                    // }
                    
                    // console.log ("### Debug: Result = "+Result);
	                  httpChannel.setResponseHeader("X-Content-Security-Policy", Result, false);
                    //  console.log(" $$$Response Header set for website :"+ responseName);
                    // console.log("X-Content-Security-Policy="+Result);
                    
                } 
            }else if(typeof(myDatabase["all"]) != undefined) {
                if (myDatabase["all"][0] != null) {
                    // console.log("May be I will set ALL Rules for this website="+ hostName);            
                    // console.log("#### All Website Rule will set in header");
                    if (myDatabase["all"][1] != 3 || myDatabase["all"][1] != 4) {
                        policyToApply = myDatabase["all"][0];
                    } else {
                        policyToApply = myDatabase["all"][3];
                    }
                    // // inline Script and eval
                    // var inlineS = false;
                    // if (myDatabase["all"][2]=="true" || myDatabase["all"][2]==true) {
                    //     policyToApply += " options inline-script";
                    //     inlineS = true;
                    // }
                    // if ((myDatabase["all"][4]=="true" || myDatabase["all"][4]==true) && (inlineS == true)) {
                    //     policyToApply += " inline-eval;"; 
                    //     inlineS = false;
                    // }else if ((myDatabase["all"][4]=="true" || myDatabase["all"][4]==true)) {
                    //     policyToApply += " options inline-eval;"; 
                    //     inlineS = false;
                    // }
                    // if(inlineS) {
                    //     inlineS = false;
                    //     Result += ";";
                    // }

                    httpChannel.setResponseHeader("X-Content-Security-Policy", policyToApply, false);
                    // console.log(" $$$Response Header set to value of All :"+ policyToApply);
                    
                }  
            } // else if (myDatabase[hostName][0] != null && (myDatabase[hostName][1] >= 2 || myDatabase[hostName][1] <= 4)){ // Avoid this from execution. 
        //     console.log("$$$$$ Website Rule will be set = "+myDatabase[hostName][0]);
	      //     var Result = "";

        //     // var temp = "";
	      //     // for(var i=0; i<11; i++) {
		    //     //     temp = userCSPNullFilter(myDatabase[hostName][0], i);
        //     //     console.log("##Debug: temp = "+temp);
		    //     //     if (temp == null || temp == "null") {
		    //     //         continue;
		    //     //     } else {
		    //     //         Result = Result + temp;
		    //     //     }
	      //     // } // end of For loop
        //     // console.log ("### Debug: Result = "+Result);

        //      if (myDatabase[hostName][1] != 3 || myDatabase[hostName][1] != 4) {
        //          Result = myDatabase[hostName][0];
        //      } else {
        //          Result = myDatabase[hostName][3];
        //      }
	      //     if (myDatabase[hostName][2] == "true" || myDatabase[hostName][2]== true) { // inline-script
        //             Result += " options inline-script;" 
        //     }
        //    // console.log ("### Debug: Result = "+Result);
	      //     httpChannel.setResponseHeader("X-Content-Security-Policy", Result, false);
        //     console.log(" $$$Response Header set for website :"+ hostName);
        //     console.log("X-Content-Security-Policy="+Result);

        // }
        } catch (e) { console.log("%%% Error!!! cannot set CSP header in the response " + e); }

      //  } // end of http/s check IF Loop

    } // end of responseStatus == 200 IF loop
   
} // end of httpExamineCallBack() function

// observer.add("http-on-examine-response", httpExamineCallback); 

// Register observer service for http events
var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
	observerService.addObserver(httpExamineCallback, "http-on-examine-response", false);



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



// Helper function to add domain to the infer list
function addRuleToInferList(hostName, contType, contLoc) {
    try {
        if (typeof(inferRuleArray[hostName]) == undefined || !inferRuleArray[hostName]) {
            inferRuleArray[hostName] = new Array(11);
            inferRuleArray[hostName][0] = "'self'"; // default-src
            inferRuleArray[hostName][9] = "*"; // frame-ancestors
            console.log("inferRule entry is created for "+hostName+ " in addRuleToInferList function");
        }
        if (!ss.storage.inferredPoliciesArray[hostName]) {
            ss.storage.inferredPoliciesArray[hostName] = new Array(11);
            ss.storage.inferredPoliciesArray[hostName][0] = "'self'";
            ss.storage.inferredPoliciesArray[hostName][9] = "*";
        }

    } catch (e) {
        console.log ("\n EXCEPTION in main.js: inferRuleArray caused Exception!!! e = " + e);
    }

    var contURL = contLoc.scheme + "://" + contLoc.host;

    switch(contType) {    
    case 2: // script-src
        if (typeof(inferRuleArray[hostName][1]) == undefined || !inferRuleArray[hostName][1])
            inferRuleArray[hostName][1] = "";
        if (inferRuleArray[hostName][1].indexOf(contURL) == -1) {
            inferRuleArray[hostName][1] += " ";
            inferRuleArray[hostName][1] += contURL;
           // console.log("Infer Rule!! " + hostName+ " script-src ="+inferRuleArray[hostName][1]);
        }

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][1])
            ss.storage.inferredPoliciesArray[hostName][1] = "";
        if (ss.storage.inferredPoliciesArray[hostName][1].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][1] += " ";
            ss.storage.inferredPoliciesArray[hostName][1] += contURL;
            console.log("Infer Rule!! " + hostName+ " script-src ="+ ss.storage.inferredPoliciesArray[hostName][1]);
        }

        break
    case 3: // img-src
        if (typeof(inferRuleArray[hostName][3]) == undefined || !inferRuleArray[hostName][3])
            inferRuleArray[hostName][3] = "";
        if (inferRuleArray[hostName][3].indexOf(contURL) == -1) {
            inferRuleArray[hostName][3] += " ";
            inferRuleArray[hostName][3] += contURL;
          //  console.log("Infer Rule!! " + hostName+ " img-src ="+inferRuleArray[hostName][3]);
        }

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][3])
            ss.storage.inferredPoliciesArray[hostName][3] = "";
        if (ss.storage.inferredPoliciesArray[hostName][3].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][3] += " ";
            ss.storage.inferredPoliciesArray[hostName][3] += contURL;
            console.log("Infer Rule!! " + hostName+ " img-src ="+ ss.storage.inferredPoliciesArray[hostName][3]);
        }

        break;
    case 4: // style-src
        if (typeof(inferRuleArray[hostName][5]) == undefined || !inferRuleArray[hostName][5])
            inferRuleArray[hostName][5] = "";
        if (inferRuleArray[hostName][5].indexOf(contURL) == -1) {
            inferRuleArray[hostName][5] += " ";
            inferRuleArray[hostName][5] += contURL;
           // console.log("Infer Rule!! " + hostName+ " style-src ="+inferRuleArray[hostName][5]);
        }

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][5])
            ss.storage.inferredPoliciesArray[hostName][5] = "";
        if (ss.storage.inferredPoliciesArray[hostName][5].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][5] += " ";
            ss.storage.inferredPoliciesArray[hostName][5] += contURL;
            console.log("Infer Rule!! " + hostName+ " style-src ="+ ss.storage.inferredPoliciesArray[hostName][5]);
        }

        break;
    case 5: // object-src
        if (typeof(inferRuleArray[hostName][2]) == undefined || !inferRuleArray[hostName][2])
            inferRuleArray[hostName][2] = "";
        if (inferRuleArray[hostName][2].indexOf(contURL) == -1) {
            inferRuleArray[hostName][2] += " ";
            inferRuleArray[hostName][2] += contURL;
          //  console.log("Infer Rule!! " + hostName+ " object-src ="+inferRuleArray[hostName][2]);
        }

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][2])
            ss.storage.inferredPoliciesArray[hostName][2] = "";
        if (ss.storage.inferredPoliciesArray[hostName][2].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][2] += " ";
            ss.storage.inferredPoliciesArray[hostName][2] += contURL;
            console.log("Infer Rule!! " + hostName+ " object-src ="+ ss.storage.inferredPoliciesArray[hostName][2]);
        }

        break;
    case 6: // document-src
        if (typeof(inferRuleArray[hostName][0]) == undefined || !inferRuleArray[hostName][0])
            inferRuleArray[hostName][0] = "";
        if (inferRuleArray[hostName][0].indexOf(contURL) == -1) {
            inferRuleArray[hostName][0] = " ";
            inferRuleArray[hostName][0] = "'self'";
          //  console.log("Infer Rule!! " + hostName+ " default-src ="+inferRuleArray[hostName][0]);
        }

        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][0])
            ss.storage.inferredPoliciesArray[hostName][0] = "";
        if (ss.storage.inferredPoliciesArray[hostName][0].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][0] += " ";
            ss.storage.inferredPoliciesArray[hostName][0] += contURL;
            console.log("Infer Rule!! " + hostName+ " default-src ="+ ss.storage.inferredPoliciesArray[hostName][0]);
        }

        break;
    case 7: // frame-src
        if (typeof(inferRuleArray[hostName][6]) == undefined || !inferRuleArray[hostName][6])
            inferRuleArray[hostName][6] = "";
        if (inferRuleArray[hostName][6].indexOf(contURL) == -1) {
            inferRuleArray[hostName][6] += " ";
            inferRuleArray[hostName][6] += contURL;
           // console.log("Infer Rule!! " + hostName+ " frame-src ="+inferRuleArray[hostName][6]);
        }
        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][6])
            ss.storage.inferredPoliciesArray[hostName][6] = "";
        if (ss.storage.inferredPoliciesArray[hostName][6].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][6] += " ";
            ss.storage.inferredPoliciesArray[hostName][6] += contURL;
            console.log("Infer Rule!! " + hostName+ " frame-src ="+ ss.storage.inferredPoliciesArray[hostName][6]);
        }

        break;
    case 11: // xhr-src or connect-src
        if (typeof(inferRuleArray[hostName][8]) == undefined || !inferRuleArray[hostName][8])
            inferRuleArray[hostName][8] = "";
        if (inferRuleArray[hostName][8].indexOf(contURL) == -1) {
            inferRuleArray[hostName][8] += " ";
            inferRuleArray[hostName][8] += contURL;
           // console.log("Infer Rule!! " + hostName+ " connect-src ="+inferRuleArray[hostName][8]);
        }
        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][8])
            ss.storage.inferredPoliciesArray[hostName][8] = "";
        if (ss.storage.inferredPoliciesArray[hostName][8].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][8] += " ";
            ss.storage.inferredPoliciesArray[hostName][8] += contURL;
            console.log("Infer Rule!! " + hostName+ " connect-src ="+ ss.storage.inferredPoliciesArray[hostName][8]);
        }

        break;
    case 14: // font-src
        if (typeof(inferRuleArray[hostName][7]) == undefined || !inferRuleArray[hostName][7])
            inferRuleArray[hostName][7] = "";
        if (inferRuleArray[hostName][7].indexOf(contURL) == -1) {
            inferRuleArray[hostName][7] += " ";
            inferRuleArray[hostName][7] += contURL;
           // console.log("Infer Rule!! " + hostName+ " font-src ="+inferRuleArray[hostName][7]);
        }
        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][7])
            ss.storage.inferredPoliciesArray[hostName][7] = "";
        if (ss.storage.inferredPoliciesArray[hostName][7].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][7] += " ";
            ss.storage.inferredPoliciesArray[hostName][7] += contURL;
            console.log("Infer Rule!! " + hostName+ " font-src ="+ ss.storage.inferredPoliciesArray[hostName][7]);
        }
            break;
        case 15: // media-src
        if (typeof(inferRuleArray[hostName][4]) == undefined || !inferRuleArray[hostName][4])
            inferRuleArray[hostName][4] = "";
        if (inferRuleArray[hostName][4].indexOf(contURL) == -1) {
            inferRuleArray[hostName][4] += " ";
            inferRuleArray[hostName][4] += contURL;
           // console.log("Infer Rule!! " + hostName+ " media-src ="+inferRuleArray[hostName][4]);
        }
        // using simple-storage
        if (!ss.storage.inferredPoliciesArray[hostName][4])
            ss.storage.inferredPoliciesArray[hostName][4] = "";
        if (ss.storage.inferredPoliciesArray[hostName][4].indexOf(contURL) == -1) {
            ss.storage.inferredPoliciesArray[hostName][4] += " ";
            ss.storage.inferredPoliciesArray[hostName][4] += contURL;
            console.log("Infer Rule!! " + hostName+ " media-src ="+ ss.storage.inferredPoliciesArray[hostName][4]);
        }

        break;
    } // end of switch
} // end of function addRuleToInferList()


exports.preventimage = Class({
  extends: xpcom.Unknown,
  interfaces: ["nsIContentPolicy"],
  shouldLoad: function (contType, contLoc, reqOrig, ctx, typeGuess, extra) {
      if (!inferCSPFlag)
          return Ci.nsIContentPolicy.ACCEPT;

      if (typeof(reqOrig.scheme) == undefined)
          return Ci.nsIContentPolicy.ACCEPT;

      if (typeof(contLoc.scheme) == undefined)
          return Ci.nsIContentPolicy.ACCEPT;

      if (contLoc.scheme =="http" || contLoc.scheme =="https") {
          if (reqOrig.scheme =="http" || reqOrig.scheme =="https") {
              var hostName =  reqOrig.scheme + "://" + reqOrig.host;
              
             //console.log(" Both contLoc and reqOrigin scheme = http || https");           

              addRuleToInferList(hostName, contType, contLoc);
          } // end of req.Orig IF Loop
          else {
              var hostName = contLoc.scheme + "://" + contLoc.host;
              if (contType === 6) {
                  console.log(" New page load request contType == 6, contLoc = " + hostName);
                  try {
                      if (typeof(inferRuleArray[hostName]) == undefined) {
                          inferRuleArray[hostName] = new Array(11);
                          inferRuleArray[hostName][0] = "'self'"; // default-src
                          inferRuleArray[hostName][9] = "*"; // frame-ancestors
                      } 

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



// Infer CSP Policy State 
userCSP.port.on("inferCSPPolicy", function (state) {
    if (state) {
        inferCSPFlag = true;
    } else {
        inferCSPFlag = false;
    }
});


// send Infer CSP Policy Array to addon
userCSP.port.on("inferCSPArray", function (webDomain) {
    userCSP.port.emit("setInferAsUserCSP",  webDomain, inferRuleArray);
});


// Add-on Unload Routine
require("unload").when(function() { 
    // Unregister content policy
    catman.deleteCategoryEntry("content-policy", "preventimage.preventimage", false);

    // I didn't register it. So no need to use unregisterFactory 
    // setTimeout(function() {
    //     // Component must be unregistered delayed, otherwise other content
    //     // policy will not be removed from the category correctly
    //     componentManager.unregisterFactory(policyID, policy);
    //     }, 0);

 });