class GroovyScripts {
    static getGlobalVars = `
        import jenkins.model.*
        import groovy.json.*

        instance = Jenkins.getInstance()
        globalNodeProperties = instance.getGlobalNodeProperties()
        envVarsNodePropertyList = globalNodeProperties.getAll(hudson.slaves.EnvironmentVariablesNodeProperty.class)
        print JsonOutput.toJson(envVarsNodePropertyList.envVars.first())
    `;

    static getCredentials = `
        import com.cloudbees.plugins.credentials.*
        import com.cloudbees.plugins.credentials.domains.*
        import groovy.json.*

        def credentialsProvider = Jenkins.instance.getExtensionList('com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0]
        println JsonOutput.toJson(credentialsProvider.domainCredentials.collectMany { 
            domain -> credentialsProvider.getCredentials(domain.domain).collect { [(domain.domain.name ?: ''), it.id] }
        })
    `;

    static revealCredentials = `
        def creds = com.cloudbees.plugins.credentials.CredentialsProvider.lookupCredentials( com.cloudbees.plugins.credentials.Credentials.class, Jenkins.instance, null, null ).findAll {it.id=='$ID'}
        for (c in creds) {
            c.properties.findAll { !(['descriptor', 'privateKey', 'class', 'scope', 'usernameSecret', 'privateKeySource'].contains(it.key)) } .each { println it; println ''; }
        }
    `;

    static getServerDate = `
        print System.currentTimeMillis()
    `;
}