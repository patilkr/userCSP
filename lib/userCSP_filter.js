var cspDirectiveList = ["default-src", "script-src", "object-src", "img-src", "media-src", "style-src", "frame-src", "font-src", "connect-src", "frame-ancestors", "report-uri"];

// Length of each directive
var cspDirectiveLength =[11, 10, 10, 7, 9, 9, 9, 8, 11, 15, 10];

// Function to filter CSP directives
// It removes Null character from userCSP when userCSP fetched from d/b and
// Fitlers website CSP to show in add-on UI
exports.cspDirectiveFilter = function cspDirectiveFilter(cspRules, index, websiteFilter) {
    var n = cspRules.search(cspDirectiveList[index]);

    if (n === -1)  return "";

    if (websiteFilter) { // retrieve value excluding directive name
        n += cspDirectiveLength[index]; // To avoid calculating length
    }

    var k = cspRules.indexOf(";", n);
    if (k !== -1) {
        return cspRules.substring(n, k);
    } else {
        return cspRules.substring(n);
    }
    
    return "";

}; // end of cspDirectiveFilter() function

// Build CSP : Add directive names
exports.addCSPDirectiveNames = function addCSPDirectiveNames(Result, j, data) {
    if (cspDirectiveList[j-1]) {
        Result += cspDirectiveList[j-1] + " " + data + "; ";
        console.log ("addCSPDirectiveNames: Result = "+Result);
        return Result;
    }
};