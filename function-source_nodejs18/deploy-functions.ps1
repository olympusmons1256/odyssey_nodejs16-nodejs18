# PowerShell version of deploy-all-functions
$ErrorActionPreference = "Stop"

if (-not (Test-Path "functions.list")) {
    Write-Error "ERROR: List of functions must be in file 'functions.list'"
    exit 1
}

$failed = $false
Get-Content "functions.list" | ForEach-Object {
    $function = $_
    if (-not $failed) {
        Write-Host "Deploying function: $function"
        try {
            firebase deploy --debug -f --only "functions:$function"
            if ($LASTEXITCODE -ne 0) {
                $failed = $true
                Write-Error "Failed on: $function"
            }
        }
        catch {
            $failed = $true
            Write-Error "Failed on: $function"
        }
    }
}
