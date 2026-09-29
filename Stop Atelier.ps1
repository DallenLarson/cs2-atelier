$serverFile = Join-Path $PSScriptRoot 'server.mjs'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($serverFile) } | ForEach-Object { Stop-Process -Id $_.ProcessId }
