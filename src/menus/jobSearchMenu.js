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
            new UrlActionItem("/users", "/asynchPeople/"),
            new UrlActionItem("/log", "/log/all"),
            new SettingsMenuItem("/nodes", "/computer/", () => requestJenkinsJson('/computer/api/json')
                .computer.map(c => new UrlActionItem(
                    c.displayName,
                    appendUrl(location.origin,
                        `computer/${c.displayName == 'Built-In Node' ? '(built-in)' : c.displayName}/`
                    )
                ))
            ),
            new MenuItem("/global-variables").setMenu(() => new GlobalVarsMenu()),
            new MenuItem("/credentials").setMenu(() => new CredentialsMenu()),
            new MenuItem('/switch-server').setMenu(() => new ServersMenu()),
            new MenuItem('/utils').setMenu(() => new UtilsMenu())
        ])
    }
}

class JobSearchItem extends UrlActionItem {
    constructor(fullName) {
        super(fullName, `/job/${fullName.split('/').join('/job/')}`)
        this.setMenu(new JobActionsMenu(fullName, this.getUrl()))
        this.addBindings([
            {
                key: new HotkeyBinding("KeyL", "Open last build"),
                action: n => this.navigate(n, () => getLastBuild(this.getUrl())?.url)
            },
            {
                key: new HotkeyBinding("Ctrl+KeyL", "Open last build in new tab"),
                action: n => this.navigate(n, () => getLastBuild(this.getUrl())?.url, true)
            },
            {
                key: new HotkeyBinding("KeyM", "Open my last build"),
                action: n => this.navigate(n, () => getMyLastBuild(this.getUrl())?.url)
            },
            {
                key: new HotkeyBinding("Ctrl+KeyM", "Open my last build in new tab"),
                action: n => this.navigate(n, () => getMyLastBuild(this.getUrl())?.url, true)
            },
        ])
    }
}

class SettingsMenuItem extends UrlActionItem {
    constructor(name, url, loader) {
        super(name, url)
        this.setMenu(new itemsMenu(name, loader), "Open items menu")
    }
}
