param([Parameter(Mandatory = $true)][string]$FontPath)
$ErrorActionPreference = 'Stop'
$taskFontSource = (Resolve-Path -LiteralPath $FontPath).Path
if ([IO.Path]::GetExtension($taskFontSource) -ine '.ttf') { throw 'Please provide the Mojangles.ttf from your local Bedrock installation.' }
$taskRepoRoot = Split-Path -Parent $PSScriptRoot
$taskFontTarget = Join-Path $taskRepoRoot '.cache/local-fonts'
New-Item -ItemType Directory -Path $taskFontTarget -Force | Out-Null
Copy-Item -LiteralPath $taskFontSource -Destination (Join-Path $taskFontTarget 'Mojangles.ttf') -Force
$taskPixelMeta = Join-Path $taskFontTarget 'pixel-font.json'
$taskPixelFile = Join-Path $taskFontTarget 'Mojangles-Pixel.woff2'
if (Test-Path -LiteralPath $taskPixelFile) {
  $taskFontHash = (Get-FileHash -LiteralPath $taskFontSource -Algorithm SHA256).Hash.ToLowerInvariant()
  $taskPreviousHash = if (Test-Path -LiteralPath $taskPixelMeta) { (Get-Content -LiteralPath $taskPixelMeta -Raw | ConvertFrom-Json).sourceSha256 } else { '' }
  if ($taskPreviousHash -ne $taskFontHash) { Remove-Item -LiteralPath $taskPixelFile }
}
Write-Output 'Mojangles copied for local demo use; game files remain unchanged.'
Write-Output 'For exact Windows pixel rendering, run python scripts/prepare-pixel-font.py and python scripts/prepare-font-oracle.py, then restart Vite.'
Write-Output 'The npm library excludes these local game font files.'
