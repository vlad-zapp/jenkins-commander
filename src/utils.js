function sleep(ms) {
    var start = new Date().getTime(), expire = start + ms;
    while (new Date().getTime() < expire) { }
    return true;
}

function doWithRetry(number, duration, code) {
    if (number > 0) {
        try {
            code()
        } catch(e) {
            if (number == 1) {
                throw e;
            } else {
                setTimeout(()=>doWithRetry(number-1, duration, code), duration)
            }
        }
    } else {
        throw new Error('Timed out, no more retries')
    }
}

function appendUrl(url, appendix) {
    return `${url.replace(/\/*$/, '')}/${appendix.replace(/^\/*/, '')}`
}

function getJob(jobUrl) {
    let request = requestJenkins(appendUrl(jobUrl, '/api/json'));

    if (request.status === 200) {
        return JSON.parse(request.responseText)
    }
}

function getLastBuild(jobUrl) {
    return getJob(jobUrl)?.lastBuild
}

function getMyLastBuild(jobUrl, minTimestamp) {
    const userId = requestJenkinsJson(appendUrl(location.origin, '/me/api/json')).id
    const builds = requestJenkinsJson(appendUrl(jobUrl, '/api/json?tree=builds[url,timestamp,actions[causes[*]]]')).builds
    const build = builds.find(b => (minTimestamp ? Number(b.timestamp) > Number(minTimestamp) : true) && b?.actions?.some(a => a?.causes?.some(c => {
            return c?.userId == userId || (c?._class === "com.sonyericsson.hudson.plugins.gerrit.trigger.hudsontrigger.GerritUserCause" && c?.userName == userId)
        })))
    return build
}

function cacheJobs() {
    const start = Date.now();
    const request = requestJenkins(appendUrl(location.origin, '/api/json?tree=' + "jobs[fullName,".repeat(5) + 'jobs' + "]".repeat(5)))
    if (request.status === 200) {
        let jobs = []
        let folders = [JSON.parse(request.responseText)]
        let folder

        while (folder = folders.pop()) {
            if (folder.jobs) {
                folder.jobs.forEach(it => {
                    if (it.jobs) {
                        folders.push(it)
                    } else if (it.fullName) {
                        jobs.push(it.fullName)
                    }
                });
            }
        }

        DbStorage.set(location.host, jobs.join('//'))
    }
    console.log(`Cached jobs in ${Date.now() - start} ms`)
}