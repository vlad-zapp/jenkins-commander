class GlobalVarsMenu extends Menu {
    constructor() {
        super(true)
        this.header = 'Global Variables'
        this.items = Object.entries(JSON.parse(runGroovyScript(GroovyScripts.getGlobalVars))).map(e => new GlobalVarsItem(e[0],e[1]))
    }
}

class GlobalVarsItem extends UrlActionItem {
    constructor(name, value) {
        super(`${name} = ${value}`, `/configure#highlight::input[name=env\\.key][value=${name.replace( /(:|\.|\[|\]|,|=|@)/g, "\\$1" )}]`)
        // this.addBindingsWithMenu([
        //     {
        //         key: new HotkeyBinding("KeyC", "Copy Value"),
        //         action: n => navigator.clipboard.writeText(value),
        //     },
        //     {
        //         key: new HotkeyBinding("KeyX", "Copy 'Name = Value'"),
        //         action: n => navigator.clipboard.writeText(`${name} = ${value}`)
        //     }
        // ])
    }
}

// class JobBuildActionItem extends UrlActionItem {
//     constructor(name, url) {
//         super(name, url)
//         this.addBindings([
//             {
//                 key: new HotkeyBinding("KeyC", "Open console"),
//                 action: n => n.navigate(appendUrl(this.getUrl(), "/console"))
//             },
//             {
//                 key: new HotkeyBinding("Ctrl+KeyC", "Open console in new tab"),
//                 action: n => n.navigate(appendUrl(this.getUrl(), "/console"), true)
//             },
//         ])
//     }
// }