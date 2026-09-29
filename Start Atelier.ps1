param([switch]$Background)
$ErrorActionPreference = 'Stop'
$appDirectory = $PSScriptRoot
$appUrl = 'http://127.0.0.1:43127'
try { $null = Invoke-RestMethod "$appUrl/api/state" -TimeoutSec 2 } catch {
    $savedNodePath = Join-Path $appDirectory 'node-path.txt'
    $nodeExecutable = if (Test-Path -LiteralPath $savedNodePath) { (Get-Content -LiteralPath $savedNodePath -Raw).Trim() } else { '' }
    if (-not $nodeExecutable -or -not (Test-Path -LiteralPath $nodeExecutable)) { $nodeExecutable = (Get-Command node -ErrorAction Stop).Source }
    $null = New-Item -ItemType Directory -Path (Join-Path $appDirectory 'data') -Force
    $serverFile = Join-Path $appDirectory 'server.mjs'
    $appProcess = Start-Process -FilePath $nodeExecutable -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $appDirectory -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath (Join-Path $appDirectory 'data/server.pid') -Value $appProcess.Id
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try { $null = Invoke-RestMethod "$appUrl/api/state" -TimeoutSec 1; break } catch {}
    }
}
if (-not $Background) { Start-Process $appUrl }
