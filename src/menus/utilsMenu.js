class UtilsMenu extends Menu {
    constructor() {
        super(true)
        this.header = 'Utils'
        this.items = [
            new MenuItem('import-credentials', [], () => new ServersMenu('Select source server', s => new MenuItem(s.id, [], () => importCredentials(s.id))))
        ]
    }
}

async function importCredentials(server) {
    const menu = new SelectingMenu('Select credentials', [], createCredentials, async (i) => i.items = JSON.parse(await runRemoteGroovyScript(GroovyScripts.revealAllCredentials, server))
        .map(e => new SelectableMenuItem(`${e.domain ?? 'global'} / ${e.id}`, e)))
    await menu.init()
    return menu;

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
            return JSON.parse(output)
        } catch {
            console.log(output)
            throw new Error('Unexpected response.')
        }
    }
}