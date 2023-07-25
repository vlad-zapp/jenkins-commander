class JobSearchMenu extends Menu {
    constructor(context) {
        super(false)
        cacheJobs();
        const storedItems = DbStorage.get(context.hostname).split('//');
        this.items = storedItems.map(j => new JobSearchItem(j)).concat([
            new UrlActionItem("/script", "/script"),
            new UrlActionItem("/script-approval", "/scriptApproval/#footer"),
            new UrlActionItem("/all-builds-history", "/view/all/builds"),
            new UrlActionItem("/plugins", "/pluginManager/installed"),
            new UrlActionItem("/users", "/securityRealm/"),
            new UrlActionItem("/log", "/log/all"),
            new SettingsMenuItem("/nodes", "/computer/", () => requestJenkinsJson('/computer/api/json')
                .computer.map(c => new UrlActionItem(
                    c.displayName,
                    appendUrl(location.origin,
                        `computer/${c.displayName == 'Built-In Node' ? '(built-in)' : c.displayName}/`
                    )
                ))
            ),
            new MenuItem("/global-variables", [], () => new GlobalVarsMenu()),
            new MenuItem("/credentials", [], () => new CredentialsMenu())
        ])
    }
}

class JobSearchItem extends UrlActionItem {
    constructor(fullName) {
        super(fullName, `/job/${fullName.split('/').join('/job/')}`)
        this.addMenu(new JobActionsMenu(fullName, this.getUrl()))
        this.addBindings([
            {
                key: new HotkeyBinding("KeyL", "Open last build"),
                action: n => this.navigate(n, () => getLastBuild(this.getUrl()))
            },
            {
                key: new HotkeyBinding("Ctrl+KeyL", "Open last build in new tab"),
                action: n => this.navigate(n, () => getLastBuild(this.getUrl()), true)
            },
            {
                key: new HotkeyBinding("KeyM", "Open my last build"),
                action: n => this.navigate(n, () => getMyLastBuild(this.getUrl()))
            },
            {
                key: new HotkeyBinding("Ctrl+KeyM", "Open my last build in new tab"),
                action: n => this.navigate(n, () => getMyLastBuild(this.getUrl()), true)
            },
        ])
    }
}

class SettingsMenuItem extends UrlActionItem {
    constructor(name, url, loader) {
        super(name, url)
        this.addMenu(new itemsMenu(name, loader), "Open items menu")
    }
}
