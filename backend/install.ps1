$ErrorActionPreference = "Continue"

$packages = @("Flask", "Flask-CORS", "PyPDF2", "google-auth", "scikit-learn", "sentence-transformers", "spacy")

foreach ($pkg in $packages) {
    $success = $false
    $attempts = 0
    while (-not $success -and $attempts -lt 10) {
        $attempts++
        Write-Host "Installing $pkg (Attempt $attempts)..."
        & .\venv\Scripts\pip install $pkg --no-cache-dir
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Host "Successfully installed $pkg"
        } else {
            Write-Host "Installation of $pkg failed. Retrying..."
            Start-Sleep -Seconds 2
        }
    }
}

$spacySuccess = $false
$spacyAttempts = 0
while (-not $spacySuccess -and $spacyAttempts -lt 10) {
    $spacyAttempts++
    Write-Host "Downloading spaCy model (Attempt $spacyAttempts)..."
    & .\venv\Scripts\python -m spacy download en_core_web_sm
    if ($LASTEXITCODE -eq 0) {
        $spacySuccess = $true
        Write-Host "Successfully downloaded spaCy model"
    } else {
        Write-Host "Downloading spaCy model failed. Retrying..."
        Start-Sleep -Seconds 2
    }
}

Write-Host "All installation tasks completed."
