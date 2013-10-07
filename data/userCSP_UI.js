/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
 */


// Helper function to get the name of the selected domain in drop-down list
function getSelectedDomain() {
    var dName = document.getElementById("domainName");
    var selectedDomain = dName.options[dName.selectedIndex].value;

    return selectedDomain;
} // end of "getSelectedDomain" function

// Helper function to get the name of the selected domain in drop-down list
function getSelectedDirective() {
    var dName = document.getElementById("cspDirectives");
    var selectedDirective = dName.options[dName.selectedIndex].value;

    return selectedDirective;
} // end of "getSelectedDomain" function



// Remove selected rule/rules from Directive
function removeData(evt) {
    var flag = false;
    var selectList = document.getElementById("rule1UserList");
    for (var i = (selectList.options.length - 1); i >= 0; i--) {
        if(selectList.options[i].selected) {
            selectList.remove(i);
            flag = true;
        }
    }
    // If some items are deleted to store only then update csp array
    if (flag) {
        var userList = document.getElementById("rule1UserList");
        var userListData = "";
        for (var i = 0; i < userList.options.length; i++) {
            if(userList.options[i].value)
                userListData += userList.options[i].value + " ";
        }
        var selectedDomain = getSelectedDomain();
        if (userCSPArray[selectedDomain]) {
            var selectedDirectiveValue = getSelectedDirective();
            userCSPArray[selectedDomain][selectedDirectiveValue] = userListData;
        }

    } // end of IF(flag) loop

} // end of "removeData" function

// Add selected rule from Options list to Directive Rule list
function addData(evt) {
    var selectOptionsList = document.getElementById("rule1WebsiteList");
    for (var i = (selectOptionsList.options.length - 1); i >= 0; i--) {
        if (selectOptionsList.options[i].selected) {
            var anOption = document.createElement("OPTION");
            var selectList = document.getElementById("rule1UserList");
            anOption.text = selectOptionsList.options[i].text;
            anOption.value = selectOptionsList.options[i].value;
            selectList.add(anOption);
        }
    }
} // end of "addData" function

// Helper function to add an item into list 
function insertItemInList(str) {
    var anOption = document.createElement("OPTION");
    var selectList = document.getElementById("rule1UserList");
    anOption.text = str;
    anOption.value = str;
    selectList.add(anOption);
    
    // Add to userCSP array as well
    var selectedDomain = getSelectedDomain();
    var selectedDirective = getSelectedDirective();
    if (typeof(userCSPArray) === "undefined") {
        userCSPArray = {};
    }
    if ((typeof(userCSPArray[selectedDomain]) === "undefined") || !userCSPArray[selectedDomain]) {
        userCSPArray[selectedDomain] = new Array(15);
        userCSPArray[selectedDomain][selectedDirective] = "";
        // console.log("\n\n\n Goes inside then why exception on next line???");
    }
    
    str = str + " ";
        
    if ((typeof(userCSPArray[selectedDomain][selectedDirective]) !== "undefined") && (userCSPArray[selectedDomain][selectedDirective] !== "null")) {            
            userCSPArray[selectedDomain][selectedDirective] += str;
           // dump("\n userCSPArray(1) = "+ userCSPArray[selectedDomain][selectedDirective]);
    } else {
        userCSPArray[selectedDomain][selectedDirective] = str;
       // dump("\n userCSPArray(2)= "+ userCSPArray[selectedDomain][selectedDirective]);
    }
    
    // Update userCSPAll
    userCSPAll[selectedDomain] = addDirNameToPrint(userCSPArray, selectedDomain);
    if (userCSPUIState[selectedDomain] === 2) {
        document.getElementById("currentCSP").textContent = userCSPAll[selectedDomain];        
    }
    
   storeUserCSPUState(selectedDomain, userCSPUIState, true, userCSPAll, userCSPArray);
    
} // end of InsertIteminList() function

// Listen for user input values 
function listenData(evt) {  
    // Dynamically add OPTION element to SELECT Tag
    var text = document.getElementById("rule1").value;
    
    // Clear Previous Error msg if any
    document.getElementById("errorMsg").textContent = "";

    if (text) {
        //--------------------------------------------------
        // Filtering of input according to W3C CSP standard
        var flag = true;
        if (text === "'none'") {            
            insertItemInList(text);
            document.getElementById("rule1").value = ""; 
            return;
        }
        if (text === "none") {
            insertItemInList("'none'");
            document.getElementById("rule1").value = ""; 
            return;
        }
        if (text === "*") {
            insertItemInList(text);
            document.getElementById("rule1").value = ""; 
            return;
        }
        if (text === "'self'") {//ok
            insertItemInList(text);
            document.getElementById("rule1").value = ""; 
            return;
        }
        if (text === "self") {
            insertItemInList("'self'");
            document.getElementById("rule1").value = ""; 
            return;
        }
        // For "script-src" or "style-src" only 'unsafe-inline' accepted
        if (text === "'unsafe-inline'"  || text === "unsafe-inline") {  
        	var dirVal = getSelectedDirective();        	
        	if (dirVal === "1" || dirVal === "5") {
        		insertItemInList("'unsafe-inline'");
        		document.getElementById("rule1").value = ""; 
        		return;
        	}
            
        }         
        // 'unsafe-eval' i/p accepted only for "script-src" or "style-src" 
        if (text === "'unsafe-eval'" || text === "unsafe-eval") {  
        	var dirVal = getSelectedDirective();
        	if (dirVal === "1" || dirVal === "5") {  
                insertItemInList("'unsafe-eval'");
                document.getElementById("rule1").value = ""; 
                return;
            }
        }
         

        var myRegexp = new RegExp('^[a-z0-9 _.:/*\']*$', 'i');
        // any number of a-z 0-9 spaces underscore . : * \ 
        // is allowed in I/P string. 'i' is used to ignore case. 
        // ^ means beginning of string and $ means end of string
        // * means any number of characters in string
        
        var tokens = text.split(' ');
        for (var i in tokens) {
            if (tokens[i] === "" || tokens[i] === " ") continue;
            if (tokens[i] === "'none'" || tokens[i] === "none") {
                insertItemInList(tokens[i]);
                continue;
            }
            if (tokens[i] === "*") {
                insertItemInList(text);
                document.getElementById("rule1").value = ""; 
                continue;
            }
            if (tokens[i] === "'self'" || tokens[i] === "self") {
                insertItemInList(tokens[i]);
                continue;
            }  
            if ((previousTabId === 1 || previousTabId === 5) && (tokens[i] === "'unsafe-eval'" || tokens[i] === "unsafe-eval")) {               
                    insertItemInList(tokens[i]);
                    continue;               
            }
            if ((previousTabId === 1 || previousTabId === 5) && (tokens[i] === "'unsafe-inline'" || tokens[i] === "unsafe-inline")) {               
                    insertItemInList(tokens[i]);
                    continue;               
            }

            if (text.match(myRegexp)) {       
                var wildcardIndex = tokens[i].indexOf('*');
                if (wildcardIndex !== -1) { //hostname wildcard check
                    if (wildcardIndex !== 0) {
                        if (tokens[i][wildcardIndex-1] !== ':') {
                            document.getElementById("errorMsg").textContent = " Invalid Input:" + tokens[i];
                           // window.alert("Unexpected value:"+tokens[i]);
                            continue;
                        }
                    }
                }
                var colonIndex = tokens[i].indexOf(':');
                var dotIndex = tokens[i].indexOf('.');
                if ((colonIndex !== -1) && (dotIndex < colonIndex)) {
                    insertItemInList(tokens[i]);
                    continue;
                }
                if (tokens[i].indexOf('.') !== -1) {
                    insertItemInList(tokens[i]);
                } else {
                    document.getElementById("errorMsg").textContent = " Invalid Input:" + tokens[i];
                }
            } // end of .match IF loop                   
         else document.getElementById("errorMsg").textContent = " Invalid Input:" + tokens[i];
        } // end of FOR loop
        //-----------------------------------------------------
       
        // Clear the text from Input field
        document.getElementById("rule1").value = "";   
         
        // Invoke Refine policy UI
       // showHideCombine(true);
    }
} // end of "listenData" function

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
       // dump("\n rulesToApply- Error =" + e);
    }
    userCSPUIState[selectedDomain] = id;
    
    switch (id) {
        case 1:
            try {
                if (typeof(websiteCSPAll[selectedDomain]) !== "undefined")
                    document.getElementById("currentCSP").textContent = websiteCSPAll[selectedDomain];
                    storeUserCSPUState(selectedDomain, userCSPUIState, false, userCSPAll, userCSPArray);
            } catch (e) {
            }
            break;
        case 2:
            try {
                if (typeof(userCSPAll[selectedDomain]) !== "undefined") {
                    document.getElementById("currentCSP").textContent = userCSPAll[selectedDomain];
                    storeUserCSPUState(selectedDomain, userCSPUIState, true, userCSPAll, userCSPArray);
                }
            } catch (e) {
            }
            break;
        case 3:
            combineStrict();
            break;
        case 4:
            document.getElementById("currentCSP").textContent = combineLoose();
            // Send it to main add-on
            storeUserCSPUState(selectedDomain, userCSPUIState, true, userCSPAll, userCSPArray);
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
                storeUserCSPUState(selectedDomain, userCSPUIState, false, userCSPAll, userCSPArray);
            } catch (e) {
               // dump("\n rulesToApply- Error =" + e);
            }
            break;
    } // end of switch () statement    

// Send it to main add-on
// storeUserCSPUState(selectedDomain, userCSPUIState, true, userCSPAll, userCSPArray);

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
        if (userList.options[i].value !== null)
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
                document.getElementById("currentCSP").textContent = inferCSPAll[selectedDomain];
            } else {
                document.getElementById("currentCSP").textContent = "";
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
        if (cspRuleArray[selectedDomain][j] && cspRuleArray[selectedDomain][j] !== "") {
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

  //  dump("\n Complete UserCSP = " + userCSPAll[selectedDomain]);
  //  dump("\n Complete WebsiteCSP = " + websiteCSPAll[selectedDomain]);

    // dump("\n Now combining them strictly\n");
    getCombineStrict(websiteCSPAll[selectedDomain], userCSPAll[selectedDomain], selectedDomain);

} // end of combineStrict() function


// This function automatically stores CSP directive data
function storeDirectiveData(event) {
    var index = event.selectedIndex;
   // dump("\n Old Directive Value=" + oldDirectiveValue + " New Directive Value=" + event.options[index].value);

    // Store user CSP policy for the directive into global table in the corresponding domain name field
    // 1. get the currently selected Domain Name
    var selectedDomain = getSelectedDomain();
    helperToStore(selectedDomain);

    // Clear the "rule1UserList"
    var userList = document.getElementById("rule1UserList");
    userList.options.length = 0;

    // Clear the "rule1WebsiteList"
    var websiteList = document.getElementById("rule1WebsiteList");
    websiteList.options.length = 0;

    // change oldDirective value
    oldDirectiveValue = event.options[index].value;

    // Get new Directive contents for "rule1UserList" if its present.
    // 1. get the currently selected Domain Name
    selectedDomain = getSelectedDomain();
    if (userCSPArray[selectedDomain][oldDirectiveValue]) {
        // 2. Dynamically create OPTIONS in "rule1UserList"
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

} //end of "storeDirectiveData" function
