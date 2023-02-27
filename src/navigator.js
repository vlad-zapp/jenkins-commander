const inputCode = "<input class='jenkins-nav-prompt-input' id='jenkins-navigator-prompt' />"

const elementCode = `\
    <div id='jenkins-navigator-overlay' class='jenkins-nav-overlay'>\
        <div id='jenkins-navigator-container' class='jenkins-nav-container'>\
            ${inputCode}\
        </div>\
    </div>`


class Navigator {
    #jobNames

    constructor(hostname) {
        this.#jobNames = DbStorage.get(hostname)
    }

    toggle() {
        let element = $('div#jenkins-navigator-overlay')
        if (!element.length) {
            $('body').append(elementCode)
            $('input#jenkins-navigator-prompt')
                .on('input', e => this.#onSearch(this, e))
                .on('click', x => false)
                .on('keydown', e=> this.#onSelectResult(this, e))
            $('div#jenkins-navigator-overlay').on('click', this.#hide)
        } else {
            if ($(element).is(":visible")) {
                this.#hide()
            } else {
                this.#show()
            }
        }
        $('input#jenkins-navigator-prompt').focus()
    }

    #show() {
        $('div#jenkins-navigator-overlay').show()
    }

    #hide() {
        $('div#jenkins-navigator-overlay').hide()
        $('input#jenkins-navigator-prompt').val('')
        $('div[id^=jenkins-navigator-result-]').remove()
    }

    #getText() {
        return $('input#jenkins-navigator-prompt').val()
    }

    #onSelectResult(self, e) {
        if(e.originalEvent.code == "ArrowDown" || e.originalEvent.code == "ArrowUp") {
            let elem = $('div.jenkins-nav-search-result-selected')
            elem.removeClass('jenkins-nav-search-result-selected')
            elem = elem[e.originalEvent.code == "ArrowDown" ? 'next' : 'prev']('div.jenkins-nav-search-result')
                
            if(elem.length){
                elem.addClass('jenkins-nav-search-result-selected')
            } else {
                elem = $('div.jenkins-nav-search-result')
                elem = elem[e.originalEvent.code == "ArrowDown" ? 'first' : 'last']()
                elem?.addClass('jenkins-nav-search-result-selected')
            }

            return false
        }

        if(e.originalEvent.code == "Enter") {
            let elem = $('div.jenkins-nav-search-result-selected')
            if(elem.length == 0) {
                elem = $('div.jenkins-nav-search-result').first()
            }
            elem.click()
        }

        if(e.originalEvent.code == "Escape") {
            this.#hide()
        }
    }

    #onSearch(sender, e) {
        const text = sender.#getText().toLowerCase()
        if (text != '') {
            const matches = fuzzysort.go(text, sender.#jobNames)
            sender.#showResults(matches, 10)
        } else {
            sender.#showResults([], 0)
        }

    }

    #showResults(results, number) {
        results = results.slice(0, number)
        $('div[id^=jenkins-navigator-result-]').remove()
        results.forEach((res, num) => {
            $('div#jenkins-navigator-container').append(`<div id='jenkins-navigator-result-${num}' class='jenkins-nav-search-result'>\
                ${fuzzysort.highlight(res, "<span style='color:red'>", "</span>")}</div>`)
            $(`div#jenkins-navigator-result-${num}`)
                .on('click', () => { location.href = appendUrl(location.origin, `/job/${res.target.split('/').join('/job/')}`) })
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

