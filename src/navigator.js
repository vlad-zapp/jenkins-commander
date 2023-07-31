const inputCode = "<input class='jenkins-nav-prompt-input' id='jenkins-navigator-prompt' autocomplete='off' />"

const elementCode = `\
    <div id='jenkins-navigator-overlay' class='jenkins-nav-overlay'>\
        <div class="lds-ring"><div></div><div></div><div></div><div></div></div>\
        <div id='jenkins-navigator-container' class='jenkins-nav-container'>\
            <br/><div class='jenkins-nav-header'></div>\
            <div class='jenkins-nav-prompt-div'>\
                <!--div class='jenkins-nav-update-div'>\
                    <img src='${chrome.runtime.getURL('media/icon-update.png')}' class='jenkins-nav-update-img' />
                </div-->\
                <div class='jenkins-nav-prompt-input-div'>${inputCode}</div>\
            </div>\
            <div id="jenkins-navigator-results" class="jenkins-navigator-results"></div>
        </div>\
    </div>`

class Navigator {
    #defaultMenu
    #currentMenu

    constructor(hostname) {
        this.#defaultMenu = new JobSearchMenu({ hostname: hostname });
    }

    isVisible() {
        let element = $('div#jenkins-navigator-overlay')
        return element.length && $(element).is(":visible")
    }

    toggle() {
        if (this.isVisible()) {
            this.#hide()
        } else {
            this.#show()
        }
    }

    toggleLoader(on) {
        if (on) {
            $('div.lds-ring').show()
            $('div#jenkins-navigator-container').hide()
        } else {
            $('div.lds-ring').hide()
            $('div#jenkins-navigator-container').show()

            // hack. jquery .focus() don't work here for some reason
            document.getElementById('jenkins-navigator-prompt').focus()
        }
    }

    openMenu(newMenu) {
        if (newMenu.header) {
            $('div.jenkins-nav-header').text(newMenu.header)
            $('div.jenkins-nav-header').show()
        }

        $('input#jenkins-navigator-prompt').val('')
        $('div[id^=jenkins-navigator-result-]').remove()

        this.#currentMenu = newMenu

        if (this.#currentMenu.searchForEmpty) {
            $('input#jenkins-navigator-prompt').trigger('input')
        }
        $('input#jenkins-navigator-prompt').focus()
    }

    navigate(url, newWindow = false) {
        var gotoUrl = url;
        if (!url.match('://')) {
            gotoUrl = appendUrl(location.origin, url)
        }
        if (newWindow === true) {
            window.open(gotoUrl)
        } else {
            location.href = gotoUrl
        }
    }

    #show() {
        $('body').addClass('stop-scrolling')
        this.#currentMenu = this.#defaultMenu;
        if ($('div#jenkins-navigator-overlay').length == 0) {
            $('body').append(elementCode)
            $('input#jenkins-navigator-prompt')
                .on('click', () => false)
                .on('input', e => {
                    const specialPrefix = e.target.value.match(/^[^\w^\d]/)
                    let searchItems = this.#currentMenu.items
                    if (specialPrefix) {
                        searchItems = searchItems.filter(i => i.name.startsWith(specialPrefix[0]))
                    } else {
                        searchItems = searchItems.filter(i => i.name.match(/^[\w\d]/))
                    }
                    const matches = fuzzysort.go(e.target.value, searchItems, { key: 'name', all: this.#currentMenu.searchForEmpty })
                    this.#showResults(matches)
                })

            //$('div#jenkins-navigator-overlay').on('click', this.#hide)
            $('img.jenkins-nav-update-img').height($('input#jenkins-navigator-prompt').height())
            $('div.jenkins-nav-header').hide()
        }

        this.toggleLoader(false)

        $('body').on('keydown.navigator', e => this.#onInput(e, this))
        this.#currentMenu = this.#defaultMenu
        $('div#jenkins-navigator-overlay').css('left', window.scrollX)
        $('div#jenkins-navigator-overlay').css('top', window.scrollY)
        $('div#jenkins-navigator-overlay').show()
        $('input#jenkins-navigator-prompt').focus()
    }

    #hide() {
        $('body').removeClass('stop-scrolling')
        $('body').off('.navigator')
        $('div.jenkins-nav-header').text('')
        $('div.jenkins-nav-header').hide()
        $('div#jenkins-navigator-overlay').hide()
        $('input#jenkins-navigator-prompt').val('')
        $('div[id^=jenkins-navigator-result-]').remove()
    }

    #onInput(e, sender) {
        switch (e.originalEvent.code) {
            case "ArrowLeft":
                if ($('input#jenkins-navigator-prompt').val().length == 0) {
                    sender.cacheJobs()
                }
                break
            case "ArrowDown":
            case "ArrowUp":
                var elem = $('div.jenkins-nav-search-result-selected')
                if (elem.length) {
                    elem.removeClass('jenkins-nav-search-result-selected')
                    elem = elem[e.originalEvent.code == "ArrowDown" ? 'next' : 'prev']('div.jenkins-nav-search-result')
                }
                if (elem.length) {
                    elem.addClass('jenkins-nav-search-result-selected')
                    elem[0].scrollIntoViewIfNeeded(false)
                } else {
                    elem = $('div.jenkins-nav-search-result')
                    if ($('input#jenkins-navigator-prompt').is(':focus') && elem.length) {
                        $('input#jenkins-navigator-prompt').blur()
                        elem = elem[e.originalEvent.code == "ArrowDown" ? 'first' : 'last']()
                        if (elem.length) {
                            elem.addClass('jenkins-nav-search-result-selected')
                            elem[0].scrollIntoViewIfNeeded(false)
                        }
                    } else {
                        $('input#jenkins-navigator-prompt').focus()
                        $('div#jenkins-navigator-results').scrollTop(0)
                    }
                }
                return false
            case "Escape":
                this.#hide()
                break
            default:
                var elem = $('div.jenkins-nav-search-result-selected')
                if (elem.length == 0 && e.originalEvent.code == "Enter") {
                    elem = $('div.jenkins-nav-search-result').first()
                }
                if (elem.length == 0) {
                    return;
                }
                const event = jQuery.Event('interact');
                event.shiftKey = e.originalEvent.shiftKey
                event.ctrlKey = e.originalEvent.ctrlKey
                event.altKey = e.originalEvent.altKey
                event.code = e.originalEvent.code
                elem.trigger(event)
                e.preventDefault()
        }
    }

    #showResults(results) {
        $('div[id^=jenkins-navigator-result-]').remove()
        return new Promise((res, rej) => {
            results.forEach((result, num) => {
                $('div#jenkins-navigator-results').append(this.#renderResult(result, `jenkins-navigator-result-${num}`))
                this.#bindResult(result, `jenkins-navigator-result-${num}`)

                result.obj.redraw = () => {
                    const wasSelected = $(`div#jenkins-navigator-result-${num}`).hasClass('jenkins-nav-search-result-selected')
                    $(`div#jenkins-navigator-result-${num}`).replaceWith(this.#renderResult(result, `jenkins-navigator-result-${num}`, wasSelected)).focus()
                    this.#bindResult(result, `jenkins-navigator-result-${num}`)
                }

                result.obj.showLoadingScreen = () => this.toggleLoader(true);
                result.obj.hideLoadingScreen = () => this.toggleLoader(false);
            });
            res()
        });
    }

    #renderResult(result, resultId, selected) {
        return `<div id='${resultId}' class='jenkins-nav-search-result${selected ? ' jenkins-nav-search-result-selected' : ''}'>\
        ${this.#currentMenu instanceof SelectingMenu ? (result.obj.selected ? '[x]' : '[<span style=\'opacity: 0\'>x</span>]') : ''}
        ${result.score == -Infinity ? result.target : fuzzysort.highlight(result, "<span style='color:red'>", "</span>")}
        ${result.obj.opensMenu ? `<img src='${chrome.runtime.getURL('media/icon-menu.svg')}' class='jenkins-nav-menu-img' id=menu-${resultId}/>` : ''}
        </div>`;
    }

    #bindResult(result, resultId) {
        $(`div#${resultId}`)
            .on('interact', e => { result.obj.act(e, this).then(x => e.preventDefault()) })
            //.on('click', e => { result.obj.act(e, this).then(x => e.preventDefault()) })
    }
}
