class GroovyScripts {
    static getGlobalVars = `
        import jenkins.model.*
        import groovy.json.*

        instance = Jenkins.getInstance()
        globalNodeProperties = instance.getGlobalNodeProperties()
        envVarsNodePropertyList = globalNodeProperties.getAll(hudson.slaves.EnvironmentVariablesNodeProperty.class)
        print JsonOutput.toJson(envVarsNodePropertyList.envVars.first())
    `;

    static getServerDate = `
        print System.currentTimeMillis()
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

    static revealAllCredentials = `
        import jenkins.model.Jenkins
        import com.cloudbees.plugins.credentials.domains.Domain
        import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
        import com.cloudbees.plugins.credentials.CredentialsScope
        import groovy.json.*

        print JsonOutput.toJson(Jenkins.instance.getExtensionList("com.cloudbees.plugins.credentials.SystemCredentialsProvider")
        .collect {it.getStore() }
        .collectMany { s -> s.getDomains()
        .collectMany { d -> s.getCredentials(d).collect
            { c -> c.getProperties().findAll { !(['descriptor', 'privateKeySource'].contains(it.key)) }
            .collectEntries({a -> ["\${a.key}":a.value.toString()]}) %2B ['domain':d.name, 'store':"\${s.displayName}"]}}})
    `

    static revealCredentials(id) {
        return `
            def creds = com.cloudbees.plugins.credentials.CredentialsProvider.lookupCredentials( com.cloudbees.plugins.credentials.Credentials.class, Jenkins.instance, null, null ).findAll {it.id=='${id}'}
            for (c in creds) {
                println c.properties
                        .findAll { !(['descriptor', 'privateKey', 'class', 'scope', 'usernameSecret', 'privateKeySource', 'description', 'id'].contains(it.key)) }
                        .collect { it.toString() }
                        .join('\\n\\n')
            }`
    };

    static deleteCredentials(prototype) {
        return `
            import jenkins.model.Jenkins
            import com.cloudbees.plugins.credentials.domains.Domain
            import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
            import com.cloudbees.plugins.credentials.CredentialsScope

            store = Jenkins.instance.getExtensionList("com.cloudbees.plugins.credentials.SystemCredentialsProvider").collect {it.getStore()}.find { it.displayName==${quoted(prototype.store)}}
            domain = store.domains.find {it.name==${quoted(prototype.domain)}}
            def creds = store.getCredentials(domain).find { it.id == ${quoted(prototype.id)}}
            print store.removeCredentials(domain, creds)
        `
    }

    static createCredentials(prototype) {
        return encodeURIComponent(`
            import jenkins.model.Jenkins
            import com.cloudbees.plugins.credentials.domains.Domain
            import com.cloudbees.jenkins.plugins.sshcredentials.impl.BasicSSHUserPrivateKey
            import com.cloudbees.plugins.credentials.CredentialsScope

            def store = Jenkins.instance.getExtensionList("com.cloudbees.plugins.credentials.SystemCredentialsProvider").collect {it.getStore()}.find { it.displayName==${quoted(prototype.store)}}
            def domain = store.domains.find {it.name==${quoted(prototype.domain)}}
            def cred = ${renderInstantiation(prototype)}
            print store.addCredentials(domain, cred)
        `)

        function renderInstantiation(prototype) {
            switch(prototype.class) {
                case "class com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl":
                    return `
                        new com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl(
                            CredentialsScope.${prototype.scope},
                            ${quoted(prototype.id)},
                            ${quoted(prototype.description)},
                            ${quoted(prototype.name)},
                            ${quoted(prototype.password)})
                    `
                case "class com.cloudbees.jenkins.plugins.sshcredentials.impl.BasicSSHUserPrivateKey":
                    return `
                        new com.cloudbees.jenkins.plugins.sshcredentials.impl.BasicSSHUserPrivateKey(
                            CredentialsScope.${prototype.scope},
                            ${quoted(prototype.id)},
                            ${quoted(prototype.username)},
                            new BasicSSHUserPrivateKey.DirectEntryPrivateKeySource('''${prototype.privateKey}'''),
                            ${quoted(prototype.passphrase)},
                            ${quoted(prototype.description)})
                    `
                case "class org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl":
                    return `
                        new org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl(
                            CredentialsScope.${prototype.scope},
                            ${quoted(prototype.id)},
                            ${quoted(prototype.description)},
                            new Secret(${quoted(prototype.secret)}))
                    `
                default:
                    console.log(`ERROR: Unknown credential class: ${it.value.class}`)
            }
        }
    }

    static getDomain(store, id) {
        return `
            import jenkins.model.Jenkins
            import com.cloudbees.plugins.credentials.domains.Domain
            import com.cloudbees.jenkins.plugins.sshcredentials.impl.BasicSSHUserPrivateKey
            import com.cloudbees.plugins.credentials.CredentialsScope
            import groovy.json.*

            store = Jenkins.instance.getExtensionList(
                "com.cloudbees.plugins.credentials.SystemCredentialsProvider").collect {it.getStore()}.find { it.displayName==${quoted(store)}}
            
            print JsonOutput.toJson(store.domains.find {it.name==${quoted(id)}})
        `
    }
}

function quoted(value) {
    return value ? `'${value}'` : null
}