# 🚀 INICIAR SERVICIOS PARA ACCESO REMOTO

## IP DEL SERVIDOR: **172.16.40.65**

---

## OPCIÓN 1: Iniciar en Terminales Separadas (Recomendado)

### Terminal 1 - Backend API (Puerto 3000)

Abre una terminal en PowerShell o CMD y ejecuta:

```bash
cd "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones\backend"
npm run dev
```

**Resultado esperado:**
```
🚀 Servidor ejecutándose en http://0.0.0.0:3000
🗄️  MySQL conectado en 172.16.1.80 (BD: poa_pac)
```

---

### Terminal 2 - Frontend (Puerto 5173)

Abre otra terminal y ejecuta:

```bash
cd "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones\frontend"
npm run dev
```

**Resultado esperado:**
```
Local:   http://localhost:5173/
Network: http://172.16.40.65:5173/
```

---

## OPCIÓN 2: Script Automático

Si prefieres, ejecuta este comando en PowerShell:

```powershell
cd "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones"
. .\iniciar-servicios-remoto.ps1
```

---

## ✅ ACCESO REMOTO

Una vez que ambos servicios estén corriendo:

### Desde otra computadora en la red:

```
http://172.16.40.65:5173
```

### Copiar y pegar en el navegador:
```
http://172.16.40.65:5173
```

---

## 🔍 VERIFICAR SERVICIOS

### Ver procesos Node:
```powershell
Get-Process node | Select-Object ProcessName, Id, WorkingSet
```

### Ver puertos en uso:
```powershell
netstat -ano | findstr "3000 5173"
```

### Detenidos todos los servicios:
```powershell
Stop-Process -Name node -Force
```

---

## 📋 CHECKLIST

- [ ] Backend iniciado en puerto 3000
- [ ] Frontend iniciado en puerto 5173
- [ ] BD conectada a 172.16.1.80
- [ ] Puedes acceder a http://172.16.40.65:5173 desde otra PC
- [ ] Login funciona correctamente

---

## 💡 NOTAS

- El frontend es un proxy para las API del backend
- Ambas máquinas deben estar en la misma red
- Los puertos 3000 y 5173 deben estar abiertos en firewall
- La BD está en 172.16.1.80 (acceso desde backend)

**Fecha:** 2026-06-24
