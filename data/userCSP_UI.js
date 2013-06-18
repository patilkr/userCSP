/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
 */


// Helper function to get the name of the selected domain in drop-down list
function getSelectedDomain() {
    var dName = document.getElementById("domainName");
    var selectedDomain = dName.options[dName.selectedIndex].value;

    return selectedDomain;
} // end of "getSelectedDomain" function



// Get user choice for domain name from drop down box
function getDomainChoice(evt) {
    var selectedDomain = getSelectedDomain();

    var userList = document.getElementById("rule1UserList");
    var websiteList = document.getElementById("rule1WebsiteList");

    // 1. Store the current directive of previous domain. 
    helperToStore(oldDomainValue);
    oldDomainValue = selectedDomain;

    // 2. Empty userList multi-select drop-down box
    userList.options.length = 0;
    websiteList.options.length = 0;

    // 3. Make sure global table entry exists. If not then create it.
    if (!userCSPArray[selectedDomain]) {
        userCSPArray[selectedDomain] = new Array(15);

        // make bydefault state to Enable
        userCSPUIState[selectedDomain] = 1;
    }

    if (userCSPArray[selectedDomain][oldDirectiveValue]) {
        restoreDirectiveRules(userCSPArray[selectedDomain][oldDirectiveValue]);
    }
    //---------------------------------------------------------------
    // 6.1 Show website CSP rules for selected directive
    if (inferCSPArray || inferCSPArray !== null) {
        if (inferCSPArray[selectedDomain]) {
            if (inferCSPArray[selectedDomain][oldDirectiveValue]) {
                showWebsiteCSPRules(inferCSPArray[selectedDomain][oldDirectiveValue]);
            }
        }
    }
    //---------------------------------------------------------------
    // 7. Change user Rule state for domain (Enable/Disable)    
    try {
        if (!userCSPUIState[selectedDomain])
            userCSPUIState[selectedDomain] = 1;
    } catch (e) {
        userCSPUIState[selectedDomain] = 1;
    }

    document.getElementById("currentCSP").textContent = "";

    switch (userCSPUIState[selectedDomain]) {
        case 1: // website Rules
            document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
            try {
                if (typeof(websiteCSPAll[selectedDomain]) !== "undefined")
                    document.getElementById("currentCSP").textContent = websiteCSPAll[selectedDomain];
            } catch (e) {
                    document.getElementById("currentCSP").textContent = "";
            }
            break;
        case 2: // user Rules
            document.getElementById("selectUserCSPRuleBtn").checked = true;
            try {
                if (typeof(userCSPAll[selectedDomain]) !== "undefined") {
                    document.getElementById("currentCSP").textContent = userCSPAll[selectedDomain];
                }
            } catch (e) {
                document.getElementById("currentCSP").textContent = "";
            }
            break;
        case 3: // Combine Strict Rules
            document.getElementById("selectCombinedSCSPRuleBtn").checked = true;
            break;
        case 4: // Combine Loose Rules
            document.getElementById("selectCombinedLCSPRuleBtn").checked = true;
            document.getElementById("currentCSP").textContent = combineLoose();
            break;
        case 5: // Infer policy
            document.getElementById("selectInferredCSPRuleBtn").checked = true;
            try {
            if(typeof(inferCSPAll[selectedDomain]) !== "undefined")
                document.getElementById("currentCSP").textContent = inferCSPAll[selectedDomain];
            } catch (e) {
                document.getElementById("currentCSP").textContent = "";
            }            
            break;
        default:
            document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
            try {
                if (typeof(websiteCSPAll[selectedDomain]) !== "undefined")
                    document.getElementById("currentCSP").textContent = websiteCSPAll[selectedDomain];
            } catch (e) {
                    document.getElementById("currentCSP").textContent = "";
            }
            break;
    } // end of switch

} // end of getDomainChoice() Function




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

    switch (id) {
        case 1:
            try {
                if (typeof(websiteCSPAll[selectedDomain]) !== "undefined")
                    document.getElementById("currentCSP").textContent = websiteCSPAll[selectedDomain];
            } catch (e) {
            }
            break;
        case 2:
            try {
                if (typeof(userCSPAll[selectedDomain]) !== "undefined") {
                    document.getElementById("currentCSP").textContent = userCSPAll[selectedDomain];
                }
            } catch (e) {
            }
            break;
        case 3:
            combineStrict();
            break;
        case 4:
            document.getElementById("currentCSP").textContent = combineLoose();
            break;
        case 5:
            try {
                var tempFlag = false;
                if (!inferCSPArray[selectedDomain]) {
                    inferCSPArray[selectedDomain] = new Array(11);
                    tempFlag = true;
                }
                if (!inferCSPAll[selectedDomain]) {
                    inferCSPAll[selectedDomain] = "";
                    tempFlag = true;
                }
                if (tempFlag) {
                    getInferCSPArray(selectedDomain);
                }
                document.getElementById("currentCSP").textContent = inferCSPAll[selectedDomain];
            } catch (e) {
                dump("\n rulesToApply- Error =" + e);
            }
            break;
    } // end of switch () statement    

} // end of function rulesToApply()

// Helper function to restore Directive Rules upon reselection of directive
function restoreDirectiveRules(ruleString) {
    // split entries using SPACE cacharcter
    var mySplitResult = ruleString.split(" ");
    var selectList = document.getElementById("rule1UserList");
    for (var i = 0; i < mySplitResult.length; i++) {
        if (mySplitResult[i] === "")
            continue;
        var anOption = document.createElement("OPTION");
        anOption.text = mySplitResult[i];
        anOption.value = mySplitResult[i];
        selectList.add(anOption);
    }

} //end of "restoreDirectiveRules" function


// This is a helper function for storeDirectiveData and applyUserRules
function helperToStore(domainName) {
    // 1. Retrive the policy from directive from the "rule1UserList"
    var userList = document.getElementById("rule1UserList");
    // if its empty then no need to store. 
    if (userList.options.length === 0)
        return;

    var userListData = "";

    for (var i = 0; i < userList.options.length; i++) {
        if (userList.options[i].value)
            userListData += userList.options[i].value + " ";
    }

    // 2. Store the user CSP policy of the directive into global table
    //    under the currently selected Domain name
    if (!userCSPArray || userCSPArray === null) {
        userCSPArray = {};
    }
    if (!userCSPArray[domainName]) {
        userCSPArray[domainName] = new Array(15);

        // make bydefault state to Enable
        userCSPUIState[domainName] = 1;
        document.getElementById("selectWebsiteCSPRuleBtn").checked = true;
    }
    userCSPArray[domainName][oldDirectiveValue] = userListData;

} //end of "helperToStore" function


// Helper function to show CSP Directive Rules set by website upon reselection of directive
function showWebsiteCSPRules(ruleString) {
    // split entries using SPACE cacharcter
    var mySplitResult = ruleString.split(" ");
    var selectList = document.getElementById("rule1WebsiteList");
    for (var i = 0; i < mySplitResult.length; i++) {
        if (mySplitResult[i] === "")
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
    if (inferCSPArray || inferCSPArray !== null) {
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
    } catch (e) {
        userCSPUIState[selectedDomain] = 1;
    }

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
            if (typeof(userCSPAll[selectedDomain]) !== 'undefined') {
                document.getElementById("currentCSP").textContent = userCSPAll[selectedDomain];
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


//helper function to comine policy loosely
function combineLooselyHelper(tempUserCSPArray, tempWebsiteCSPArray, tempSelectedDomain, j, tempStr) {
    var Result = "";
    var flag = false;

    if (!tempUserCSPArray[tempSelectedDomain][j])
        tempUserCSPArray[tempSelectedDomain][j] = "";

    if (!tempWebsiteCSPArray[tempSelectedDomain][j])
        tempWebsiteCSPArray[tempSelectedDomain][j] = "";

    // compare with * in userCSP
    if ((tempUserCSPArray[tempSelectedDomain][j].indexOf("*") !== -1) && (tempUserCSPArray[tempSelectedDomain][j].length < 4)) {
        Result += tempStr + tempUserCSPArray[tempSelectedDomain][j] + "; ";
        return Result;
    }

    // compare with * in websiteCSP
    if ((tempWebsiteCSPArray[tempSelectedDomain][j].indexOf("*") !== -1) && (tempUserCSPArray[tempSelectedDomain][j].length < 4)) {
        Result += tempStr + tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";
        return Result;
    }


    // if both are 'self'
    if ((tempWebsiteCSPArray[tempSelectedDomain][j] === "'self'" && tempUserCSPArray[tempSelectedDomain][j] === "'self' ") || (tempWebsiteCSPArray[tempSelectedDomain][j] === "'self'" && tempUserCSPArray[tempSelectedDomain][j] === "self ")) {
        Result += tempStr + tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";
        return Result;
    }

    // if usercsp = none
    if ((tempUserCSPArray[tempSelectedDomain][j] === "none " || tempUserCSPArray[tempSelectedDomain][j] === "'none' ") && (tempWebsiteCSPArray[tempSelectedDomain][j] || (tempWebsiteCSPArray[tempSelectedDomain][j] !== ""))) {
        Result += tempStr + tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";
        return Result;
    }

    // if website csp = none
    if ((tempWebsiteCSPArray[tempSelectedDomain][j] === "none" || tempWebsiteCSPArray[tempSelectedDomain][j] === "'none'") && ((tempUserCSPArray[tempSelectedDomain][j]) || (tempUserCSPArray[tempSelectedDomain][j] !== ""))) {
        Result += tempStr + tempUserCSPArray[tempSelectedDomain][j] + "; ";
        return Result;
    }

    // Otherwise take directives from both policies
    if (tempUserCSPArray[tempSelectedDomain][j] && tempUserCSPArray[tempSelectedDomain][j] !== "") {
        Result = tempStr + tempUserCSPArray[tempSelectedDomain][j];
        flag = true;
    }
    if (tempWebsiteCSPArray[tempSelectedDomain][j] && tempWebsiteCSPArray[tempSelectedDomain][j] !== "") {
        if (!flag)
            Result += tempStr + tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";
        else
            Result += tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";

        flag = false;
    }

    if (flag) {
        Result += ";";
        flag = false; // reset flag
    }
    return Result;

} // end of combineLooselyHelper() function



// Combine userCSP and website CSP loosely
function loosePolicyToPrint(tempUserCSPArray, tempWebsiteCSPArray, tempSelectedDomain) {
    var myResult = "";
    var flag = false;
    var dirName = "";

    for (var j = 0; j < 10; j++) {
        dirName = cspDirList[j] + " ";
        myResult += combineLooselyHelper(tempUserCSPArray, tempWebsiteCSPArray, tempSelectedDomain, j, dirName);
    }

    if (tempUserCSPArray[tempSelectedDomain][j] && tempUserCSPArray[tempSelectedDomain][j] !== "") {
        myResult += "report-uri " + tempUserCSPArray[tempSelectedDomain][j];
        flag = true;
    }
    if (tempWebsiteCSPArray[tempSelectedDomain][j] && tempWebsiteCSPArray[tempSelectedDomain][j] !== "") {
        if (!flag)
            myResult += "report-uri " + tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";
        else
            myResult += tempWebsiteCSPArray[tempSelectedDomain][j] + "; ";
        flag = false;
    }

    if (flag) {
        Result += ";";
        flag = false; // reset flag
    }

    return myResult;

} // end of loosePolicyToPrint() function


// Combine website and user specified CSP loosely
// Allow if it is allowed ANY ONE  or BOTH
function combineLoose() {
    var Result = "";
    var flag = false;

    // dump("\n Combine Loose is Clicked");

    var selectedDomain = getSelectedDomain();

    if (!userCSPArray[selectedDomain] && !websiteCSPArray[selectedDomain])
        return;

    if (!userCSPArray[selectedDomain] && websiteCSPArray[selectedDomain]) {
        Result = websiteCSPAll[selectedDomain];
        flag = true;
    }

    if (!websiteCSPArray[selectedDomain]) {
        Result = userCSPAll[selectedDomain];
        flag = true;
    }
    if (!flag)
        Result = loosePolicyToPrint(userCSPArray, websiteCSPArray, selectedDomain);

    //  dump("\n %%Combine Loose CSP Policy = " +Result);

    // Display combine Policy in UI
    document.getElementById("currentCSP").textContent = Result;

    // Store combined loose policy in userCSPArray
    userCSPArray[selectedDomain][13] = Result;
    return Result;
} // end of combineLoose() function


function addDirNameToPrint(cspRuleArray, selectedDomain) {
    var Result = "";

    for(var j = 0; j < 11; j++) {
        if (cspRuleArray[selectedDomain][j] ) {
            Result += cspDirList[j] + " " + cspRuleArray[selectedDomain][j] + "; ";  
        }
    }
    return Result;
} // end of function addDirNameToPrint


// Combine website and user policy strictly. 
// Only allow if it is allowed by BOTH
function combineStrict() {
    var Result = "";

    // now show website and user policy for combining
    var selectedDomain = getSelectedDomain();
    if (!userCSPArray[selectedDomain])
        return;
    if (!websiteCSPArray[selectedDomain])
        return;


    Result = addDirNameToPrint(userCSPArray, selectedDomain);
    userCSPAll[selectedDomain] = Result;

    dump("\n Complete UserCSP = " + userCSPAll[selectedDomain]);
    dump("\n Complete WebsiteCSP = " + websiteCSPAll[selectedDomain]);

    // dump("\n Now combining them strictly\n");
    getCombineStrict(websiteCSPAll[selectedDomain], userCSPAll[selectedDomain], selectedDomain);

} // end of combineStrict() function
