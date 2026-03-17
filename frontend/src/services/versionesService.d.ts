export interface Version {
  id: number;
  anio: number;
  numeroReforma: number;
  nombre: string;
  descripcion?: string;
  estado: 'borrador' | 'aprobado' | 'historico';
  presupuestoTotal: number;
  fechaCreacion?: string;
  fechaAprobacion?: string;
  usuarioCreacion?: string;
  totalActividades: number;
  actividadesActivas: number;
  actividadesInactivas: number;
  actividades?: any[];
}

export interface CrearReformaData {
  anio: number;
  descripcion: string;
  usuario_creacion: string;
}

export function getAllVersiones(): Promise<Version[]>;
export function getVersionById(id: number): Promise<Version>;
export function getVersionActual(): Promise<Version>;
export function crearNuevaReforma(data: CrearReformaData): Promise<Version>;
export function aprobarVersion(id: number, usuario: string): Promise<Version>;
export function getCambiosReforma(id: number): Promise<any[]>;
export function compararVersiones(id1: number, id2: number): Promise<any>;
export function deleteVersion(id: number): Promise<void>;
