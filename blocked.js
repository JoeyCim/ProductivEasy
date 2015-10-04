var url = window.location.search;
url = url.substring(url.indexOf("?id=") + 4);
if (url.length > 40) {
    url = url.substring(0,40) + "...";
}

document.addEventListener("DOMContentLoaded", function() {
    var urlEl = document.getElementsByTagName("h2")[0];
    urlEl.textContent = "The URL is: " + url;
});

displayBlockedURL();
