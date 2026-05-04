# ============================================================
# Script: Detener servicios
# ============================================================

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  DETENIENDO SERVICIOS                                 ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Write-Host "`nDeteniendo procesos node..." -ForegroundColor Cyan

# Detener procesos node
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✓ $(($nodeProcesses | Measure-Object).Count) proceso(s) node detenido(s)" -ForegroundColor Green
} else {
    Write-Host "ℹ No hay procesos node activos" -ForegroundColor Gray
}

# Detener trabajos de PowerShell
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    Stop-Job -Name * -ErrorAction SilentlyContinue
    Remove-Job -Name * -ErrorAction SilentlyContinue
    Write-Host "✓ Trabajos de PowerShell detenidos" -ForegroundColor Green
}

Write-Host "`n✨ Todos los servicios han sido detenidos" -ForegroundColor Green
Write-Host ""
