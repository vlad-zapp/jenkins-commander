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

chrome.action.onClicked.addListener(async function (tab) {
    await getCurrentTab().then(async t => {
        const host = t.url.match('(http(?:s)?://[^/]+)(?:/)?')[1]

        await chrome.scripting.getRegisteredContentScripts()
            .then(async s => {
                if (s.find(x => x.id == host)) {
                    await chrome.scripting.unregisterContentScripts({ ids: [host] })
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
    }
);