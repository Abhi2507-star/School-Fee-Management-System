# ============================================================================
# SWAMI VIVEKANAND SIKSHAN SANSTHAN — Production Windows Startup Script
# Verifies PostgreSQL service, applies non-destructive pending migrations,
# starts the Node.js backend, verifies /api/v1/health, and opens localhost:3000
# ============================================================================
$ErrorActionPreference = "Stop"

Write-Host "[1/5] Checking Windows PostgreSQL Service..." -ForegroundColor Cyan
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $pgService) {
    Write-Error "PostgreSQL Windows Service not found. Please install PostgreSQL 16 locally."
    exit 1
}
if ($pgService.Status -ne 'Running') {
    Write-Host "Starting PostgreSQL service $($pgService.Name)..." -ForegroundColor Yellow
    Start-Service -Name $pgService.Name
    Start-Sleep -Seconds 3
}

Write-Host "[2/5] Applying non-destructive database migrations (prisma migrate deploy)..." -ForegroundColor Cyan
npx prisma migrate deploy --schema=./prisma/schema.prisma

Write-Host "[3/5] Starting Swami Vivekanand SFMS Server on http://localhost:3000..." -ForegroundColor Cyan
$env:NODE_ENV = "production"
Start-Process -FilePath "node" -ArgumentList "apps/api/dist/server.js" -WorkingDirectory (Get-Location) -WindowStyle Hidden

Start-Sleep -Seconds 3
Write-Host "[4/5] Verifying application health endpoint..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method Get
if ($health.status -ne "HEALTHY") {
    Write-Error "Health check failed: $($health | ConvertTo-Json)"
    exit 1
}

Write-Host "[5/5] Swami Vivekanand Sikshan Sansthan SFMS is READY at http://localhost:3000" -ForegroundColor Green
