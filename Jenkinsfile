pipeline {
    agent any
    
    environment {
        FIREBASE_PROJECT = 'ngp-odyssey-testing'
        NODE_ENV = 'testing'
        FUNCTIONS_DIR = '.'  
        MAIN_REPO = 'https://github.com/olympusmons1256/odyssey_nodejs16-nodejs18.git'
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
                dir(env.FUNCTIONS_DIR) {
                    sh 'npm install'
                }
            }
        }
        
        stage('Build') {
            steps {
                dir(env.FUNCTIONS_DIR) {
                    sh 'npm run build'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                dir(env.FUNCTIONS_DIR) {
                    // Deploy to Firebase
                    sh "firebase deploy --only functions --project ${env.FIREBASE_PROJECT}"
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
