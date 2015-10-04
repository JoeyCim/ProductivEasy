var curId;

function loadData() {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        for (var i = 0; i < backgroundPage.categories.length; i++) {
            displayCategory(backgroundPage.categories[i]);
        }
    });
}

function addCategory(category) {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        backgroundPage.categories.push(category);
    });
}

function modifyCategory(id, name, siteList, times, days, noEdit) {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        var categories = backgroundPage.categories;

        for (var i = 0; i < categories.length; i++) {
            if (categories[i]["id"] == id) {
                setCategoryAttributes(categories[i], name, siteList, times,
                    days, noEdit);
                redisplayCategory(id, categories[i]);
            }
        }
    });
}

function removeCategory(id) {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        var categories = backgroundPage.categories;

        for (var i = 0; i < categories.length; i++) {
            if (categories[i]["id"] == id) {
                categories.splice(i, 1);
                return;
            }
        }
    });
}

function saveData() {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        backgroundPage.saveData();
    });
}

function isValidSiteList(siteList) {
    var re = /^\S*\.\S*$/;

    if (siteList.length == 0)
        return false;
    for (var i = 0; i < siteList.length; i++) {
        if (!re.test(siteList[i])) 
            return false;
    }
    return true;
}

function isValidTime(times) {
    // Remove all whitespace
    times = times.replace(/\s/g, '');

    // Build a regex that checks whether the inputted time is in
    // the correct format. (e.g., '12:00-13:00,15:00-19:00')
    var re_part1 = "(([01]?[0-9]|2[0-4]):[0-5][0-9])"
        var re_part2 = re_part1+"-"+re_part1;
    var re = new RegExp("^(" + re_part2 + ",)*(" + re_part2 + ")$");
    return re.test(times);
}

function setCategoryAttributes(category, name, siteList, times, days, noEdit) {
    category.name = name || "&nbsp";
    category.sites = siteList;
    category.siteDisplay = getSiteDisplay(category.sites);
    category.blockedTimes = {};
    category.noEdit = noEdit;

    for (var i = 0; i < days.length; ++i) {
        category.blockedTimes[days[i]] = [];
        for (var j = 0; j < times.length; j++)
            category.blockedTimes[days[i]].push(times[j]);
    }
}

function createCategory(name, siteList, times, days, noEdit) {
    var category = {};
    
    setCategoryAttributes(category, name, siteList, times, days, noEdit);
    category.id = new Date().getTime();
    addCategory(category);
    displayCategory(category);
}

// Turn a category's blocked site list into a string
function getSiteDisplay(siteList) {
    var siteDisplay = "";

    for (var i = 0; i < siteList.length; i++) {
        if (siteDisplay.length + siteList[i].length > 30) {
            siteDisplay += siteList[i].slice(0, 30-siteDisplay.length-1) 
                + "...";
            return siteDisplay;
        }
        else {
            siteDisplay += siteList[i] + ", ";
        }
    }
    return siteDisplay.slice(0, -2);
}

// Generates jquery objects of HTML elements corresponding to the title/site/
// status of a <li> element or "popup category".
function createPopupElements(category) {
    var inputElements = {};
    
    var $category = $("<li></li>");
    var siteList = $('#blocked').val().split('\n');
    var siteDisplay = getSiteDisplay(siteList);
    var $catTitle = $('<h2 class="cat-title">' + category.name + '</h2>');
    var $catSites = $('<p class="cat-sites">Includes: <em>' + 
            category.siteDisplay  + '</em></p>');
    var $catStatus = $('<p class="cat-status">Currently blocked: ' +
            '<span class="inactive">No</span>');
    
    inputElements["$catTitle"] = $catTitle;
    inputElements["$catSites"] = $catSites;
    inputElements["$catStatus"] = $catStatus;
    return inputElements;
}

// Add a category to the popup
function displayCategory(category) {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        var $category = $("<li></li>");
        var elements = createPopupElements(category);

        if (backgroundPage.isCategoryBlocked(category)) {
            elements["$catStatus"] = $('<p class="cat-status">' +
                'Currently blocked: <span class="active">Yes</span>');
        }

        $category.attr("value", category.id);
        $category.append(elements["$catTitle"]);
        $category.append(elements["$catStatus"]);
        $category.append(elements["$catSites"]);
        $('#website-list').append($category);
    });
}

// Remove a category from the popup
function undisplayCategory(id) {
    $category = getPopupCategory(id);
    $category.remove();
}

// Modify a category from the popup
function redisplayCategory(id, category) {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        var $category = getPopupCategory(id);
        var newElements = createPopupElements(category);

        if (backgroundPage.isCategoryBlocked(category)) {
            newElements["$catStatus"] = $('<p class="cat-status">' +
                'Currently blocked: <span class="active">Yes</span>');
        }

        $category.empty();
        $category.append(newElements["$catTitle"]);
        $category.append(newElements["$catStatus"]);
        $category.append(newElements["$catSites"]);
    });
}


function getPopupCategory(id) {
    $categories = $("li");

    for (var i = 0; i < $categories.length; i++) {
        if ($($categories[i]).attr("value") == id) {
            return $($categories[i]);
        }
    }
    return null;
}

function fillCatInfo(id) {
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
        var categories = backgroundPage.categories;
        var sites, times, days, name, noEdit;
        var target;

        sites = times = name = "";
        days = [];

        // Restore everything to enabled state at the start
        $("#cat-form :input").prop("disabled", false);
        $("#update").prop("disabled", false);
        $("#delete").prop("disabled", false);

        for (var i = 0; i < categories.length; i++) {
            if (categories[i].id == id) {
                target = categories[i];
  
                for (var j = 0; j < target["sites"].length; j++) {
                    sites += target["sites"][j] + "\n";
                }
                sites = sites.slice(0, -1);

                for (var day in target["blockedTimes"]) {
                    days.push(day);
                    if (times == "") {
                        var timesArr = target["blockedTimes"][day];
                        for (var j = 0; j < timesArr.length; j++) {
                            times += timesArr[j] + ",";
                        }
                    }
                }
                times = times.slice(0, -1);

                name = target["name"];
                noEdit = target["noEdit"];
            }
        }
        $("#name").val(name);
        $("#week-time").val(times);
        $("#blocked").val(sites);
        for (var i = 0; i < days.length; i++) {
            $("input[value=" + days[i] + "]").prop("checked", true);
        }
        if (noEdit) {
            $("#no-edit").prop("checked", true);
            
            // Prevent fields from being edited if the category is blocked
            // and "noEdit" has been activated.
            if (backgroundPage.isCategoryBlocked(target)) {
                $("#cat-form :input").prop("disabled", true);
                $("#update").prop("disabled", true);
                $("#delete").prop("disabled", true);
            }
        }
    });
}

function validateInput() {
    var name = $('#name').val();

    // Split the entered sites into an array, removing blank lines
    var siteList = $('#blocked').val().toLowerCase().split("\n");
    siteList = siteList.filter(function(el) {
        return el.length != 0;
    });
    var times = $("#week-time").val();
    var days= [];
    var $dayBoxes = $('input[id*="-check"');
    var noEdit = $("#no-edit").is(":checked");

    for (var i = 0; i < $dayBoxes.length; i++) {
        if ($dayBoxes[i].checked) {
            days.push($dayBoxes[i].value);
        }
    }

    if (!isValidTime(times) && !isValidSiteList(siteList)) {
        $('#error-message').text(
                "Error: please check that your time intervals were entered" + 
                " corrctly and that your websites are valid.");
        $("#error-message").fadeIn();
        setTimeout(function() {
            $('#error-message').fadeOut();
        }, 5500);
        return {};
    }
    else if (!isValidTime(times)) {
        $('#error-message').text(
                "Error: please check that your time intervals were entered" + 
                " corrctly.");
        $("#error-message").fadeIn();
        setTimeout(function() {
            $('#error-message').fadeOut();
        }, 4000);
        return {};
    }
    else if (!isValidSiteList(siteList)) {
        $('#error-message').text(
                "Error: please check that the websites you entered are valid.");
        $("#error-message").fadeIn();
        setTimeout(function() {
            $('#error-message').fadeOut();
        }, 4000);
        return {};
    }
    else {
        return {"name":name, "times":times.split(","), "days":days, 
            "siteList":siteList, "noEdit":noEdit};
    }
}

$(document).ready(function() {
    var name, siteList, times, days;
    loadData();

    $("#add").click(function() {
        $("#add-panel h1").text("Add a new blocked category");
        $("#update, #delete, #edit-return").hide();
        $("#submit, #return").show();
        
        // Restore everything to enabled state at the start
        $("#cat-form :input").prop("disabled", false);
        $("#update").prop("disabled", false);
        $("#delete").prop("disabled", false);
        
        $("#add-panel").slideDown();
        $("#content-panel").slideUp();
    })

    $("#edit").click(function() {
        chrome.storage.sync.clear();
    });

    $("#return, #edit-return").click(function() {
        $("#add-panel").slideUp();
        $("#content-panel").slideDown();
        $("#cat-form")[0].reset();
    });

    $(document).on("click", "li", function() {
        $("#add-panel h1").text("Edit a blocked category");
        $("#submit, #return").hide();
        $("#update, #delete, #edit-return").show();
        $("#add-panel").slideDown();
        curId = $(this).attr("value");
        fillCatInfo(curId);
        $("#content-panel").slideUp();
    });

    $("#delete").click(function() {
        undisplayCategory(curId);
        removeCategory(curId);
        $("#add-panel").slideUp();
        $("#content-panel").slideDown();
        $("#cat-form")[0].reset();
    });

    $("#update").click(function() {
        data = validateInput();
        if (!jQuery.isEmptyObject(data)) {
            name = data["name"];
            siteList = data["siteList"];
            times = data["times"];
            days = data["days"];
            noEdit = data["noEdit"];

            modifyCategory(curId, name, siteList, times, days, noEdit);
            saveData();
            $("#add-panel").slideUp();
            $("#content-panel").slideDown();
            $("#cat-form")[0].reset();
        }
    });

    $("#submit").click(function() {
        data = validateInput();
        if (!jQuery.isEmptyObject(data)) {
            name = data["name"];
            siteList = data["siteList"];
            times = data["times"];
            days = data["days"];
            noEdit = data["noEdit"];

            createCategory(name, siteList, times, days, noEdit);
            saveData();
            $("#add-panel").slideUp();
            $("#content-panel").slideDown();
            $("#cat-form")[0].reset();
        }
    });
});
