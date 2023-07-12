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
            "src/menus/menus.js",
            "src/menus/jobSearchMenu.js",
            "src/menus/jobActionsMenu.js",
            "src/menus/itemsMenu.js",
            "src/commander.js"
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

async function interactWithDb(key, value) {
    return new Promise((res, rej) => {
        console.log(`interacting with db: ${key}, ${value}`)
        const dbRequest = indexedDB.open('jenkins-commander-extension', 1)
        dbRequest.onupgradeneeded = () => initDb(dbRequest)
        dbRequest.onsuccess = e => {
            const db = e.target.result
            if (value === undefined) {
                const transaction = db.transaction("jobs", "readonly");
                const jobsStore = transaction.objectStore("jobs");
                const req = jobsStore.get(key)
                req.onsuccess = () => res(req.result.data)
                req.onerror = () => rej(req.error)
            } else {
                const transaction = db.transaction("jobs", "readwrite");
                const jobsStore = transaction.objectStore("jobs");
                const jobs = {
                    server: key,
                    data: value
                };

                const req = jobsStore.put(jobs);
                req.onsuccess = res
                req.onerror = () => rej(req.error)
            }
        }
        dbRequest.onerror = () => rej(dbRequest.error)
    });
}

function initDb(req) {
    var db = req.result;
    if (!db.objectStoreNames.contains('jobs')) {
        db.createObjectStore('jobs', { keyPath: 'server' });
    }
}

function writeDB(key, value) {
    return interactWithDb(key, value)
}

function readDb(key) {
    return interactWithDb(key)
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
            chrome.scripting.getRegisteredContentScripts().then(scripts => sendResponse(scripts.map(s => s.id)))
            return true
        }
        if (request === "turn_on_icon") {
            chrome.action.setIcon({ path: "/media/icon-on-32.png" })

        }
        if (gm = request.match(/^get_jobs (.*)/)) {
            readDb(gm[1]).then(r=>sendResponse(r))
            //console.log(res)
            return true
        }
        if (sm = request.match(/^set_jobs (.*?) (.*)/)) {
            writeDB(sm[1], sm[2])
            return true
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