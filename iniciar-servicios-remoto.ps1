# Script para iniciar servicios con acceso remoto

Write-Host "INICIANDO SERVICIOS CON ACCESO REMOTO..." -ForegroundColor Green
Write-Host ""

# Obtener IP local (excluir loopback)
$ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notlike "*Loopback*" -and
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
    $ip = "127.0.0.1"
}

Write-Host "IP de la maquina: $ip" -ForegroundColor Cyan
Write-Host ""

# Cambiar a directorio del proyecto
$projectPath = "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones"
Set-Location $projectPath

# Iniciar Backend en background
Write-Host "Iniciando Backend (Puerto 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev:backend" -WindowStyle Minimized -PassThru | Out-Null
Start-Sleep -Seconds 3

# Iniciar Frontend en background
Write-Host "Iniciando Frontend (Puerto 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev:frontend" -WindowStyle Minimized -PassThru | Out-Null
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "SERVICIOS INICIADOS CORRECTAMENTE" -ForegroundColor Green
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "        ACCESO DESDE OTRA COMPUTADORA                    " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL para acceder desde otra computadora en la red:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   http://$ip`:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "                   INFORMACION TECNICA                   " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:        http://$ip`:3000" -ForegroundColor Gray
Write-Host "Frontend:           http://$ip`:5173" -ForegroundColor Gray
Write-Host "Base de Datos:       172.16.1.80 (poa_pac)" -ForegroundColor Gray
Write-Host ""
Write-Host "Instrucciones:" -ForegroundColor Cyan
Write-Host "   1. Abre el navegador en otra computadora" -ForegroundColor Gray
Write-Host "   2. Ingresa la URL: http://$ip`:5173" -ForegroundColor Gray
Write-Host "   3. Asegurate de que ambas computadoras esten en la misma red" -ForegroundColor Gray
Write-Host ""
