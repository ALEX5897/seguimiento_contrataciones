# ============================================================
# Script: Restablecer y levantar el proyecto
# ============================================================

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  RESTABLECER Y LEVANTAR PROYECTO                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Detener procesos node
Write-Host "`n[1/5] Deteniendo procesos node..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✓ Procesos node detenidos" -ForegroundColor Green

# 2. Limpiar cache de npm (opcional)
Write-Host "`n[2/5] Limpiando cache de npm..." -ForegroundColor Yellow
npm cache clean --force -ErrorAction SilentlyContinue | Out-Null
Write-Host "✓ Cache limpiado" -ForegroundColor Green

# 3. Instalar dependencias del backend
Write-Host "`n[3/5] Instalando dependencias del backend..." -ForegroundColor Yellow
Push-Location "backend"
npm install --legacy-peer-deps | Out-Null
Pop-Location
Write-Host "✓ Backend listo" -ForegroundColor Green

# 4. Instalar dependencias del frontend
Write-Host "`n[4/5] Instalando dependencias del frontend..." -ForegroundColor Yellow
Push-Location "frontend"
npm install --legacy-peer-deps | Out-Null
Pop-Location
Write-Host "✓ Frontend listo" -ForegroundColor Green

# 5. Iniciar servicios
Write-Host "`n[5/5] Iniciando servicios..." -ForegroundColor Yellow

Write-Host "`n📦 Iniciando Backend (puerto 3000)..." -ForegroundColor Cyan
Start-Job -Name "backend" -ScriptBlock {
    Set-Location "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones\backend"
    npm run dev
} | Out-Null

Start-Sleep -Seconds 3

Write-Host "🎨 Iniciando Frontend (puerto 5173)..." -ForegroundColor Cyan
Start-Job -Name "frontend" -ScriptBlock {
    Set-Location "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones\frontend"
    npm run dev
} | Out-Null

Start-Sleep -Seconds 3

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  PROYECTO INICIADO CORRECTAMENTE                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📍 URLs disponibles:" -ForegroundColor Cyan
Write-Host "   Frontend  → http://localhost:5173" -ForegroundColor White
Write-Host "   Backend   → http://localhost:3000" -ForegroundColor White
Write-Host "   API       → http://localhost:3000/api" -ForegroundColor White

Write-Host "`n📋 Trabajos activos:" -ForegroundColor Cyan
Get-Job | Select-Object Name, State | ForEach-Object {
    Write-Host "   $($_.Name) - $($_.State)" -ForegroundColor White
}

Write-Host "`n💡 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   Ver logs backend:  Get-Job -Name backend | Receive-Job -Keep" -ForegroundColor White
Write-Host "   Ver logs frontend: Get-Job -Name frontend | Receive-Job -Keep" -ForegroundColor White
Write-Host "   Detener todo:      Stop-Job -Name backend, frontend" -ForegroundColor White
Write-Host "   Remover trabajos:  Remove-Job -Name backend, frontend" -ForegroundColor White

Write-Host "`n✨ Presiona Ctrl+C para salir (los servicios seguirán corriendo)" -ForegroundColor Yellow
