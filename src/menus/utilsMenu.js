class UtilsMenu extends Menu {
    constructor() {
        super(true)
        this.header = 'Utils'
        this.items = [
            new MenuItem('import-variables', [], () => new ServersMenu('Select source server', s => new MenuItem(s.id, [], () => importVariables(s.id)))),
            new MenuItem('import-credentials', [], () => new ServersMenu('Select source server', s => new MenuItem(s.id, [], () => importCredentials(s.id))))
        ]
    }
}

async function importVariables(server) {
    const menu = new SelectingMenu('Select variables', [], createVariables, async (i) => {
        const response = await runRemoteGroovyScript(GroovyScripts.getGlobalVars, server)
        i.items = Object.entries(getResult(response)).map(e => new SelectableMenuItem(`${e[0]} = ${e[1]}`, e))
    })

    await menu.init()
    return menu;
}

async function importCredentials(server) {
    const menu = new SelectingMenu('Select credentials', [], createCredentials, async (i) => {
        const response = await runRemoteGroovyScript(GroovyScripts.revealAllCredentials, server)
        i.items = getResult(response).map(e => new SelectableMenuItem(`${e.domain ?? 'global'} / ${e.id}`, e))
    })

    await menu.init()
    return menu;
}

function createVariables(selectedItems) {
    selectedItems.forEach(it => {
        const response = runGroovyScript(GroovyScripts.setVariable(it.value))
        if(!response) {
            console.log(`set variable '${it.value[0]}' = '${it.value[1]}'`)
        } else {
            console.log(`got unexpected response when setting var: ${response}`)
            console.log(`var data:`, it.value)
        }
    })
}

function createCredentials(selectedItems) {

    selectedItems.forEach(it => {
        //const domain = runRemoteGroovyScript(GroovyScripts.getDomain(it.value.store, it.value.domain), server)
        //console.log(domain)
        // todo: create domain if it doesn't exist
        const removed = getResult(runGroovyScript(GroovyScripts.deleteCredentials(it.value)))
        const created = getResult(runGroovyScript(GroovyScripts.createCredentials(it.value)))
        console.log(`${it.value.id}: ${removed ? 'existing value removed, ' : ''}new value ${created ? 'created' : 'not created'}`)
    })
}

function getResult(output) {
    try {
        console.log(JSON.parse(output))
        return JSON.parse(output)
    } catch {
        console.log(output)
        throw new Error('Unexpected response.')
    }
}