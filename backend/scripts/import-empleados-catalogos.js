import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { initMySQL, getDireccionesCatalogo, getResponsablesCatalogo, query } from '../data/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANDIDATE_FILES = [
  '../../Documentos base/empleados.xlsx',
  '../../Documentos base/Empleado.xlsx'
];

const DIRECCION_ALIAS = new Map([
  ['jefatura administrativa', 'DAF / Jefatura Administrativa'],
  ['jefatura de talento humano', 'DAF / Jefatura de Talento Humano'],
  ['jefatura financiera', 'DAF / Jefatura Financiera'],
  ['dirección de promoción del destino turístico', 'Dirección de Promoción de Destino Turístico'],
  ['jefatura de tecnologías de la información y comunicación', 'DPEI / Jefatura de TICS']
]);

function stripAccents(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeKey(value = '') {
  return stripAccents(String(value || ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value = '') {
  const lower = String(value || '').toLowerCase();
  return lower.replace(/(^|[\s/\-(])([a-záéíóúñ])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function resolveExcelPath() {
  for (const candidate of CANDIDATE_FILES) {
    const full = path.resolve(__dirname, candidate);
    if (fs.existsSync(full)) return full;
  }
  throw new Error('No se encontró Empleado.xlsx en Documentos base');
}

function normalizeDireccion(rawValue = '') {
  const original = String(rawValue || '').trim();
  if (!original) return null;

  const parts = original.split('/').map((item) => item.trim()).filter(Boolean);
  const institutionalPart = parts.length > 1 ? parts[parts.length - 1] : original;
  const alias = DIRECCION_ALIAS.get(normalizeKey(institutionalPart));
  if (alias) return alias;

  if (/^direccion administrativa financiera$/i.test(institutionalPart)) {
    return 'Dirección Administrativa Financiera';
  }

  if (/^direccion de planificacion estrategica e informacion$/i.test(stripAccents(institutionalPart))) {
    return 'Dirección de Planificación Estratégica e Información';
  }

  if (/^gerencia general$/i.test(institutionalPart)) {
    return 'Gerencia General';
  }

  return toTitleCase(institutionalPart)
    .replace(/ Tics\b/g, ' TICS')
    .replace(/ Dpei\b/g, 'DPEI');
}

function normalizeEmpleadoNombre(rawValue = '') {
  const value = String(rawValue || '').trim();
  if (!value) return null;
  return toTitleCase(value);
}

function normalizeEmail(rawValue = '') {
  const value = String(rawValue || '').trim().toLowerCase();
  return value || null;
}

async function upsertDireccion(nombre, cacheByKey) {
  const key = normalizeKey(nombre);
  const existing = cacheByKey.get(key);
  if (existing) {
    if (!existing.activo) {
      await query('UPDATE direcciones_catalogo SET activo = true WHERE id = ?', [existing.id]);
      existing.activo = true;
    }
    return existing;
  }

  const result = await query(
    'INSERT INTO direcciones_catalogo (nombre, activo) VALUES (?, true)',
    [nombre]
  );

  const created = { id: result.insertId, nombre, activo: true };
  cacheByKey.set(key, created);
  return created;
}

async function upsertResponsable({ nombre, email, direccionId }, responsables) {
  const nombreKey = normalizeKey(nombre);
  const emailKey = normalizeKey(email || '');

  let existing = null;
  if (emailKey) {
    existing = responsables.find((item) => normalizeKey(item.email || '') === emailKey) || null;
  }
  if (!existing) {
    existing = responsables.find(
      (item) => normalizeKey(item.nombre) === nombreKey && Number(item.direccionId || 0) === Number(direccionId || 0)
    ) || null;
  }

  if (existing) {
    await query(
      `UPDATE responsables_catalogo
       SET nombre = ?, email = ?, direccion_id = ?, activo = true
       WHERE id = ?`,
      [nombre, email, direccionId || null, existing.id]
    );
    existing.nombre = nombre;
    existing.email = email;
    existing.direccionId = direccionId || null;
    existing.activo = true;
    return { action: 'updated', id: existing.id };
  }

  const result = await query(
    `INSERT INTO responsables_catalogo (nombre, email, direccion_id, activo)
     VALUES (?, ?, ?, true)`,
    [nombre, email, direccionId || null]
  );

  responsables.push({
    id: result.insertId,
    nombre,
    email,
    direccionId: direccionId || null,
    activo: true
  });

  return { action: 'created', id: result.insertId };
}

async function main() {
  await initMySQL();

  const excelPath = resolveExcelPath();
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const direccionesCatalogo = await getDireccionesCatalogo();
  const direccionesByKey = new Map(
    direccionesCatalogo.map((item) => [normalizeKey(item.nombre), { ...item }])
  );
  const responsablesCatalogo = await getResponsablesCatalogo();

  let direccionesCreadas = 0;
  let direccionesReactivadas = 0;
  let responsablesCreados = 0;
  let responsablesActualizados = 0;
  let filasOmitidas = 0;

  for (const row of rows) {
    const nombre = normalizeEmpleadoNombre(row['Nombre del empleado']);
    const email = normalizeEmail(row['Correo electrónico']);
    const direccionNombre = normalizeDireccion(row['Direccion']);

    if (!nombre || !direccionNombre) {
      filasOmitidas += 1;
      continue;
    }

    const direccionKey = normalizeKey(direccionNombre);
    const before = direccionesByKey.get(direccionKey) || null;
    const direccion = await upsertDireccion(direccionNombre, direccionesByKey);
    if (!before) {
      direccionesCreadas += 1;
    } else if (!before.activo && direccion.activo) {
      direccionesReactivadas += 1;
    }

    const result = await upsertResponsable({ nombre, email, direccionId: direccion.id }, responsablesCatalogo);
    if (result.action === 'created') responsablesCreados += 1;
    if (result.action === 'updated') responsablesActualizados += 1;
  }

  const finalDirecciones = await getDireccionesCatalogo();
  const finalResponsables = await getResponsablesCatalogo();

  console.log(JSON.stringify({
    archivo: path.basename(excelPath),
    filasExcel: rows.length,
    filasOmitidas,
    direccionesCatalogo: finalDirecciones.length,
    responsablesCatalogo: finalResponsables.length,
    direccionesCreadas,
    direccionesReactivadas,
    responsablesCreados,
    responsablesActualizados
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
