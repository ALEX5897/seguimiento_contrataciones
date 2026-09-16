# Script de deploy automático para servidor remoto
# Uso: .\deploy.ps1 -action pull_and_build
# O simplemente: .\deploy.ps1

param(
    [string]$action = "pull_and_build",
    [string]$targetHost = "srvr-seg-contratos"
)

$config = @{
    host = "172.16.1.72"
    user = "acasa"
    port = 22
    ssh_key = "~/.ssh/srvr_seg_contratos"
    project_path = "/opt/seguimiento_contrataciones"
}

$commands = @{
    "pull_and_build" = @(
        "cd $($config.project_path)",
        "git fetch origin",
        "git reset --hard origin/main",
        "git clean -fd",
        "cd frontend",
        "npm install",
        "npm run build"
    )
    "restart_backend" = @(
        "cd $($config.project_path)/backend",
        "mkdir -p $($config.project_path)/logs",
        "npm start > $($config.project_path)/logs/backend.log 2>&1 &"
    )
    "restart_frontend" = @(
        "cd $($config.project_path)/frontend",
        "mkdir -p $($config.project_path)/logs",
        "npm run dev > $($config.project_path)/logs/frontend.log 2>&1 &"
    )
    "status" = @(
        "ps aux | grep -E '(node|npm)' | grep -v grep"
    )
    "logs_backend" = @(
        "tail -f $($config.project_path)/logs/backend.log"
    )
    "logs_frontend" = @(
        "tail -f $($config.project_path)/logs/frontend.log"
    )
}

Write-Host "🚀 Ejecutando: $action" -ForegroundColor Cyan
Write-Host "Servidor: $targetHost ($($config.host))" -ForegroundColor Gray

if (-not $commands.ContainsKey($action)) {
    Write-Host "❌ Acción desconocida: $action" -ForegroundColor Red
    Write-Host "Acciones disponibles: $($commands.Keys -join ', ')" -ForegroundColor Yellow
    exit 1
}

$cmd = $commands[$action] -join "; "

ssh $targetHost $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Completado exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error al ejecutar comando" -ForegroundColor Red
    exit $LASTEXITCODE
}
