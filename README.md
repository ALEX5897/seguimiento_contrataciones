

## 📋 Requisitos Previos

- Node.js v18+ y npm
- MySQL Server en localhost
- (Opcional) Servidor SMTP para notificaciones por correo

## ⚙️ Instalación y Configuración

### Backend

```bash
cd backend

# Las dependencias ya están instaladas
# Si necesitas reinstalar: npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus configuraciones SMTP (opcional)

# Iniciar servidor
npm start

# O en modo desarrollo con auto-reload
npm run dev
```

El backend estará disponible en: `http://localhost:3000`

### Frontend

```bash
cd frontend

# Las dependencias ya están instaladas
# Si necesitas reinstalar: npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

## 🔧 Configuración

### Variables de Entorno (Backend)

Edita `backend/.env`:

```bash
# Puerto del servidor
PORT=3000

# MySQL (migrado)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=poa_pac

# Autenticación
JWT_SECRET=cambia-este-valor-en-produccion
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=12345

# Configuración SMTP (descomenta y configura para habilitar correos)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=tu-email@gmail.com
# SMTP_PASS=tu-password-de-aplicacion

# Email del remitente
EMAIL_FROM=Sistema Seguimiento <sistema@quitoturismo.gob.ec>

# Emails de supervisores (separados por coma)
SUPERVISOR_EMAILS=supervisor@quitoturismo.gob.ec

# Días de anticipación para alertas de vencimiento
ALERT_DAYS_BEFORE=3

# Activar notificaciones (true/false)
NOTIFICATIONS_ENABLED=false
```
