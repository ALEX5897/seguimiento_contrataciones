# README Técnico de Producción

Guía técnica para desplegar **Sistema de Seguimiento POA QT** en servidor, partiendo desde el repositorio Git.

## 1) Arquitectura y tecnologías

### Backend
- **Node.js 18+**
- **Express 5**
- **MySQL 8+** con `mysql2`
- **JWT** para autenticación (`jsonwebtoken`)
- **bcryptjs** para hash de contraseñas
- **node-cron** para tareas programadas
- **nodemailer** para notificaciones por correo
- **xlsx** para exportación de reportes

### Frontend
- **Vue 3** + **TypeScript**
- **Vite 7**
- **Pinia**
- **Vue Router**
- **Axios**

### Base de datos
- Motor: **MySQL**
- Nombre por defecto: `poa_pac`
- El backend ejecuta inicialización automática al arrancar (`initMySQL()`):
  - crea la base de datos si no existe
  - crea/ajusta tablas requeridas
  - crea usuario administrador por defecto si no existe

---

## 2) Requisitos de infraestructura

- SO servidor: Linux (Ubuntu 22.04+ recomendado)
- Node.js 18+ y npm
- MySQL 8+
- Nginx (recomendado como reverse proxy)
- Acceso al repositorio Git

Puertos sugeridos:
- `3000` backend (interno)
- `80/443` nginx público

---

## 3) Despliegue desde Git (paso a paso)

## 3.1 Clonar repositorio

```bash
git clone <URL_DEL_REPOSITORIO> seguimiento_contrataciones
cd seguimiento_contrataciones
```

## 3.2 Instalar dependencias

```bash
cd backend
npm ci
cd ../frontend
npm ci
cd ..
```

> Si `npm ci` falla por lockfile, usar `npm install`.

## 3.3 Configurar variables de entorno backend

Para producción, crear archivo `backend/.env.production` (puede basarse en `backend/.env.production.example`).

```bash
cp backend/.env.production.example backend/.env.production
```

Variables soportadas por backend:

```dotenv
# Servidor API
PORT=3000
HOST=0.0.0.0

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=usuario_mysql
DB_PASSWORD=clave_mysql
DB_NAME=poa_pac

# Seguridad
JWT_SECRET=CAMBIAR_POR_VALOR_LARGO_Y_SEGURO
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=CAMBIAR_PASSWORD_INICIAL

# Reglas funcionales
ALLOW_MANUAL_COMPLETION_DATE=true

# Notificaciones
NOTIFICATIONS_ENABLED=false
ALERT_DAYS_BEFORE=3
EMAIL_FROM=Sistema Seguimiento <noreply@dominio.gob.ec>
SUPERVISOR_EMAILS=correo1@dominio.gob.ec,correo2@dominio.gob.ec

# SMTP (si NOTIFICATIONS_ENABLED=true)
SMTP_HOST=smtp.dominio.gob.ec
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario_smtp
SMTP_PASS=clave_smtp
```

## 3.4 Configurar frontend para producción

Crear/editar `frontend/.env.production`:

```bash
cp frontend/.env.production.example frontend/.env.production
```

Variables:

```dotenv
VITE_API_URL=/api
VITE_ALLOW_MANUAL_COMPLETION_DATE=true
```

> Con `VITE_API_URL=/api`, el frontend funciona detrás de nginx en el mismo dominio.
>
> El backend está configurado para cargar automáticamente `backend/.env.production` cuando `NODE_ENV=production`.

## 3.5 Build de frontend

```bash
cd frontend
npm run build
cd ..
```

Salida: `frontend/dist`

## 3.6 Arranque backend (prueba inicial)

```bash
cd backend
npm start
```

Validar salud:

```bash
curl http://127.0.0.1:3000/api/health
```

Respuesta esperada: JSON con `status: "ok"`.

---

## 4) Publicación recomendada (Nginx + Node)

Se incluyen plantillas listas en el repositorio:
- `infra/nginx/seguimiento_poa_qt.conf`
- `infra/systemd/seguimiento-backend.service`

## 4.1 Configuración ejemplo de Nginx

Archivo sugerido: `/etc/nginx/sites-available/seguimiento_poa_qt`

```nginx
server {
    listen 80;
    server_name _;

    root /opt/seguimiento_contrataciones/frontend/dist;
    index index.html;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar sitio:

```bash
sudo cp /opt/seguimiento_contrataciones/infra/nginx/seguimiento_poa_qt.conf /etc/nginx/sites-available/seguimiento_poa_qt
sudo ln -s /etc/nginx/sites-available/seguimiento_poa_qt /etc/nginx/sites-enabled/seguimiento_poa_qt
sudo nginx -t
sudo systemctl reload nginx
```

> Para producción real, habilitar HTTPS con certificado TLS.

---

## 5) Ejecución persistente del backend

## Opción A: systemd (recomendada)

Crear `/etc/systemd/system/seguimiento-backend.service`:

```ini
[Unit]
Description=Seguimiento POA QT Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/seguimiento_contrataciones/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activar:

```bash
sudo cp /opt/seguimiento_contrataciones/infra/systemd/seguimiento-backend.service /etc/systemd/system/seguimiento-backend.service
sudo systemctl daemon-reload
sudo systemctl enable seguimiento-backend
sudo systemctl start seguimiento-backend
sudo systemctl status seguimiento-backend
```

Logs:

```bash
journalctl -u seguimiento-backend -f
```

## Opción B: PM2

```bash
npm i -g pm2
cd /opt/seguimiento_contrataciones/backend
pm2 start server.js --name seguimiento-backend
pm2 save
pm2 startup
```

---

## 6) Inicialización de datos

- Al primer arranque, backend crea estructura base automáticamente.
- Para cargas/actualizaciones masivas, existen scripts en `backend/scripts/` (ej. importaciones).
- Si se requiere reprocesar estructura desde cero, revisar scripts antes de ejecutar en producción.

---

## 7) Validación post-despliegue

1. API de salud:
   - `GET /api/health` responde `ok`
2. Login:
   - ingreso con usuario administrador configurado
3. Módulo de reportes:
   - `GET /api/reportes/resumen` responde 200
   - exportación XLSX funciona
4. Frontend:
   - abre sin errores y consume `/api` correctamente

---

## 8) Seguridad y operación

- Cambiar `JWT_SECRET` y `DEFAULT_ADMIN_PASSWORD` antes de habilitar acceso externo.
- Restringir acceso directo al puerto `3000` (solo localhost o red privada).
- Realizar backup periódico de MySQL.
- Mantener `NOTIFICATIONS_ENABLED=false` hasta validar SMTP.
- Configurar rotación de logs de sistema.

---

## 9) Comandos útiles de mantenimiento

Backend:

```bash
cd backend
npm start
npm run dev
```

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

Prueba rápida API:

```bash
curl http://127.0.0.1:3000/api/health
```

---

## 10) Estructura mínima esperada en servidor

```text
/opt/seguimiento_contrataciones/
   infra/
      nginx/
         seguimiento_poa_qt.conf
      systemd/
         seguimiento-backend.service
  backend/
    .env
    server.js
    package.json
  frontend/
    .env
    dist/
```

