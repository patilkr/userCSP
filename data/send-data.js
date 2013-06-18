/* * Contributor(s):
 *   PATIL Kailas <patilkr24@gmail.com>
*/

// Click on Exit Link on UI
function exitCSP(e) {
    var mytext = " Sucessfully Exit from User CSP Add-on UI";
    addon.port.emit("exitUserCSP", mytext);
}

// Click on Report an Issue link on UI
function reportIssue(e) {
    addon.port.emit("reportIssue");
}

// Function to get inferred CSP Rule array from main 
function getInferCSPArray(webDomain) {
    addon.port.emit("inferCSPArray", webDomain);
}

// Combine Strict feature
function getCombineStrict(sitePolicy, userPolicy, webDomain) {
    addon.port.emit("combineStrictPolicy", sitePolicy, userPolicy, webDomain);
}