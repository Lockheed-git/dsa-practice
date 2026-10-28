$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    node scripts/verify.js
    if ($LASTEXITCODE -ne 0) { throw 'Question bank verification failed.' }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Source push failed.' }
    $pagesCommit = git subtree split --prefix dist main
    if ($LASTEXITCODE -ne 0) { throw 'Pages subtree preparation failed.' }
    git push origin "${pagesCommit}:refs/heads/gh-pages"
    if ($LASTEXITCODE -ne 0) { throw 'Pages branch push failed.' }
    Write-Output 'GitHub Pages branch updated. Check the deployment in GitHub Actions.'
} finally {
    Pop-Location
}
