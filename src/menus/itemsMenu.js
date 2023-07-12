class itemsMenu extends Menu {
    constructor(name, loader) {
        super(true)
        this.header = name
        this.items = loader()
    }
}