#!/bin/bash

# ============================================================
# Script: Restablecer y levantar el proyecto
# ============================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  RESTABLECER Y LEVANTAR PROYECTO                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ ERROR: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# 1. Detener procesos node
echo "[1/5] Deteniendo procesos node..."
pkill -f "node" 2>/dev/null || true
sleep 2
echo "✓ Procesos node detenidos"
echo ""

# 2. Limpiar cache de npm
echo "[2/5] Limpiando cache de npm..."
npm cache clean --force 2>/dev/null || true
echo "✓ Cache limpiado"
echo ""

# 3. Instalar dependencias del backend
echo "[3/5] Instalando dependencias del backend..."
cd backend
npm install --legacy-peer-deps >/dev/null 2>&1
cd ..
echo "✓ Backend listo"
echo ""

# 4. Instalar dependencias del frontend
echo "[4/5] Instalando dependencias del frontend..."
cd frontend
npm install --legacy-peer-deps >/dev/null 2>&1
cd ..
echo "✓ Frontend listo"
echo ""

# 5. Iniciar servicios
echo "[5/5] Iniciando servicios..."
echo ""

# Iniciar backend en background
echo "📦 Iniciando Backend (puerto 3000)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..
sleep 2

# Iniciar frontend en background
echo "🎨 Iniciando Frontend (puerto 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
sleep 2

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  PROYECTO INICIADO CORRECTAMENTE                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📍 URLs disponibles:"
echo "   Frontend  → http://localhost:5173"
echo "   Backend   → http://localhost:3000"
echo "   API       → http://localhost:3000/api"
echo ""
echo "📋 Procesos activos:"
echo "   Backend  (PID: $BACKEND_PID)"
echo "   Frontend (PID: $FRONTEND_PID)"
echo ""
echo "💡 Comandos útiles:"
echo "   Ver logs backend:  kill -0 $BACKEND_PID && echo 'Backend corriendo'"
echo "   Ver logs frontend: kill -0 $FRONTEND_PID && echo 'Frontend corriendo'"
echo "   Detener todo:      kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "✨ Presiona Ctrl+C para salir (los servicios seguirán corriendo)"
echo ""

# Esperar a que los procesos terminen
wait
