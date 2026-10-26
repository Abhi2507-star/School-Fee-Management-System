# Schedules daily encrypted PostgreSQL backups at 05:30 PM IST (School Office Closing)
$ErrorActionPreference = "Stop"
$AppDir = (Get-Item -Path ".").FullName
$TaskName = "SVSS_Daily_Encrypted_DB_Backup"

$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$AppDir\scripts\backup\backup-db.js`"" -WorkingDirectory $AppDir
$Trigger = New-ScheduledTaskTrigger -Daily -At 5:30PM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily AES-256-GCM Encrypted Backup of SVSS Fee Database to Local & USB Drives" -Force
Write-Host "Scheduled daily 5:30 PM backup task: $TaskName" -ForegroundColor Green
