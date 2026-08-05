# 📋 Catálogo de Etapas de Procesos de Contratación

**Última actualización:** 2026-08-05  
**Total de etapas registradas:** 66  
**Clasificadas:** 33 | **Sin clasificar:** 33

---

## 📊 Resumen por Clasificación

| Clasificación | Cantidad | Porcentaje |
|---|---|---|
| 🔵 Preparatoria | 9 | 13.6% |
| 🟢 Precontractual | 23 | 34.8% |
| 🔴 Contractual | 1 | 1.5% |
| ⚪ Sin clasificar | 33 | 50.0% |

---

## 🔵 FASE PREPARATORIA (9 etapas)

**Descripción:** Etapas iniciales de preparación de la solicitud de contratación, incluyendo certificaciones programáticas, informes técnicos y verificación de requisitos.

| Orden | Etapa |
|---|---|
| 1 | SOLICTUD DE CERTIFICACION PROGRAMATICA |
| 2 | CERTIFICACION POA PAI |
| 3 | SOLICITUD DE CATE |
| 4 | CATE |
| 5 | INFORME TECNICO |
| 6 | INFORME DE NECESIDAD |
| 7 | SOLICITUD DE AUTORIZACION DE INFORME DE NECESIDAD |
| 8 | AUTORIZACION DEL INFORME |
| 9 | TERMINOS DE REFERENCIA - ESPECIFICACIONES TECNICAS |

---

## 🟢 FASE PRECONTRACTUAL (23 etapas)

**Descripción:** Etapas del proceso de licitación, incluyendo publicación de necesidades, obtención de proformas, certificaciones presupuestarias, elaboración de pliegos y adjudicación.

| Orden | Etapa |
|---|---|
| 1 | SOLICITUD DE PUBLICACION |
| 2 | PUBLICACION PROFORMAS |
| 3 | ENTREGA DE PROFORMAS |
| 4 | RECEPCION PROFORMAS |
| 5 | ESTUDIO DE MERCADO |
| 6 | SOLICITUD DE CERTIFICACION PRESUPUESTARIA |
| 7 | CERTIFICACION PRESUESTARIA |
| 8 | SOLICITUD DE CERTICACION PAC |
| 9 | CERTIFICACION PAC |
| 10 | SOLICTUD DE AUTORIZACION DE INICIO |
| 11 | AUTORIZACION INICIO |
| 12 | ELABORACION DE PLIEGOS |
| 13 | SOLICITUD DE RESOLUCION DE INICO |
| 14 | RESOLUCION DE INICIO |
| 15 | FECHA DE PUBLICACION EN EL PORTAL - SUSCRIPCION DE INFIMA CUANTIA |
| 16 | PREGUNTAS |
| 17 | RESPUESTA |
| 18 | ENTREA DE OFERTA |
| 19 | REVISION PARA CONVALIDACION |
| 20 | SOLICITUD DE CONVALIDACION |
| 21 | ENTREGA DE CONVALIDACION |
| 22 | CALIFICACION |
| 23 | ADJUDICACION |

---

## 🔴 FASE CONTRACTUAL (1 etapa)

**Descripción:** Etapa final donde se formaliza el contrato con el proveedor adjudicado.

| Orden | Etapa |
|---|---|
| 1 | CONTRATO |

---

## ⚪ SIN CLASIFICAR (33 etapas)

**Nota:** Estas etapas requieren clasificación adicional. Pueden pertenecer a fases especiales, procesos alternativos (VPN, Suscripción de Ínfima Cuantía) o etapas posteriores al contrato.

### Etapas de Directorio y VPN
- MESA TECNICA
- CORRECCION
- ELABORACION DE PLIEGOS PARA DIRECTORIO
- CONVOCATORIA DEL DIRECTORIO
- DIRECTORIO
- RESOLUCION DEL DIRECTORIO
- SOLICITUD DE PUBLICACION VPN
- RESULTADOS DE VPN
- RESOLUCION VPN
- SUSCRIPCION DE INFIMA CUANTIA

### Etapas de Autorizaciones Especiales
- SOLICITUD DE AUTORIZACION SERCOP
- AUTORIZACION SERCOP
- SOLICTUD DE AUTORIZACION QUITO HONESTO
- INFORME QUITO HONESTO
- SOLICITUD DE AUTORIZACION MINTEL
- AUTORIZACION MINTEL
- ELABORACION DE BASES INTERNACIONALES PLIEGO

### Etapas Post-Adjudicación (Potencial Fase Contractual Extendida)
- INFORME DE RECOMENDACION - PUJA
- CARTA DE INTENCIÓN
- VALORIZACIÓN
- APROBACIÓN
- INFORME FINANCIERO
- INFORME JURÍDICO
- BORRADOR DE ACUERDO COMERCIAL
- FIRMA DEL ACUERDO COMERCIAL
- SOLICITUD DE REFORMA PAC

### Etapas de Catálogos y Registros
- SOLICITUD DE CATALOGO
- VERIFICACION DE CATALOGO
- REGISTRO DE Información ERP
- CARGA EN EL ERP DE RESOLUCION DE INICIO
- Anexo
- Fecha de Publicación
- Informe de recomendacion

---

## 📝 Notas Técnicas

### Base de Datos
- **Tabla principal:** `etapas_pac`
- **Tabla de catálogo:** `etapas_catalogo`
- **Campos de clasificación:** `id`, `nombre`, `clasificacion`, `orden`, `descripcion`

### Enumeración de Clasificaciones
```
ENUM('preparatoria', 'precontractual', 'contractual', 'sin_clasificar')
```

### Consideraciones para Futuras Clasificaciones
1. **Procesos Especiales:** VPN, Suscripción de Ínfima Cuantía podrían requerir una clasificación especial
2. **Etapas Post-Contractuales:** Las etapas de "CARTA DE INTENCIÓN", "VALORIZACIÓN", etc., pueden necesitar una fase adicional (ej: "post-contractual" o "ejecución")
3. **Etapas de Apoyo:** Algunas etapas como "MESA TECNICA", "CORRECCION" pueden ser transversales

---

## 📚 Historial de Cambios

| Fecha | Versión | Cambios |
|---|---|---|
| 2026-08-05 | 1.0 | Creación del catálogo inicial con 66 etapas clasificadas |

