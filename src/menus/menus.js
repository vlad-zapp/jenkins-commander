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
        return (this.keyCode == e.code || this.keyCode == "Enter" && e.type == "click") &&
            this.shift === e.shiftKey &&
            this.ctrl === e.ctrlKey &&
            this.alt === e.altKey
    }
}

class Menu {
    searchForEmpty
    maxResults
    header
    items
    constructor(searchForEmpty, maxResults = 10) {
        this.searchForEmpty = searchForEmpty
        this.maxResults = maxResults
    }
}

class MenuItem {
    name
    bindings = []
    opensMenu = false

    addMenu(menu, description = "Open menu") {
        this.addBindings([{
            key: new HotkeyBinding("Shift+Enter", description),
            action: n => n.openMenu(menu)
        }])
        this.opensMenu = true
    }

    addBindings(moreBindings) {
        this.bindings = this.bindings.concat(moreBindings)
    }

    act(event, navigator) {
        this.bindings
            .filter(b => b.key.isMatch(event))
            .forEach(a => a.action(navigator))
    }
}

class UrlActionItem extends MenuItem {
    #url

    constructor(name, url) {
        super()
        this.#url = url
        this.name = name
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
        try{
            return url instanceof Function
                ? url()
                : url
        } catch(e) {
            return null
        }
    }

    navigate(navigator, url, newWindow = false) {
        const gotoUrl = this.getUrl(url)
        if(gotoUrl) {
            navigator.navigate(gotoUrl, newWindow)
        } else {
            window.alert('Not available')
        }
    }
}