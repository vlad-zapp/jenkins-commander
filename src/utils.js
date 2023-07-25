function sleep(ms) {
    var start = new Date().getTime(), expire = start + ms;
    while (new Date().getTime() < expire) { }
    return true;
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

function getLastBuild(jobUrl, timestamp) {
    return getJob(jobUrl).lastBuild.url
}

function getMyLastBuild(jobUrl) {
    const userId = requestJenkinsJson(appendUrl(location.origin, '/me/api/json')).id
    const build = requestJenkinsJson(appendUrl(jobUrl, '/api/json?tree=builds[url,actions[causes[*]]]'))
        .builds
        .find(b => b?.actions?.some(a => a?.causes?.some(c => {
            return c?.userId == userId ||
                (c?._class === "com.sonyericsson.hudson.plugins.gerrit.trigger.hudsontrigger.GerritUserCause" && c?.userName == userId)
        })))
    return build.url
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