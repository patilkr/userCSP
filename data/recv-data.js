// Receive the list of domain names from main add-on
addon.port.on("domainNames", function (arg) {  
   //addon.port.emit("text-entered", arg);

    dump("\n reve-data.js: domainNames invoked. DomainNames = "+arg);

    // var selectDomainList = document.getElementById("domainName");
    // var anOption = document.createElement("OPTION");
    // anOption.text = "*(Every Website)";
	  // anOption.value = "all";    
	  // selectDomainList.add(anOption);

    //  // We need to add this domain elements to the Domain name Drop down box
    // if (arg.length != 0) {
	  //     for (var i = 0; i < arg.length; i++) {
	  //         anOption = document.createElement("OPTION");
	  //         anOption.text = arg[i];
	  //         anOption.value = arg[i];
	  //         selectDomainList.add(anOption);
	  //     }
    // } //end of "arg.length" IF loop
});

// Add hostname recevied from main-add to domain names drop down box
addon.port.on("addHostName", function (hName) {  
    var selectDomainList = document.getElementById("domainName");

    dump("hName = "+ hName);

    // Empty previous list
    selectDomainList.options.length = 0;

    var anOption = document.createElement("OPTION");
    anOption.text = "*(Every Website)";
    anOption.value = "all";    
    selectDomainList.add(anOption);

    // Check global userCSPArray for data
     if (!userCSPArray || userCSPArray == null) {
        dump("\n userCSPArray doesn't exists. So I need to create it ");
         userCSPArray = {};
    } 
    if (!userCSPArray[anOption.value]) {
        userCSPArray[anOption.value] = new Array(11);
        
        // make bydefault state to Enable
        userCSPArray[anOption.value][10] = true; 
        document.getElementById("cspRuleEnable").checked = true;

        dump("\n userCSP arrary is created for domain="+anOption.value);
    }   
    
    // We need to add this domain elements to the Domain name Drop down box
    if (hName.length != 0) {
	      for (var i = 0; i < hName.length; i++) {
	          anOption = document.createElement("OPTION");
	          anOption.text = hName[i];
	          anOption.value = hName[i];
	          selectDomainList.add(anOption);
            
            // Add an entry into global userCSPArray if it doesn't exists
	          if (!userCSPArray[anOption.value]) {
		            userCSPArray[anOption.value] = new Array(11);

                // make bydefault state to Enable
                userCSPArray[anOption.value][10] = true; 
                document.getElementById("cspRuleEnable").checked = true;
		            
                dump("\n userCSP arrary is created for domain="+anOption.value);
	          }  
            
	      } // end of FOR loop
    } //end of "hName.length" IF loop

    dump("\n New hosts added to drop down box are: "+hName);

}); // end of "addHostName" event listener

// Add CSP rules into global table
addon.port.on("showCSPRules", function (dListData, websiteListData, websiteCSPList, userCSPList) {
    dump("\n UI: I have received CSP Rules for: "+dListData.length+" Domains");

    // cannot use ".length" method  on websiteListData variable. 

    // if (dListData.length == 0)
	  //     return;   
    
    // Check global userCSPArray for data
    if (!userCSPArray || userCSPArray == null) {
        dump("\n userCSPArray doesn't exists. So I need to create it ");
        userCSPArray = {};
    } 
    if (!userCSPArray["all"]) {
        userCSPArray["all"] = new Array(11);
    }

    if (!websiteCSPArray || websiteCSPArray == null) {
        dump("\n websiteCSPArray doesn't exists. So I need to create it ");
        websiteCSPArray = {};
    }

    var dNames = document.getElementById("domainName");
    dump("\n number of domains in the list are : "+dNames.options.length);

    for (var i=0; i<dNames.options.length; i++) {
        if (websiteListData[dNames.options[i].value]) {
            websiteCSPArray[dNames.options[i].value] = new Array(10);
           // dump("\n@@ Website CSP Array is created for : "+dNames.options[i].value);

            // store website defined CSP in global table 
            websiteCSPAll[dNames.options[i].value] = websiteCSPList[dNames.options[i].value];
           // dump("\n Website defined CSP = " + websiteCSPAll[dNames.options[i].value]);

            for (var k=0; k<10; k++) {
                websiteCSPArray[dNames.options[i].value][k] = websiteListData[dNames.options[i].value][k];
               // dump("\n @@@ WebsiteCSPArray[][k] = "+websiteCSPArray[dNames.options[i].value][k]);
            } // end of FOR Loop
        } // end of IF wesbiteListData Loop

        // Record userCSP in Database
        if (userCSPList[dNames.options[i].value]) {
            userCSPAll[dNames.options[i].value] = userCSPList[dNames.options[i].value][0];
            dump("\n User Specified CSP I sent is = " + userCSPList[dNames.options[i].value][0])
            dump("\n User Specified CSP I received is = " + userCSPAll[dNames.options[i].value]);
        }
        // --TODO -- (update userCSP if user modified rules for domain)

	      dump("\n Restoring CSP rules of Domain:"+dNames.options[i].value);
	      if (dListData[dNames.options[i].value]) {
	          for (var j=0; j<10; j++) {
                // Restore userCSP array from Database
		            if (dListData[dNames.options[i].value][j] == "null") {
		                userCSPArray[dNames.options[i].value][j] = "";
		            } else {
		                userCSPArray[dNames.options[i].value][j] = dListData[dNames.options[i].value][j];
		                dump("\n Restored: "+j+" directive="+userCSPArray[dNames.options[i].value][j]);
		            }
	          } // end of FOR loop "j"

	          if(dListData[dNames.options[i].value][10].indexOf("true") != -1) {
		            userCSPArray[dNames.options[i].value][10] = true;
	          } else {
		            userCSPArray[dNames.options[i].value][10] = false;
	          }
	          dump("\n Restored: "+userCSPArray[dNames.options[i].value][10]);
	      } // endof IF dListData Loop
    } // end of FOR loop "i"
    

    // Restore CSP rules for selected Domain
    restoreCSPRules();

}); // end of "showCSPRules" event listener

// Remove hostname recevied from main-add to domain names drop down box
addon.port.on("rmHost", function (hName) {  
    dump("\n Need to remove "+hName+" from drop down box");
    var selectDomainList = document.getElementById("domainName");
    
    for(var i=selectDomainList.options.length-1; i>=0; i--) {
        if (hName.indexOf(selectDomainList.options[i].value) != -1) {
            selectDomainList.remove(i);
            break;
        }
    }
});


// set combineStrict Policy
addon.port.on("setCombineStrict", function (strictCSP, webDomain) {  
    dump("$$$ CSP after RefinePolicy="+strictCSP);
    var selectedDomain = getSelectedDomain();
   
    if (selectedDomain.match(webDomain) && (previousTabId == -1)) {
        document.getElementById("combinedWUCSP").innerHTML = strictCSP;
    }
    
});