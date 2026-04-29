# Seguimiento Contrataciones Backend

## Descripción
Este proyecto es una aplicación backend para el seguimiento de contrataciones. Proporciona una API para gestionar actividades y subtareas relacionadas con el proceso de contratación.

## Estructura del Proyecto
```
seguimiento-contrataciones-backend
├── src
│   ├── index.js                # Punto de entrada de la aplicación
│   ├── routes                  # Rutas de la API
│   │   ├── actividades.js      # Rutas para actividades
│   │   └── subtareas.js        # Rutas para subtareas
│   ├── controllers             # Controladores de la API
│   │   └── actividadesController.js # Controlador para actividades
│   ├── models                  # Modelos de datos
│   │   └── actividadesModel.js # Modelo para actividades
│   └── config                  # Configuración de la aplicación
│       └── db.js              # Configuración de la conexión a la base de datos
├── package.json                # Configuración de npm
├── .env                        # Variables de entorno
└── README.md                   # Documentación del proyecto
```

## Instalación
1. Clona el repositorio:
   ```
   git clone <URL_DEL_REPOSITORIO>
   ```
2. Navega al directorio del proyecto:
   ```
   cd seguimiento-contrataciones-backend
   ```
3. Instala las dependencias:
   ```
   npm install
   ```

## Uso
1. Configura las variables de entorno en el archivo `.env`.
2. Inicia el servidor:
   ```
   npm start
   ```
3. Accede a la API en `http://localhost:3000`.

## Contribuciones
Las contribuciones son bienvenidas. Por favor, abre un issue o envía un pull request para discutir cambios.

## Licencia
Este proyecto está bajo la Licencia MIT.