class JobActionsMenu extends Menu {
    constructor(fullName, url) {
        super(true)
        this.header = `[${fullName}]`
        this.items = [
            new UrlActionItem("Overview", url),
            new UrlActionItem("Configure", appendUrl(url, '/configure')),
            new JobBuildActionItem("Last build", () => getLastBuild(url)?.url),
            new JobBuildActionItem("My Last build", () => getMyLastBuild(url)?.url),
        ]
    }
}

class JobBuildActionItem extends UrlActionItem {
    constructor(name, url) {
        super(name, url)
        this.addBindings([
            {
                key: new HotkeyBinding("KeyC", "Open console"),
                action: n => n.navigate(appendUrl(this.getUrl(), "/console"))
            },
            {
                key: new HotkeyBinding("Ctrl+KeyC", "Open console in new tab"),
                action: n => n.navigate(appendUrl(this.getUrl(), "/console"), true)
            },
        ])
    }
}