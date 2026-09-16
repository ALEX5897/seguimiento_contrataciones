# Estructura Completa de la Base de Datos - Seguimiento de Contrataciones

**Documento generado:** 2026-08-20  
**Proceso de referencia:** 01.01.001.055.530702.000.009 (ID: 130)  
**Objetivo:** Depuración y normalización de BD

---

## 📊 Resumen General

- **Total de Tablas:** 18
- **Total de Campos:** 177
- **Tablas principales:** 7
- **Tablas de catálogos:** 4
- **Tablas de permisos:** 4
- **Otras tablas:** 3

---

## 🔵 TABLA 1: subtareas (22 campos)
**Descripción:** Tabla principal que almacena los procesos de contratación

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | Identificador único |
| direccion_encargada | varchar(255) | NO | | | Dirección responsable |
| nombre | text | NO | | | Nombre del proceso |
| codigo_olympo | varchar(100) | NO | UNI | | Código único (Olympo) |
| partida_presupuestaria | varchar(120) | SI | | | Código de partida |
| presupuesto_2026_inicial | decimal(14,2) | NO | | 0.00 | Presupuesto inicial |
| costo_2026 | decimal(14,2) | NO | | 0.00 | Costo actual |
| cuatrimestre | varchar(50) | SI | | | Período (I, II, III, IV) |
| plazo_contrato | varchar(120) | SI | | | Duración o plazo |
| pac_no_pac | varchar(30) | NO | | PAC | Clasificación: PAC o NO PAC |
| procedimiento_sugerido | varchar(255) | SI | | | Tipo de procedimiento |
| responsable_id | int | SI | MUL | | FK → responsables_catalogo |
| responsable | varchar(255) | SI | | | Nombre responsable (legacy) |
| activo | tinyint(1) | NO | | 1 | Estado: 1=Activo, 0=Inactivo |
| observaciones | text | SI | | | Notas adicionales |
| proceso_en_riesgo | tinyint(1) | NO | | 0 | Flag: 1=En riesgo |
| riesgo_comentario | text | SI | | | Descripción de riesgos |
| fecha_reforma_3 | date | SI | | | Fecha de última reforma |
| fecha_inicio | date | SI | | | Fecha inicio del proceso |
| fecha_fin | date | SI | | | Fecha fin estimada |
| created_at | datetime | SI | | CURRENT_TIMESTAMP | Fecha creación |
| updated_at | datetime | SI | | CURRENT_TIMESTAMP | Última actualización |

**Ejemplo (Proceso ID 130):**
```
Renovación de la suscripción de las licencias de diseño asistido 
por computadoras (CAD) diseño gráfico modelado en 3D
- Código: 01.01.001.055.530702.000.009
- Presupuesto: $7,000.00
- Costo: $7,000.00 (100% ejecutado)
- Tipo: NO PAC
- Responsable: Javier Pacha (ID: 6)
```

---

## 🔵 TABLA 2: subtareas_etapas (7 campos)
**Descripción:** Relación entre procesos (subtareas) y etapas del PAC

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | Identificador único |
| subtarea_id | int | NO | MUL | | FK → subtareas(id) |
| etapa_id | int | NO | MUL | | FK → etapas_pac(id) |
| aplica | tinyint(1) | NO | | 1 | ¿Aplica esta etapa? |
| fecha_tentativa | date | SI | | | Fecha tentativa |
| fecha_reforma | date | SI | | | Fecha reforma |
| fecha_reforma_3 | date | SI | | | Fecha reforma 3 |

**Relación:**
- Cada proceso puede tener múltiples etapas
- Total registros para ID 130: 50 etapas

---

## 🔵 TABLA 3: etapas_pac (4 campos)
**Descripción:** Catálogo de etapas (plantilla de fases)

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | | Identificador |
| nombre | varchar(255) | NO | UNI | | Nombre de la etapa |
| orden | int | NO | | | Orden de ejecución |
| es_personalizada | tinyint(1) | SI | | 0 | ¿Es personalizada? |

---

## 🔵 TABLA 4: seguimiento_etapas (9 campos)
**Descripción:** Seguimiento del estado de cada etapa por proceso

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| subtarea_id | int | NO | MUL | | FK → subtareas(id) |
| etapa_id | int | NO | MUL | | FK → etapas_pac(id) |
| estado | varchar(50) | NO | | pendiente | Estado: pendiente, en_progreso, completado |
| fecha_planificada | date | SI | | | Fecha esperada |
| fecha_real | date | SI | | | Fecha real de cumplimiento |
| responsable_id | int | SI | MUL | | FK → responsables_catalogo(id) |
| responsable | varchar(255) | SI | | | Nombre responsable (legacy) |
| observaciones | text | SI | | | Comentarios |

**Para Proceso ID 130:** 50 registros de seguimiento

---

## 🔵 TABLA 5: seguimientos_diarios (10 campos)
**Descripción:** Registro diario de progreso y alertas por etapa

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| subtarea_id | int | NO | MUL | | FK → subtareas(id) |
| etapa_id | int | NO | MUL | | FK → etapas_pac(id) |
| fecha | date | NO | | | Fecha del seguimiento |
| comentario | text | NO | | | Comentario del día |
| tiene_alerta | tinyint(1) | SI | | 0 | Flag de alerta |
| responsable_id | int | SI | MUL | | FK → responsables_catalogo(id) |
| responsable | varchar(255) | SI | | | Nombre responsable |
| created_at | datetime | NO | | CURRENT_TIMESTAMP | Creado |
| updated_at | datetime | NO | | CURRENT_TIMESTAMP | Actualizado |

---

## 🟢 TABLA 6: responsables_catalogo (7 campos)
**Descripción:** Catálogo de responsables/usuarios

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| nombre | varchar(255) | NO | | | Nombre completo |
| email | varchar(255) | SI | | | Correo electrónico |
| direccion_id | int | SI | MUL | | FK → direcciones_catalogo(id) |
| activo | tinyint(1) | NO | | 1 | Estado activo |
| created_at | datetime | SI | | CURRENT_TIMESTAMP | |
| updated_at | datetime | SI | | CURRENT_TIMESTAMP | |

**Ejemplo para Proceso 130:**
- ID 6: Javier Pacha
- ID actual responsable: Fabricio Medina

---

## 🟢 TABLA 7: direcciones_catalogo (5 campos)
**Descripción:** Catálogo de direcciones administrativas

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| nombre | varchar(255) | NO | UNI | | Nombre único |
| activo | tinyint(1) | NO | | 1 | Estado |
| created_at | datetime | SI | | CURRENT_TIMESTAMP | |
| updated_at | datetime | SI | | CURRENT_TIMESTAMP | |

**Direcciones configuradas:**
- Dirección de Asesoría Jurídica
- DPEI / Jefatura de TICS
- DAF / Jefatura Administrativa
- DAF / Jefatura de Talento Humano
- Dirección de Comercialización
- Sin dirección

---

## 🟡 TABLA 8: usuarios (12 campos)
**Descripción:** Usuarios del sistema

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| username | varchar(80) | NO | UNI | | Usuario único |
| nombre | varchar(255) | NO | | | Nombre completo |
| password_hash | varchar(255) | NO | | | Hash bcrypt |
| role | varchar(80) | NO | | | Rol: admin, direccion, reporteria |
| direccion_nombre | varchar(255) | SI | | | Dirección asignada |
| orden_login | int | NO | | 0 | Orden en login |
| activo | tinyint(1) | NO | | 1 | Estado |
| fecha_inicio_rol | date | SI | | | Inicio de vigencia |
| fecha_fin_rol | date | SI | | | Fin de vigencia |
| created_at | datetime | SI | | CURRENT_TIMESTAMP | |
| updated_at | datetime | SI | | CURRENT_TIMESTAMP | |

---

## 🟡 TABLA 9: usuarios_direcciones (4 campos)
**Descripción:** Relación entre usuarios y direcciones

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| usuario_id | int | NO | MUL | | FK → usuarios(id) |
| direccion_id | int | NO | MUL | | FK → direcciones_catalogo(id) |
| created_at | datetime | SI | | CURRENT_TIMESTAMP | |

---

## 🟣 TABLA 10: auditoria_eventos (19 campos)
**Descripción:** Registro de todas las acciones del sistema

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | bigint | NO | PRI | auto_increment | |
| user_id | int | SI | MUL | | Usuario que ejecutó |
| username | varchar(80) | SI | | | Usuario (backup) |
| role | varchar(80) | SI | | | Rol en el momento |
| direccion_nombre | varchar(255) | SI | | | Dirección en el momento |
| accion | varchar(20) | NO | MUL | | Acción: create, read, update, delete |
| modulo | varchar(80) | SI | MUL | | Módulo afectado |
| recurso | varchar(255) | SI | | | ID del recurso |
| metodo | varchar(10) | NO | | | HTTP method |
| ruta | varchar(255) | NO | | | Ruta API |
| status_code | int | NO | | | HTTP status |
| exito | tinyint(1) | NO | | 0 | ¿Tuvo éxito? |
| ip | varchar(64) | SI | | | IP origen |
| user_agent | varchar(512) | SI | | | Browser info |
| request_query | longtext | SI | | | Query params |
| request_body | longtext | SI | | | Body enviado |
| response_body | longtext | SI | | | Respuesta |
| error_mensaje | text | SI | | | Mensaje de error |
| fecha | datetime | NO | MUL | CURRENT_TIMESTAMP | Timestamp |

---

## 🟡 TABLA 11: configuracion_notificaciones (23 campos)
**Descripción:** Configuración global de sistema de notificaciones

### Campos principales:
- enabled, remitente_nombre, remitente_email
- smtp_host, smtp_port, smtp_secure, requiere_auth
- smtp_user, smtp_password
- supervisor_emails, hora_envio, zona_horaria
- notificar_etapas_atrasadas, dias_atraso_minimo
- asunto_plantilla, plantilla_html, pie_mensaje
- ultima_ejecucion_at, ultima_ejecucion_fecha

---

## 🟡 TABLA 12: notificaciones (10 campos)
**Descripción:** Log de notificaciones enviadas

### Campos:
| Campo | Tipo | NULL | Clave | Default | Notas |
|-------|------|------|-------|---------|-------|
| id | int | NO | PRI | auto_increment | |
| tipo | varchar(50) | NO | | | Tipo: email, sms, etc |
| destinatario | varchar(255) | NO | | | Destinatario |
| asunto | varchar(255) | NO | | | Asunto |
| mensaje | longtext | NO | | | Cuerpo |
| tarea_id | int | SI | MUL | | Relacionada a tarea |
| fecha | datetime | NO | MUL | | Fecha envío |
| leida | tinyint(1) | NO | | 0 | ¿Leída? |
| fecha_leida | datetime | SI | | | Cuándo se leyó |
| enviada | tinyint(1) | NO | | 0 | ¿Enviada? |

---

## 🔐 TABLAS DE PERMISOS (Tablas 13-16)

### TABLA 13: permisos_modulos_catalogo (8 campos)
Catálogo de módulos del sistema

### TABLA 14: permisos_menu_catalogo (8 campos)
Catálogo de opciones de menú

### TABLA 15: permisos_roles_modulos (9 campos)
Permisos por rol para cada módulo

### TABLA 16: permisos_roles_menu (6 campos)
Acceso a menús por rol

---

## 📋 OTRAS TABLAS

### TABLA 17: etapas_catalogo (7 campos)
Catálogo alternativo de etapas con clasificación

### TABLA 18: permisos_roles_campos_etapas (7 campos)
Permisos a nivel de campo en etapas

---

## 🔗 Relaciones Principales (Foreign Keys)

```
subtareas ──→ responsables_catalogo (responsable_id)
subtareas ──→ direcciones_catalogo (implícito: direccion_encargada)

subtareas_etapas ──→ subtareas (subtarea_id) [cascade]
subtareas_etapas ──→ etapas_pac (etapa_id) [cascade]

seguimiento_etapas ──→ subtareas (subtarea_id) [cascade]
seguimiento_etapas ──→ etapas_pac (etapa_id) [cascade]
seguimiento_etapas ──→ responsables_catalogo (responsable_id)

seguimientos_diarios ──→ subtareas (subtarea_id) [cascade]
seguimientos_diarios ──→ etapas_pac (etapa_id) [cascade]
seguimientos_diarios ──→ responsables_catalogo (responsable_id)

responsables_catalogo ──→ direcciones_catalogo (direccion_id)

usuarios_direcciones ──→ usuarios (usuario_id) [cascade]
usuarios_direcciones ──→ direcciones_catalogo (direccion_id) [cascade]
```

---

## 🚨 Problemas Identificados para Depuración

### 1. Campo `responsable` (legacy)
- En `subtareas`: String de responsable guardado directamente
- En `seguimiento_etapas`: También hay copia de string
- **Solución:** Migrar completamente a `responsable_id`

### 2. Inconsistencia de direcciones
- `subtareas.direccion_encargada`: String texto
- `responsables_catalogo.direccion_id`: FK a tabla
- **Solución:** Normalizar a usar siempre direccion_id o direccion_nombre

### 3. Campos sin usar o redundantes
- `etapas_catalogo` vs `etapas_pac`: ¿Cuál usar?
- Múltiples campos de fechas (fecha_reforma, fecha_reforma_3, fecha_tentativa)
- **Solución:** Consolidar en una sola tabla de etapas

### 4. Campos DEFAULT con valores legacy
- `pac_no_pac` DEFAULT 'PAC'
- `activo` DEFAULT true
- **Solución:** Ser consistente en nomenclatura (PAC vs pac_no_pac)

### 5. Encoding de datos
- Posible mojibake en campos de texto
- **Solución:** Revisar charset utf8mb4 en todas las tablas

---

## 📌 Recomendaciones de Normalización

1. **Eliminar campos redundantes:** Consolidar `responsable` (string) en favor de `responsable_id`
2. **Unificar tablas de etapas:** Decidir entre `etapas_pac` y `etapas_catalogo`
3. **Normalizar fechas:** Documentar qué significa cada campo de fecha
4. **Validación de datos:** Implementar constraints CHECK para estados válidos
5. **Auditoria completa:** El campo `responsable` en múltiples tablas no se audita correctamente
6. **Documentar el ciclo de vida:** ¿Qué transiciones de estado son válidas en seguimiento_etapas?

---

**Fin del documento de estructura**
