this.$ = this.jQuery = jQuery.noConflict(true);
var nav

function requestJenkins(url, method='GET', data=null) {
    const request = new XMLHttpRequest();
    request.open(method, url, false); // `false` makes the request synchronous
    request.setRequestHeader($('head').attr('data-crumb-header'), $('head').attr('data-crumb-value'))
    if(data && method=='POST') {
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    request.send(data);
    return request
}

function restart(jobUrl) {
    let request = requestJenkins(appendUrl(jobUrl, '/rebuild'))
    if (request.status != 200) {
        requestJenkins(appendUrl(jobUrl, '/gerrit-trigger-retrigger-this/index'), 'POST')
    }
}

function jumpToConsole(jobBuildUrl, newTab = false) {
    if(newTab) {
        window.open(appendUrl(jobBuildUrl,'/console'), '_blank').focus();
    } else {
        window.location = appendUrl(jobBuildUrl,'/console')
    }
}

function doc_keyDown(e)
{
    // alt-r: restart job and go to console
    if(e.code=='KeyR' && e.altKey) {
        if(JobOverviewPage.Identify()) {
            restart(JobOverviewPage.GetCurrentBuild())
            jumpToConsole(JobOverviewPage.GetLastBuild())
        } else if (JobRunPage.Identify()) {
            restart(JobRunPage.GetCurrentBuild())
            jumpToConsole(JobRunPage.GetLastBuild())
        } else if (JobConfigurationPage.Identify()) {
            JobConfigurationPage.Apply()
            jumpToConsole(JobConfigurationPage.GetLastBuild())
        }
    }

    //alt-c: configure job
    if(e.code=='KeyC' && e.altKey) {
        if(JobConfigurationPage.Identify()) {
            console.log($('button[type=submit]').length)
            $('button[type=submit]').click()
        }
        else if(location.pathname.match('/job/[^/]+')) {
            location.href = appendUrl(location.href.match('(^.*/job/[^/]+)(/.*)')[1], '/configure')
        }
        return false;
    }

    //alt-/: open navigation prompt
    if(e.code=='Slash' && e.altKey) {
        nav.toggle()
    }
}

function cacheJobs() {
    const start = Date.now();
    const request = requestJenkins(appendUrl(location.origin, '/api/json?tree='+"jobs[fullName,".repeat(5)+'jobs'+"]".repeat(5)))
    if (request.status === 200) {
        let jobs = []
        let folders = [JSON.parse(request.responseText)]
        let folder

        while(folder = folders.pop()) {
            if(folder.jobs) {
                folder.jobs.forEach(it => {
                    if(it.jobs) {
                        folders.push(it)
                    } else if(it.fullName) {
                        jobs.push(it.fullName)
                    }
                });
            }
        }

        DbStorage.set(location.host, jobs)
    }
    console.log(`Cached jobs in ${Date.now()-start} ms`)
}

function silentReload() {
    const request = requestJenkins(window.document.location.href)
    if (request.status === 200) {
        document.body.innerHTML = request.responseText.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
    }
}

document.addEventListener('keydown', doc_keyDown, false);
$('form[role=search]').remove()
cacheJobs()
nav = new Navigator(location.host)

new Promise(() => {
    setTimeout(()=> {
        // todo: revisit
        if(window.document.location.href.match('/job/[^/]+/[0-9]+/console(?:Full)?') && sleep(2000) && !($('pre.console-output')?.text())) {
            silentReload()
        }
    }, 2000)
})
