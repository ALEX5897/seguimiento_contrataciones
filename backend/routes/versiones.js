import express from 'express';
import * as mysql from '../data/mysql.js';

const router = express.Router();

function scopeFromReq(req) {
  return {
    role: req.user?.role,
    direccionNombre: req.user?.direccionNombre || null
  };
}

/**
 * GET / - Listar todas las versiones del POA
 */
router.get('/', async (req, res) => {
  try {
    const versiones = await mysql.getAllVersiones();
    res.json(versiones);
  } catch (error) {
    console.error('Error al obtener versiones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /:id - Obtener una versión específica con sus actividades
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const version = await mysql.getVersionById(id);
    
    if (!version) {
      return res.status(404).json({ error: 'Versión no encontrada' });
    }

    // Obtener actividades de esta versión
    const actividades = await mysql.getAllSubtareasByScope(scopeFromReq(req));
    version.actividades = actividades;
    
    res.json(version);
  } catch (error) {
    console.error('Error al obtener versión:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /actual/info - Obtener la versión actual activa
 */
router.get('/actual/info', async (req, res) => {
  try {
    const versionActual = await mysql.getVersionActual();
    
    if (!versionActual) {
      return res.status(404).json({ error: 'No hay versión actual definida' });
    }

    const actividades = await mysql.getAllSubtareasByScope(scopeFromReq(req));
    versionActual.actividades = actividades;
    
    res.json(versionActual);
  } catch (error) {
    console.error('Error al obtener versión actual:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST / - Crear nueva versión/reforma
 * Body: { anio, descripcion, usuario_creacion }
 */
router.post('/', async (req, res) => {
  try {
    const { anio, descripcion, usuario_creacion } = req.body;
    
    if (!anio) {
      return res.status(400).json({ error: 'El año es requerido' });
    }

    const nuevaVersion = await mysql.crearNuevaReforma(anio, descripcion, usuario_creacion);
    res.status(201).json(nuevaVersion);
  } catch (error) {
    console.error('Error al crear reforma:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /:id/aprobar - Aprobar una versión (cambiar estado a aprobado)
 */
router.put('/:id/aprobar', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_aprobacion } = req.body;
    
    await mysql.aprobarVersion(id, usuario_aprobacion);
    const version = await mysql.getVersionById(id);
    
    res.json(version);
  } catch (error) {
    console.error('Error al aprobar versión:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /:id/cambios - Obtener cambios de una reforma
 */
router.get('/:id/cambios', async (req, res) => {
  try {
    const { id } = req.params;
    const cambios = await mysql.getCambiosReforma(id);
    res.json(cambios);
  } catch (error) {
    console.error('Error al obtener cambios:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /comparar/:id1/:id2 - Comparar dos versiones
 */
router.get('/comparar/:id1/:id2', async (req, res) => {
  try {
    const { id1, id2 } = req.params;
    
    const [version1, version2] = await Promise.all([
      mysql.getVersionById(id1),
      mysql.getVersionById(id2)
    ]);

    if (!version1 || !version2) {
      return res.status(404).json({ error: 'Una o ambas versiones no encontradas' });
    }

    const scope = scopeFromReq(req);
    const [actividades1, actividades2] = await Promise.all([
      mysql.getAllSubtareasByScope(scope),
      mysql.getAllSubtareasByScope(scope)
    ]);

    // Calcular diferencias
    const comparacion = calcularDiferencias(actividades1, actividades2);
    
    res.json({
      version1: { ...version1, actividades: actividades1 },
      version2: { ...version2, actividades: actividades2 },
      diferencias: comparacion
    });
  } catch (error) {
    console.error('Error al comparar versiones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /:id - Eliminar una versión (solo si está en borrador)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const version = await mysql.getVersionById(id);
    if (!version) {
      return res.status(404).json({ error: 'Versión no encontrada' });
    }

    if (version.estado !== 'borrador') {
      return res.status(400).json({ 
        error: 'Solo se pueden eliminar versiones en estado borrador' 
      });
    }

    await mysql.deleteVersion(id);
    res.json({ message: 'Versión eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar versión:', error);
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para calcular diferencias entre versiones
function calcularDiferencias(actividades1, actividades2) {
  const map1 = new Map(actividades1.map(a => [a.subtareaOrigenId || a.id, a]));
  const map2 = new Map(actividades2.map(a => [a.subtareaOrigenId || a.id, a]));

  const diferencias = {
    nuevas: [],
    modificadas: [],
    eliminadas: [],
    deshabilitadas: []
  };

  // Nuevas o modificadas en version2
  for (const [id, act2] of map2) {
    const act1 = map1.get(id);
    
    if (!act1) {
      diferencias.nuevas.push(act2);
    } else {
      const cambios = [];
      
      // Comparar campos importantes
      if (act1.nombre !== act2.nombre) {
        cambios.push({ campo: 'nombre', anterior: act1.nombre, nuevo: act2.nombre });
      }
      if (act1.presupuesto !== act2.presupuesto) {
        cambios.push({ campo: 'presupuesto', anterior: act1.presupuesto, nuevo: act2.presupuesto });
      }
      if (act1.activo && !act2.activo) {
        diferencias.deshabilitadas.push({ ...act2, cambios });
      } else if (cambios.length > 0) {
        diferencias.modificadas.push({ ...act2, cambios });
      }
    }
  }

  // Eliminadas en version2
  for (const [id, act1] of map1) {
    if (!map2.has(id)) {
      diferencias.eliminadas.push(act1);
    }
  }

  return diferencias;
}

export default router;
