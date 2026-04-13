# Guía rápida para Infraestructura (Producción)

## 1) Archivos que debes entregar a Infra

### Opción recomendada (entrega completa del proyecto)
- Carpeta completa del proyecto `seguimiento_contrataciones` (sin `node_modules`)
- Archivo de variables de backend por canal seguro: `backend/.env.production`

### Opción mínima (si no van a compilar desde Git)
- `backend/` completo (sin `node_modules`)
- `frontend/dist/` ya compilado
- `infra/nginx/seguimiento_poa_qt.production.conf`
- `infra/systemd/seguimiento-backend.service`
- `backend/.env.production` (en canal seguro)

## 2) Variables que Infra debe completar sí o sí

En `backend/.env.production`:
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `DEFAULT_ADMIN_PASSWORD`
- `SMTP_*` (si usarán notificaciones)
- `SUPERVISOR_EMAILS`

En frontend (ya configurado):
- `frontend/.env.production` con `VITE_API_URL=/api`

## 3) Qué deben cambiar Infra en configuración

### Nginx
Archivo: `infra/nginx/seguimiento_poa_qt.production.conf`
- Cambiar `server_name TU_DOMINIO_O_IP;`
- Si backend usa otro puerto, cambiar `proxy_pass http://127.0.0.1:3000/api/;`

### systemd
Archivo: `infra/systemd/seguimiento-backend.service`
- Validar `WorkingDirectory=/opt/seguimiento_contrataciones/backend`
- Validar ruta de npm en `ExecStart=/usr/bin/npm start`

## 4) Comandos rápidos para Infra (Ubuntu)

```bash
# 1) Instalar dependencias
cd /opt/seguimiento_contrataciones/backend
npm ci
cd /opt/seguimiento_contrataciones/frontend
npm ci

# 2) Build frontend
npm run build

# 3) Configurar Nginx
sudo cp /opt/seguimiento_contrataciones/infra/nginx/seguimiento_poa_qt.production.conf /etc/nginx/sites-available/seguimiento_poa_qt
sudo ln -sf /etc/nginx/sites-available/seguimiento_poa_qt /etc/nginx/sites-enabled/seguimiento_poa_qt
sudo nginx -t
sudo systemctl reload nginx

# 4) Configurar servicio backend
sudo cp /opt/seguimiento_contrataciones/infra/systemd/seguimiento-backend.service /etc/systemd/system/seguimiento-backend.service
sudo systemctl daemon-reload
sudo systemctl enable seguimiento-backend
sudo systemctl restart seguimiento-backend
sudo systemctl status seguimiento-backend

# 5) Verificar
curl http://127.0.0.1:3000/api/health
```

## 5) Validación final
- Backend responde en `/api/health`
- Frontend abre en el dominio/IP configurado
- Login funciona
- Módulo de actividades y modal de seguimiento cargan correctamente

## 6) Página de mantenimiento (172.16.1.72)

El archivo ya está incluido en:
- `infra/nginx/maintenance.html`

El modo mantenimiento se activa con un archivo bandera:

```bash
# Activar mantenimiento
sudo touch /opt/seguimiento_contrataciones/.maintenance
sudo nginx -t
sudo systemctl reload nginx

# Desactivar mantenimiento
sudo rm -f /opt/seguimiento_contrataciones/.maintenance
sudo nginx -t
sudo systemctl reload nginx
```

Cuando está activo, el servidor `172.16.1.72` responde con la página de "Sistema en mantenimiento".

## 7) Recomendación de seguridad
- No exponer puerto 3000 a internet
- Abrir solo 80/443
- Habilitar HTTPS (Certbot/Nginx)
