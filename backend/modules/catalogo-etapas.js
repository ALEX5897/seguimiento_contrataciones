import catalogoData from '../catalogo-etapas.json' assert { type: 'json' };

class CatalogoEtapas {
  constructor() {
    this.datos = catalogoData;
    this.etapasById = new Map();
    this.etapasByNombre = new Map();
    this.clasificacionesMap = new Map();
    this.inicializar();
  }

  inicializar() {
    // Poblar mapas para búsqueda rápida
    for (const [clasificacion, datos] of Object.entries(this.datos.clasificaciones)) {
      this.clasificacionesMap.set(clasificacion, datos);

      for (const etapa of datos.etapas) {
        this.etapasById.set(etapa.id, {
          ...etapa,
          clasificacion,
          icono: datos.icono,
          descripcion: datos.descripcion
        });
        this.etapasByNombre.set(etapa.nombre.toLowerCase(), {
          ...etapa,
          clasificacion,
          icono: datos.icono
        });
      }
    }
  }

  // Obtener etapa por ID
  obtenerPorId(id) {
    return this.etapasById.get(id);
  }

  // Obtener etapa por nombre (búsqueda insensible a mayúsculas)
  obtenerPorNombre(nombre) {
    return this.etapasByNombre.get(nombre.toLowerCase());
  }

  // Obtener clasificación de una etapa
  obtenerClasificacion(etapaId) {
    const etapa = this.obtenerPorId(etapaId);
    return etapa ? etapa.clasificacion : null;
  }

  // Obtener todas las etapas de una clasificación
  obtenerEtapasDeClasificacion(clasificacion) {
    const datos = this.clasificacionesMap.get(clasificacion);
    return datos ? datos.etapas : [];
  }

  // Verificar si una etapa está clasificada
  estaClasificada(etapaId) {
    const etapa = this.obtenerPorId(etapaId);
    return etapa && etapa.clasificacion !== 'sin_clasificar';
  }

  // Obtener todas las clasificaciones
  obtenerClasificaciones() {
    return Array.from(this.clasificacionesMap.keys());
  }

  // Obtener datos de una clasificación
  obtenerDatosClasificacion(clasificacion) {
    return this.clasificacionesMap.get(clasificacion);
  }

  // Resumen de estadísticas
  obtenerEstadisticas() {
    return this.datos.resumen;
  }

  // Verificar si etapa es de fase preparatoria
  esPreparatoria(etapaId) {
    return this.obtenerClasificacion(etapaId) === 'preparatoria';
  }

  // Verificar si etapa es de fase precontractual
  esPrecontractual(etapaId) {
    return this.obtenerClasificacion(etapaId) === 'precontractual';
  }

  // Verificar si etapa es de fase contractual
  esContractual(etapaId) {
    return this.obtenerClasificacion(etapaId) === 'contractual';
  }

  // Obtener orden de etapa en su fase
  obtenerOrden(etapaId) {
    const etapa = this.obtenerPorId(etapaId);
    return etapa ? etapa.orden : null;
  }

  // Comparar orden de dos etapas (para saber cuál viene primero)
  // Retorna: -1 si etapa1 < etapa2, 0 si son iguales, 1 si etapa1 > etapa2
  compararOrden(etapaId1, etapaId2) {
    const orden1 = this.obtenerOrden(etapaId1);
    const orden2 = this.obtenerOrden(etapaId2);

    if (orden1 === null || orden2 === null) return 0;
    if (orden1 < orden2) return -1;
    if (orden1 > orden2) return 1;
    return 0;
  }

  // Obtener progresión de fases para un proceso
  // Retorna objeto con progreso en cada fase
  obtenerProgresionFases(etapasCompletadas) {
    const progresion = {
      preparatoria: { completadas: 0, total: 0 },
      precontractual: { completadas: 0, total: 0 },
      contractual: { completadas: 0, total: 0 },
      sin_clasificar: { completadas: 0, total: 0 }
    };

    for (const [clasificacion, datos] of this.clasificacionesMap) {
      progresion[clasificacion].total = datos.etapas.length;

      for (const etapa of datos.etapas) {
        if (etapasCompletadas.includes(etapa.id)) {
          progresion[clasificacion].completadas++;
        }
      }
    }

    return progresion;
  }

  // Obtener porcentaje de completitud por fase
  obtenerPorcentajesFases(etapasCompletadas) {
    const progresion = this.obtenerProgresionFases(etapasCompletadas);
    const porcentajes = {};

    for (const [fase, datos] of Object.entries(progresion)) {
      porcentajes[fase] = datos.total > 0
        ? Math.round((datos.completadas / datos.total) * 100)
        : 0;
    }

    return porcentajes;
  }

  // Búsqueda de etapas por término
  buscar(termino) {
    const terminoLower = termino.toLowerCase();
    const resultados = [];

    for (const [, etapa] of this.etapasById) {
      if (etapa.nombre.toLowerCase().includes(terminoLower)) {
        resultados.push(etapa);
      }
    }

    return resultados;
  }

  // Exportar JSON del catálogo
  exportarJSON() {
    return JSON.stringify(this.datos, null, 2);
  }

  // Obtener todas las etapas
  obtenerTodasEtapas() {
    return Array.from(this.etapasById.values());
  }
}

export default new CatalogoEtapas();
