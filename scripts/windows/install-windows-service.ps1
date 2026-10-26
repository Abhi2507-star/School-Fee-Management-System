# Registers Swami Vivekanand SFMS to start automatically on Windows boot under a restricted local account
$ErrorActionPreference = "Stop"
$AppDir = (Get-Item -Path ".").FullName
$TaskName = "SVSS_Fee_Management_Server"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$AppDir\scripts\windows\start-prod.ps1`"" -WorkingDirectory $AppDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Swami Vivekanand Sikshan Sansthan Local Fee Management Server" -Force
Write-Host "Registered Windows startup task: $TaskName" -ForegroundColor Green
