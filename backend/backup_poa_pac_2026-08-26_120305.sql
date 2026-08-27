-- Backup de poa_pac
-- Fecha: 26/8/2026, 12:03:05


-- Tabla: auditoria_eventos
CREATE TABLE `auditoria_eventos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accion` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recurso` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metodo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_code` int NOT NULL,
  `exito` tinyint(1) NOT NULL DEFAULT '0',
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_query` longtext COLLATE utf8mb4_unicode_ci,
  `request_body` longtext COLLATE utf8mb4_unicode_ci,
  `response_body` longtext COLLATE utf8mb4_unicode_ci,
  `error_mensaje` text COLLATE utf8mb4_unicode_ci,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_fecha` (`fecha`),
  KEY `idx_auditoria_user` (`user_id`),
  KEY `idx_auditoria_modulo` (`modulo`),
  KEY `idx_auditoria_accion` (`accion`)
) ENGINE=InnoDB AUTO_INCREMENT=5433 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5432 registros

-- Tabla: configuracion_notificaciones
CREATE TABLE `configuracion_notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `remitente_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remitente_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_servidor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'smtp',
  `smtp_host` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_port` int NOT NULL DEFAULT '587',
  `smtp_secure` tinyint(1) NOT NULL DEFAULT '0',
  `requiere_auth` tinyint(1) NOT NULL DEFAULT '1',
  `smtp_user` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supervisor_emails` text COLLATE utf8mb4_unicode_ci,
  `hora_envio` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '08:00',
  `zona_horaria` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Guayaquil',
  `notificar_etapas_atrasadas` tinyint(1) NOT NULL DEFAULT '1',
  `dias_atraso_minimo` int NOT NULL DEFAULT '2',
  `asunto_plantilla` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plantilla_html` longtext COLLATE utf8mb4_unicode_ci,
  `pie_mensaje` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultima_ejecucion_at` datetime DEFAULT NULL,
  `ultima_ejecucion_fecha` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 registros

-- Tabla: direcciones_catalogo
CREATE TABLE `direcciones_catalogo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=1581 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19 registros

-- Tabla: etapas_catalogo
CREATE TABLE `etapas_catalogo` (
  `id` int NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clasificacion` enum('preparatoria','precontractual','contractual','sin_clasificar') COLLATE utf8mb4_unicode_ci DEFAULT 'sin_clasificar',
  `orden` int DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `etapas_catalogo_ibfk_1` FOREIGN KEY (`id`) REFERENCES `etapas_pac` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 66 registros

-- Tabla: etapas_pac
CREATE TABLE `etapas_pac` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL,
  `es_personalizada` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 66 registros

-- Tabla: notificaciones
CREATE TABLE `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinatario` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asunto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `tarea_id` int DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_leida` datetime DEFAULT NULL,
  `enviada` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_tarea` (`tarea_id`)
) ENGINE=InnoDB AUTO_INCREMENT=830 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 829 registros

-- Tabla: permisos_menu_catalogo
CREATE TABLE `permisos_menu_catalogo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `orden` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=17692 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12 registros

-- Tabla: permisos_modulos_catalogo
CREATE TABLE `permisos_modulos_catalogo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `orden` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=20633 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16 registros

-- Tabla: permisos_roles_campos_etapas
CREATE TABLE `permisos_roles_campos_etapas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campo_clave` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `puede_ver` tinyint(1) NOT NULL DEFAULT '1',
  `puede_editar` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permisos_roles_campos` (`role`,`campo_clave`)
) ENGINE=InnoDB AUTO_INCREMENT=8273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24 registros

-- Tabla: permisos_roles_menu
CREATE TABLE `permisos_roles_menu` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_clave` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `puede_ingresar` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permisos_roles_menu` (`role`,`menu_clave`),
  KEY `fk_permisos_roles_menu_catalogo` (`menu_clave`),
  CONSTRAINT `fk_permisos_roles_menu_catalogo` FOREIGN KEY (`menu_clave`) REFERENCES `permisos_menu_catalogo` (`clave`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=71337 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 72 registros

-- Tabla: permisos_roles_modulos
CREATE TABLE `permisos_roles_modulos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo_clave` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `puede_leer` tinyint(1) NOT NULL DEFAULT '0',
  `puede_crear` tinyint(1) NOT NULL DEFAULT '0',
  `puede_actualizar` tinyint(1) NOT NULL DEFAULT '0',
  `puede_borrar` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permisos_roles_modulo` (`role`,`modulo_clave`),
  KEY `fk_permisos_roles_modulos_catalogo` (`modulo_clave`),
  CONSTRAINT `fk_permisos_roles_modulos_catalogo` FOREIGN KEY (`modulo_clave`) REFERENCES `permisos_modulos_catalogo` (`clave`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=81824 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 96 registros

-- Tabla: responsables_catalogo
CREATE TABLE `responsables_catalogo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion_id` int DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_responsables_direccion` (`direccion_id`),
  CONSTRAINT `fk_responsables_direccion` FOREIGN KEY (`direccion_id`) REFERENCES `direcciones_catalogo` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 102 registros

-- Tabla: seguimiento_etapas
CREATE TABLE `seguimiento_etapas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subtarea_id` int NOT NULL,
  `etapa_id` int NOT NULL,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_planificada` date DEFAULT NULL,
  `fecha_real` date DEFAULT NULL,
  `responsable_id` int DEFAULT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subtarea_etapa_seguimiento` (`subtarea_id`,`etapa_id`),
  KEY `etapa_id` (`etapa_id`),
  KEY `fk_seguimiento_responsable` (`responsable_id`),
  CONSTRAINT `fk_seguimiento_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `responsables_catalogo` (`id`) ON DELETE SET NULL,
  CONSTRAINT `seguimiento_etapas_ibfk_1` FOREIGN KEY (`subtarea_id`) REFERENCES `subtareas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seguimiento_etapas_ibfk_2` FOREIGN KEY (`etapa_id`) REFERENCES `etapas_pac` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=184251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14093 registros

-- Tabla: seguimientos_diarios
CREATE TABLE `seguimientos_diarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subtarea_id` int NOT NULL,
  `etapa_id` int NOT NULL,
  `fecha` date NOT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tiene_alerta` tinyint(1) DEFAULT '0',
  `responsable_id` int DEFAULT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `etapa_id` (`etapa_id`),
  KEY `idx_sd_subtarea` (`subtarea_id`),
  KEY `fk_seguimientos_diarios_responsable` (`responsable_id`),
  CONSTRAINT `fk_seguimientos_diarios_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `responsables_catalogo` (`id`) ON DELETE SET NULL,
  CONSTRAINT `seguimientos_diarios_ibfk_1` FOREIGN KEY (`subtarea_id`) REFERENCES `subtareas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seguimientos_diarios_ibfk_2` FOREIGN KEY (`etapa_id`) REFERENCES `etapas_pac` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=442 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 394 registros

-- Tabla: subtareas
CREATE TABLE `subtareas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `direccion_encargada` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_olympo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partida_presupuestaria` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presupuesto_2026_inicial` decimal(14,2) NOT NULL DEFAULT '0.00',
  `costo_2026` decimal(14,2) NOT NULL DEFAULT '0.00',
  `cuatrimestre` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plazo_contrato` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pac_no_pac` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PAC',
  `procedimiento_sugerido` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable_id` int DEFAULT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `proceso_en_riesgo` tinyint(1) NOT NULL DEFAULT '0',
  `riesgo_comentario` text COLLATE utf8mb4_unicode_ci,
  `fecha_reforma_3` date DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_olympo` (`codigo_olympo`),
  KEY `fk_subtareas_responsable` (`responsable_id`),
  CONSTRAINT `fk_subtareas_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `responsables_catalogo` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=288 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 270 registros

-- Tabla: subtareas_etapas
CREATE TABLE `subtareas_etapas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subtarea_id` int NOT NULL,
  `etapa_id` int NOT NULL,
  `aplica` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_tentativa` date DEFAULT NULL,
  `fecha_reforma` date DEFAULT NULL,
  `fecha_reforma_3` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subtarea_etapa` (`subtarea_id`,`etapa_id`),
  KEY `etapa_id` (`etapa_id`),
  CONSTRAINT `subtareas_etapas_ibfk_1` FOREIGN KEY (`subtarea_id`) REFERENCES `subtareas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subtareas_etapas_ibfk_2` FOREIGN KEY (`etapa_id`) REFERENCES `etapas_pac` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=184252 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14093 registros

-- Tabla: subtareas_versiones
CREATE TABLE `subtareas_versiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `version_id` int NOT NULL,
  `subtarea_id_original` int DEFAULT NULL,
  `codigo_olympo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtarea` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion_encargada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable_id` int DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `plazo_contrato` int DEFAULT NULL,
  `pac_no_pac` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `procedimiento_sugerido` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presupuesto_2026_inicial` decimal(15,2) DEFAULT '0.00',
  `costo_2026` decimal(15,2) DEFAULT '0.00',
  `partida_presupuestaria` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cuatrimestre` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint DEFAULT '1',
  `proceso_en_riesgo` tinyint DEFAULT '0',
  `riesgo_comentario` text COLLATE utf8mb4_unicode_ci,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `estado_carga` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'activo',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_proceso_version` (`version_id`,`codigo_olympo`),
  KEY `idx_version` (`version_id`),
  KEY `idx_codigo` (`codigo_olympo`),
  KEY `idx_activo` (`activo`),
  KEY `idx_direccion` (`direccion_encargada`),
  KEY `idx_pac_nopac` (`pac_no_pac`),
  CONSTRAINT `subtareas_versiones_ibfk_1` FOREIGN KEY (`version_id`) REFERENCES `versiones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 118 registros

-- Tabla: usuarios
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orden_login` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_inicio_rol` date DEFAULT NULL,
  `fecha_fin_rol` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20 registros

-- Tabla: usuarios_direcciones
CREATE TABLE `usuarios_direcciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `direccion_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_usuario_direccion` (`usuario_id`,`direccion_id`),
  KEY `fk_usuarios_direcciones_direccion` (`direccion_id`),
  CONSTRAINT `fk_usuarios_direcciones_direccion` FOREIGN KEY (`direccion_id`) REFERENCES `direcciones_catalogo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usuarios_direcciones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1 registros

-- Tabla: versiones
CREATE TABLE `versiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `anio` int NOT NULL,
  `numero_reforma` int DEFAULT '0',
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('borrador','aprobado','historico') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `activa` tinyint(1) DEFAULT '0',
  `usuario_creacion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_aprobacion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_aprobacion` timestamp NULL DEFAULT NULL,
  `usuario_activacion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_activacion` timestamp NULL DEFAULT NULL,
  `presupuesto_total` decimal(15,2) DEFAULT '0.00',
  `total_procesos` int DEFAULT '0',
  `activos_count` int DEFAULT '0',
  `inactivos_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reforma` (`anio`,`numero_reforma`),
  KEY `idx_estado` (`estado`),
  KEY `idx_activa` (`activa`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  KEY `idx_anio` (`anio`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8 registros

-- Tabla: versiones_cambios
CREATE TABLE `versiones_cambios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `version_id` int NOT NULL,
  `tipo_cambio` enum('crear','duplicar','excel','editar','eliminar','aprobar','activar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `cantidad_registros` int DEFAULT NULL,
  `datos_cambio` json DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_version` (`version_id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_tipo` (`tipo_cambio`),
  CONSTRAINT `versiones_cambios_ibfk_1` FOREIGN KEY (`version_id`) REFERENCES `versiones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22 registros
