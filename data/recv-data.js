
// set Infered CSP array of a website to userCSP Array
addon.port.on("setInferAsUserCSP", function (webDomain, inferredCSPArray, inferredCSPPolicies) {
    var selectedDomain = getSelectedDomain();

    if (typeof(inferredCSPArray[webDomain]) === 'undefined') 
        return;

    if (typeof(inferredCSPPolicies[webDomain]) === 'undefined') 
        return;

    if (selectedDomain.match(webDomain)) {
        inferCSPAll[selectedDomain] = inferredCSPPolicies[selectedDomain];

        for (var i = 0; i < 10; i++) {
            if (inferredCSPArray[selectedDomain][i] !== null && inferredCSPArray[selectedDomain][i] !== "null") {
                inferCSPArray[selectedDomain][i] = inferredCSPArray[selectedDomain][i];
            } else {
                inferCSPArray[selectedDomain][i] ="";
            }
        }
    }
});

// Add hostname recevied from main-add to domain names drop down box
addon.port.on("addHostName", function (hName) {  
    var selectDomainList = document.getElementById("domainName");

    //dump("hName = "+ hName);

    // Empty previous list
    selectDomainList.options.length = 0;

    document.getElementById("currentCSP").textContent = "";

    //2. Clear Directive contents
    document.getElementById("rule1").value = "";
    var listW = document.getElementById("rule1WebsiteList");
    listW.options.length = 0; // clear website list
    var listU = document.getElementById("rule1UserList");
    listU.options.length = 0; // clear user list
    // -----------------------------------------------------


    var anOption = document.createElement("OPTION");
    anOption.text = "*(Every Website)";
    anOption.value = "all";    
    selectDomainList.add(anOption);

    // Check global userCSPArray for data
     if (!userCSPArray || userCSPArray === null) {
        //dump("\n userCSPArray doesn't exists. So I need to create it ");
         userCSPArray = {};
    } 
    if (!userCSPArray[anOption.value]) {
        userCSPArray[anOption.value] = new Array(15);
        
        // make bydefault state to Enable
        userCSPUIState[anOption.value] = 1; 
        document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
    }   
    
    // We need to add this domain elements to the Domain name Drop down box
    if (hName.length !== 0) {
	      for (var i = 0; i < hName.length; i++) {
	          anOption = document.createElement("OPTION");
	          anOption.text = hName[i];
	          anOption.value = hName[i];
	          selectDomainList.add(anOption);
            
            // Add an entry into global userCSPArray if it doesn't exists
	          if (!userCSPArray[anOption.value]) {
		            userCSPArray[anOption.value] = new Array(15);

                // make bydefault state to Enable
                userCSPUIState[anOption.value] = 1; 
                document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
	          }  
            
	      } // end of FOR loop
    } //end of "hName.length" IF loop

}); // end of "addHostName" event listener

// Add CSP rules into global table
addon.port.on("showCSPRules", function (activeWindow, websiteCSPList, websiteListArray, userCSPList, userCSPListArray,  inferRulesList, inferRulesListArray) {
        
    // Check global userCSPArray for data
    if (!userCSPArray || (userCSPArray === null) || typeof(userCSPArray) === "undefined") {
        userCSPArray = {};
    } 
    if (!userCSPAll || (userCSPAll === null) || typeof(userSPAll) === "undefined") {
        userCSPAll = {};
    } 
    if (!userCSPArray["all"]) {
        userCSPArray["all"] = new Array(15);
    }

    if (!websiteCSPArray || (websiteCSPArray === null) || typeof(websiteCSPArray) === "undefined") {
        websiteCSPArray = {};
    }

    var dNames = document.getElementById("domainName");
   
    setSelectedDomain(activeWindow);   

    for (var i = 0; i < dNames.options.length; i++) {
        dump("\n\n Processing Domain Name = " + dNames.options[i].value);
        
        if (typeof(websiteListArray[dNames.options[i].value]) !== "undefined") {
            websiteCSPArray[dNames.options[i].value] = new Array(11);

            // store website defined CSP in global table 
            websiteCSPAll[dNames.options[i].value] = websiteCSPList[dNames.options[i].value];
            dump("\n WebsiteCSPALL = " + websiteCSPAll[dNames.options[i].value]);
            for (var k = 0; k < 11; k++) {
                websiteCSPArray[dNames.options[i].value][k] = websiteListArray[dNames.options[i].value][k];              
            } // end of FOR Loop
        } // end of IF wesbiteListData Loop

        // Record userCSP in Database
        try {
            if (typeof(userCSPList) !== "undefined") {
                if (typeof(userCSPList[dNames.options[i].value]) !== "undefined") {
                    userCSPAll[dNames.options[i].value] = userCSPList[dNames.options[i].value];
                   // dump("\n\n Recevied userCSPAll = " + userCSPAll[dNames.options[i].value]);
                } else {
                   // dump("\n (1) Recevied userCSPAll is EMPTY!!!");
                }
            } else {
              // dump("\n (2) Recvied userCSPAll is EMPTY!!!");
            }

            //  //dump("\n Restoring CSP rules of Domain:"+dNames.options[i].value);
            if (userCSPListArray[dNames.options[i].value]) {
                for (var j = 0; j < 15; j++) {
                    // Restore userCSP array from Database
                    if ((userCSPListArray[dNames.options[i].value][j] === "null") || (typeof(userCSPListArray[dNames.options[i].value][j]) === "undefined")) {
                        userCSPArray[dNames.options[i].value][j] = "";
                    } else {
                        userCSPArray[dNames.options[i].value][j] = userCSPListArray[dNames.options[i].value][j];
                    }
                } // end of FOR loop "j"

            } // endof IF dListData Loop
        } catch (e) {
            dump("\n\n\n\n Error in userCSP rule restoring in 'showCSPRules' event\n");        
        }

        // Infer CSP rules
        try {
            if (typeof(inferRulesList) !== 'undefined') {
                if (typeof(inferRulesList[dNames.options[i].value]) !== 'undefined')
                    inferCSPAll[dNames.options[i].value] = inferRulesList[dNames.options[i].value];                     
            }
            if (inferRulesListArray[dNames.options[i].value]) {
                inferCSPArray[dNames.options[i].value] = new Array(11);

            for (var k = 0; k < 11; k++) {
                inferCSPArray[dNames.options[i].value][k] = inferRulesListArray[dNames.options[i].value][k];              
            } // end of FOR Loop
        } // end of IF inferRulesListArray Loop
            
        } catch(e) {
            dump(" ERROR!! inferRulesList in recv-data is not valid");
        }
        
    } // end of FOR loop "i"
    
    
    // Restore CSP rules for selected Domain
    restoreCSPRules();

}); // end of "showCSPRules" event listener

// // Helper function to set the Name of selected domain
function setSelectedDomain(activeDomain) {
    var dName = document.getElementById("domainName");  
    for(var i = 0; i < dName.options.length; i++) {
         if (activeDomain.indexOf(dName.options[i].value) !== -1) {
             dName.selectedIndex = i;
             break;
         }
    } // end of FOR loop

} // end of setSelectedDomain

// Change Seclected Domain to domain names drop down box
addon.port.on("changeActiveDomain", function (activeDomain) {  
    try {
        setSelectedDomain(activeDomain);
        // Invoke domain change function to redisplay policy values
        getDomainChoice(null);
    } catch (e) { dump("\n @@WARNING!! default.js is not yet initialized. So setSlectedDomain Doesn't exists");}
});

// Remove hostname recevied from main-add to domain names drop down box
addon.port.on("rmHost", function (hName) {  
    //dump("\n Need to remove "+hName+" from drop down box");
    var selectDomainList = document.getElementById("domainName");
    
    for(var i = selectDomainList.options.length-1; i >= 0; i--) {
        if (hName.indexOf(selectDomainList.options[i].value) !== -1) {
            selectDomainList.remove(i);
            
            // To handle the case of ActiveDomain removed: 
            //  Invoke domain change function to redisplay policy values
            getDomainChoice(null);
            break;
        }
    }
});


// set combineStrict Policy
addon.port.on("setCombineStrict", function (strictCSP, webDomain) {  
    var selectedDomain = getSelectedDomain();
   
    if (selectedDomain.match(webDomain)) {
        // Display it in UI
        document.getElementById("currentCSP").textContent = strictCSP;
        
        // Store it in userCSP Array
        userCSPArray[selectedDomain][11] = strictCSP;
    }
    
});

