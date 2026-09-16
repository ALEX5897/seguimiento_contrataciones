import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as cargaMasiva from '../services/cargaMasiva.js';
import * as mysql from '../data/mysql.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configurar multer
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `carga-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// POST /api/carga-masiva/validar
router.post('/validar', requireAuth, upload.single('archivo'), async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ error: 'No se proporcionó archivo' });
  }

  try {
    const resultados = await cargaMasiva.leerYValidarExcel(filePath);

    // Limpiar archivo temporal
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error al eliminar archivo temporal:', err);
    });

    res.json({
      valido: resultados.errores.length === 0,
      resumen: resultados.resumen,
      procesos: resultados.procesos,
      errores: resultados.errores.slice(0, 50), // Limitar a 50 errores
      advertencias: resultados.advertencias.slice(0, 20),
      detallesCargados: resultados.procesos.map(p => ({
        rowNum: p.rowNum,
        codigo_olympo: p.codigo_olympo,
        subtarea: p.subtarea,
        presupuesto: p.presupuesto_2026_inicial
      }))
    });
  } catch (error) {
    // Limpiar archivo
    if (filePath) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al eliminar archivo:', err);
      });
    }
    console.error('Error en validación de carga masiva:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/carga-masiva/ejecutar
router.post('/ejecutar', requireAuth, async (req, res) => {
  const { procesos, versionId, opciones } = req.body;

  if (!procesos || !Array.isArray(procesos) || procesos.length === 0) {
    return res.status(400).json({ error: 'No hay procesos para cargar' });
  }

  if (!versionId) {
    return res.status(400).json({ error: 'versionId es requerido' });
  }

  try {
    // Verificar que la versión existe
    const [versiones] = await mysql.query('SELECT id FROM versiones WHERE id = ? LIMIT 1', [versionId]);
    if (versiones.length === 0) {
      return res.status(404).json({ error: 'Versión no encontrada' });
    }

    // Obtener conexión para transacción
    const pool = mysql.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const resultados = await cargaMasiva.cargarProcesosMasivo(
        procesos,
        versionId,
        conn,
        opciones || {}
      );

      await conn.commit();

      res.json({
        exitoso: true,
        resultados: {
          cargados: resultados.cargados,
          actualizados: resultados.actualizados,
          errores: resultados.errores,
          totalProcesados: resultados.cargados + resultados.actualizados + resultados.errores.length,
          detalles: resultados.detalles
        }
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error en ejecución de carga masiva:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/carga-masiva/versiones
router.get('/versiones', requireAuth, async (req, res) => {
  try {
    const resultado = await mysql.query(
      'SELECT id, nombre, numero FROM versiones ORDER BY id DESC LIMIT 1'
    );
    let versiones = Array.isArray(resultado[0]) ? resultado[0] : [];
    // Si es un objeto único, convertir a array
    if (!Array.isArray(versiones) && versiones && versiones.id) {
      versiones = [versiones];
    }
    res.json(versiones);
  } catch (error) {
    console.error('Error al obtener versiones:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/carga-masiva/plantilla - Descargar plantilla Excel
router.get('/plantilla', requireAuth, async (req, res) => {
  try {
    // Crear Excel con headers de plantilla
    const XLSX = (await import('xlsx')).default;

    const headers = [
      'Codigo Olympo',
      'Codigo Unico Proceso',
      'Subtarea',
      'Direccion',
      'Entidad Responsable',
      'Presupuesto 2026 Anual',
      'Presupuesto Con Reformas',
      'Partida Presupuestaria',
      'Tipo Plan',
      'Proyecto Tipo',
      'Observaciones',
      'Actividad Nombre',
      'Actividad Composicion Gasto',
      'Actividad Enfoque Genero',
      'Actividad Tipo Obra',
      'Actividad Fecha Inicio',
      'Actividad Fecha Fin',
      'Tarea Nombre',
      'Tarea Fecha Inicio',
      'Tarea Fecha Fin',
      'Objetivo Operativo PMDOT',
      'Meta PMDOT 2033',
      'Valor Meta PMDOT 2025',
      'Meta Indicador',
      'Meta Valor 2026',
      'Meta Formula Calculo',
      'Meta Tipo'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Procesos');

    // Ajustar ancho de columnas
    const colWidths = headers.map(() => 20);
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    // Generar buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla-carga-procesos.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error al generar plantilla:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
