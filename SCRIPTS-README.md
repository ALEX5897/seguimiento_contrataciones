# Scripts de Control del Proyecto

Estos scripts facilitan el inicio, parada y restablecimiento del proyecto de **Seguimiento de Contrataciones**.

## 📋 Disponibles

### En Windows

#### 1. **restart-project.bat** (Recomendado)
Abre dos nuevas ventanas de terminal: una para el Backend y otra para el Frontend.

```bash
# Ejecuta el script haciendo doble clic o desde PowerShell:
.\restart-project.bat
```

**Qué hace:**
- ✓ Detiene todos los procesos node
- ✓ Limpia cache de npm
- ✓ Instala dependencias (backend y frontend)
- ✓ Abre Backend en http://localhost:3000
- ✓ Abre Frontend en http://localhost:5173

#### 2. **restart-project.ps1** (PowerShell)
Ejecuta los servicios en background dentro de PowerShell.

```powershell
# En PowerShell (como administrador):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\restart-project.ps1
```

#### 3. **stop-services.bat**
Detiene todos los servicios node.

```bash
.\stop-services.bat
```

#### 4. **stop-services.ps1** (PowerShell)
```powershell
.\stop-services.ps1
```

---

### En Linux / macOS

#### 1. **restart-project.sh**
```bash
# Dar permisos de ejecución (primera vez):
chmod +x restart-project.sh

# Ejecutar:
./restart-project.sh
```

---

## 🚀 Opciones Rápidas

### Opción 1: Ejecutar con doble clic (más fácil)
En Windows, simplemente haz doble clic en:
- `restart-project.bat` ← **Recomendado**

### Opción 2: Línea de comandos
```bash
# Desde cmd.exe o PowerShell en la carpeta del proyecto
restart-project.bat
```

### Opción 3: PowerShell Manual
```powershell
# Abre PowerShell y ejecuta:
Set-Location "C:\Users\acasa\OneDrive - QuitoTurismo\Documentos\Desarrollo\Seguimiento_contrataciones"
.\restart-project.ps1
```

---

## 📍 URLs Disponibles Después de Iniciar

| Servicio | URL | Puerto |
|----------|-----|--------|
| Frontend | http://localhost:5173 | 5173 |
| Backend | http://localhost:3000 | 3000 |
| API | http://localhost:3000/api | 3000 |

---

## 💡 Consejos

### Ver logs en tiempo real
Si usas **restart-project.ps1**, puedes ver los logs:

```powershell
# Ver logs del backend
Get-Job -Name backend | Receive-Job -Keep

# Ver logs del frontend
Get-Job -Name frontend | Receive-Job -Keep
```

### Detener servicios
```powershell
# Si usas PowerShell
.\stop-services.ps1

# Si usas cmd.exe
stop-services.bat

# O simplemente cierra las ventanas de terminal
```

### Problemas comunes

**Error: "Port 5173 is already in use"**
```powershell
# Detén todos los procesos node
taskkill /F /IM node.exe
```

**Error: "npm command not found"**
- Asegúrate de que Node.js está instalado
- Verifica con: `node --version` y `npm --version`

**Error: "Cannot find module"**
```bash
# Limpia node_modules
rm -r backend/node_modules frontend/node_modules
npm cache clean --force

# O ejecuta el script nuevamente
```

---

## 📝 Notas

- El script `.bat` abre nuevas ventanas de terminal para cada servicio
- El script `.ps1` ejecuta los servicios en background dentro de PowerShell
- Los logs se muestran en tiempo real en cada ventana
- Presiona `Ctrl+C` en cada ventana para detener el servicio
- El script `.sh` es para Linux/macOS

---

## 🔧 Personalización

Si necesitas cambiar puertos u otras configuraciones:

### Backend
Edita `backend/.env`:
```env
HOST=localhost
PORT=3000
```

### Frontend
El puerto está configurado en `frontend/vite.config.ts`:
```typescript
port: 5173,
```

---

¡El proyecto está listo para desarrollar! 🎉
