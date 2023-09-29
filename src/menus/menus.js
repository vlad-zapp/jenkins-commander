class HotkeyBinding {
    keyCode
    description
    alt = false
    ctrl = false
    shift = false
    constructor(shortcut, description) {
        const match = shortcut.match(/^(.*?)?(?:\+(.*))?$/i)
        this.keyCode = match.findLast(a => a)
        this.description = description

        if (match.length > 2) {
            const modifier = match[1]
            switch (modifier.toLowerCase()) {
                case 'alt':
                    this.alt = true
                    break
                case 'ctrl':
                    this.ctrl = true
                    break
                case 'shift':
                    this.shift = true
                    break
            }
        }
    }

    isMatch(e) {
        return (this.keyCode == e.code || (this.keyCode == "Enter" ? e.code == "NumpadEnter" : false)) &&
            this.shift === e.shiftKey &&
            this.ctrl === e.ctrlKey &&
            this.alt === e.altKey
    }
}

class Menu {
    searchForEmpty
    header
    items
    constructor(searchForEmpty) {
        this.searchForEmpty = searchForEmpty
    }
}

class MenuItem {
    name
    bindings = []
    opensMenu = false
    opensMenuByDefault = true

    showLoadingScreen
    hideLoadingScreen
    redraw

    constructor(name) {
        this.name = name
    }

    setAction(action) {
        this.addBindings([
        {
            key: new HotkeyBinding("Enter", description),
            action: async n => action(n)
        }])
        this.opensMenu = false
        return this;
    }

    setMenu(menu, description = "Open menu") {
        if (!menu) {
            return;
        }
        this.addBindings([{
            key: new HotkeyBinding("Shift+Enter", description),
            action: async n => await openMenu(menu).then(m => n.openMenu(m))
        },
        {
            key: new HotkeyBinding("Enter", description),
            action: async n => { if (this.opensMenuByDefault) await openMenu(menu).then(m => n.openMenu(m)) }
        }])
        this.opensMenu = true
        return this;

        async function openMenu(menu) {
            const instance = typeof (menu) == 'function' ? await menu() : menu
            if (instance.init) {
                await instance.init()
            }
            return instance
        }
    }

    addBindings(moreBindings) {
        if (moreBindings) {
            this.bindings = this.bindings.concat(moreBindings)
        }
        return this;
    }

    async act(event, navigator) {
        if (this.showLoadingScreen) {
            this.showLoadingScreen()
        }

        for (var x of this.bindings.filter(b => b.key.isMatch(event))) {
            await x.action(navigator)
        }

        if (this.hideLoadingScreen) {
            this.hideLoadingScreen()
        }
    }
}

class UrlActionItem extends MenuItem {
    #url

    constructor(name, url) {
        super(name)
        this.opensMenuByDefault = false
        this.#url = url
        this.bindings = [
            {
                key: new HotkeyBinding("Enter", "Open"),
                action: n => this.navigate(n, url)
            },
            {
                key: new HotkeyBinding("Ctrl+Enter", "Open in new tab"),
                action: n => this.navigate(n, url, true)
            }
        ]
    }

    getUrl(url = this.#url) {
        try {
            return url instanceof Function
                ? url()
                : url
        } catch (e) {
            return null
        }
    }

    navigate(navigator, url, newWindow = false) {
        const gotoUrl = this.getUrl(url)
        if (gotoUrl) {
            if (!newWindow) {
                this.hideLoadingScreen = null
            }
            navigator.navigate(gotoUrl, newWindow)
        } else {
            window.alert('Not available')
        }
    }
}

class SelectingMenu extends Menu {
    #init
    #submitAction
    items
    constructor(header, items, submitAction, init) {
        super(true)
        this.header = header
        this.#init = init
        this.items = items
        this.#submitAction = submitAction
        this.items?.forEach(i => i.submitAction = (n) => submitAction(this.items.filter(i => i.selected), n))
    }

    async init() {
        if (this.#init) await this.#init(this);
        this.items?.forEach(i => i.submitAction = (n) => this.#submitAction(this.items.filter(i => i.selected), n))
    }
}

class SelectableMenuItem extends MenuItem {
    constructor(name, value) {
        super(name)
        this.submitAction = undefined
        this.value = value
        this.selected = false
        this.toggleSelect = () => {
            this.selected = !this.selected; if (this.redraw) this.redraw()
        }
        this.bindings = [
            {
                key: new HotkeyBinding("Space", "Select"),
                action: n => { this.toggleSelect() }
            },
            {
                key: new HotkeyBinding("KeyA", "Select All"),
                action: n => { n.triggerForCurrentItems(i => i.toggleSelect()) }
            },
            {
                key: new HotkeyBinding("Enter", "Submit"),
                action: n => this.submitAction(n)
            }
        ]
    }

    submitAction
    onSelectedChanged;
}
