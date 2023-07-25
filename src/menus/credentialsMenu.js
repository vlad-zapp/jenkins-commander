class CredentialsMenu extends Menu {
    constructor() {
        super(true)
        this.header = 'Credentials'
        this.items = JSON.parse(runGroovyScript(GroovyScripts.getCredentials)).map(e => new CredentialsItem(e[0], e[1]))
    }
}

class CredentialsItem extends UrlActionItem {
    constructor(domain, name) {
        super(name, `/credentials/store/system/domain/${domain ? domain : '_' }/credential/${name}`)
    }
}
