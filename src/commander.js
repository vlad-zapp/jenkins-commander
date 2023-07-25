this.$ = this.jQuery = jQuery.noConflict(true);
var nav

chrome.runtime.sendMessage("turn_on_icon")

function requestJenkins(url, method = 'GET', data = null) {
    const request = new XMLHttpRequest();
    request.open(method, url, false); // `false` makes the request synchronous
    request.setRequestHeader($('head').attr('data-crumb-header'), $('head').attr('data-crumb-value'))
    if (data && method == 'POST') {
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    request.send(data);
    return request
}

function requestJenkinsJson(url, method = 'GET', data = null) {
    const req = requestJenkins(url, method, data)
    if (req.status == 200) {
        return JSON.parse(req.responseText)
    }
}

function runGroovyScript(script) {
    const req = requestJenkins("/scriptText", method = 'POST', data = `script=${script}`);
    return req.responseText;
}

function restart(jobUrl) {
    request = requestJenkins(appendUrl(jobUrl, '/rebuild'))
    if (request.responseURL.match(/rebuild\/parameterized(?:\/)?$/i)) {
        $('#restartFrame').remove()
        $(`<iframe src="${request.responseURL}" id="restartFrame" style="visibility:hidden; height:1px" />`).appendTo('body')
        $('#restartFrame').on('load', () => $('#restartFrame').contents().find("form[name=config] button:submit").click())
        return true
    }

    if (request.status != 200) {
        request = requestJenkins(appendUrl(jobUrl, '/gerrit-trigger-retrigger-this/index'), 'POST')
        return request.status == 200
    }

    return true
}

function jumpToConsole(jobBuildUrl, newTab = false) {
    if (newTab) {
        window.open(appendUrl(jobBuildUrl, '/console'), '_blank').focus();
    } else {
        window.location = appendUrl(jobBuildUrl, '/console')
    }
}

function doc_keyDown(e) {
    // alt-r: restart job and go to console
    if (e.code == 'KeyR' && e.altKey) {
        const currentServerTimestamp = runGroovyScript(GroovyScripts.getServerDate)
        if (JobOverviewPage.Identify()) {
            if (restart(JobOverviewPage.GetCurrentBuild())) {
                goToConsole(JobOverviewPage.GetMyLastBuild, currentServerTimestamp)
            }
        } else if (JobRerunPage.Identify()) {
            JobRerunPage.Rebuild()
        } else if (JobRunPage.Identify()) {
            if (restart(JobRunPage.GetCurrentBuild())) {
                goToConsole(JobRunPage.GetMyLastBuild, currentServerTimestamp)
            }
        }
    }

    //alt-c: configure job
    if (e.code == 'KeyC' && e.altKey) {
        if (JobConfigurationPage.Identify()) {
            $('button[type=submit]').click()
        }
        else if (location.pathname.match('/job/[^/]+')) {
            location.href = appendUrl(location.href.match('(^.*/job/[^/]+)(/.*)')[1], '/configure')
        }
        return false;
    }

    //alt-/: open navigation prompt
    if (e.code == 'Slash' && (e.altKey || e.metaKey)) {
        nav.toggle()
    }
}

function goToConsole(method, minTimestamp) {
    doWithRetry(10, 300, () => {
        const newBuildUrl = method(minTimestamp)?.url
        if (newBuildUrl) {
            return jumpToConsole(newBuildUrl)
        }
        throw new Error('No suitable build found')
    });
}

function silentReload() {
    const request = requestJenkins(window.document.location.href)
    if (request.status === 200) {
        document.body.innerHTML = request.responseText.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    }
}

document.addEventListener('keydown', doc_keyDown, false);
$('form[role=search]').remove()
nav = new Navigator(location.host)

var observer = new MutationObserver(function (mutations) {
    if (window.location.hash) {
        const hashCmds = window.location.hash.split(':::').map(e => e.split('::'))
        hashCmds.forEach(hashCmd => {
            switch (hashCmd[0]) {
                case "#highlight":
                    hashCmd.slice(1).forEach(arg => {
                        const found = $(arg)
                        if (found.length) {
                            found.css('border', '3px solid red')
                            found[0].scrollIntoView({ 'block': 'center' })
                            const observer2 = new window.IntersectionObserver(([entry]) => {
                                if (entry.isIntersecting) {
                                    observer.disconnect();
                                    observer2.disconnect();
                                    return
                                }
                            }, {
                                root: null,
                                threshold: 1,
                            })
                            observer2.observe(found[0]);
                        }
                    })
                    break;
            }
        })
    }
});

observer.observe(document, { attributes: false, childList: true, characterData: false, subtree: true });

$(window).on('hashchange', function () {
    window.location.reload(true);
});

$(window).on('load', () => {
    if (CredentialsDetailsPage.Identify()) {
        CredentialsDetailsPage.EnableReveal()
    }
});

//cacheJobs()
// new Promise(() => {
//     if (window.document.location.href.match('/job/[^/]+/[0-9]+/console(?:Full)?') && sleep(2000) && !($('pre.console-output')?.text())) {
//         silentReload()
//     }
// })
