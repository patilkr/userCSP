/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
*/

// Global Variable
//var selectDomainList = document.getElementById("domainName");

function exitCSP(e) {
    var mytext = " Sucessfully Exit from User CSP Add-on UI";
    addon.port.emit("exitUserCSP", mytext);
}

// Ask for DomainNames
function getDomainNameList() {
  // First Remove all Options from the list except "* (Every Website)"

    var selectDomainList = document.getElementById("domainName");
  
   // if (selectDomainList.options.length > 0) {
    //     for (var i=selectDomainList.options.length-1; i > 0 ; i--) {
    //         selectDomainList.remove(i);
    //     }
    // }
    
    //Fastest way to empyt choice list:
    selectDomainList.options.length=0;

    addon.port.emit("domainNames", "Hi");
}

// send CSP rules for domain name to the main add-on to store in D/B
function sendDomainRules(selectedDomain, directiveRules) {
    addon.port.emit("storeDomainRules", selectedDomain, directiveRules);
}

// Get CSP rules for "* (Every Website)" when no tab is loaded
function getforAll() {
    addon.port.emit("getCSPforAll", "Hi");
}


// Combine Strict feature
function getCombineStrict(sitePolicy, userPolicy, webDomain) {
    addon.port.emit("combineStrictPolicy", sitePolicy, userPolicy, webDomain);
}

// Infer Policy start/stop
function inferCSPRules(state) {
 
    if (state) {
        document.getElementById("startInferCSPbtn").disabled = true;
        document.getElementById("stopInferCSPbtn").disabled = false;
        document.getElementById("startInferBtnHelp").textContent="(Load websites to Infer CSP policy for them)";
    } else {
        document.getElementById("startInferCSPbtn").disabled = false;
        document.getElementById("stopInferCSPbtn").disabled = true;
        document.getElementById("startInferBtnHelp").textContent="";
    }

   addon.port.emit("inferCSPPolicy", state);
} // end of inferCSPRules function


// Function to get inferred CSP Rule array from main 
function getInferCSPArray(webDomain) {
    addon.port.emit("inferCSPArray", webDomain);
}
