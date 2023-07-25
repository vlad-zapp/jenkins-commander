class JobOverviewPage {
    static Identify() {
        return (location.pathname.match('/job/[^/]+/$'))
    }

    static GetLastBuild() {
        return getLastBuild(location.href)
    }

    static GetMyLastBuild(minTimestamp) {
        return getMyLastBuild(location.href, minTimestamp)
    }

    static GetCurrentBuild() {
        return this.GetLastBuild()
    }
}

class JobRunPage {
    static Identify() {
        return (location.pathname.match('/job/[^/]+/[0-9]+/'))
    }

    static GetLastBuild() {
        const url = appendUrl(location.href.match('^.*/job/[^/]+')[0], '/api/json')
        return getLastBuild(url)
    }

    static GetMyLastBuild(minTimestamp) {
        const url = appendUrl(location.href.match('^.*/job/[^/]+')[0], '/api/json')
        return getMyLastBuild(url, minTimestamp)
    }

    static GetCurrentBuild() {
        return location.href.match('^.*/job/[^/]+/[0-9]+')[0]
    }
}

class JobRerunPage {
    static Identify() {
        return (location.pathname.match('/job/[^/]+/[0-9]+/rebuild/parameterized(?:/)?'))
    }

    static Rebuild() {
        console.log($('form[name="config"] button:submit'))
        $('form[name="config"] button:submit').click()
    }
}

class JobConfigurationPage {
    static Identify() {
        return (location.pathname.match('/job/[^/]+/configure$'))
    }

    static Apply() {
        $('button[type=button]').click()
    }

    static GetLastBuild() {
        const url = appendUrl(location.href.match('^.*/job/[^/]+')[0], '/api/json')
        return getLastBuild(url)
    }
}

class CredentialsDetailsPage {
    static Identify() {
        return (location.pathname.match('/credentials/store/system/domain/[^/]+/credential/[^/]+/$')?.length > 0) ?? false;
    }

    static EnableReveal() {
        $(`<a href='#' id='reveal-cred')'>Reveal</a><br/><br/>`).insertAfter('div#main-panel h1')
        $('a#reveal-cred').on('click', ()=> {
            const id = location.pathname.split('/').filter(x=>x)[6]
            console.log(id);
            const reveal = runGroovyScript(GroovyScripts.revealCredentials.replace('$ID', id))
            $(`<div style='white-space: pre-line; border: 1px dashed black; padding: inherit;'>${reveal}</div><br/><br/>`).insertAfter('a#reveal-cred')
            $('a#reveal-cred').remove()
            return false;
        })
    }
}
