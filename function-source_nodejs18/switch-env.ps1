# Environment switcher and deployment helper
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'test', 'prod')]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [switch]$Deploy,

    [Parameter(Mandatory=$false)]
    [switch]$TestPermissions
)

$ErrorActionPreference = "Stop"
$envConfigDir = Join-Path $PSScriptRoot "env-config"
$credentialsDir = Join-Path $PSScriptRoot "credentials"
$currentEnvFile = Join-Path $credentialsDir "current-env.txt"

# Create credentials directory if it doesn't exist
if (-not (Test-Path $credentialsDir)) {
    New-Item -ItemType Directory -Path $credentialsDir | Out-Null
}

# Read environment configuration
$envConfig = Get-Content -Path (Join-Path $envConfigDir "$Environment.json") | ConvertFrom-Json

# Set up kubeconfig
$env:KUBECONFIG = "$HOME\.kube\cw-kubeconfig"

# Extract service account key from Kubernetes secret
Write-Host "Extracting service account key for $($envConfig.name) environment..."
$keyJson = kubectl get secret $envConfig.k8s_secret -n $envConfig.k8s_namespace -o jsonpath="{.data.key\.json}" | 
    %{ [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }

# Save service account key
$keyPath = Join-Path $credentialsDir "$Environment-key.json"
$keyJson | Out-File -FilePath $keyPath -Encoding utf8

# Save current environment
$Environment | Out-File -FilePath $currentEnvFile -Encoding utf8

# Set environment variables
$env:GOOGLE_APPLICATION_CREDENTIALS = $keyPath
$env:FIREBASE_PROJECT = $envConfig.firebase_project

Write-Host "Switched to $Environment environment:"
Write-Host "  Firebase Project: $($envConfig.firebase_project)"
Write-Host "  Service Account: $keyPath"

if ($TestPermissions) {
    Write-Host "`nTesting Firebase permissions..."
    # Install firebase-tools if not present
    if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
        npm install -g firebase-tools
    }
    
    # Test Firebase access
    firebase projects:list
    
    Write-Host "`nTesting specific project access..."
    firebase functions:list --project $envConfig.firebase_project
}

if ($Deploy) {
    Write-Host "`nDeploying functions using existing deploy-all-functions.sh script..."
    # Ensure we're in the right directory
    Push-Location $PSScriptRoot
    try {
        # Use Git Bash to run the shell script
        & 'C:\Program Files\Git\bin\bash.exe' -c "./src/scripts/deploy-all-functions.sh"
    }
    finally {
        Pop-Location
    }
}
