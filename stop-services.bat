@echo off
REM ============================================================
REM Script: Detener servicios
REM ============================================================

echo.
echo ======================================================
echo   DETENIENDO SERVICIOS
echo ======================================================
echo.

echo Deteniendo procesos node...
taskkill /F /IM node.exe >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo OK - Procesos node detenidos
) else (
    echo INFO - No hay procesos node activos
)

echo.
echo ======================================================
echo   SERVICIOS DETENIDOS
echo ======================================================
echo.

pause
