/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
*/


// Helper function to get the name of the selected domain in drop-down list
function getSelectedDomain() {
    var dName = document.getElementById("domainName");    
    var selectedDomain = dName.options[dName.selectedIndex].value;
    
    return selectedDomain;
} // end of "getSelectedDomain" function


// Function to store rules to apply:
// 1: Website rules
// 2: User CSP rules
// 3: Combine Strict CSP rules
// 4: Combine Loose CSP rules
// 5: Inferred policy
function rulesToApply(id) {
   
    var selectedDomain = getSelectedDomain();
    //  dump("\n selected Domain name = "+selectedDomain);
    
    document.getElementById("currentCSP").textContent = "";

    try {
        if (!userCSPUIState[selectedDomain]) {
            userCSPUIState[selectedDomain] = id;
        }
        
    } catch (e) {
        dump("\n rulesToApply- Error =" + e);
    }

    var ruleToShow = "";
    switch (id) {
    case 1:
        
        break;
    case 2:
        try {
            if (!userCSPArray[selectedDomain]) {
                userCSPArray[selectedDomain] = new Array(15);
                // dump("\n userCSP array is created ");
            }
        } catch (e) {
        }
        break;
    case 3:
         ruleToShow = combineStrict();
        break;
    case 4:
        ruleToShow = combineLoose();
        break;
    case 5:
        try {
            var tempFlag = false;
            if (!inferCSPArray[selectedDomain])  {
                inferCSPArray[selectedDomain] = new Array (11);
                tempFlag = true;
            }
            if (!inferCSPAll[selectedDomain]) {
                inferCSPAll[selectedDomain] = "";
                tempFlag = true;
            }
            if (tempFlag) {
                getInferCSPArray(selectedDomain);
            }
            ruleToShow = inferCSPAll[selectedDomain];
        }catch (e) { 
            dump("\n rulesToApply- Error =" + e);
        }
        break;
    } // end of switch () statement

    // display inferred csp policy
    document.getElementById("currentCSP").textContent = ruleToShow;

} // end of function rulesToApply()

// Helper function to restore Directive Rules upon reselection of directive
function restoreDirectiveRules(ruleString) {
    // split entries using SPACE cacharcter
    var mySplitResult = ruleString.split(" ");    
    var selectList = document.getElementById("rule1UserList");    
    for(var i=0; i < mySplitResult.length; i++){
        if(mySplitResult[i] === "")
            continue;
	      var anOption = document.createElement("OPTION");
	      anOption.text = mySplitResult[i];
	      anOption.value = mySplitResult[i];
	      selectList.add(anOption);
    }

} //end of "restoreDirectiveRules" function

// Helper function to show CSP Directive Rules set by website upon reselection of directive
function showWebsiteCSPRules(ruleString) {
    // split entries using SPACE cacharcter
    var mySplitResult = ruleString.split(" ");    
    var selectList = document.getElementById("rule1WebsiteList");    
    for(var i=0; i < mySplitResult.length; i++){
        if(mySplitResult[i] === "")
            continue;
	      var anOption = document.createElement("OPTION");
	      anOption.text = mySplitResult[i];
	      anOption.value = mySplitResult[i];
	      selectList.add(anOption);
    }
} //end of "restoreDirectiveRules" function


// Get user choice for domain name from drop down box
function restoreCSPRules() {
    var selectedDomain = getSelectedDomain();
    var userList = document.getElementById("rule1UserList");
    var websiteList = document.getElementById("rule1WebsiteList");

    // 1. Store the current directive of previous domain. 
    oldDomainValue = selectedDomain;


    // 2. Empty websiteList/userList multi-select drop-down box
    userList.options.length = 0;
    websiteList.options.length = 0;

    // Make sure global table entry existis. If not then create it.
     if (!userCSPArray[selectedDomain]) {
        userCSPArray[selectedDomain] = new Array(15);
    }   
   
    // Restore "rule1UserList" selected directive contents
    if (userCSPArray[selectedDomain][oldDirectiveValue]) {         
	      restoreDirectiveRules(userCSPArray[selectedDomain][oldDirectiveValue]);
    }
    //---------------------------------------------------------------
    // Show website CSP rules for selected directive
     if (inferCSPArray  ||  inferCSPArray !== null) {
         if (inferCSPArray[selectedDomain]) {
             if (inferCSPArray[selectedDomain][oldDirectiveValue]) { 
                 showWebsiteCSPRules(inferCSPArray[selectedDomain][oldDirectiveValue]);  
             }
         }
     }
    //---------------------------------------------------------------

    //  Change user Rule state for domain (Enable/Disable)    
     // dump("\nI am going in to enable or disable state");
    try {
        if (!userCSPUIState[selectedDomain]) {
            userCSPUIState[selectedDomain] = 1;
        }
    }catch (e) { userCSPUIState[selectedDomain] = 1; }

    switch (userCSPUIState[selectedDomain]) {
    case 1: // Website Rules
        document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
        if (typeof(websiteCSPAll[selectedDomain]) !== 'undefined') {
         document.getElementById("currentCSP").textContent = websiteCSPAll[selectedDomain];
        } else {
          document.getElementById("currentCSP").textContent = "";
        }
        break;
    case 2: // User Rules
        document.getElementById("selectUserCSPRuleBtn").checked = true;
        if(typeof(userCSPAll[selectedDomain]) !== 'undefined') {
            document.getElementById("currentCSP").textContent =  userCSPAll[selectedDomain];
        } else {
          document.getElementById("currentCSP").textContent = "";
        }
        break;
    case 3: // Combine Strict Rules
        document.getElementById("selectCombinedSCSPRuleBtn").checked = true;
        if (typeof(userCSPArray[selectedDomain][13]) !== 'undefined') {
            document.getElementById("currentCSP").textContent = userCSPArray[selectedDomain][13];
        } else {
          document.getElementById("currentCSP").textContent = "";
        }
        break;
    case 4: // Combine Loose Rules
        document.getElementById("selectCombinedLCSPRuleBtn").checked = true;
         if (typeof(userCSPArray[selectedDomain][13]) !== 'undefined') {
            document.getElementById("currentCSP").textContent = userCSPArray[selectedDomain][13];
        } else {
          document.getElementById("currentCSP").textContent = "";
        }
        break;
    case 5:
        document.getElementById("selectInferredCSPRuleBtn").checked = true;
        if (typeof(inferCSPAll[selectedDomain]) !== 'undefined') {
            document.getElementById("inferredCSP").textContent = inferCSPAll[selectedDomain];
        } else {
            document.getElementById("inferredCSP").textContent = "";
        }
        break;
    default:
        document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
        if (typeof(websiteCSPAll[selectedDomain]) !== 'undefined') {
         document.getElementById("currentCSP").textContent = websiteCSPAll[selectedDomain];
        } else {
          document.getElementById("currentCSP").textContent = "";
        }
        break;
    } // end of switch   

} // end of "restoreCSPRules" function

