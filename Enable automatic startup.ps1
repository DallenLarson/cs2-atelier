$ErrorActionPreference = 'Stop'
$shellLink = New-Object -ComObject WScript.Shell
$shortcut = $shellLink.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'CS2 Atelier.lnk'))
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -File "' + (Join-Path $PSScriptRoot 'Start Atelier.ps1') + '" -Background'
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Host 'Atelier will start quietly when you sign in. Keep this folder in its current location.'
