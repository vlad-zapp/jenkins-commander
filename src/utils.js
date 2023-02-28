function sleep(ms) {
    var start = new Date().getTime(), expire = start + ms;
    while (new Date().getTime() < expire) { }
    return true;
}

function appendUrl(url, appendix) {
    if (appendix.startsWith('/')) {
        return url.replace(/\/$/, '') + appendix
    } else {
        return url + appendix
    }
}
