import express from 'express';
import { ESTADOS } from '../data/database.js';

export const estadosRouter = express.Router();

// Obtener todos los estados posibles
estadosRouter.get('/', (req, res) => {
  const estadosConInfo = Object.entries(ESTADOS).map(([key, value]) => ({
    codigo: value,
    nombre: key.replace(/_/g, ' '),
    descripcion: getDescripcionEstado(value)
  }));

  res.json(estadosConInfo);
});

function getDescripcionEstado(estado) {
  const descripciones = {
    pendiente: 'Tarea pendiente de inicio',
    en_curso: 'Tarea en proceso de ejecución',
    en_revision: 'Tarea en revisión/aprobación',
    bloqueada: 'Tarea bloqueada por dependencias o problemas',
    completada: 'Tarea completada, pendiente de cierre',
    cerrada: 'Tarea cerrada y archivada'
  };
  return descripciones[estado] || '';
}
