# PowerShell wrapper for verifying and restoring an encrypted PostgreSQL backup
param(
    [Parameter(Mandatory=$true)][string]$BackupFile,
    [switch]$VerifyOnly = $false
)
$ErrorActionPreference = "Stop"
if ($VerifyOnly) {
    node "$PSScriptRoot\restore-db.js" --verify-only --file "$BackupFile"
} else {
    node "$PSScriptRoot\restore-db.js" --execute-restore --file "$BackupFile"
}
