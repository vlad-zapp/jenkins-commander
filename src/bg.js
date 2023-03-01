async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

function getScript(host) {
    return [{
        "id": host,
        "persistAcrossSessions": true,
        "matches": [
            `${host}/*`
        ],
        "js": [
            "lib/jquery-3.6.3.min.js",
            "lib/fuzzysort.min.js",
            "src/utils.js",
            "src/storage.js",
            "src/navigator.js",
            "src/pages.js",
            "src/commander.js",
        ],
        "css": ["styles.css"]
    }]
}

function getHost(url) {
    const match = url.match('(http(?:s)?://[^/]+)(?:/)?')
    if (match) {
        return match[1]
    } else {
        return null
    }
}

chrome.action.onClicked.addListener(async function (tab) {
    await getCurrentTab().then(async t => {
        const host = getHost(t.url)
        if (host == null) {
            return
        }

        await chrome.scripting.getRegisteredContentScripts()
            .then(async s => {
                if (s.find(x => x.id == host)) {
                    await chrome.scripting.unregisterContentScripts({ ids: [host] })
                    chrome.action.setIcon({ path: "/media/icon-off-32.png" })
                } else {
                    await chrome.scripting.registerContentScripts(getScript(host))
                }
                await chrome.tabs.reload()
            })
    })
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request === "get_servers") {
            chrome.scripting.getRegisteredContentScripts()
                .then(s => sendResponse(s.map(x => x.id)))
            return true
        }
        if (request === "turn_on_icon") {
            chrome.action.setIcon({ path: "/media/icon-on-32.png" })
        }
    }
);

chrome.tabs.onActivated.addListener(function (activeInfo) {
    getCurrentTab().then(t => {
        const host = getHost(t.url)
        chrome.scripting.getRegisteredContentScripts()
            .then(async s => {
                if (s.find(x => x.id == host)) {
                    // on
                    chrome.action.setIcon({ path: "/media/icon-on-32.png" })
                } else {
                    //off
                    chrome.action.setIcon({ path: "/media/icon-off-32.png" })
                }
            })
    })
})