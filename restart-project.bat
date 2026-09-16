@echo off
REM ============================================================
REM Script: Restablecer y levantar el proyecto
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ======================================================
echo   RESTABLECER Y LEVANTAR PROYECTO
echo ======================================================
echo.

REM Detectar si estamos en la carpeta correcta
if not exist backend (
    echo ERROR: Este script debe ejecutarse desde la raiz del proyecto
    echo Ejecuta el script desde: c:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones
    pause
    exit /b 1
)

REM 1. Detener procesos node
echo [1/5] Deteniendo procesos node...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo OK - Procesos node detenidos
echo.

REM 2. Limpiar cache de npm
echo [2/5] Limpiando cache de npm...
call npm cache clean --force >nul 2>&1
echo OK - Cache limpiado
echo.

REM 3. Instalar dependencias backend
echo [3/5] Instalando dependencias del backend...
cd backend
call npm install --legacy-peer-deps >nul 2>&1
cd ..
echo OK - Backend listo
echo.

REM 4. Instalar dependencias frontend
echo [4/5] Instalando dependencias del frontend...
cd frontend
call npm install --legacy-peer-deps >nul 2>&1
cd ..
echo OK - Frontend listo
echo.

REM 5. Iniciar servicios
echo [5/5] Iniciando servicios...
echo.

REM Abrir ventana para backend
echo Iniciando Backend en puerto 3000...
start "Backend - npm run dev" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

REM Abrir ventana para frontend
echo Iniciando Frontend en puerto 5173...
start "Frontend - npm run dev" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ======================================================
echo   PROYECTO INICIADO CORRECTAMENTE
echo ======================================================
echo.
echo URLs disponibles:
echo   Frontend  : http://localhost:5173
echo   Backend   : http://localhost:3000
echo   API       : http://localhost:3000/api
echo.
echo Las ventanas de Backend y Frontend se abriran en nuevas pestanas
echo Cierra este script cuando terminies
echo.
pause
