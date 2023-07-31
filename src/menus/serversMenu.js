class ServersMenu extends Menu {
    #customItemMaker
    constructor(customHeader, customItemMaker) {
        super(true)
        this.#customItemMaker = customItemMaker
        this.header = customHeader ?? 'Servers'
    }

    async init() {
        const servers = await chrome.runtime.sendMessage(`get_servers`)
        this.items = servers.filter(x => x.enabled).map(x => this.#customItemMaker ? this.#customItemMaker(x) : new UrlActionItem(x.id, x.id))
    }
}
