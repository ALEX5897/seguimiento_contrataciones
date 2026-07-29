# 🌐 ACCESO REMOTO - SEGUIMIENTO CONTRATACIONES

**Fecha:** 2026-06-24  
**Estado:** Servicios configurados para acceso remoto

---

## 📋 INFORMACIÓN DE CONEXIÓN

| Parámetro | Valor |
|-----------|-------|
| **IP del Servidor** | `172.16.40.65` |
| **Red** | Wi-Fi (Conexión de área local) |
| **Puerto Frontend** | 5173 |
| **Puerto Backend** | 3000 |
| **Base de Datos** | 172.16.1.80 (poa_pac) |

---

## 🔗 ENLACES DE ACCESO

### Desde otra computadora en la red:

```
Frontend (Aplicación):
http://172.16.40.65:5173

Backend API (Servicios):
http://172.16.40.65:3000
```

### Desde la misma computadora:

```
Frontend: 
http://localhost:5173  o  http://127.0.0.1:5173

Backend:
http://localhost:3000  o  http://127.0.0.1:3000
```

---

## 📱 INSTRUCCIONES PARA ACCESO REMOTO

### Requisitos:
- ✅ Ambas computadoras deben estar en la misma red Wi-Fi o Ethernet
- ✅ Firewall debe permitir tráfico en puertos 3000 y 5173
- ✅ El servidor debe estar ejecutándose

### Pasos:

1. **En la computadora remota:**
   - Abre un navegador web (Chrome, Firefox, Edge, etc.)
   - Ingresa en la barra de direcciones:
   ```
   http://172.16.40.65:5173
   ```

2. **Presiona Enter**
   - Debería cargar la aplicación de Seguimiento de Contrataciones

3. **Inicia sesión**
   - Usuario: (según tu credencial)
   - Contraseña: (según tu credencial)

---

## ⚙️ CONFIGURACIÓN DE SERVICIOS

### Backend (Node.js - Puerto 3000)
- **Host:** 0.0.0.0 (escucha en todas las interfaces)
- **Puerto:** 3000
- **Comando:** `npm run dev:backend`
- **Base de Datos:** MySQL en 172.16.1.80

### Frontend (Vue 3 + Vite - Puerto 5173)
- **Host:** 0.0.0.0 (escucha en todas las interfaces)
- **Puerto:** 5173
- **Comando:** `npm run dev:frontend`
- **Proxy API:** http://127.0.0.1:3000

---

## 🚀 INICIANDO SERVICIOS

### Opción 1: Script PowerShell (Automático)
```powershell
cd "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones"
.\iniciar-servicios-remoto.ps1
```

### Opción 2: Manual (en terminal separadas)

**Terminal 1 - Backend:**
```bash
cd "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones"
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
cd "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones"
npm run dev:frontend
```

---

## ✅ VERIFICAR SERVICIOS

### Puertos en uso:
```powershell
netstat -ano | findstr "3000 5173"
```

### Procesos Node:
```powershell
Get-Process node
```

### Salida esperada:
```
TCP    [::]:3000     [::]:0    LISTENING
TCP    [::]:5173     [::]:0    LISTENING
```

---

## 🔒 SOLUCIÓN DE PROBLEMAS

### Problema: No puedo acceder desde otra computadora

**Solución:**
1. ✅ Verifica que ambas máquinas estén en la misma red
2. ✅ Confirma que el servidor esté ejecutándose:
   ```powershell
   netstat -ano | findstr "3000 5173"
   ```
3. ✅ Desactiva el firewall temporalmente (o abre puertos 3000 y 5173)
4. ✅ Intenta acceder desde otra app (ej: Postman) a:
   ```
   http://172.16.40.65:3000/api/subtareas
   ```

### Problema: Los servicios no inician

**Solución:**
1. ✅ Mata procesos Node previos:
   ```powershell
   Stop-Process -Name node -Force
   ```
2. ✅ Verifica los puertos:
   ```powershell
   netstat -ano | findstr "3000 5173"
   ```
3. ✅ Reinicia los servicios:
   ```bash
   npm install
   npm run dev:backend
   ```

### Problema: Error de conexión a BD

**Solución:**
1. ✅ Verifica que puedas alcanzar 172.16.1.80:
   ```powershell
   Test-NetConnection 172.16.1.80 -Port 3306
   ```
2. ✅ Revisa el archivo `.env`:
   ```
   DB_HOST=172.16.1.80
   DB_USER=usr-cont
   DB_PASSWORD=mas_TER$*25@
   DB_NAME=poa_pac
   ```

---

## 📊 INFORMACIÓN DEL SISTEMA

- **SO:** Windows 11 Pro
- **Versión Node:** v20.20.2
- **NPM:** ^10.0.0
- **Framework:** Vue 3 + TypeScript
- **Backend:** Express.js
- **BD:** MySQL

---

## 📞 SOPORTE

Para más información sobre los servicios, revisa:
- Frontend: `frontend/vite.config.ts`
- Backend: `backend/server.js`
- Configuración BD: `backend/.env`

**Fecha de actualización:** 2026-06-24
