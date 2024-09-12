// Enable extension when it's button is clicked
chrome.action.onClicked.addListener(async tab => {
    //todo: check if this is legit supported jenkins
    const serverAddress = new URL(tab?.url)?.origin
    if (!serverAddress) {
        return
    }

    updateServerRecord(serverAddress, s => s.enabled = !s.enabled).then(async server => {
        if (server.enabled) {
            await chrome.scripting.registerContentScripts(getScript(serverAddress))
        } else {
            await chrome.scripting.unregisterContentScripts({ ids: [serverAddress] })
        }
        const tabsToReload = await chrome.tabs.query({ url: `${new URL(server.id)}*` })
        tabsToReload.forEach(t => chrome.tabs.reload(t.id))
    })
});

// Switch extensions state based on tab state
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
        updateIcon(new URL(tab.url).origin, tabId)
    }
})

// Update icon
function updateIcon(serverId, tabId) {
    getServerRecord(serverId).then(server => {
        if (server?.enabled) {
            chrome.action.setIcon({ path: "/media/icon-on-32.png", tabId: tabId })
        } else {
            chrome.action.setIcon({ path: "/media/icon-off-32.png", tabId: tabId })
        }
    })
}

// Process messages from content scripts
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request === "get_servers") {
            readDb('servers').then(sendResponse)
            return true
        }

        if (request.action === 'report_crumb') {
            updateServerRecord(request.server, s => { s.crumbHeader = request.crumbHeader; s.crumbValue = request.crumbValue })
        }

        if (request?.action === 'exec') {
            runGroovyScriptBg(request.script, request.server).then(o => sendResponse(o)).then(sendResponse)
            return true;
        }

        if (request?.action === 'llm') {
            runLlmPromptBg(request.prompt, request.context).then(sendResponse)
            return true;
        }
    }
)

function getServerRecord(id) {
    return readDb('servers', id)
}

async function updateServerRecord(id, updateAction) {
    if (!id) {
        throw new error('Server id required')
    }
    server = (await readDb('servers', id)) ?? {
        id: id,
        enabled: false,
        crumbHeader: null,
        crumbValue: null
    }

    updateAction(server)
    await writeDB('servers', server)
    return server
}

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
            "src/menus/globalVarsMenu.js",
            "src/menus/credentialsMenu.js",
            "src/menus/serversMenu.js",
            "src/menus/utilsMenu.js",
            "src/commander.js",
            "src/groovyScripts.js"
        ],
        "css": ["styles.css"]
    }]
}

function interactWithDb(store, key, value) {
    return new Promise((res, rej) => {
        const dbRequest = indexedDB.open('jenkins-commander-0', 1)
        dbRequest.onupgradeneeded = () => initDb(dbRequest)
        dbRequest.onsuccess = e => {
            const db = e.target.result
            if (value === undefined) {
                const transaction = db.transaction(store, "readonly");
                const dataStore = transaction.objectStore(store);
                const req = key ? dataStore.get(key) : dataStore.getAll()
                req.onsuccess = () => { res(req.result) }
                req.onerror = () => rej(req.error)
            } else {
                const transaction = db.transaction(store, "readwrite");
                const dataStore = transaction.objectStore(store);
                const req = dataStore.put(value);
                req.onsuccess = res
                req.onerror = () => rej(req.error)
            }
        }
        dbRequest.onerror = () => rej(dbRequest.error)
    });
}

function initDb(req) {
    var db = req.result;
    if (!db.objectStoreNames.contains('servers')) {
        db.createObjectStore('servers', { keyPath: 'id' });
    }
}

function writeDB(store, value) {
    return interactWithDb(store, undefined, value)
}

function readDb(store, key) {
    return interactWithDb(store, key, undefined)
}

async function requestJenkinsBg(url, method = 'GET', data = null) {

    const cookies = await chrome.cookies.getAll({ domain: new URL(url).host })
    const preHeaders = { 'Cookie': cookies.map(c => `${(c.name)}=${(c.value)}`).join(';') }
    const textResponse = await (await fetch(new URL(url).origin, { method: 'GET', headers: preHeaders })).text()
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
    headers[textResponse.match(/data-crumb-header="([^"]*)"/)[1]] = textResponse.match(/data-crumb-value="([^"]*)"/)[1]
    const requestOptions = {
        method: method,
        headers: headers,
        body: data
    }
    const resp = await fetch(url, requestOptions)
    return await resp.text()
}

async function runGroovyScriptBg(script, server) {
    return await requestJenkinsBg(`${server}/scriptText`, method = 'POST', data = `script=${script}`);
}

async function runLlmPromptBg(prompt, context) {
    console.log(`query llm: ${prompt}`)
    const requestOptions = {
        method: "POST",
        body: JSON.stringify(
            {
                "model": "llama3.1",
                "prompt": prompt,
                options: {
                    "num_ctx": 16384,
                },
                //"context": context,
            }
        )
    }
    const resp = await fetch("http://localhost:11434/api/generate", requestOptions)
    const responseParts = (await resp.text()).split('\n').map(x => { try { return JSON.parse(x) } catch { return null } }).filter(x => x != null)
    const responseContext = responseParts.find(r => r.context)?.context

    const finalResponse = { response: responseParts.map(r => r.response).join(""), context: responseContext }
    return finalResponse
}

// enable content scripts for enabled servers
chrome.scripting.unregisterContentScripts().then(() => {
    getServerRecord().then(s => {
        s.filter(a => a.enabled).forEach(server => {
            chrome.scripting.registerContentScripts(getScript(server.id))
        });
    })
})