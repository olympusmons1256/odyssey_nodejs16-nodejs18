# Firebase Functions Deployment Guide

## Environment Setup and Deployment Process

### Prerequisites
- Kubernetes access configured (`~/.kube/cw-kubeconfig`)
- Firebase CLI installed
- Git Bash installed (typically at `C:\Program Files\Git\bin\bash.exe`)

### Environment Configuration
The project uses environment-specific configurations stored in `env-config/` directory:
- `dev.json`: Development environment
- `test.json`: Testing environment
- `prod.json`: Production environment

Each config file contains:
```json
{
    "name": "environment_name",
    "firebase_project": "project_id",
    "k8s_namespace": "kubernetes_namespace",
    "k8s_secret": "kubernetes_secret_name"
}
```

### Deployment Steps

1. **Switch Environment**
   ```powershell
   # Switch to desired environment and test permissions
   ./switch-env.ps1 -Environment dev -TestPermissions
   ```
   This script will:
   - Extract service account key from Kubernetes secret
   - Set up GOOGLE_APPLICATION_CREDENTIALS
   - Configure Firebase project
   - Test Firebase permissions

2. **Deploy Functions**
   ```powershell
   # Option 1: Deploy as part of switch-env
   ./switch-env.ps1 -Environment dev -Deploy

   # Option 2: Deploy separately using the shell script
   ./deploy-all-functions.sh
   ```
   The deployment script will:
   - Read functions from `functions.list`
   - Deploy each function individually
   - Stop on first failure

### Function Runtime Configuration
- Node.js version: 18
- Runtime configuration in `firebase.json`:
  ```json
  {
    "functions": {
      "source": ".",
      "runtime": "nodejs18"
    }
  }
  ```

### Important Files
- `functions.list`: List of functions to deploy
- `env-config/*.json`: Environment-specific configurations
- `switch-env.ps1`: Environment setup script
- `deploy-all-functions.sh`: Deployment script
- `firebase.json`: Firebase configuration

### Notes
- Always ensure you're using the correct environment before deployment
- The service account key is automatically managed and should not be committed to version control
- Deployment logs are available in Firebase Console
- Functions are deployed sequentially to prevent race conditions
