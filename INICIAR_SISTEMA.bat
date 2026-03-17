@echo off
setlocal
cd /d "%~dp0"

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R /C:"IPv4.*:"') do (
	set "IP_LOCAL=%%i"
	goto :ip_ok
)
:ip_ok
set "IP_LOCAL=%IP_LOCAL: =%"
if "%IP_LOCAL%"=="" set "IP_LOCAL=localhost"

echo ========================================
echo   Sistema de Seguimiento POA 2026
echo   QuitoTurismo (Modo Red LAN)
echo ========================================
echo.

echo [1/2] Iniciando Backend (0.0.0.0:3000)...
cd backend
start "Backend - Puerto 3000" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (0.0.0.0:5173)...
cd ..\frontend
start "Frontend - Puerto 5173" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo ========================================
echo   Sistema iniciado correctamente!
echo ========================================
echo.
echo Backend local:  http://localhost:3000/api/health
echo Frontend local: http://localhost:5173
echo.
echo Backend red:    http://%IP_LOCAL%:3000/api/health
echo Frontend red:   http://%IP_LOCAL%:5173
echo.
echo Presiona cualquier tecla para abrir el navegador...
pause >nul

start http://localhost:5173

echo.
echo Para detener el sistema, cierra las ventanas
echo de Backend y Frontend.
echo.
pause
