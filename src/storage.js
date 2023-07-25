class DbStorage {
    static #storage = new Map()

    static set(key, value) {
        //chrome.runtime.sendMessage(`set_jobs ${key} ${value}`)
        this.#storage.set(key, value)
    }

    static get(key) {
        //return await chrome.runtime.sendMessage(`get_jobs ${key}`)
        return this.#storage.get(key)
    }
}

class CloudStorage {
    static #storage = new Map()

    static set(key, value) {
        this.#storage.set(key, value)
    }

    static get(key) {
        return this.#storage.get(key)
    }
}