$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$sourceRoot = [Environment]::GetFolderPath('UserProfile')

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE."
  }
}

try {
  $toolRoot = Join-Path $env:LOCALAPPDATA 'SmartQueueTools'
  $portableToolPaths = @(
    (Join-Path $toolRoot 'git\cmd'),
    (Join-Path $toolRoot 'git\usr\bin'),
    (Join-Path $toolRoot 'git\ucrt64\bin'),
    (Join-Path $toolRoot 'gh\bin')
  ) | Where-Object { Test-Path -LiteralPath $_ -PathType Container }
  $env:PATH = ($portableToolPaths -join ';') + ";$env:PATH"

  $missingTools = @('git', 'gh', 'npm.cmd') | Where-Object { -not (Get-Command $_ -ErrorAction SilentlyContinue) }
  if ($missingTools.Count -gt 0) {
    Write-Host 'Install these required tools, then double-click this file again:' -ForegroundColor Yellow
    if ($missingTools -contains 'git') {
      Write-Host 'Git for Windows: https://git-scm.com/download/win'
      Start-Process 'https://git-scm.com/download/win'
    }
    if ($missingTools -contains 'gh') {
      Write-Host 'GitHub CLI: https://cli.github.com/'
      Start-Process 'https://cli.github.com/'
    }
    if ($missingTools -contains 'npm.cmd') {
      Write-Host 'Node.js (includes npm): https://nodejs.org/'
      Start-Process 'https://nodejs.org/'
    }
    throw 'Publishing prerequisites are missing.'
  }

  $sourceFiles = @('package.json', 'package-lock.json', 'server.js', 'vite.config.js', 'index.html')
  foreach ($fileName in $sourceFiles) {
    $sourcePath = Join-Path $sourceRoot $fileName
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
      throw "Required app file not found: $sourcePath"
    }
    Copy-Item -LiteralPath $sourcePath -Destination $projectRoot -Force
  }

  $sourceDirectory = Join-Path $sourceRoot 'src'
  $destinationDirectory = Join-Path $projectRoot 'src'
  if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
    throw "React source folder not found: $sourceDirectory"
  }
  New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
  Get-ChildItem -LiteralPath $sourceDirectory -File | Copy-Item -Destination $destinationDirectory -Force

  Set-Location $projectRoot
  Write-Host 'Installing dependencies and checking the production build...' -ForegroundColor Cyan
  Invoke-CheckedCommand 'npm.cmd' @('ci')
  Invoke-CheckedCommand 'npm.cmd' @('run', 'build')

  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $null = & gh auth status --hostname github.com 2>&1
  $authStatusCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  if ($authStatusCode -ne 0) {
    Write-Host 'Sign in to GitHub in the browser window that opens.' -ForegroundColor Cyan
    Invoke-CheckedCommand 'gh' @('auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web')
  }

  $githubUser = (& gh api user --jq '.login').Trim()
  if ($LASTEXITCODE -ne 0 -or -not $githubUser) {
    throw 'Could not read the signed-in GitHub account.'
  }
  $githubId = (& gh api user --jq '.id').Trim()
  if ($LASTEXITCODE -ne 0 -or -not $githubId) {
    throw 'Could not read the GitHub account ID.'
  }

  $repositoryName = Read-Host 'Repository name [SmartQueue]'
  if ([string]::IsNullOrWhiteSpace($repositoryName)) { $repositoryName = 'SmartQueue' }
  if ($repositoryName -notmatch '^[A-Za-z0-9._-]+$') {
    throw 'Repository names can only contain letters, numbers, periods, underscores, and hyphens.'
  }

  do {
    $visibility = Read-Host 'Repository visibility: private or public [private]'
    if ([string]::IsNullOrWhiteSpace($visibility)) { $visibility = 'private' }
    $visibility = $visibility.ToLowerInvariant()
    if ($visibility -notin @('private', 'public')) {
      Write-Host 'Enter private or public.' -ForegroundColor Yellow
    }
  } while ($visibility -notin @('private', 'public'))

  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.git') -PathType Container)) {
    Invoke-CheckedCommand 'git' @('init', '-b', 'main')
  }

  Invoke-CheckedCommand 'git' @('config', 'user.name', $githubUser)
  Invoke-CheckedCommand 'git' @('config', 'user.email', "$githubId+$githubUser@users.noreply.github.com")
  Invoke-CheckedCommand 'git' @('add', '--all')

  $branch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $branch) { $branch = 'main' }
  $null = & git rev-parse --verify HEAD 2>$null
  $hasCommit = $LASTEXITCODE -eq 0
  $changes = & git status --porcelain
  if ($changes) {
    $commitMessage = if ($hasCommit) { 'Update SmartQueue' } else { 'Initial SmartQueue app' }
    Invoke-CheckedCommand 'git' @('commit', '-m', $commitMessage)
  }

  $origin = & git remote get-url origin 2>$null
  if ($LASTEXITCODE -eq 0 -and $origin) {
    Write-Host "Existing origin: $origin" -ForegroundColor Yellow
    $confirmation = Read-Host 'Type PUSH to send this project to that remote'
    if ($confirmation -cne 'PUSH') { throw 'Push cancelled; existing remote was left unchanged.' }
    Invoke-CheckedCommand 'git' @('push', '--set-upstream', 'origin', $branch)
    $repositoryUrl = $origin -replace '\.git$', ''
  } else {
    $visibilityFlag = if ($visibility -eq 'private') { '--private' } else { '--public' }
    Invoke-CheckedCommand 'gh' @('repo', 'create', $repositoryName, $visibilityFlag, '--source', $projectRoot, '--remote', 'origin', '--push')
    $repositoryUrl = (& gh repo view "$githubUser/$repositoryName" --json url --jq '.url').Trim()
  }

  Write-Host "Published successfully: $repositoryUrl" -ForegroundColor Green
  if ($repositoryUrl) { Start-Process $repositoryUrl }
} catch {
  Write-Host "`nPublish stopped: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}