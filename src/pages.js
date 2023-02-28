function getLastBuild(jobUrl) {
    let request = requestJenkins(appendUrl(jobUrl, '/api/json'));

    if (request.status === 200) {
        return JSON.parse(request.responseText).lastBuild.url
    }
}

class JobOverviewPage {
    static Identify() {
        return (location.pathname.match('/job/[^/]+/$'))
    }

    static GetLastBuild() {
        return getLastBuild(location.href)
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

    static GetCurrentBuild() {
        return location.href.match('^.*/job/[^/]+/[0-9]+')[0]
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