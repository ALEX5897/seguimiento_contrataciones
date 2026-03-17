import api from './api';

/**
 * Servicio para gestionar versiones del POA-PAC
 */

// Obtener todas las versiones
export async function getAllVersiones() {
  const response = await api.get('/versiones');
  return response.data;
}

// Obtener una versión específica por ID
export async function getVersionById(id) {
  const response = await api.get(`/versiones/${id}`);
  return response.data;
}

// Obtener la versión actual
export async function getVersionActual() {
  const response = await api.get('/versiones/actual/info');
  return response.data;
}

// Crear nueva reforma
export async function crearNuevaReforma(data) {
  const response = await api.post('/versiones', data);
  return response.data;
}

// Aprobar una versión
export async function aprobarVersion(id, usuarioAprobacion) {
  const response = await api.put(`/versiones/${id}/aprobar`, { usuario_aprobacion: usuarioAprobacion });
  return response.data;
}

// Obtener cambios de una reforma
export async function getCambiosReforma(id) {
  const response = await api.get(`/versiones/${id}/cambios`);
  return response.data;
}

// Comparar dos versiones
export async function compararVersiones(id1, id2) {
  const response = await api.get(`/versiones/comparar/${id1}/${id2}`);
  return response.data;
}

// Eliminar una versión (solo borradores)
export async function deleteVersion(id) {
  const response = await api.delete(`/versiones/${id}`);
  return response.data;
}

export default {
  getAllVersiones,
  getVersionById,
  getVersionActual,
  crearNuevaReforma,
  aprobarVersion,
  getCambiosReforma,
  compararVersiones,
  deleteVersion
};
