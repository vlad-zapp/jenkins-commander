const inputCode = "<input class='jenkins-nav-prompt-input' id='jenkins-navigator-prompt' />"

const elementCode = `\
    <div id='jenkins-navigator-overlay' class='jenkins-nav-overlay'>\
        <div id='jenkins-navigator-container' class='jenkins-nav-container'>\
            <br/><div class='jenkins-nav-header'></div>\
            ${inputCode}\
        </div>\
    </div>`


class Navigator {
    #handler = this.#onSearch
    #servers = []
    #jobs = []
    #commands = [
        {
            name: "/script-approvals",
            cmd: () => { location.pathname = '/scriptApproval/' }
        },
        {
            name: "/script",
            cmd: () => { location.pathname = '/script' }
        },
        {
            name: "/all-builds-history",
            cmd: () => { location.pathname = '/view/all/builds' }
        },
        {
            name: "/switch-server",
            cmd: () => {
                chrome.runtime.sendMessage("get_servers")
                    .then(r => {
                        this.#servers = r.map(x => ({ name: x, cmd: () => location.href = appendUrl(x, location.pathname) }))
                        this.switchMode('Select server:', this.#onServerSelect)
                    })
            }
        }
    ]

    constructor(hostname) {
        this.#jobs = DbStorage.get(hostname).map(it => ({
            name: it,
            cmd: () => { location.pathname = `/job/${it.split('/').join('/job/')}` }
        }))
    }

    toggle() {
        let element = $('div#jenkins-navigator-overlay')
        if (!element.length) {
            $('body').append(elementCode)
            $('input#jenkins-navigator-prompt')
                .on('input', e => this.#handler(this, e))
                .on('click', x => false)
                .on('keydown', e => this.#onSelectResult(this, e))
            $('div#jenkins-navigator-overlay').on('click', () => this.#hide(this))
        } else {
            if ($(element).is(":visible")) {
                this.#hide()
            } else {
                this.#show()
            }
        }
        $('div#jenkins-navigator-overlay').css('left', window.scrollX)
        $('div#jenkins-navigator-overlay').css('top', window.scrollY)
        $('input#jenkins-navigator-prompt').focus()
    }

    switchMode(name, handler) {
        $('div[id^=jenkins-navigator-result-]').remove()
        $('input#jenkins-navigator-prompt').val('')
        $('div.jenkins-nav-header').text(name)
        $('div.jenkins-nav-header').css('visibility', 'visible')
        this.#handler = handler
        handler(this, null)
    }

    #show() {
        $('div#jenkins-navigator-overlay').show()
    }

    #hide(sender = this) {
        $('div.jenkins-nav-header').text('')
        $('div.jenkins-nav-header').css('visibility', 'hidden')
        $('div#jenkins-navigator-overlay').hide()
        $('input#jenkins-navigator-prompt').val('')
        $('div[id^=jenkins-navigator-result-]').remove()
        sender.#handler = sender.#onSearch
    }

    #getText() {
        return $('input#jenkins-navigator-prompt').val()
    }

    #onSelectResult(self, e) {
        if (e.originalEvent.code == "ArrowDown" || e.originalEvent.code == "ArrowUp") {
            let elem = $('div.jenkins-nav-search-result-selected')
            elem.removeClass('jenkins-nav-search-result-selected')
            elem = elem[e.originalEvent.code == "ArrowDown" ? 'next' : 'prev']('div.jenkins-nav-search-result')

            if (elem.length) {
                elem.addClass('jenkins-nav-search-result-selected')
            } else {
                elem = $('div.jenkins-nav-search-result')
                elem = elem[e.originalEvent.code == "ArrowDown" ? 'first' : 'last']()
                elem?.addClass('jenkins-nav-search-result-selected')
            }

            return false
        }

        if (e.originalEvent.code == "Enter") {
            let elem = $('div.jenkins-nav-search-result-selected')
            if (elem.length == 0) {
                elem = $('div.jenkins-nav-search-result').first()
            }
            elem.click()
        }

        if (e.originalEvent.code == "Escape") {
            this.#hide()
        }
    }

    #onSearch(sender, e) {
        const text = sender.#getText()
        const matches = fuzzysort.go(
            text,
            (text.startsWith('/') ? sender.#commands : sender.#jobs),
            { key: 'name', all: false }
        )
        sender.#showResults(matches, 10)
    }

    async #onServerSelect(sender, e) {
        const text = sender.#getText()
        const results = fuzzysort.go(text, sender.#servers, { key: 'name', all: true })
        sender.#showResults(results, 10)
    }

    #showResults(results, number) {
        results = results.slice(0, number)
        $('div[id^=jenkins-navigator-result-]').remove()
        results.forEach((res, num) => {
            console.log(res)
            $('div#jenkins-navigator-container').append(`<div id='jenkins-navigator-result-${num}' class='jenkins-nav-search-result'>\
                ${res.score == -Infinity ? res.target : fuzzysort.highlight(res, "<span style='color:red'>", "</span>")}</div>`)
            $(`div#jenkins-navigator-result-${num}`)
                .on('click', () => { res.obj.cmd(); return false; })
            // This is firing if mouse is over element during it's appeasrance. Need to fix.
            // .hover(
            //     function() {
            //         $('jenkins-nav-search-result').removeClass('jenkins-nav-search-result-selected');
            //         $(this).addClass('jenkins-nav-search-result-selected');
            //       }, function() {
            //         $(this).removeClass('jenkins-nav-search-result-selected');
            //       }
            // )
        });
    }
}

