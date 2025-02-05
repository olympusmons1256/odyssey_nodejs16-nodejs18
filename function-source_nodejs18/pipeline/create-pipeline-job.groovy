folder('odyssey') {
    description('Odyssey Project Pipelines')
}

pipelineJob('odyssey/functions-nodejs18-deploy') {
    description('Firebase Functions deployment for Node.js 18 codebase')
    definition {
        cpsScm {
            lightweight(true)
            scm {
                git {
                    remote {
                        url('https://github.com/olympusmons1256/odyssey_nodejs16-nodejs18.git')
                    }
                    branch('main')
                    extensions {
                        cleanBeforeCheckout()
                    }
                }
            }
            scriptPath('Jenkinsfile')
        }
    }
}
