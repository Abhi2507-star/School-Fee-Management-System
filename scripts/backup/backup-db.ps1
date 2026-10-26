# PowerShell wrapper for daily encrypted PostgreSQL backup
$ErrorActionPreference = "Stop"
node "$PSScriptRoot\backup-db.js"
