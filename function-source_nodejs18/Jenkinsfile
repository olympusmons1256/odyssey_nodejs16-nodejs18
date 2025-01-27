pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                  - name: nodejs
                    image: node:18
                    command:
                    - cat
                    tty: true
                    volumeMounts:
                    - name: firebase-sa
                      mountPath: /var/secrets/firebase
                      readOnly: true
                  volumes:
                  - name: firebase-sa
                    secret:
                      secretName: firebase-write-serviceaccount-ngp-odyssey-testing
            '''
        }
    }
    
    environment {
        FIREBASE_PROJECT = 'ngp-odyssey-testing'
        NODE_ENV = 'testing'
        FUNCTIONS_DIR = '.'  
        MAIN_REPO = 'https://github.com/olympusmons1256/odyssey_nodejs16-nodejs18.git'
        GOOGLE_APPLICATION_CREDENTIALS = '/var/secrets/firebase/service-account.json'
    }
    
    stages {
        stage('Checkout') {
            steps {
                // Clean workspace before build
                cleanWs()
                
                // Checkout main repository without credentials
                git url: env.MAIN_REPO,
                    branch: 'main'
            }
        }
        
        stage('Install Dependencies') {
            steps {
                container('nodejs') {
                    dir(env.FUNCTIONS_DIR) {
                        sh 'npm install'
                        sh 'npm install -g firebase-tools'
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                container('nodejs') {
                    dir(env.FUNCTIONS_DIR) {
                        sh 'npm run build'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                container('nodejs') {
                    dir(env.FUNCTIONS_DIR) {
                        // Deploy to Firebase using service account
                        sh "firebase deploy --only functions --project ${env.FIREBASE_PROJECT} --json"
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
