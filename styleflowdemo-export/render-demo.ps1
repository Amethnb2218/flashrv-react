param(
  [string]$OutputDir = "$(Join-Path $PSScriptRoot 'render-output')",
  [int]$Port = 9222
)

$edgeCandidates = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edgePath) {
  throw "Microsoft Edge est introuvable sur cette machine."
}

$profileDir = Join-Path $PSScriptRoot "edge-profile-$Port"
$pagePath = Join-Path $PSScriptRoot "index.html"
$pageUrl = "file:///$($pagePath -replace '\\','/')"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$existing = Join-Path $OutputDir "jolofera-demo-promo.webm"
if (Test-Path $existing) {
  Remove-Item $existing -Force
}

$arguments = @(
  "--headless",
  "--disable-gpu",
  "--no-first-run",
  "--allow-file-access-from-files",
  "--autoplay-policy=no-user-gesture-required",
  "--remote-debugging-port=$Port",
  "--user-data-dir=$profileDir",
  "about:blank"
)

$process = Start-Process -FilePath $edgePath -ArgumentList $arguments -PassThru

try {
  node (Join-Path $PSScriptRoot "render-demo.mjs") `
    --port $Port `
    --page $pageUrl `
    --downloadDir $OutputDir `
    --fileName "jolofera-demo-promo.webm" `
    --timeoutMs 60000
}
finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
  }
}
