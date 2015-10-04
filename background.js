var categories = [];

// Load data from Chrome storage
function restoreData() {
    chrome.storage.sync.get("data", function(items) {
        data = items["data"] || [];
        for (var i = 0; i < data.length; i++) {
            categories.push(data[i]);
        }
    });
}

// Save data to Chrome storage
function saveData() {
    chrome.storage.sync.set({
        "data": categories
    }, function() {
        if (chrome.runtime.error) {
            console.log("Problem saving data...");
        }
    });
}

function isBefore(curHour, curMin, endHour, endMin) {
    return curHour < endHour || (curHour == endHour && curMin < endMin);
}

function inBlockedTime(blockedTimes) {
    var date = new Date();
    var day = date.getDay();
    var startHour, startMin, endHour, endMin;
    var curHour = date.getHours();
    var curMin = date.getMinutes();
    var times;

    for (blockedDay in blockedTimes) {
        if (day == blockedDay) {
            times = blockedTimes[blockedDay];
            for (var i = 0; i < times.length; i++) {
                time = times[i].split("-");
                startHour = parseInt(time[0].split(":")[0]);
                startMin = parseInt(time[0].split(":")[1]);
                endHour = parseInt(time[1].split(":")[0]);
                endMin = parseInt(time[1].split(":")[1]);

                // Check if current time is in interval [startTime, endTime]
                // (have to consider case when endTime "wraps around" 24 hour
                // mark).
                if ((isBefore(curHour, curMin, endHour, endMin) &&
                            isBefore(startHour, startMin, curHour, curMin)) ||
                        (isBefore(endHour, endMin, startHour, startMin) &&
                         (isBefore(endHour, endMin, curHour, curMin) ||
                          isBefore(curHour, curMin, startHour, startMin)))) {
                              return true;
                          }
            }
        }
    }
    return false;
}


function isCategoryBlocked(category) {
    return inBlockedTime(category["blockedTimes"]);
}

function isURLBlocked(url) {
    var wwwIndex;
    
    if (url.startsWith("chrome-extension")) {
        return false;
    }
    for (var i = 0; i < categories.length; i++) {
        sites = categories[i]["sites"];

        for (var j = 0; j < sites.length; j++) {
            wwwIndex = sites[j].indexOf("www.");

            if (wwwIndex != -1) {
                sites[j] = sites[j].substring(wwwIndex + 4);
            }
            if (url.indexOf(sites[j]) != -1) {
                if (isCategoryBlocked(categories[i])) {
                    return true;
                }
            }
        }
    }
    return false;
}

restoreData();

function processURL() {
    chrome.tabs.query({'active': true, 'currentWindow': true}, 
            function(tabs) {
                if (!tabs[0]) {
                    return;
                }
                console.log(tabs[0].url);
                if (isURLBlocked(tabs[0].url)) {
                    chrome.tabs.update(tabs[0].id, {url: "/blocked.html?id=" 
                        + tabs[0].url});
                }
            }
        );
}

// Check the URL to see if it's blocked when a user tries to visit a website
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    processURL();
});

// Chrome will begin loading some simple static websites before you actually
// press enter to visit the URL, and visits to these pages won't trigger the
// listener above. Instead we need to use 'onReplaced'
chrome.tabs.onReplaced.addListener(function(tabId, changeInfo, tab) {
    processURL();
});

