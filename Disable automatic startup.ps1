$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'CS2 Atelier.lnk'
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath }
Write-Host 'Atelier will no longer launch at sign-in. Your data is unchanged.'
